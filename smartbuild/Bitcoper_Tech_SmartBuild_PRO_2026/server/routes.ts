
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import * as xlsx from "xlsx";
import { searchPrice } from "./price-engine";
import { calculateFinancing, burnTokens, generateTokenId } from "./financing";
import { externalRegisterSchema } from "@shared/schema";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

function extractHostname(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isHostAllowed(hostname: string, allowedHost: string): boolean {
  return hostname === allowedHost || hostname.endsWith("." + allowedHost);
}

function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();

  const allowedDomains = (process.env.ALLOWED_ORIGINS || "").split(",").map(d => d.trim().toLowerCase()).filter(Boolean);

  if (allowedDomains.length === 0) {
    return res.status(403).json({ error: "Configuración de seguridad incompleta" });
  }

  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";

  const originHost = origin ? extractHostname(origin) : null;
  const refererHost = referer ? extractHostname(referer) : null;

  const checkHost = originHost || refererHost;

  if (!checkHost) {
    return res.status(403).json({ error: "Origen de solicitud no identificado" });
  }

  const isAllowed = allowedDomains.some(domain => isHostAllowed(checkHost, domain));

  if (!isAllowed) {
    return res.status(403).json({ error: "Acceso no autorizado desde este origen" });
  }
  next();
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
  const validKey = process.env.SMARTBUILD_API_KEY;
  if (!validKey) {
    return res.status(500).json({ error: "API key no configurada en el servidor" });
  }
  if (!header || header !== validKey) {
    return res.status(401).json({ error: "API key inválida o no proporcionada" });
  }
  next();
}

function toNumeric(val: any): number {
  if (val === null || val === undefined || val === "") return NaN;
  if (typeof val === "number") return val;
  let str = String(val).trim();
  str = str.replace(/[$€£%\s]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    str = str.replace(/,/g, "");
  }
  const num = parseFloat(str);
  return isNaN(num) ? NaN : num;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  // Projects (protected)
  app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.projects.get.path, isAuthenticated, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const updated = await storage.updateProject(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating project:", err);
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post(api.projects.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Dashboard Stats
  app.get(api.projects.dashboard.path, isAuthenticated, async (req, res) => {
    const utilityPercent = Number(req.query.utilityPercent) || 20;
    const ggPercent = Number(req.query.ggPercent) || 0;
    const stats = await storage.getDashboardStats(utilityPercent, ggPercent);
    res.json(stats);
  });

  // Items
  app.get(api.items.list.path, isAuthenticated, async (req, res) => {
    const items = await storage.getBudgetItems(Number(req.params.id));
    res.json(items);
  });

  app.put(api.items.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.items.update.input.parse(req.body);
      const updated = await storage.updateBudgetItem(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
       res.status(400).json({ message: "Invalid update" });
    }
  });

  app.get(api.materials.list.path, isAuthenticated, requireSameOrigin, async (req, res) => {
    const materials = await storage.getMaterials();

    const simulatedMaterials = materials.map(m => {
      const result = searchPrice(m.name);
      if (result.bestPrice > 0 && result.sodimac && result.easy) {
        return {
          ...m,
          currentPrice: result.bestPrice.toString(),
          sodimacPrice: result.sodimac.price.toString(),
          easyPrice: result.easy.price.toString(),
          sodimacBrand: result.sodimac.brand,
          easyBrand: result.easy.brand,
          sodimacStock: result.sodimac.stock,
          easyStock: result.easy.stock,
          cheapest: result.bestSupplier,
        };
      }
      return m;
    });

    res.json(simulatedMaterials);
  });

  // --- Mock Analysis & Upload Endpoints ---

  app.post(api.projects.upload.path, isAuthenticated, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No se adjuntó ningún archivo" });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const descKeywords = ["descripcion", "description", "nombre_partida", "detalle"];
      const unitKeywords = ["unidad", "unit", "unid", "und"];
      const qtyKeywords = ["cantidad", "quantity", "cant", "qty"];
      const upKeywords = ["precio unitario", "precio_unitario", "unit price", "valor_unitario", "p_u", "p.u.", "pu", "precio"];
      const totalKeywords = ["total", "valor_total", "monto", "subtotal"];
      const itemKeywords = ["item", "n°", "nro", "numero", "#"];
      const headerKeywords = [...descKeywords, ...unitKeywords, ...qtyKeywords, ...itemKeywords];

      const matchesAny = (cellVal: string, keywords: string[]) => {
        const norm = normalize(cellVal);
        return keywords.some(k => norm === k || norm.includes(k));
      };


      const preferredNames = ["final corregido", "presupuesto", "budget", "datos", "itemizado", "partidas"];
      let chosenSheetName: string | null = null;

      for (const pref of preferredNames) {
        const match = workbook.SheetNames.find(name => normalize(name).includes(pref));
        if (match) {
          chosenSheetName = match;
          break;
        }
      }

      if (!chosenSheetName) {
        let maxRows = 0;
        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          const data: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const nonEmptyRows = data.filter(row => 
            Array.isArray(row) && row.some((c: any) => String(c ?? "").trim() !== "")
          ).length;
          if (nonEmptyRows > maxRows) {
            maxRows = nonEmptyRows;
            chosenSheetName = name;
          }
        }
      }

      if (!chosenSheetName) {
        return res.status(400).json({ message: "El archivo Excel no tiene hojas con datos." });
      }

      const worksheet = workbook.Sheets[chosenSheetName];
      const rawData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: true });

      if (!rawData || rawData.length === 0) {
        return res.status(400).json({ message: `La hoja "${chosenSheetName}" está vacía.` });
      }


      let headerRowIndex = -1;
      let descColIndex = -1;

      for (let r = 0; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row)) continue;

        let matchCount = 0;
        let foundDescInRow = -1;
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] ?? "").trim();
          if (!cell) continue;
          if (matchesAny(cell, headerKeywords)) matchCount++;
          if (foundDescInRow < 0 && matchesAny(cell, descKeywords)) foundDescInRow = c;
        }

        if (matchCount >= 2) {
          headerRowIndex = r;
          descColIndex = foundDescInRow;
          break;
        }
      }

      if (headerRowIndex >= 0 && descColIndex < 0) {
        const hRow = rawData[headerRowIndex];
        for (let c = 0; c < hRow.length; c++) {
          const cell = String(hRow[c] ?? "").trim();
          if (cell && matchesAny(cell, descKeywords)) { descColIndex = c; break; }
        }
        if (descColIndex < 0) {
          descColIndex = Math.min(1, (hRow || []).length - 1);
        }
      }

      if (headerRowIndex < 0) {
        for (let r = 0; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || !Array.isArray(row)) continue;
          const nonEmpty = row.filter((v: any) => String(v ?? "").trim() !== "").length;
          if (nonEmpty >= 3) {
            headerRowIndex = r;
            descColIndex = row.length >= 3 ? 1 : 0;
            break;
          }
        }
      }

      if (headerRowIndex < 0) {
        const allCells = rawData.slice(0, 15).map((r, i) =>
          `Fila ${i + 1}: ${(r || []).map((c: any) => String(c ?? "").trim()).filter(Boolean).join(" | ")}`
        ).join("\n");
        return res.status(400).json({
          message: `No se encontró fila de encabezados en la hoja "${chosenSheetName}".\nContenido detectado:\n${allCells}`
        });
      }

      const headerRow = rawData[headerRowIndex];
      const cleanedHeaders = headerRow.map((c: any) => String(c ?? "").trim().toUpperCase());

      const findColIndex = (keywords: string[], fallbackIndex?: number): number => {
        for (let c = 0; c < headerRow.length; c++) {
          const cell = String(headerRow[c] ?? "").trim();
          if (cell && matchesAny(cell, keywords)) return c;
        }
        return fallbackIndex ?? -1;
      };

      const unitColIndex = findColIndex(unitKeywords);
      const qtyColIndex = findColIndex(qtyKeywords);
      const upColIndex = findColIndex(upKeywords);
      const totalColIndex = findColIndex(totalKeywords);
      const itemColIndex = findColIndex(itemKeywords);

      const projectId = Number(req.params.id);
      let itemsCount = 0;
      let skippedRows = 0;
      const bulkItems: any[] = [];

      for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row)) continue;

        const description = String(row[descColIndex] ?? "").trim();
        if (!description) continue;

        const unit = unitColIndex >= 0 ? String(row[unitColIndex] ?? "").trim() : "";

        const hasUnit = unit && unit.length > 0 && unit.length < 15;
        const looksLikeSectionTitle = !hasUnit && description === description.toUpperCase() && description.length > 3;
        if (looksLikeSectionTitle && !unit) {
          const rawQty = qtyColIndex >= 0 ? row[qtyColIndex] : null;
          const q = toNumeric(rawQty);
          if (isNaN(q) || q <= 0) {
            skippedRows++;
            continue;
          }
        }

        const rawQty = qtyColIndex >= 0 ? row[qtyColIndex] : null;
        const parsedQty = toNumeric(rawQty);

        const rawUnitPrice = upColIndex >= 0 ? row[upColIndex] : null;
        const rawTotalPrice = totalColIndex >= 0 ? row[totalColIndex] : null;
        const parsedUP = toNumeric(rawUnitPrice);
        const parsedTP = toNumeric(rawTotalPrice);

        bulkItems.push({
          projectId,
          description,
          unit: unit || "un",
          quantity: !isNaN(parsedQty) && parsedQty > 0 ? parsedQty.toString() : "0",
          unitPrice: !isNaN(parsedUP) ? parsedUP.toString() : null,
          totalPrice: !isNaN(parsedTP) ? parsedTP.toString() : null,
          status: "pending"
        });
        itemsCount++;
      }

      if (bulkItems.length > 0) {
        await storage.createBudgetItemsBulk(bulkItems);
      }

      if (itemsCount === 0) {
        return res.status(400).json({
          message: `Encabezado en fila ${headerRowIndex + 1} de hoja "${chosenSheetName}", pero no se encontraron filas con datos válidos debajo.`
        });
      }

      // === Extract footer totals (Subtotal Neto, GG%, Utilidad%, IVA, Total) ===
      const footerUpdates: Record<string, string> = {};
      const footerKeywords = {
        subtotalNeto: ['subtotal neto', 'subtotal', 'neto', 'costo directo', 'sub-total'],
        gastosGenerales: ['gastos generales', 'gg', 'gastos grales', 'overhead'],
        utilidad: ['utilidad', 'beneficio', 'margen'],
        iva: ['iva', 'impuesto'],
        total: ['total presupuesto', 'total general', 'total obra', 'monto total', 'precio total'],
      };

      // Scan footer rows (from last row upward, up to 30 rows)
      const footerStart = Math.max(headerRowIndex + 1, rawData.length - 30);

      for (let r = rawData.length - 1; r >= footerStart; r--) {
        const row = rawData[r];
        if (!row || !Array.isArray(row)) continue;

        const rowText = row.map((c: any) => normalize(String(c ?? ""))).join(" ");

        // Try to find each footer keyword
        for (const [key, keywords] of Object.entries(footerKeywords)) {
          if (footerUpdates[key]) continue; // already found
          
          const found = keywords.some(kw => rowText.includes(kw));
          if (!found) continue;

          // Look for numeric values in this row (skip the label cells)
          for (let c = row.length - 1; c >= 0; c--) {
            const cellStr = String(row[c] ?? "").trim();
            if (!cellStr) continue;
            
            // Check if cell contains a percent value
            if (key === 'gastosGenerales' || key === 'utilidad' || key === 'iva') {
              const percentMatch = cellStr.match(/(\d+[.,]?\d*)\s*%/);
              if (percentMatch) {
                const pctVal = toNumeric(percentMatch[1]);
                if (!isNaN(pctVal) && pctVal > 0 && pctVal < 100) {
                  footerUpdates[key + 'Percent'] = pctVal.toString();
                  continue;
                }
              }
            }

            const numVal = toNumeric(cellStr);
            if (!isNaN(numVal) && numVal > 0) {
              if (key === 'gastosGenerales' || key === 'utilidad' || key === 'iva') {
                // Small numbers likely percentages, large numbers likely amounts
                if (numVal < 100 && !footerUpdates[key + 'Percent']) {
                  footerUpdates[key + 'Percent'] = numVal.toString();
                } else if (!footerUpdates[key + 'Amount']) {
                  footerUpdates[key + 'Amount'] = numVal.toString();
                }
              } else {
                footerUpdates[key] = numVal.toString();
                break;
              }
            }
          }
        }
      }

      // Update project with extracted totals
      const projectUpdate: any = {};
      if (footerUpdates.subtotalNeto) projectUpdate.subtotalNeto = footerUpdates.subtotalNeto;
      if (footerUpdates.gastosGeneralesPercent) projectUpdate.gastosGeneralesPercent = footerUpdates.gastosGeneralesPercent;
      if (footerUpdates.utilidadPercent) projectUpdate.utilidadPercent = footerUpdates.utilidadPercent;
      if (footerUpdates.ivaPercent) projectUpdate.ivaPercent = footerUpdates.ivaPercent;
      else projectUpdate.ivaPercent = "19"; // Chilean default
      if (footerUpdates.total) {
        projectUpdate.totalExcel = footerUpdates.total;
        projectUpdate.totalBudget = footerUpdates.total;
      }
      // If no subtotalNeto found, compute from items
      if (!projectUpdate.subtotalNeto && bulkItems.length > 0) {
        let computedNeto = 0;
        for (const item of bulkItems) {
          const tp = Number(item.totalPrice || 0);
          const qty = Number(item.quantity || 0);
          const up = Number(item.unitPrice || 0);
          computedNeto += tp > 0 ? tp : (qty * up);
        }
        if (computedNeto > 0) {
          projectUpdate.subtotalNeto = computedNeto.toString();
        }
      }

      if (Object.keys(projectUpdate).length > 0) {
        await storage.updateProject(projectId, projectUpdate);
      }

      const msg = `Se importaron ${itemsCount} ítems desde hoja "${chosenSheetName}" (encabezado en fila ${headerRowIndex + 1}).${skippedRows > 0 ? ` ${skippedRows} filas de título omitidas.` : ""}`;
      res.json({ message: msg, itemsCount });
    } catch (error: any) {
      console.error("[Upload] Excel processing error:", error);
      res.status(500).json({ message: `Error al procesar el archivo: ${error.message || "Error desconocido"}` });
    }
  });

  // Project Financials (comparison panel)
  app.get(api.projects.financials.path, isAuthenticated, requireSameOrigin, async (req, res) => {
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const items = await storage.getBudgetItems(projectId);
    const allMaterials = await storage.getMaterials();

    // Excel values (from uploaded budget)
    const ggPercent = Number(project.gastosGeneralesPercent || 0);
    const utilPercent = Number(project.utilidadPercent || 0);
    const ivaPercent = Number(project.ivaPercent || 19);
    const excelTotal = Number(project.totalExcel || project.totalBudget || 0);
    
    // Derive excelNeto: use stored value, or reverse-calculate from total and percents
    let excelNeto = Number(project.subtotalNeto || 0);
    if (excelNeto === 0 && excelTotal > 0) {
      // Reverse: Total = Neto * (1 + GG% + Util%) * (1 + IVA%)
      const multiplier = (1 + ggPercent / 100 + utilPercent / 100) * (1 + ivaPercent / 100);
      excelNeto = multiplier > 0 ? Math.round(excelTotal / multiplier) : excelTotal;
    }

    const excelGGAmount = Math.round(excelNeto * (ggPercent / 100));
    const excelUtilAmount = Math.round(excelNeto * (utilPercent / 100));
    const excelSubBeforeIVA = excelNeto + excelGGAmount + excelUtilAmount;
    const excelIVAAmount = Math.round(excelSubBeforeIVA * (ivaPercent / 100));
    const excelComputedTotal = excelTotal > 0 ? excelTotal : (excelSubBeforeIVA + excelIVAAmount);

    // Real values (from market analysis)
    let realNeto = 0;
    let hasAnalysis = false;

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (item.status === 'matched' && item.marketPrice) {
        hasAnalysis = true;
        realNeto += qty * Number(item.marketPrice);
      } else {
        const up = Number(item.unitPrice || 0);
        const tp = Number(item.totalPrice || 0);
        realNeto += tp > 0 ? tp : (qty * up);
      }
    }

    // If no items at all, use excel neto
    if (realNeto === 0 && excelNeto > 0 && items.length === 0) realNeto = excelNeto;

    const realGGAmount = Math.round(realNeto * (ggPercent / 100));
    const realUtilAmount = Math.round(realNeto * (utilPercent / 100));
    const realSubBeforeIVA = realNeto + realGGAmount + realUtilAmount;
    const realIVAAmount = Math.round(realSubBeforeIVA * (ivaPercent / 100));
    const realTotal = realSubBeforeIVA + realIVAAmount;

    // Margen de Maniobra: bid-fixed approach
    // Under the original bid, how much utility do you actually get with real material costs?
    // materialSavings = excelNeto - realNeto (positive = materials cheaper than bid)
    // effectiveUtilAmount = original utility + savings from cheaper materials
    const materialSavings = excelNeto - realNeto;
    const effectiveUtilAmount = excelUtilAmount + materialSavings;
    let utilidadRealPercent = utilPercent;
    if (excelNeto > 0 && hasAnalysis) {
      utilidadRealPercent = Math.round((effectiveUtilAmount / excelNeto) * 10000) / 100;
    }

    const deltaAmount = hasAnalysis ? Math.round(effectiveUtilAmount - excelUtilAmount) : 0;
    const deltaPercent = hasAnalysis ? Math.round((utilidadRealPercent - utilPercent) * 100) / 100 : 0;
    let status: 'favorable' | 'riesgo' | 'neutro' = 'neutro';
    if (deltaPercent > 0.5) status = 'favorable';
    else if (deltaPercent < -0.5) status = 'riesgo';

    res.json({
      excel: {
        netoMateriales: excelNeto,
        gastosGeneralesPercent: ggPercent,
        gastosGeneralesAmount: excelGGAmount,
        utilidadPercent: utilPercent,
        utilidadAmount: excelUtilAmount,
        ivaPercent,
        ivaAmount: excelIVAAmount,
        total: excelComputedTotal,
      },
      real: {
        netoMateriales: Math.round(realNeto),
        gastosGeneralesPercent: ggPercent,
        gastosGeneralesAmount: realGGAmount,
        utilidadPercent: utilPercent,
        utilidadAmount: realUtilAmount,
        ivaPercent,
        ivaAmount: realIVAAmount,
        total: realTotal,
      },
      margenManiobra: {
        deltaAmount,
        deltaPercent,
        status,
        utilidadRealPercent,
      },
      hasAnalysis,
    });
  });

  app.post(api.projects.syncPrices.path, isAuthenticated, requireSameOrigin, async (req, res) => {
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ message: "Proyecto no encontrado" });

    const items = await storage.getBudgetItems(projectId);
    if (items.length === 0) {
      return res.json({ message: "No hay ítems para sincronizar.", matchedCount: 0, totalItems: 0, syncTimestamp: new Date().toISOString() });
    }

    let matchedCount = 0;
    let totalProjectedCost = 0;
    let totalBudget = 0;

    for (const item of items) {
      const result = searchPrice(item.description);

      if (result.bestPrice > 0 && result.sodimac && result.easy) {
        matchedCount++;
        const qty = Number(item.quantity || 0);
        const newTotal = qty * result.bestPrice;
        totalProjectedCost += newTotal;
        totalBudget += newTotal;

        await storage.updateBudgetItem(item.id, {
          commercialDescription: result.bestProduct?.name || item.description,
          commercialUnit: result.bestProduct?.unit || item.unit,
          marketPrice: result.bestPrice.toString(),
          unitPrice: result.bestPrice.toString(),
          totalPrice: newTotal.toString(),
          supplier: result.bestSupplier || undefined,
          sodimacPrice: result.sodimac.price.toString(),
          easyPrice: result.easy.price.toString(),
          sodimacName: result.sodimac.name,
          easyName: result.easy.name,
          sodimacBrand: result.sodimac.brand,
          easyBrand: result.easy.brand,
          sodimacStock: result.sodimac.stock,
          easyStock: result.easy.stock,
          status: "matched",
        });
      } else {
        const qty = Number(item.quantity || 0);
        const up = Number(item.unitPrice || 0);
        const tp = Number(item.totalPrice || 0);
        const existingTotal = tp > 0 ? tp : (qty * up);
        totalProjectedCost += existingTotal;
        totalBudget += existingTotal;
        await storage.updateBudgetItem(item.id, {
          sodimacPrice: null,
          easyPrice: null,
          sodimacName: null,
          easyName: null,
          sodimacBrand: null,
          easyBrand: null,
          sodimacStock: null,
          easyStock: null,
          status: "pending",
        });
      }
    }

    const syncDate = new Date();
    const syncTimestamp = syncDate.toISOString();
    await storage.updateProject(projectId, {
      totalBudget: totalBudget.toString(),
      totalCost: totalProjectedCost.toString(),
      lastPriceSync: syncDate as any,
      status: "processing",
    });

    res.json({
      message: `Sincronización completada: ${matchedCount} de ${items.length} ítems encontrados en Sodimac y Easy.`,
      matchedCount,
      totalItems: items.length,
      syncTimestamp,
    });
  });

  app.post(api.projects.analyze.path, isAuthenticated, requireSameOrigin, async (req, res) => {
    const projectId = Number(req.params.id);
    const items = await storage.getBudgetItems(projectId);

    let matchedCount = 0;
    let totalProjectedCost = 0;
    let totalBudget = 0;

    for (const item of items) {
      const result = searchPrice(item.description);

      if (result.bestPrice > 0 && result.sodimac && result.easy) {
        matchedCount++;
        const qty = Number(item.quantity || 0);
        const newTotal = qty * result.bestPrice;
        totalProjectedCost += newTotal;
        totalBudget += newTotal;

        await storage.updateBudgetItem(item.id, {
          commercialDescription: result.bestProduct?.name || item.description,
          commercialUnit: result.bestProduct?.unit || item.unit,
          marketPrice: result.bestPrice.toString(),
          unitPrice: result.bestPrice.toString(),
          totalPrice: newTotal.toString(),
          supplier: result.bestSupplier || undefined,
          sodimacPrice: result.sodimac.price.toString(),
          easyPrice: result.easy.price.toString(),
          sodimacName: result.sodimac.name,
          easyName: result.easy.name,
          sodimacBrand: result.sodimac.brand,
          easyBrand: result.easy.brand,
          sodimacStock: result.sodimac.stock,
          easyStock: result.easy.stock,
          status: "matched",
        });
      } else {
        const qty = Number(item.quantity || 0);
        const up = Number(item.unitPrice || 0);
        const tp = Number(item.totalPrice || 0);
        const existingTotal = tp > 0 ? tp : (qty * up);
        totalProjectedCost += existingTotal;
        totalBudget += existingTotal;
        await storage.updateBudgetItem(item.id, {
          status: "pending",
        });
      }
    }

    const syncDate = new Date();
    await storage.updateProject(projectId, {
      totalBudget: totalBudget.toString(),
      totalCost: totalProjectedCost.toString(),
      lastPriceSync: syncDate as any,
      status: "processing",
    });

    res.json({ message: `Análisis completado: ${matchedCount} de ${items.length} ítems vinculados con precios Sodimac/Easy.`, jobId: "job_" + Date.now() });
  });

  app.put('/api/materials/:id/status', isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    const updated = await storage.updateMaterial(id, { status });
    if (!updated) return res.status(404).json({ message: "Material not found" });

    if (status === 'Comprado') {
      const result = searchPrice(updated.name);
      if (result.bestPrice > 0) {
        const allProjects = await storage.getProjects();
        for (const project of allProjects) {
          const items = await storage.getBudgetItems(project.id);
          let deduction = 0;
          for (const item of items) {
            if (item.status === 'matched' && item.commercialDescription) {
              const itemResult = searchPrice(item.commercialDescription);
              const matResult = searchPrice(updated.name);
              if (itemResult.bestPrice > 0 && matResult.bestPrice > 0 &&
                  itemResult.bestProduct?.name === matResult.bestProduct?.name) {
                deduction += Number(item.quantity || 0) * result.bestPrice;
              }
            }
          }
          if (deduction > 0) {
            const currentCost = Number(project.totalCost || 0);
            const newCost = currentCost + deduction;
            await storage.updateProject(project.id, {
              totalCost: newCost.toString()
            });
          }
        }
      }
    }

    res.json(updated);
  });
  
  app.get("/api/settings", isAuthenticated, async (_req, res) => {
    const settings = await storage.getCompanySettings();
    res.json(settings);
  });

  app.put("/api/settings", isAuthenticated, async (req, res) => {
    const { companyName, rut, address, contact, email, phone } = req.body;
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (rut !== undefined) updates.rut = rut;
    if (address !== undefined) updates.address = address;
    if (contact !== undefined) updates.contact = contact;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    const settings = await storage.updateCompanySettings(updates);
    res.json(settings);
  });

  app.post("/api/settings/logo", isAuthenticated, upload.single("logo"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const settings = await storage.updateCompanySettings({ logoBase64: base64 });
    res.json(settings);
  });

  app.post("/api/settings/firma", isAuthenticated, upload.single("firma"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const settings = await storage.updateCompanySettings({ firmaBase64: base64 });
    res.json(settings);
  });

  app.delete("/api/settings/logo", isAuthenticated, async (_req, res) => {
    const settings = await storage.updateCompanySettings({ logoBase64: null });
    res.json(settings);
  });

  app.delete("/api/settings/firma", isAuthenticated, async (_req, res) => {
    const settings = await storage.updateCompanySettings({ firmaBase64: null });
    res.json(settings);
  });

  // ====== PUBLIC ENDPOINTS ======

  app.post("/api/demo-request", async (req, res) => {
    try {
      const { name, email, company, phone, message } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "Nombre y email son requeridos" });
      }
      const demo = await storage.createDemoRequest({ name, email, company, phone, message });
      res.json({ success: true, id: demo.id });
    } catch (err: any) {
      console.error("Demo request error:", err);
      res.status(500).json({ error: "Error al procesar la solicitud" });
    }
  });

  // ====== EXTERNAL API (protected by API key) ======

  app.post("/api/external/register", requireApiKey, async (req, res) => {
    try {
      const data = externalRegisterSchema.parse(req.body);
      const existing = await storage.getCustomerByEmail(data.email);
      if (existing) {
        return res.status(409).json({
          error: "El email ya está registrado",
          userId: existing.id,
        });
      }
      const user = await storage.createCustomer({
        name: data.name,
        email: data.email,
        rut: data.rut || null,
        company: data.company || null,
        phone: data.phone || null,
        plan: data.plan || "starter",
        paymentStatus: "approved",
        webpayToken: data.webpayToken || null,
        webpayOrderId: data.webpayOrderId || null,
        amountPaid: data.amountPaid || null,
        isActive: true,
      });
      res.status(201).json({
        message: "Usuario registrado exitosamente",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: "Datos inválidos",
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      console.error("Error registrando usuario:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/users", isAuthenticated, async (_req, res) => {
    const allUsers = await storage.getCustomers();
    const safe = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      company: u.company,
      plan: u.plan,
      paymentStatus: u.paymentStatus,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
    res.json(safe);
  });

  app.get("/api/settings/api-key", isAuthenticated, async (_req, res) => {
    const key = process.env.SMARTBUILD_API_KEY;
    if (!key) {
      return res.json({ configured: false, maskedKey: null });
    }
    const masked = key.substring(0, 6) + "..." + key.substring(key.length - 4);
    res.json({ configured: true, maskedKey: masked });
  });

  app.get("/api/financing/simulate", isAuthenticated, async (_req, res) => {
    try {
      const rawTasa = Number(_req.query.tasa);
      const rawPlazo = Number(_req.query.plazo);
      const rawCuotas = Number(_req.query.cuotas_pagadas);
      const tasaMensual = isNaN(rawTasa) || rawTasa < 0 || rawTasa > 10 ? 1.5 : rawTasa;
      const plazoMeses = isNaN(rawPlazo) || rawPlazo < 1 || rawPlazo > 60 ? 12 : Math.round(rawPlazo);
      const cuotasPagadas = isNaN(rawCuotas) || rawCuotas < 0 ? 0 : Math.min(Math.round(rawCuotas), plazoMeses);
      const allProjects = await storage.getProjects();
      const simulations = [];

      for (const project of allProjects) {
        const items = await storage.getBudgetItems(project.id);
        let costoDirecto = 0;
        for (const item of items) {
          if (item.status === "matched" && item.marketPrice) {
            costoDirecto += Number(item.quantity || 0) * Number(item.marketPrice);
          }
        }
        if (costoDirecto === 0) costoDirecto = Number(project.totalCost || 0) || Number(project.totalBudget || 0) * 0.7;

        const tokenId = project.tokenId || generateTokenId();
        if (!project.tokenId) {
          await storage.updateProject(project.id, { tokenId } as any);
        }

        simulations.push(calculateFinancing(
          project.id,
          project.name,
          costoDirecto,
          tasaMensual,
          plazoMeses,
          cuotasPagadas,
          tokenId,
          project.statusFinanciamiento || "pendiente"
        ));
      }

      res.json(simulations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const burnTokensSchema = z.object({
    projectId: z.number().int().positive(),
    cuotasPagadas: z.number().int().min(0).max(60).default(0),
    tasaMensual: z.number().min(0).max(10).default(1.5),
    plazoMeses: z.number().int().min(1).max(60).default(12),
  });

  app.post("/api/financing/burn-tokens", isAuthenticated, async (req, res) => {
    try {
      const parsed = burnTokensSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Datos inválidos" });
      const { projectId, cuotasPagadas, tasaMensual, plazoMeses } = parsed.data;

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

      const items = await storage.getBudgetItems(project.id);
      let costoDirecto = 0;
      for (const item of items) {
        if (item.status === "matched" && item.marketPrice) {
          costoDirecto += Number(item.quantity || 0) * Number(item.marketPrice);
        }
      }
      if (costoDirecto === 0) costoDirecto = Number(project.totalCost || 0) || Number(project.totalBudget || 0) * 0.7;

      const montoFinanciar = Math.round(costoDirecto * 0.3);
      const tokenId = project.tokenId || generateTokenId();

      const result = burnTokens(montoFinanciar, tasaMensual, plazoMeses, cuotasPagadas, tokenId);

      const newStatus = result.saldoPendiente <= 0 ? "aprobado" : "pendiente";
      await storage.updateProject(project.id, {
        tokenId,
        statusFinanciamiento: newStatus,
      } as any);

      res.json({ ...result, statusFinanciamiento: newStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/financing/:projectId/status", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { status } = req.body;
      if (!["pendiente", "aprobado"].includes(status)) {
        return res.status(400).json({ error: "Status debe ser 'pendiente' o 'aprobado'" });
      }
      const updated = await storage.updateProject(projectId, { statusFinanciamiento: status } as any);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProjects = await storage.getProjects();
  if (existingProjects.length === 0) {
    await storage.createProject({
      name: "Edificio Centro 2024",
      client: "Inmobiliaria Norte",
      totalBudget: "250000000",
      description: "Obra gruesa y terminaciones edificio 5 pisos.",
      status: "processing"
    });
    await storage.createProject({
      name: "Casa Loteo Valles",
      client: "Juan Pérez",
      totalBudget: "85000000",
      description: "Construcción casa habitacional 140m2",
      status: "draft"
    });
    
    await storage.createMaterial({
      name: "Acero Estructural A63-42H 12mm",
      unit: "kg",
      currentPrice: "1150",
      supplier: "Sodimac",
      status: "En Tránsito desde Sodimac"
    });
    
    await storage.createMaterial({
      name: "Plancha PV4 Zinc Alum 0.4mm x 3.6m",
      unit: "m2",
      currentPrice: "12500",
      supplier: "Easy",
      status: "Pendiente de Compra"
    });
    
    await storage.createMaterial({
      name: "Cemento Melón Especial 25kg",
      unit: "saco",
      currentPrice: "4500",
      supplier: "Sodimac",
      status: "Recibido en Obra"
    });
  }
}
