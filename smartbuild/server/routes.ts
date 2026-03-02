
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import * as xlsx from "xlsx";
import { searchPrice, getFullCatalog, type PriceSearchResult } from "./price-engine";
import { calculateFinancing, burnTokens, generateTokenId } from "./financing";
import { recommendPaymentGateway, getPaymentSplit, type PaymentIntent } from "./payment-switch";
import { paymentService, type CreatePaymentRequest, type WebhookPayload } from "./payment-service";
import { getCountryConfig, formatCurrency, getSupportedCountries, calculateTax, isCountrySupported } from "../shared/country-config";
import { externalRegisterSchema, insertAdminTransactionSchema } from "@shared/schema";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerAssistantRoutes } from "./assistant";
import { submitReviewSchema, submitReviewWithLeadSchema, getMaestroLevel, kycUpdateSchema, getDocumentStatusLabel, generateCouponCode, acceptBudgetSchema, submitMilestoneSchema, ESCROW_STATUS, MILESTONE_STATUS, TRANSACTION_TYPES, NOTIFICATION_TYPES, generateWithdrawalToken, SUBSCRIPTION_PLANS, WITHDRAWAL_STATUS, insertHomeownerSubscriptionSchema, DAILY_CUSTODY_RATE, generateCertificateId, COPPER_CREDIT_TYPES, MILESTONE_BONUS_RATE, USER_ROLES, generatePaymentToken, PAYMENT_LINK_TYPES, generateFerreteriaCouponCode, COUPON_STATUS } from "@shared/models/auth";
import PDFDocument from "pdfkit";
import { getFullCatalog as getMarketplaceCatalog } from "./price-engine";
import path from "path";
import fs from "fs";

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

  const manualOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
  const replitDomains = (process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "").split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
  const allowedDomains = [...manualOrigins, ...replitDomains];

  if (allowedDomains.length === 0) {
    console.error(`[ORIGIN-GUARD] 403 — No allowed domains configured. Set ALLOWED_ORIGINS or ensure REPLIT_DOMAINS is available.`);
    return res.status(403).json({ error: "Configuración de seguridad incompleta" });
  }

  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";

  const originHost = origin ? extractHostname(origin) : null;
  const refererHost = referer ? extractHostname(referer) : null;

  const checkHost = originHost || refererHost;

  if (!checkHost) {
    const hostHeader = (req.headers.host || "").split(":")[0].toLowerCase();
    if (hostHeader && allowedDomains.some(domain => isHostAllowed(hostHeader, domain))) {
      return next();
    }
    console.error(`[ORIGIN-GUARD] 403 — No origin/referer header. Host: ${hostHeader} Method: ${req.method} Path: ${req.path}`);
    return res.status(403).json({ error: "Origen de solicitud no identificado" });
  }

  const isAllowed = allowedDomains.some(domain => isHostAllowed(checkHost, domain));

  if (!isAllowed) {
    console.error(`[ORIGIN-GUARD] 403 — Blocked origin: ${checkHost}. Allowed: ${allowedDomains.join(", ")}`);
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

function getUserId(req: Request): string {
  return (req.user as any)?.claims?.sub;
}

function getUserEmail(req: Request): string | undefined {
  return (req.user as any)?.claims?.email;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req);
  const userEmail = getUserEmail(req);
  const adminId = process.env.ADMIN_USER_ID;
  const adminEmail = process.env.ADMIN_EMAIL;

  const isAdminById = adminId && userId === adminId;
  const isAdminByEmail = adminEmail && userEmail && adminEmail.toLowerCase() === userEmail.toLowerCase();

  if (!isAdminById && !isAdminByEmail) {
    return res.status(403).json({ error: "Acceso denegado: solo administradores" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  // Projects (protected, multi-tenant)
  app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projects = await storage.getProjects(userId);
    res.json(projects);
  });

  app.get(api.projects.get.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const project = await storage.getProject(Number(req.params.id));
    if (!project || project.ownerId !== userId) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);
      const project = await storage.getProject(id);
      if (!project || project.ownerId !== userId) return res.status(404).json({ message: "Project not found" });
      const updated = await storage.updateProject(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating project:", err);
      res.status(500).json({ message: "Error interno" });
    }
  });

  app.post(api.projects.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const userEmail = getUserEmail(req);
      const adminId = process.env.ADMIN_USER_ID;
      const adminEmail = process.env.ADMIN_EMAIL;
      const isAdmin = (adminId && userId === adminId) || (adminEmail && userEmail && adminEmail.toLowerCase() === userEmail.toLowerCase());

      if (!isAdmin) {
        const existingProjects = await storage.getProjects(userId);
        if (existingProjects.length >= 1) {
          return res.status(403).json({
            code: "PLAN_LIMIT_REACHED",
            message: "Has alcanzado el límite de proyectos en tu plan gratuito. Actualiza a PRO para crear proyectos ilimitados.",
          });
        }
      }
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input, userId);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const id = Number(req.params.id);
      const project = await storage.getProject(id);
      if (!project || project.ownerId !== userId) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }
      await storage.deleteProject(id);
      res.json({ message: "Proyecto eliminado exitosamente" });
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ message: "Error al eliminar proyecto" });
    }
  });

  // Dashboard Stats
  app.get(api.projects.dashboard.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const compSettings = await storage.getCompanySettings();
    const defaultUtil = Number(compSettings?.defaultUtilidadPercent || 20);
    const defaultGG = Number(compSettings?.defaultGGPercent || 15);
    const utilityPercent = Number(req.query.utilityPercent) || defaultUtil;
    const ggPercent = Number(req.query.ggPercent) || defaultGG;
    const stats = await storage.getDashboardStats(userId, utilityPercent, ggPercent);
    res.json(stats);
  });

  // Items (verify project ownership)
  app.get(api.items.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    if (!project || project.ownerId !== userId) return res.status(404).json({ message: "Proyecto no encontrado" });
    const items = await storage.getBudgetItems(projectId);
    res.json(items);
  });

  app.put(api.items.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const itemId = Number(req.params.id);
      const item = await storage.getBudgetItem(itemId);
      if (item) {
        const project = await storage.getProject(item.projectId);
        if (!project || project.ownerId !== userId) {
          return res.status(404).json({ message: "Item no encontrado" });
        }
      }
      const input = api.items.update.input.parse(req.body);
      const updated = await storage.updateBudgetItem(itemId, input);
      res.json(updated);
    } catch (err) {
       res.status(400).json({ message: "Invalid update" });
    }
  });

  app.get('/api/catalog', isAuthenticated, requireSameOrigin, async (_req, res) => {
    try {
      const catalog = getFullCatalog();
      res.json(catalog);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el catálogo de precios" });
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
      const userId = getUserId(req);
      const projectId = Number(req.params.id);
      const ownerCheck = await storage.getProject(projectId);
      if (!ownerCheck || ownerCheck.ownerId !== userId) {
        return res.status(404).json({ message: "Proyecto no encontrado" });
      }

      await storage.deleteBudgetItemsByProject(projectId);

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

      // === APU FORMAT DETECTION ===
      const apuIndicators = ["analisis de precios unitarios", "formato precio unitario", "precios unitarios", "formato apu"];
      const apuSectionHeaders = ["especificacion material", "mano de obra", "herramientas", "maquinaria"];

      let isApuFormat = false;
      let apuSheetName: string | null = null;

      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const preview: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true });
        let hasApuTitle = false;
        let sectionCount = 0;
        for (const row of preview.slice(0, 40)) {
          if (!Array.isArray(row)) continue;
          for (const cell of row) {
            const norm = normalize(String(cell ?? ""));
            if (apuIndicators.some(ind => norm.includes(ind))) hasApuTitle = true;
            if (apuSectionHeaders.some(sh => norm.includes(sh))) sectionCount++;
          }
        }
        if (hasApuTitle && sectionCount >= 2) {
          isApuFormat = true;
          apuSheetName = sheetName;
          break;
        }
      }

      if (isApuFormat && apuSheetName) {
        const ws = workbook.Sheets[apuSheetName];
        const rawData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true });

        const itemRows: number[] = [];
        for (let r = 0; r < rawData.length; r++) {
          const row = rawData[r];
          if (!Array.isArray(row)) continue;
          const c0 = normalize(String(row[0] ?? ""));
          if (c0 === "item" || c0 === "item") {
            itemRows.push(r);
          }
        }

        if (itemRows.length === 0) {
          return res.status(400).json({ message: "Formato APU detectado pero no se encontraron partidas (ITEM)." });
        }

        const sectionPatterns = [
          { keywords: ["especificacion material", "especificacion"], name: "Materiales", totalPrefix: "(a)" },
          { keywords: ["mano de obra"], name: "Mano de Obra", totalPrefix: "(b)" },
          { keywords: ["herramientas", "maquinaria", "herramientas/maquinaria"], name: "Herramientas/Maquinaria", totalPrefix: "(c)" },
        ];

        const bulkItems: any[] = [];
        let apuCount = 0;
        let totalCostoAPU = 0;

        for (let idx = 0; idx < itemRows.length; idx++) {
          const apuStart = itemRows[idx];
          const apuEnd = idx + 1 < itemRows.length ? itemRows[idx + 1] : rawData.length;

          let apuItemNum = "";
          let apuPartida = "";
          let apuUnidad = "";
          for (let r = apuStart; r < Math.min(apuStart + 6, apuEnd); r++) {
            const row = rawData[r];
            if (!Array.isArray(row)) continue;
            const c0 = normalize(String(row[0] ?? ""));
            if (c0 === "item" || c0 === "item") apuItemNum = String(row[1] ?? row[2] ?? "").trim();
            if (c0 === "partida" || c0.includes("partida")) apuPartida = String(row[1] ?? row[2] ?? "").trim();
            if (c0 === "unidad" && !c0.includes("precio")) apuUnidad = String(row[1] ?? row[2] ?? "").trim();
          }

          interface ApuSection { name: string; startRow: number; endRow: number; totalLabel: string; }
          const sections: ApuSection[] = [];
          for (let r = apuStart; r < apuEnd; r++) {
            const row = rawData[r];
            if (!Array.isArray(row)) continue;
            const c0 = normalize(String(row[0] ?? ""));
            for (const sp of sectionPatterns) {
              if (sp.keywords.some(k => c0.includes(k))) {
                const hasSubHeaders = row.length >= 3 &&
                  (normalize(String(row[1] ?? "")).includes("unidad") ||
                   normalize(String(row[2] ?? "")).includes("cantidad"));
                if (hasSubHeaders) {
                  sections.push({ name: sp.name, startRow: r, endRow: -1, totalLabel: sp.totalPrefix });
                }
              }
            }
          }

          for (let i = 0; i < sections.length; i++) {
            const nextBound = i + 1 < sections.length ? sections[i + 1].startRow : apuEnd;
            for (let r = sections[i].startRow + 1; r < nextBound; r++) {
              const row = rawData[r];
              if (!Array.isArray(row)) continue;
              const c0 = normalize(String(row[0] ?? ""));
              if (c0.startsWith(sections[i].totalLabel) || (c0.includes("total") && c0.includes(sections[i].totalLabel.replace(/[()]/g, "")))) {
                sections[i].endRow = r;
                break;
              }
            }
            if (sections[i].endRow < 0) sections[i].endRow = nextBound;
          }

          let apuTotal = 0;
          const partidaLabel = apuPartida || `Partida ${apuItemNum || (idx + 1)}`;
          let componentCount = 0;

          for (const section of sections) {
            for (let r = section.startRow + 1; r < section.endRow; r++) {
              const row = rawData[r];
              if (!Array.isArray(row)) continue;
              const desc = String(row[0] ?? "").trim();
              if (!desc) continue;
              const normDesc = normalize(desc);
              if (normDesc.includes("total") || normDesc.includes("leyes sociales")) continue;

              const unit = String(row[1] ?? "").trim();
              const qty = toNumeric(row[2]);
              const pu = toNumeric(row[3]);
              const total = toNumeric(row[4]);

              if (!unit && isNaN(qty) && isNaN(pu)) continue;

              const itemTotal = !isNaN(total) ? total : (!isNaN(qty) && !isNaN(pu) ? qty * pu : 0);
              apuTotal += itemTotal;
              componentCount++;

              bulkItems.push({
                projectId,
                description: `${apuItemNum ? apuItemNum + " " : ""}${partidaLabel} → [${section.name}] ${desc}`,
                unit: unit || "un",
                quantity: !isNaN(qty) && qty > 0 ? qty.toString() : "0",
                unitPrice: !isNaN(pu) ? pu.toString() : null,
                totalPrice: itemTotal > 0 ? itemTotal.toString() : null,
                sortOrder: bulkItems.length + 1,
                status: "pending"
              });
            }
          }

          if (componentCount === 0) {
            bulkItems.push({
              projectId,
              description: `${apuItemNum ? apuItemNum + " " : ""}${partidaLabel}`,
              unit: apuUnidad || "un",
              quantity: "1",
              unitPrice: null,
              totalPrice: null,
              sortOrder: bulkItems.length + 1,
              status: "pending"
            });
          }

          totalCostoAPU += apuTotal;
          apuCount++;
        }

        if (bulkItems.length > 0) {
          await storage.createBudgetItemsBulk(bulkItems);
        }

        return res.json({
          message: `APU procesado: ${apuCount} partida${apuCount !== 1 ? "s" : ""} encontrada${apuCount !== 1 ? "s" : ""}`,
          format: "apu",
          sheetName: apuSheetName,
          componentsCount: bulkItems.length,
          totalCostoAPU: totalCostoAPU > 0 ? totalCostoAPU : null,
          itemsInserted: bulkItems.length,
        });
      }

      // === BUDGET FORMAT (Presupuesto/Itemizado) ===
      const descKeywords = ["descripcion", "description", "nombre_partida", "detalle", "partida", "glosa", "actividad"];
      const unitKeywords = ["unidad", "unit", "unid", "und", "ud", "medida"];
      const qtyKeywords = ["cantidad", "quantity", "cant", "qty", "vol"];
      const upKeywords = ["precio unitario", "precio_unitario", "unit price", "valor_unitario", "p_u", "p.u.", "pu", "precio unitario  $", "precio unitario $", "precio"];
      const totalKeywords = ["total", "valor_total", "monto", "subtotal", "total $"];
      const itemKeywords = ["item", "ítem", "n°", "nro", "numero", "#", "cod", "codigo"];
      const headerKeywords = [...descKeywords, ...unitKeywords, ...qtyKeywords, ...itemKeywords];

      const matchesAny = (cellVal: string, keywords: string[]) => {
        const norm = normalize(cellVal);
        if (!norm) return false;
        return keywords.some(k => {
          const normK = normalize(k);
          return norm === normK || norm.includes(normK);
        });
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
        let hasUnitCol = false;
        let hasQtyCol = false;
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] ?? "").trim();
          if (!cell) continue;
          if (matchesAny(cell, headerKeywords)) matchCount++;
          if (foundDescInRow < 0 && matchesAny(cell, descKeywords)) foundDescInRow = c;
          if (matchesAny(cell, unitKeywords)) hasUnitCol = true;
          if (matchesAny(cell, qtyKeywords)) hasQtyCol = true;
        }

        if (matchCount >= 3 && (hasUnitCol || hasQtyCol)) {
          headerRowIndex = r;
          descColIndex = foundDescInRow;
          break;
        }
      }

      if (headerRowIndex < 0) {
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

      if (headerRowIndex >= 0) {
        const hRow = rawData[headerRowIndex];
        const itemCI = (() => { for (let c = 0; c < hRow.length; c++) { const cell = String(hRow[c] ?? "").trim(); if (cell && matchesAny(cell, itemKeywords)) return c; } return -1; })();

        if (descColIndex === itemCI && itemCI >= 0) {
          let betterDesc = -1;
          for (let c = 0; c < hRow.length; c++) {
            if (c === itemCI) continue;
            const cell = String(hRow[c] ?? "").trim();
            if (cell && matchesAny(cell, descKeywords)) { betterDesc = c; break; }
          }
          if (betterDesc >= 0) descColIndex = betterDesc;
          else {
            for (let c = itemCI + 1; c < hRow.length; c++) {
              const cell = String(hRow[c] ?? "").trim();
              if (cell && !matchesAny(cell, unitKeywords) && !matchesAny(cell, qtyKeywords) && !matchesAny(cell, upKeywords) && !matchesAny(cell, totalKeywords)) {
                descColIndex = c; break;
              }
            }
          }
        }

        const sampleSize = Math.min(10, rawData.length - headerRowIndex - 1);
        let numericCount = 0;
        for (let s = 1; s <= sampleSize; s++) {
          const sr = rawData[headerRowIndex + s];
          if (!sr) continue;
          const val = String(sr[descColIndex] ?? "").trim();
          if (val && !isNaN(Number(val))) numericCount++;
        }
        if (numericCount >= sampleSize * 0.6 && sampleSize > 0) {
          console.log(`[PARSER] descCol ${descColIndex} has mostly numeric data (${numericCount}/${sampleSize}), searching for text column`);
          let bestCol = -1;
          let bestTextCount = 0;
          for (let c = 0; c < hRow.length; c++) {
            if (c === descColIndex) continue;
            const unitCI = (() => { for (let cc = 0; cc < hRow.length; cc++) { const cell = String(hRow[cc] ?? "").trim(); if (cell && matchesAny(cell, unitKeywords)) return cc; } return -1; })();
            const qtyCI = (() => { for (let cc = 0; cc < hRow.length; cc++) { const cell = String(hRow[cc] ?? "").trim(); if (cell && matchesAny(cell, qtyKeywords)) return cc; } return -1; })();
            const upCI2 = (() => { for (let cc = 0; cc < hRow.length; cc++) { const cell = String(hRow[cc] ?? "").trim(); if (cell && matchesAny(cell, upKeywords)) return cc; } return -1; })();
            const totalCI = (() => { for (let cc = 0; cc < hRow.length; cc++) { const cell = String(hRow[cc] ?? "").trim(); if (cell && matchesAny(cell, totalKeywords)) return cc; } return -1; })();
            if (c === unitCI || c === qtyCI || c === upCI2 || c === totalCI) continue;
            let textCount = 0;
            for (let s = 1; s <= sampleSize; s++) {
              const sr = rawData[headerRowIndex + s];
              if (!sr) continue;
              const val = String(sr[c] ?? "").trim();
              if (val && val.length > 3 && isNaN(Number(val))) textCount++;
            }
            if (textCount > bestTextCount) { bestTextCount = textCount; bestCol = c; }
          }
          if (bestCol >= 0 && bestTextCount > numericCount * 0.5) {
            console.log(`[PARSER] Switching descCol from ${descColIndex} to ${bestCol} (textCount=${bestTextCount})`);
            descColIndex = bestCol;
          }
        }

        const headerCells = hRow.map((c: any, i: number) => { const v = String(c ?? "").trim(); return v ? `[${i}]${v}` : null; }).filter(Boolean);
        console.log(`[PARSER] Sheet: "${chosenSheetName}" | Header row: ${headerRowIndex} | descCol: ${descColIndex}`);
        console.log(`[PARSER] Header: ${headerCells.join(" | ")}`);
        const sampleRow = rawData[headerRowIndex + 2];
        if (sampleRow) {
          const sampleCells = sampleRow.map((c: any, i: number) => { const v = String(c ?? "").trim(); return v ? `[${i}]${v}` : null; }).filter(Boolean);
          console.log(`[PARSER] Sample data row ${headerRowIndex + 2}: ${sampleCells.join(" | ")}`);
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

      let itemsCount = 0;
      let skippedRows = 0;
      const bulkItems: any[] = [];

      for (let r = headerRowIndex + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row)) continue;

        let description = String(row[descColIndex] ?? "").trim();
        const descIsNumeric = description && !isNaN(Number(description));
        if (!description || descIsNumeric) {
          for (let c = 0; c < row.length; c++) {
            if (c === descColIndex) continue;
            if (c === unitColIndex || c === qtyColIndex || c === upColIndex || c === totalColIndex || c === itemColIndex) continue;
            const alt = String(row[c] ?? "").trim();
            if (alt && alt.length > 3 && isNaN(Number(alt))) {
              description = alt;
              break;
            }
          }
        }
        if (!description || (!isNaN(Number(description)) && description.length < 4)) continue;

        const unit = unitColIndex >= 0 ? String(row[unitColIndex] ?? "").trim() : "";

        const hasUnit = unit && unit.length > 0 && unit.length < 15;
        const rawQtySec = qtyColIndex >= 0 ? row[qtyColIndex] : null;
        const qSec = toNumeric(rawQtySec);
        const rawUpSec = upColIndex >= 0 ? row[upColIndex] : null;
        const upSec = toNumeric(rawUpSec);
        const hasNoNumbers = (isNaN(qSec) || qSec <= 0) && (isNaN(upSec) || upSec <= 0);
        const looksLikeSectionTitle = !hasUnit && hasNoNumbers;
        if (looksLikeSectionTitle) {
          skippedRows++;
          continue;
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
          sortOrder: bulkItems.length + 1,
          status: "pending"
        });
        itemsCount++;
      }

      const numericDescCount = bulkItems.filter((item: any) => !isNaN(Number(item.description))).length;
      if (numericDescCount > bulkItems.length * 0.5 && bulkItems.length > 0) {
        console.log(`[PARSER] WARNING: ${numericDescCount}/${bulkItems.length} items have numeric descriptions. Attempting recovery...`);
        const knownCols = new Set([descColIndex, unitColIndex, qtyColIndex, upColIndex, totalColIndex, itemColIndex]);
        let textCol = -1;
        const headerRow2 = rawData[headerRowIndex];
        for (let c = 0; c < headerRow2.length; c++) {
          if (knownCols.has(c)) continue;
          let txtCount = 0;
          const check = Math.min(10, rawData.length - headerRowIndex - 1);
          for (let s = 1; s <= check; s++) {
            const sr = rawData[headerRowIndex + s];
            if (!sr) continue;
            const v = String(sr[c] ?? "").trim();
            if (v && v.length > 3 && isNaN(Number(v))) txtCount++;
          }
          if (txtCount > check * 0.3) { textCol = c; break; }
        }
        if (textCol < 0) {
          for (let c = 0; c < headerRow2.length; c++) {
            if (c === descColIndex) continue;
            let txtCount = 0;
            const check = Math.min(10, rawData.length - headerRowIndex - 1);
            for (let s = 1; s <= check; s++) {
              const sr = rawData[headerRowIndex + s];
              if (!sr) continue;
              const v = String(sr[c] ?? "").trim();
              if (v && v.length > 3 && isNaN(Number(v))) txtCount++;
            }
            if (txtCount > check * 0.3) { textCol = c; break; }
          }
        }
        if (textCol >= 0) {
          console.log(`[PARSER] Found text column at index ${textCol}, re-extracting descriptions`);
          let dataRowIdx = 0;
          for (let r = headerRowIndex + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || !Array.isArray(row)) continue;
            const origDesc = String(row[descColIndex] ?? "").trim();
            const unit2 = unitColIndex >= 0 ? String(row[unitColIndex] ?? "").trim() : "";
            const hasUnit2 = unit2 && unit2.length > 0 && unit2.length < 15;
            const q2 = toNumeric(qtyColIndex >= 0 ? row[qtyColIndex] : null);
            const u2 = toNumeric(upColIndex >= 0 ? row[upColIndex] : null);
            const noNums2 = (isNaN(q2) || q2 <= 0) && (isNaN(u2) || u2 <= 0);
            if ((!origDesc && !String(row[textCol] ?? "").trim()) || (!hasUnit2 && noNums2)) continue;
            if (dataRowIdx < bulkItems.length) {
              const newDesc = String(row[textCol] ?? "").trim();
              if (newDesc && newDesc.length > 1 && isNaN(Number(newDesc))) {
                bulkItems[dataRowIdx].description = newDesc;
              }
            }
            dataRowIdx++;
          }
          console.log(`[PARSER] Re-extracted ${dataRowIdx} descriptions from col ${textCol}`);
        }
      }

      if (bulkItems.length > 0) {
        bulkItems.forEach((item: any) => {
          if (!isNaN(Number(item.description)) && item.description.length < 6) {
            item.description = `Partida ${item.description}`;
          }
        });
        await storage.createBudgetItemsBulk(bulkItems);
      }

      if (itemsCount === 0) {
        return res.status(400).json({
          message: `Encabezado en fila ${headerRowIndex + 1} de hoja "${chosenSheetName}", pero no se encontraron filas con datos válidos debajo.`
        });
      }

      const sampleDescs = bulkItems.slice(0, 3).map((item: any) => item.description);
      console.log(`[PARSER] Columns: desc=${descColIndex} item=${itemColIndex} unit=${unitColIndex} qty=${qtyColIndex} up=${upColIndex}`);
      console.log(`[PARSER] Inserted ${itemsCount} items. Samples:`, sampleDescs);

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
    const userId = getUserId(req);
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    if (!project || project.ownerId !== userId) return res.status(404).json({ message: "Project not found" });

    const items = await storage.getBudgetItems(projectId);
    const allMaterials = await storage.getMaterials();
    const companySettings = await storage.getCompanySettings();

    const projectGG = Number(project.gastosGeneralesPercent || 0);
    const projectUtil = Number(project.utilidadPercent || 0);
    const settingsGG = Number(companySettings?.defaultGGPercent || 0);
    const settingsUtil = Number(companySettings?.defaultUtilidadPercent || 0);

    const ggPercent = projectGG > 0 ? projectGG : settingsGG;
    const utilPercent = projectUtil > 0 ? projectUtil : settingsUtil;
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
    const userId = getUserId(req);
    const projectId = Number(req.params.id);
    const project = await storage.getProject(projectId);
    if (!project || project.ownerId !== userId) return res.status(404).json({ message: "Proyecto no encontrado" });

    const items = await storage.getBudgetItems(projectId);
    if (items.length === 0) {
      return res.json({ message: "No hay ítems para sincronizar.", matchedCount: 0, totalItems: 0, syncTimestamp: new Date().toISOString(), usedFallback: false });
    }

    let matchedCount = 0;
    let totalProjectedCost = 0;
    let totalBudget = 0;
    let usedFallback = false;
    let engineErrors = 0;

    for (const item of items) {
      let result: PriceSearchResult | null = null;
      try {
        result = searchPrice(item.description);
      } catch (err: any) {
        engineErrors++;
        console.error(`[SYNC-PRICES] Error searching price for item #${item.id} "${item.description}": ${err.message}`);
      }

      if (result && result.bestPrice > 0 && result.sodimac && result.easy) {
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
        const hasSavedPrices = item.marketPrice && Number(item.marketPrice) > 0;
        if (hasSavedPrices) {
          usedFallback = true;
          const qty = Number(item.quantity || 0);
          const savedPrice = Number(item.marketPrice);
          totalProjectedCost += qty * savedPrice;
          totalBudget += qty * savedPrice;
          console.warn(`[SYNC-PRICES] Fallback to saved price for item #${item.id}: $${savedPrice}`);
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
    }

    if (engineErrors > 0) {
      console.error(`[SYNC-PRICES] Completed with ${engineErrors} engine errors out of ${items.length} items. Fallback used: ${usedFallback}`);
    }

    const syncDate = new Date();
    const syncTimestamp = syncDate.toISOString();
    await storage.updateProject(projectId, {
      totalBudget: totalBudget.toString(),
      totalCost: totalProjectedCost.toString(),
      lastPriceSync: syncDate as any,
      status: "processing",
    });

    const fallbackMsg = usedFallback ? " (algunos ítems usan precios guardados anteriormente)" : "";
    const errorMsg = engineErrors > 0 ? ` — ${engineErrors} errores en motor de precios` : "";

    res.json({
      message: `Sincronización completada: ${matchedCount} de ${items.length} ítems encontrados en Sodimac y Easy.${fallbackMsg}${errorMsg}`,
      matchedCount,
      totalItems: items.length,
      syncTimestamp,
      usedFallback,
      engineErrors,
    });
  });

  app.post(api.projects.analyze.path, isAuthenticated, requireSameOrigin, async (req, res) => {
    const userId = getUserId(req);
    const projectId = Number(req.params.id);
    const projectCheck = await storage.getProject(projectId);
    if (!projectCheck || projectCheck.ownerId !== userId) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
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
        const userId = getUserId(req);
        const allProjects = await storage.getProjects(userId);
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
    const { companyName, rut, address, contact, email, phone, defaultGGPercent, defaultUtilidadPercent } = req.body;
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (rut !== undefined) updates.rut = rut;
    if (address !== undefined) updates.address = address;
    if (contact !== undefined) updates.contact = contact;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (defaultGGPercent !== undefined) {
      const ggVal = parseFloat(defaultGGPercent);
      if (!isNaN(ggVal) && ggVal >= 0 && ggVal <= 100) updates.defaultGGPercent = ggVal.toString();
    }
    if (defaultUtilidadPercent !== undefined) {
      const utilVal = parseFloat(defaultUtilidadPercent);
      if (!isNaN(utilVal) && utilVal >= 0 && utilVal <= 100) updates.defaultUtilidadPercent = utilVal.toString();
    }
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
      const userId = getUserId(_req);
      const rawTasa = Number(_req.query.tasa);
      const rawPlazo = Number(_req.query.plazo);
      const rawCuotas = Number(_req.query.cuotas_pagadas);
      const tasaMensual = isNaN(rawTasa) || rawTasa < 0 || rawTasa > 10 ? 1.5 : rawTasa;
      const plazoMeses = isNaN(rawPlazo) || rawPlazo < 1 || rawPlazo > 60 ? 12 : Math.round(rawPlazo);
      const cuotasPagadas = isNaN(rawCuotas) || rawCuotas < 0 ? 0 : Math.min(Math.round(rawCuotas), plazoMeses);
      const allProjects = await storage.getProjects(userId);
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
      const userId = getUserId(req);
      const parsed = burnTokensSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Datos inválidos" });
      const { projectId, cuotasPagadas, tasaMensual, plazoMeses } = parsed.data;

      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) return res.status(404).json({ error: "Proyecto no encontrado" });

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
      const userId = getUserId(req);
      const projectId = parseInt(req.params.projectId as string);
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }
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

  registerAssistantRoutes(app);

  app.get("/api/admin/check", isAuthenticated, (req, res) => {
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);
    const adminId = process.env.ADMIN_USER_ID;
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdminById = adminId && userId === adminId;
    const isAdminByEmail = adminEmail && userEmail && adminEmail.toLowerCase() === userEmail.toLowerCase();
    res.json({ isAdmin: !!(isAdminById || isAdminByEmail) });
  });

  // Admin Panel endpoints (protected - super admin only)
  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithStats = await Promise.all(
        allUsers.map(async (u) => {
          const projectCount = await storage.getUserProjectCount(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            profileImageUrl: u.profileImageUrl,
            createdAt: u.createdAt,
            projectCount,
            plan: "Gratis",
          };
        })
      );
      res.json(usersWithStats);
    } catch (err) {
      console.error("Error fetching admin users:", err);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  app.get("/api/admin/transactions", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const transactions = await storage.getAdminTransactions();
      res.json(transactions);
    } catch (err) {
      console.error("Error fetching admin transactions:", err);
      res.status(500).json({ error: "Error al obtener transacciones" });
    }
  });

  app.post("/api/admin/transactions", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = insertAdminTransactionSchema.parse({
        empresa: req.body.empresa,
        montoTotal: String(req.body.montoTotal || ""),
        pagoRetail: String(req.body.pagoRetail || ""),
        comisionBitcopper: String(req.body.comisionBitcopper || ""),
        estado: req.body.estado || "Pendiente",
      });
      const transaction = await storage.createAdminTransaction(parsed);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("Error creating transaction:", err);
      res.status(500).json({ error: "Error al crear transacción" });
    }
  });

  app.patch("/api/admin/transactions/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body;
      if (!["Pendiente", "Pagado"].includes(estado)) {
        return res.status(400).json({ error: "Estado debe ser 'Pendiente' o 'Pagado'" });
      }
      const updated = await storage.updateAdminTransactionStatus(id, estado);
      if (!updated) {
        return res.status(404).json({ error: "Transacción no encontrada" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating transaction status:", err);
      res.status(500).json({ error: "Error al actualizar estado" });
    }
  });

  app.get("/api/admin/registrations", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      const demoReqs = await storage.getDemoRequests();
      res.json({ customers, demoRequests: demoReqs });
    } catch (err) {
      console.error("Error fetching registrations:", err);
      res.status(500).json({ error: "Error al obtener registros" });
    }
  });

  // --- Distributor / Referral System ---

  function generatePartnerCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "PARTNER-";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  app.get("/api/admin/distributors", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const allDistributors = await storage.getDistributors();
      const withStats = await Promise.all(
        allDistributors.map(async (d) => {
          const referralCount = await storage.getReferralCountByCode(d.code);
          return { ...d, referralCount };
        })
      );
      res.json(withStats);
    } catch (err) {
      console.error("Error fetching distributors:", err);
      res.status(500).json({ error: "Error al obtener distribuidores" });
    }
  });

  app.post("/api/admin/distributors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { companyName, contactName, email, phone, userId } = req.body;
      if (!companyName || !contactName) {
        return res.status(400).json({ error: "Nombre de empresa y contacto son requeridos" });
      }
      let code = generatePartnerCode();
      let existing = await storage.getDistributorByCode(code);
      while (existing) {
        code = generatePartnerCode();
        existing = await storage.getDistributorByCode(code);
      }
      const distributor = await storage.createDistributor({
        code,
        companyName,
        contactName,
        email: email || null,
        phone: phone || null,
        userId: userId || null,
        isActive: true,
      });
      res.status(201).json(distributor);
    } catch (err) {
      console.error("Error creating distributor:", err);
      res.status(500).json({ error: "Error al crear distribuidor" });
    }
  });

  app.patch("/api/admin/distributors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      const updated = await storage.updateDistributor(id, updates);
      if (!updated) return res.status(404).json({ error: "Distribuidor no encontrado" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating distributor:", err);
      res.status(500).json({ error: "Error al actualizar distribuidor" });
    }
  });

  app.get("/api/referral/validate/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase();
      const distributor = await storage.getDistributorByCode(code);
      if (!distributor || !distributor.isActive) {
        return res.json({ valid: false });
      }
      res.json({ valid: true, companyName: distributor.companyName });
    } catch (err) {
      res.json({ valid: false });
    }
  });

  app.post("/api/referral/apply", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Código requerido" });

      const existingCode = await storage.getUserReferralCode(userId);
      if (existingCode) {
        return res.status(400).json({ error: "Ya tienes un código de referido aplicado" });
      }

      const distributor = await storage.getDistributorByCode(code);
      if (!distributor || !distributor.isActive) {
        return res.status(400).json({ error: "Código de referido inválido" });
      }

      if (distributor.userId === userId) {
        return res.status(400).json({ error: "No puedes usar tu propio código de referido" });
      }

      await storage.applyReferralCode(userId, code);
      res.json({ success: true, companyName: distributor.companyName });
    } catch (err) {
      console.error("Error applying referral:", err);
      res.status(500).json({ error: "Error al aplicar código" });
    }
  });

  app.get("/api/referral/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const code = await storage.getUserReferralCode(userId);
      res.json({ hasReferral: !!code, code });
    } catch (err) {
      res.json({ hasReferral: false, code: null });
    }
  });

  app.get("/api/distributor/dashboard", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const distributor = await storage.getDistributorByUserId(userId);
      if (!distributor) {
        return res.status(403).json({ error: "No eres distribuidor", isDistributor: false });
      }
      const referralCount = await storage.getReferralCountByCode(distributor.code);
      res.json({
        isDistributor: true,
        code: distributor.code,
        companyName: distributor.companyName,
        contactName: distributor.contactName,
        referralCount,
        isActive: distributor.isActive,
        createdAt: distributor.createdAt,
      });
    } catch (err) {
      console.error("Error fetching distributor dashboard:", err);
      res.status(500).json({ error: "Error al obtener dashboard" });
    }
  });

  app.get("/api/distributor/check", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const distributor = await storage.getDistributorByUserId(userId);
      res.json({ isDistributor: !!distributor });
    } catch (err) {
      res.json({ isDistributor: false });
    }
  });

  // === MAESTRO PROFILE ROUTES ===

  app.get("/api/maestro/me", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json({ isMaestro: false, maestro: null });
      const level = getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0);
      res.json({ isMaestro: true, maestro: { ...maestro, level } });
    } catch (err) {
      res.status(500).json({ error: "Error al obtener perfil de maestro" });
    }
  });

  app.post("/api/maestro/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { displayName, specialty, bio, phone, city } = req.body;
      if (!displayName) return res.status(400).json({ error: "Nombre es requerido" });

      const existing = await storage.getMaestroByUserId(userId);
      if (existing) {
        const updated = await storage.updateMaestro(existing.id, { displayName, specialty, bio, phone, city });
        const level = getMaestroLevel(Number(updated.avgRating), updated.ratingCount ?? 0);
        return res.json({ ...updated, level });
      }

      const maestro = await storage.createMaestro({ userId, displayName, specialty, bio, phone, city });
      const level = getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0);
      res.status(201).json({ ...maestro, level });
    } catch (err) {
      res.status(500).json({ error: "Error al guardar perfil" });
    }
  });

  app.get("/api/maestro/check", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      res.json({ isMaestro: !!maestro });
    } catch {
      res.json({ isMaestro: false });
    }
  });

  // Public maestro profile
  app.get("/api/maestro/public/:id", async (req, res) => {
    try {
      const maestro = await storage.getMaestroById(parseInt(req.params.id));
      if (!maestro || !maestro.isPublic) return res.status(404).json({ error: "Maestro no encontrado" });
      const level = getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0);
      const docStatus = getDocumentStatusLabel(maestro);
      const reviews = await storage.getReviewsByMaestro(maestro.id);
      res.json({
        id: maestro.id,
        displayName: maestro.displayName,
        specialty: maestro.specialty,
        city: maestro.city,
        avgRating: maestro.avgRating,
        ratingCount: maestro.ratingCount,
        creditScore: maestro.creditScore,
        hasActiveBadge: maestro.hasActiveBadge,
        kycVerified: maestro.kycVerified,
        documentStatus: docStatus,
        level,
        reviews: reviews.map(r => ({ stars: r.stars, comment: r.comment, clientName: r.clientName, createdAt: r.createdAt })),
      });
    } catch {
      res.status(500).json({ error: "Error al obtener perfil" });
    }
  });

  // List maestros (for distributors/ferreterías)
  app.get("/api/maestros", isAuthenticated, async (req, res) => {
    try {
      const maestrosList = await storage.getMaestros();
      const result = maestrosList.map(m => ({
        ...m,
        level: getMaestroLevel(Number(m.avgRating), m.ratingCount ?? 0),
      }));
      res.json(result);
    } catch {
      res.status(500).json({ error: "Error al listar maestros" });
    }
  });

  // === WORK COMPLETION / QR ROUTES ===

  app.post("/api/maestro/work-completions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro primero" });

      const { projectDescription, clientName } = req.body;
      if (!projectDescription) return res.status(400).json({ error: "Descripción del trabajo es requerida" });

      const token = nanoid(20);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const wc = await storage.createWorkCompletion({
        maestroId: maestro.id,
        projectDescription,
        clientName: clientName || null,
        token,
        expiresAt,
      });

      res.status(201).json(wc);
    } catch (err) {
      res.status(500).json({ error: "Error al crear finalización de obra" });
    }
  });

  app.get("/api/maestro/work-completions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json([]);
      const completions = await storage.getWorkCompletionsByMaestro(maestro.id);
      res.json(completions);
    } catch {
      res.status(500).json({ error: "Error al obtener finalizaciones" });
    }
  });

  // === PUBLIC REVIEW ROUTES (no auth required) ===

  app.get("/api/review/:token", async (req, res) => {
    try {
      const wc = await storage.getWorkCompletionByToken(req.params.token);
      if (!wc) return res.status(404).json({ error: "Enlace inválido o expirado" });
      if (wc.status === "used") return res.status(400).json({ error: "Este enlace ya fue utilizado", used: true });
      if (new Date() > new Date(wc.expiresAt)) return res.status(400).json({ error: "Este enlace ha expirado", expired: true });

      const maestro = await storage.getMaestroById(wc.maestroId);
      const docStatus = maestro ? getDocumentStatusLabel(maestro) : [];
      res.json({
        projectDescription: wc.projectDescription,
        maestroName: maestro?.displayName || "Maestro",
        maestroSpecialty: maestro?.specialty || null,
        kycVerified: maestro?.kycVerified ?? false,
        documentStatus: docStatus,
        hasActiveBadge: maestro?.hasActiveBadge ?? false,
      });
    } catch {
      res.status(500).json({ error: "Error al validar enlace" });
    }
  });

  app.post("/api/review/:token", async (req, res) => {
    try {
      const wc = await storage.getWorkCompletionByToken(req.params.token);
      if (!wc) return res.status(404).json({ error: "Enlace inválido" });
      if (wc.status === "used") return res.status(400).json({ error: "Ya se envió una calificación para este trabajo" });
      if (new Date() > new Date(wc.expiresAt)) return res.status(400).json({ error: "Este enlace ha expirado" });

      const parsed = submitReviewWithLeadSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });

      const { stars, comment, clientName, clientPhone, clientEmail, referralCode } = parsed.data;

      const review = await storage.createReview({
        workCompletionId: wc.id,
        maestroId: wc.maestroId,
        stars,
        comment: comment || null,
        clientName: clientName || wc.clientName || null,
      });

      await storage.updateWorkCompletionStatus(wc.id, "used");
      await storage.updateMaestroRatingStats(wc.maestroId);

      const CREDIT_REWARD = 10;
      if (stars >= 4) {
        await storage.incrementMaestroCreditScore(wc.maestroId, CREDIT_REWARD);
      }

      let existingLead = await storage.getClientLeadByEmail(clientEmail);
      let clientLead;
      if (existingLead) {
        clientLead = existingLead;
      } else {
        clientLead = await storage.createClientLead({
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          maestroId: wc.maestroId,
          sourceToken: req.params.token,
          referralCode: referralCode || null,
        });
      }

      let couponCode = "";
      if (!existingLead) {
        couponCode = generateCouponCode();
        let existingCoupon = await storage.getCouponByCode(couponCode);
        while (existingCoupon) {
          couponCode = generateCouponCode();
          existingCoupon = await storage.getCouponByCode(couponCode);
        }
        await storage.createCoupon({
          code: couponCode,
          clientLeadId: clientLead.id,
          discountPercent: 10,
          status: "active",
        });

        console.log(`[WELCOME EMAIL] To: ${clientEmail}, Name: ${clientName}, Coupon: ${couponCode} (10% descuento)`);
      }

      if (referralCode && !existingLead) {
        const referrerId = parseInt(referralCode, 10);
        if (!isNaN(referrerId)) {
          const referrer = await storage.getClientLeadById(referrerId);
          if (referrer && referrer.id !== clientLead.id) {
            const REFERRAL_CREDIT = 500;
            await storage.createClientCredit({
              clientLeadId: referrer.id,
              amount: REFERRAL_CREDIT,
              reason: `Referido: ${clientName} se registró`,
            });
            await storage.createClientCredit({
              clientLeadId: clientLead.id,
              amount: REFERRAL_CREDIT,
              reason: "Bono de bienvenida por invitación",
            });
          }
        }
      }

      const maestro = await storage.getMaestroById(wc.maestroId);
      const maestroLevel = maestro ? getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0) : "Novato";

      res.json({
        success: true,
        couponCode: couponCode || undefined,
        clientLeadId: clientLead.id,
        maestroName: maestro?.displayName || "Maestro",
        maestroLevel,
        maestroRating: maestro?.avgRating || "0",
        maestroRatingCount: maestro?.ratingCount || 0,
        maestroSpecialty: maestro?.specialty || null,
        maestroId: wc.maestroId,
        message: couponCode
          ? `¡Gracias ${clientName}! Tu cupón de 10% descuento es: ${couponCode}. Te hemos registrado como cliente.`
          : stars >= 4
            ? "¡Gracias por tu calificación! El maestro ha recibido puntos de reputación."
            : "Gracias por tu calificación. Tu opinión ayuda a mejorar el servicio.",
      });
    } catch (err) {
      console.error("Error submitting review:", err);
      res.status(500).json({ error: "Error al enviar calificación" });
    }
  });

  // === CREW MANAGEMENT ROUTES ===

  const express = await import("express");
  app.use("/uploads", express.default.static(path.join(process.cwd(), "uploads")));

  app.get("/api/maestro/crew", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json([]);
      const crew = await storage.getCrewMembers(maestro.id);
      res.json(crew);
    } catch {
      res.status(500).json({ error: "Error al obtener cuadrilla" });
    }
  });

  app.post("/api/maestro/crew", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro" });
      const { name, role, phone } = req.body;
      if (!name) return res.status(400).json({ error: "Nombre es requerido" });
      const member = await storage.createCrewMember({ maestroId: maestro.id, name, role: role || "Ayudante", phone: phone || null });
      res.status(201).json(member);
    } catch {
      res.status(500).json({ error: "Error al agregar trabajador" });
    }
  });

  app.patch("/api/maestro/crew/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "No autorizado" });
      const updated = await storage.updateCrewMember(Number(req.params.id), req.body);
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Error al actualizar trabajador" });
    }
  });

  app.delete("/api/maestro/crew/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "No autorizado" });
      await storage.deleteCrewMember(Number(req.params.id));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Error al eliminar trabajador" });
    }
  });

  // === ATTENDANCE ROUTES ===

  app.get("/api/maestro/attendance", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json([]);
      const date = req.query.date as string || new Date().toISOString().split("T")[0];
      const records = await storage.getAttendanceByDate(maestro.id, date);
      res.json(records);
    } catch {
      res.status(500).json({ error: "Error al obtener asistencia" });
    }
  });

  app.get("/api/maestro/attendance/summary", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json([]);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      if (!startDate || !endDate) return res.status(400).json({ error: "Fechas requeridas" });
      const records = await storage.getAttendanceByDateRange(maestro.id, startDate, endDate);
      res.json(records);
    } catch {
      res.status(500).json({ error: "Error al obtener resumen" });
    }
  });

  app.post("/api/maestro/attendance", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro" });
      const { records, date } = req.body;
      if (!records || !Array.isArray(records)) return res.status(400).json({ error: "Datos inválidos" });
      const dateStr = date || new Date().toISOString().split("T")[0];
      const results = [];
      for (const r of records) {
        const result = await storage.upsertAttendance(maestro.id, r.crewMemberId, dateStr, r.present);
        results.push(result);
      }
      await storage.recalcMaestroStreak(maestro.id);
      res.json(results);
    } catch {
      res.status(500).json({ error: "Error al registrar asistencia" });
    }
  });

  // === DAILY LOG (BITÁCORA) ROUTES ===

  const photoUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".jpg";
        cb(null, `${nanoid(12)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Solo se permiten imágenes"));
    },
  });

  app.get("/api/maestro/daily-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.json([]);
      const startDate = req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = req.query.endDate as string || new Date().toISOString().split("T")[0];
      const logs = await storage.getDailyLogsByRange(maestro.id, startDate, endDate);
      res.json(logs);
    } catch {
      res.status(500).json({ error: "Error al obtener bitácora" });
    }
  });

  app.post("/api/maestro/daily-log", isAuthenticated, photoUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "photo2", maxCount: 1 },
  ]), async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro" });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.photo || files.photo.length === 0) {
        return res.status(400).json({ error: "Se requiere al menos una foto" });
      }

      const dateStr = req.body.date || new Date().toISOString().split("T")[0];
      const existingLog = await storage.getDailyLog(maestro.id, dateStr);
      if (existingLog) {
        return res.status(400).json({ error: "Ya subiste un avance para hoy. Solo se permite uno por día." });
      }

      const photoUrl = `/uploads/${files.photo[0].filename}`;
      const photoUrl2 = files.photo2 && files.photo2.length > 0 ? `/uploads/${files.photo2[0].filename}` : null;
      const note = req.body.note || null;

      const log = await storage.createDailyLog({
        maestroId: maestro.id,
        date: dateStr,
        photoUrl,
        photoUrl2,
        note,
      });

      const updatedMaestro = await storage.recalcMaestroStreak(maestro.id);
      res.status(201).json({ log, maestro: updatedMaestro });
    } catch (err) {
      res.status(500).json({ error: "Error al subir avance" });
    }
  });

  // === MAESTRO GAMIFICATION STATUS ===

  app.get("/api/maestro/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(404).json({ error: "No registrado como Maestro" });
      const level = getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0);
      res.json({
        activeStreak: maestro.activeStreak ?? 0,
        hasActiveBadge: maestro.hasActiveBadge ?? false,
        trustLevel: maestro.trustLevel ?? 0,
        lastActiveDate: maestro.lastActiveDate,
        level,
      });
    } catch {
      res.status(500).json({ error: "Error al obtener estado" });
    }
  });

  // === KYC / Document Verification Routes ===

  const docUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), "uploads", "kyc");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `doc-${Date.now()}-${nanoid(6)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  app.post("/api/maestro/kyc", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro primero" });

      const parsed = kycUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });

      const updates = parsed.data;
      const updated = await storage.updateMaestroKyc(maestro.id, updates);
      const level = getMaestroLevel(Number(updated.avgRating), updated.ratingCount ?? 0);
      res.json({ ...updated, level });
    } catch (err) {
      res.status(500).json({ error: "Error al actualizar documentos" });
    }
  });

  app.post("/api/maestro/kyc/photo", isAuthenticated, docUpload.single("docPhoto"), async (req, res) => {
    try {
      const userId = getUserId(req);
      const maestro = await storage.getMaestroByUserId(userId);
      if (!maestro) return res.status(403).json({ error: "Debes registrarte como Maestro primero" });

      const file = req.file;
      if (!file) return res.status(400).json({ error: "Debes subir una foto del documento" });

      const docPhotoUrl = `/uploads/kyc/${file.filename}`;
      const updated = await storage.updateMaestroKyc(maestro.id, { docPhotoUrl, kycVerified: true });
      const level = getMaestroLevel(Number(updated.avgRating), updated.ratingCount ?? 0);
      res.json({ ...updated, level });
    } catch (err) {
      res.status(500).json({ error: "Error al subir foto del documento" });
    }
  });

  app.get("/api/maestro/search", async (req, res) => {
    try {
      const { documento, rut } = req.query;
      let maestro = null;
      if (documento && typeof documento === "string") {
        maestro = await storage.getMaestroByDocument(documento);
      } else if (rut && typeof rut === "string") {
        maestro = await storage.getMaestroByRut(rut);
      }
      if (!maestro) return res.status(404).json({ error: "No se encontró un maestro con ese documento" });

      const level = getMaestroLevel(Number(maestro.avgRating), maestro.ratingCount ?? 0);
      const docStatus = getDocumentStatusLabel(maestro);
      res.json({
        id: maestro.id,
        displayName: maestro.displayName,
        specialty: maestro.specialty,
        city: maestro.city,
        avgRating: maestro.avgRating,
        ratingCount: maestro.ratingCount,
        creditScore: maestro.creditScore,
        hasActiveBadge: maestro.hasActiveBadge,
        level,
        kycVerified: maestro.kycVerified,
        documentStatus: docStatus,
      });
    } catch {
      res.status(500).json({ error: "Error al buscar maestro" });
    }
  });

  // === MARKETPLACE ROUTES (public) ===

  app.get("/api/marketplace/catalog", async (_req, res) => {
    try {
      const catalog = getMarketplaceCatalog();
      res.json(catalog);
    } catch {
      res.status(500).json({ error: "Error al obtener catálogo" });
    }
  });

  app.get("/api/marketplace/maestros", async (req, res) => {
    try {
      const city = req.query.city as string | undefined;
      const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
      const maestrosList = await storage.getMaestrosByFilters(city, minRating);
      const result = maestrosList.map(m => ({
        id: m.id,
        displayName: m.displayName,
        specialty: m.specialty,
        city: m.city,
        avgRating: m.avgRating,
        ratingCount: m.ratingCount,
        kycVerified: m.kycVerified,
        hasActiveBadge: m.hasActiveBadge,
        level: getMaestroLevel(Number(m.avgRating), m.ratingCount ?? 0),
      }));
      res.json(result);
    } catch {
      res.status(500).json({ error: "Error al buscar maestros" });
    }
  });

  app.get("/api/fama/maestros", isAuthenticated, async (req, res) => {
    try {
      const city = (req.query.city as string) || undefined;
      const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
      const specialty = (req.query.specialty as string) || undefined;
      const maestrosList = await storage.getMaestrosByFilters(city, minRating, specialty);
      const result = await Promise.all(maestrosList.map(async m => {
        const obrasCount = await storage.getCompletedObrasCountByMaestro(m.id);
        return {
          id: m.id,
          displayName: m.displayName,
          specialty: m.specialty,
          city: m.city,
          avgRating: m.avgRating,
          ratingCount: m.ratingCount,
          kycVerified: m.kycVerified,
          hasActiveBadge: m.hasActiveBadge,
          trustLevel: m.trustLevel,
          obrasProtegidas: obrasCount,
          level: getMaestroLevel(Number(m.avgRating), m.ratingCount ?? 0),
        };
      }));
      res.json(result);
    } catch {
      res.status(500).json({ error: "Error al cargar Muro de la Fama" });
    }
  });

  app.post("/api/marketplace/request", async (req, res) => {
    try {
      const { clientName, clientPhone, clientEmail, requestType, items, maestroId, referringMaestroId, notes, referralCode } = req.body;
      if (!clientName || !clientPhone || !clientEmail || !requestType || !items) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      let clientLead = await storage.getClientLeadByEmail(clientEmail);
      if (!clientLead) {
        clientLead = await storage.createClientLead({
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          referralCode: referralCode || null,
        });
      }

      let totalEstimate = "0";
      if (Array.isArray(items)) {
        const total = items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
        totalEstimate = Math.round(total).toString();
      }

      const totalNum = Number(totalEstimate);
      const FERRETERIA_PERCENT = 85;
      const BITCOPPER_PERCENT = 12;
      const MAESTRO_CASHBACK_PERCENT = 3;

      const commissionFerreteria = Math.round(totalNum * FERRETERIA_PERCENT / 100).toString();
      const commissionBitcopper = Math.round(totalNum * BITCOPPER_PERCENT / 100).toString();
      const cashbackMaestro = Math.round(totalNum * MAESTRO_CASHBACK_PERCENT / 100).toString();

      const request = await storage.createMarketplaceRequest({
        clientLeadId: clientLead.id,
        clientName,
        clientPhone,
        clientEmail,
        requestType,
        items,
        maestroId: maestroId || null,
        referringMaestroId: referringMaestroId || null,
        status: "pending",
        totalEstimate,
        commissionFerreteria,
        commissionBitcopper,
        cashbackMaestro,
        notes: notes || null,
        referralCode: referralCode || null,
      });

      if (referringMaestroId) {
        const MAESTRO_REFERRAL_CREDIT = Math.round(totalNum * MAESTRO_CASHBACK_PERCENT / 100);
        if (MAESTRO_REFERRAL_CREDIT > 0) {
          await storage.incrementMaestroCreditScore(referringMaestroId, MAESTRO_REFERRAL_CREDIT);
        }
      }

      if (referralCode && clientLead) {
        const referrerId = parseInt(referralCode, 10);
        if (!isNaN(referrerId)) {
          const referrer = await storage.getClientLeadById(referrerId);
          if (referrer && referrer.id !== clientLead.id) {
            const REFERRAL_CREDIT = 5000;
            await storage.createClientCredit({
              clientLeadId: referrer.id,
              amount: REFERRAL_CREDIT,
              reason: `Referido: ${clientName} compró $${totalEstimate} en materiales`,
            });
            await storage.createClientCredit({
              clientLeadId: clientLead.id,
              amount: REFERRAL_CREDIT,
              reason: "Bono de bienvenida por invitación de vecino",
            });
          }
        }
      }

      res.status(201).json({
        success: true,
        requestId: request.id,
        splitDetails: {
          total: totalEstimate,
          ferreteria: commissionFerreteria,
          bitcopper: commissionBitcopper,
          cashbackMaestro,
        },
        message: requestType === "direct_purchase"
          ? "¡Solicitud de compra registrada! Te contactaremos pronto para coordinar la entrega."
          : "¡Solicitud de presupuesto enviada al Maestro! Te contactará pronto con un presupuesto personalizado.",
      });
    } catch (err) {
      console.error("Error creating marketplace request:", err);
      res.status(500).json({ error: "Error al procesar solicitud" });
    }
  });

  // === CLIENT / REFERRAL SYSTEM ROUTES ===

  app.get("/api/client/profile", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ error: "Email requerido" });

      const clientLead = await storage.getClientLeadByEmail(email);
      if (!clientLead) return res.status(404).json({ error: "Cliente no encontrado" });

      const credits = await storage.getClientCreditBalance(clientLead.id);
      const creditHistory = await storage.getClientCredits(clientLead.id);
      const couponsData = await storage.getCouponsByClientLead(clientLead.id);
      const requests = await storage.getMarketplaceRequestsByClient(clientLead.id);

      res.json({
        id: clientLead.id,
        name: clientLead.name,
        email: clientLead.email,
        phone: clientLead.phone,
        referralCode: clientLead.referralCode,
        creditBalance: credits,
        creditHistory,
        coupons: couponsData,
        requests,
        createdAt: clientLead.createdAt,
      });
    } catch {
      res.status(500).json({ error: "Error al obtener perfil de cliente" });
    }
  });

  app.get("/api/client/referral-link", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ error: "Email requerido" });

      const clientLead = await storage.getClientLeadByEmail(email);
      if (!clientLead) return res.status(404).json({ error: "Cliente no encontrado" });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const referralLink = `${baseUrl}/marketplace?ref=${clientLead.id}`;
      res.json({ referralLink, clientId: clientLead.id });
    } catch {
      res.status(500).json({ error: "Error al generar enlace" });
    }
  });

  app.get("/api/client/referral-stats", isAuthenticated, async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ error: "Email requerido" });

      const sessionEmail = (req.user as any)?.email || (req.user as any)?.username;
      if (sessionEmail && sessionEmail !== email) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const clientLead = await storage.getClientLeadByEmail(email);
      if (!clientLead) return res.status(404).json({ error: "Cliente no encontrado" });

      const referralCount = await storage.getClientReferralCount(clientLead.id);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const referralLink = `${baseUrl}/marketplace?ref=${clientLead.id}`;
      const referralCode = String(clientLead.id);

      res.json({ referralCount, referralLink, referralCode, clientId: clientLead.id });
    } catch {
      res.status(500).json({ error: "Error al obtener estadísticas de referidos" });
    }
  });

  // === ESCROW / PROJECT WALLET ROUTES ===

  app.post("/api/escrow/accept-budget", async (req, res) => {
    try {
      const parsed = acceptBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
      }

      const { clientLeadId, maestroId, description, totalAmount, materialsAmount, laborAmount, guaranteePercent, items, milestones, marketplaceRequestId } = parsed.data;

      const guaranteeAmount = Math.round(totalAmount * guaranteePercent / 100);
      const effectiveLaborAmount = laborAmount > 0 ? laborAmount : totalAmount - materialsAmount - guaranteeAmount;

      const wallet = await storage.createProjectWallet({
        marketplaceRequestId: marketplaceRequestId || null,
        clientLeadId,
        maestroId,
        description,
        totalAmount,
        materialsAmount,
        laborAmount: effectiveLaborAmount,
        guaranteeAmount,
        guaranteePercent,
      });

      await storage.createWalletTransaction({
        projectWalletId: wallet.id,
        type: TRANSACTION_TYPES.CLIENT_DEPOSIT,
        amount: totalAmount,
        fromAccount: "CLIENTE",
        toAccount: "ESCROW",
        description: `Depósito del cliente - ${description}`,
      });

      if (milestones && milestones.length > 0) {
        for (const m of milestones) {
          const releaseAmount = Math.round(effectiveLaborAmount * m.releasePercent / 100);
          await storage.createProjectMilestone({
            projectWalletId: wallet.id,
            name: m.name,
            description: m.description || null,
            releasePercent: m.releasePercent,
            releaseAmount,
          });
        }
      } else {
        const defaultMilestones = [
          { name: "Inicio de Obra", percent: 30 },
          { name: "Avance 50%", percent: 30 },
          { name: "Entrega Final", percent: 40 },
        ];
        for (const m of defaultMilestones) {
          await storage.createProjectMilestone({
            projectWalletId: wallet.id,
            name: m.name,
            description: null,
            releasePercent: m.percent,
            releaseAmount: Math.round(effectiveLaborAmount * m.percent / 100),
          });
        }
      }

      if (marketplaceRequestId) {
        await storage.updateMarketplaceRequestStatus(marketplaceRequestId, "accepted");
      }

      const createdMilestones = await storage.getProjectMilestones(wallet.id);

      res.status(201).json({
        success: true,
        wallet,
        milestones: createdMilestones,
        message: "Presupuesto aceptado. Fondos retenidos en garantía (Escrow).",
      });
    } catch (err) {
      console.error("Error creating escrow wallet:", err);
      res.status(500).json({ error: "Error al crear billetera de proyecto" });
    }
  });

  app.post("/api/escrow/:walletId/confirm-payment", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const wallet = await storage.getProjectWallet(walletId);
      if (!wallet) return res.status(404).json({ error: "Billetera no encontrada" });
      if (wallet.status !== ESCROW_STATUS.HELD_IN_ESCROW) {
        return res.status(400).json({ error: "El pago ya fue procesado" });
      }

      const maestro = await storage.getMaestroById(wallet.maestroId);
      const ferreteriaName = req.body.ferreteriaName || "Ferretería Aliada";
      const materialItems = req.body.items || [];

      await storage.createWalletTransaction({
        projectWalletId: wallet.id,
        type: TRANSACTION_TYPES.MATERIAL_ALLOCATION,
        amount: wallet.materialsAmount,
        fromAccount: "ESCROW",
        toAccount: "FERRETERIA",
        description: `Asignación materiales → ${ferreteriaName}`,
      });

      if (wallet.materialsAmount > 0) {
        await storage.createPurchaseOrder({
          projectWalletId: wallet.id,
          ferreteriaName,
          items: materialItems.length > 0 ? materialItems : [{ name: "Materiales según presupuesto", quantity: 1 }],
          totalAmount: wallet.materialsAmount,
        });
      }

      await storage.createWalletTransaction({
        projectWalletId: wallet.id,
        type: TRANSACTION_TYPES.GUARANTEE_DEDUCTION,
        amount: wallet.guaranteeAmount,
        fromAccount: "ESCROW",
        toAccount: "FONDO_GARANTIA_BITCOPPER",
        description: `Retención ${wallet.guaranteePercent}% Fondo de Garantía`,
      });

      await storage.createWalletTransaction({
        projectWalletId: wallet.id,
        type: TRANSACTION_TYPES.LABOR_BLOCKED,
        amount: wallet.laborAmount,
        fromAccount: "ESCROW",
        toAccount: "MAESTRO_BLOQUEADO",
        description: `Mano de obra bloqueada hasta aprobación de hitos`,
      });

      await storage.updateProjectWallet(wallet.id, {
        status: ESCROW_STATUS.SPLIT_ALLOCATED,
        ferreteriaAllocated: wallet.materialsAmount,
        guaranteeFund: wallet.guaranteeAmount,
        maestroBlocked: wallet.laborAmount,
        maestroAvailable: 0,
      });

      await storage.createEscrowNotification({
        projectWalletId: wallet.id,
        recipientType: "client",
        recipientId: wallet.clientLeadId,
        type: NOTIFICATION_TYPES.MATERIALS_PAID,
        title: "Materiales Pagados",
        message: `Tus materiales ya fueron comprados y el dinero esta seguro. $${wallet.materialsAmount.toLocaleString("es-CL")} enviados a la ferreteria.`,
      });
      await storage.createEscrowNotification({
        projectWalletId: wallet.id,
        recipientType: "maestro",
        recipientId: wallet.maestroId,
        type: NOTIFICATION_TYPES.DEPOSIT_RECEIVED,
        title: "Pago del Cliente Recibido",
        message: `El cliente deposito $${wallet.totalAmount.toLocaleString("es-CL")}. Materiales pagados, tu pago de $${wallet.laborAmount.toLocaleString("es-CL")} esta bloqueado hasta completar hitos.`,
      });

      const updatedWallet = await storage.getProjectWallet(walletId);
      const transactions = await storage.getWalletTransactions(walletId);
      const orders = await storage.getPurchaseOrders(walletId);

      res.json({
        success: true,
        wallet: updatedWallet,
        transactions,
        purchaseOrders: orders,
        splitDetails: {
          materials: wallet.materialsAmount,
          guarantee: wallet.guaranteeAmount,
          laborBlocked: wallet.laborAmount,
          ferreteriaName,
        },
        message: "Pago confirmado. Split ejecutado: materiales pagados, garantia retenida, mano de obra bloqueada.",
      });
    } catch (err) {
      console.error("Error confirming payment:", err);
      res.status(500).json({ error: "Error al confirmar pago" });
    }
  });

  app.get("/api/escrow/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const wallet = await storage.getProjectWallet(walletId);
      if (!wallet) return res.status(404).json({ error: "Billetera no encontrada" });

      const milestones = await storage.getProjectMilestones(walletId);
      const transactions = await storage.getWalletTransactions(walletId);
      const orders = await storage.getPurchaseOrders(walletId);
      const maestro = await storage.getMaestroById(wallet.maestroId);

      res.json({
        wallet,
        milestones,
        transactions,
        purchaseOrders: orders,
        maestroName: maestro?.displayName || "Maestro",
      });
    } catch {
      res.status(500).json({ error: "Error al obtener datos de escrow" });
    }
  });

  app.get("/api/escrow/client/:clientLeadId", async (req, res) => {
    try {
      const clientLeadId = parseInt(req.params.clientLeadId);
      const wallets = await storage.getProjectWalletsByClient(clientLeadId);

      const walletsWithDetails = await Promise.all(wallets.map(async (w) => {
        const milestones = await storage.getProjectMilestones(w.id);
        const maestro = await storage.getMaestroById(w.maestroId);
        return { ...w, milestones, maestroName: maestro?.displayName || "Maestro" };
      }));

      const notifications = await storage.getEscrowNotifications("client", clientLeadId);
      const unreadCount = await storage.getUnreadNotificationCount("client", clientLeadId);
      res.json({ wallets: walletsWithDetails, notifications, unreadCount });
    } catch {
      res.status(500).json({ error: "Error al obtener billeteras del cliente" });
    }
  });

  app.get("/api/escrow/maestro/:maestroId", async (req, res) => {
    try {
      const maestroId = parseInt(req.params.maestroId);
      const wallets = await storage.getProjectWalletsByMaestro(maestroId);

      const walletsWithDetails = await Promise.all(wallets.map(async (w) => {
        const milestones = await storage.getProjectMilestones(w.id);
        const client = await storage.getClientLeadById(w.clientLeadId);
        return { ...w, milestones, clientName: client?.name || "Cliente" };
      }));

      const totalAvailable = wallets.reduce((sum, w) => sum + w.maestroAvailable, 0);
      const totalBlocked = wallets.reduce((sum, w) => sum + w.maestroBlocked, 0);
      const notifications = await storage.getEscrowNotifications("maestro", maestroId);
      const unreadCount = await storage.getUnreadNotificationCount("maestro", maestroId);

      res.json({
        wallets: walletsWithDetails,
        summary: { totalAvailable, totalBlocked, totalProjects: wallets.length },
        notifications,
        unreadCount,
      });
    } catch {
      res.status(500).json({ error: "Error al obtener billeteras del maestro" });
    }
  });

  app.post("/api/milestones/:milestoneId/submit", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.milestoneId);
      const milestone = await storage.getProjectMilestone(milestoneId);
      if (!milestone) return res.status(404).json({ error: "Hito no encontrado" });
      if (milestone.status !== MILESTONE_STATUS.PENDING) {
        return res.status(400).json({ error: "Este hito ya fue enviado o aprobado" });
      }

      const parsed = submitMilestoneSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Datos inválidos" });
      }

      await storage.updateProjectMilestone(milestoneId, {
        status: MILESTONE_STATUS.SUBMITTED,
        photoUrl: parsed.data.photoUrl,
        photoUrl2: parsed.data.photoUrl2 || null,
        maestroNote: parsed.data.maestroNote || null,
        submittedAt: new Date(),
      });

      const wallet = await storage.getProjectWallet(milestone.projectWalletId);
      if (wallet && wallet.status === ESCROW_STATUS.SPLIT_ALLOCATED) {
        await storage.updateProjectWallet(wallet.id, { status: ESCROW_STATUS.IN_PROGRESS });
      }

      if (wallet) {
        await storage.createEscrowNotification({
          projectWalletId: wallet.id,
          recipientType: "client",
          recipientId: wallet.clientLeadId,
          type: NOTIFICATION_TYPES.MILESTONE_SUBMITTED,
          title: `Avance: ${milestone.name}`,
          message: `Tu maestro envio evidencia del avance "${milestone.name}". Revisa las fotos y aprueba para liberar $${milestone.releaseAmount.toLocaleString("es-CL")}.`,
        });
      }

      const updated = await storage.getProjectMilestone(milestoneId);
      res.json({
        success: true,
        milestone: updated,
        message: "Avance enviado. Esperando aprobacion del cliente.",
      });
    } catch (err) {
      console.error("Error submitting milestone:", err);
      res.status(500).json({ error: "Error al enviar avance" });
    }
  });

  app.post("/api/milestones/:milestoneId/approve", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.milestoneId);
      const milestone = await storage.getProjectMilestone(milestoneId);
      if (!milestone) return res.status(404).json({ error: "Hito no encontrado" });
      if (milestone.status !== MILESTONE_STATUS.SUBMITTED) {
        return res.status(400).json({ error: "Este hito no está pendiente de aprobación" });
      }

      const wallet = await storage.getProjectWallet(milestone.projectWalletId);
      if (!wallet) return res.status(404).json({ error: "Billetera no encontrada" });

      const releaseAmount = milestone.releaseAmount;

      await storage.updateProjectMilestone(milestoneId, {
        status: MILESTONE_STATUS.APPROVED,
        clientApproval: true,
        approvedAt: new Date(),
      });

      await storage.createWalletTransaction({
        projectWalletId: wallet.id,
        type: TRANSACTION_TYPES.MILESTONE_RELEASE,
        amount: releaseAmount,
        fromAccount: "MAESTRO_BLOQUEADO",
        toAccount: "MAESTRO_DISPONIBLE",
        description: `Liberación hito: ${milestone.name} (${milestone.releasePercent}%)`,
        milestoneId: milestoneId,
      });

      const newBlocked = Math.max(0, wallet.maestroBlocked - releaseAmount);
      const newAvailable = wallet.maestroAvailable + releaseAmount;

      const allMilestones = await storage.getProjectMilestones(wallet.id);
      const allApproved = allMilestones.every(m => m.id === milestoneId || m.status === MILESTONE_STATUS.APPROVED);
      const newStatus = allApproved ? ESCROW_STATUS.COMPLETED : ESCROW_STATUS.IN_PROGRESS;

      await storage.updateProjectWallet(wallet.id, {
        maestroBlocked: newBlocked,
        maestroAvailable: newAvailable,
        status: newStatus,
      });

      await storage.incrementMaestroCreditScore(wallet.maestroId, releaseAmount);

      // Award Copper Credits for milestone approval (level-up bonus)
      const currentCopperBalance = await storage.getCopperCreditBalance(wallet.clientLeadId);
      const newCopperBalance = currentCopperBalance + MILESTONE_BONUS_RATE;
      await storage.createCopperCredit({
        clientLeadId: wallet.clientLeadId,
        amount: MILESTONE_BONUS_RATE.toFixed(2),
        type: COPPER_CREDIT_TYPES.MILESTONE_BONUS,
        description: `Bonus por aprobar hito "${milestone.name}": +${MILESTONE_BONUS_RATE} CC`,
        referenceId: milestoneId,
        balanceAfter: newCopperBalance.toFixed(2),
      });

      await storage.createEscrowNotification({
        projectWalletId: wallet.id,
        recipientType: "maestro",
        recipientId: wallet.maestroId,
        type: NOTIFICATION_TYPES.MILESTONE_APPROVED,
        title: `Hito Aprobado: ${milestone.name}`,
        message: `El cliente aprobo tu avance "${milestone.name}". $${releaseAmount.toLocaleString("es-CL")} fueron liberados a tu saldo disponible.`,
      });
      await storage.createEscrowNotification({
        projectWalletId: wallet.id,
        recipientType: "client",
        recipientId: wallet.clientLeadId,
        type: NOTIFICATION_TYPES.MILESTONE_APPROVED,
        title: `Pago Liberado: ${milestone.name}`,
        message: `Aprobaste el hito "${milestone.name}". $${releaseAmount.toLocaleString("es-CL")} fueron liberados al maestro. ¡Ganaste ${MILESTONE_BONUS_RATE} Copper Credits!`,
      });

      if (newStatus === ESCROW_STATUS.COMPLETED) {
        await storage.createEscrowNotification({
          projectWalletId: wallet.id,
          recipientType: "client",
          recipientId: wallet.clientLeadId,
          type: NOTIFICATION_TYPES.PROJECT_COMPLETED,
          title: "Proyecto Completado",
          message: `Todos los hitos de "${wallet.description}" fueron aprobados. Tu proyecto esta completo.`,
        });
        await storage.createEscrowNotification({
          projectWalletId: wallet.id,
          recipientType: "maestro",
          recipientId: wallet.maestroId,
          type: NOTIFICATION_TYPES.PROJECT_COMPLETED,
          title: "Proyecto Completado",
          message: `Todos los hitos de "${wallet.description}" fueron aprobados. Todo tu saldo esta disponible.`,
        });
      }

      const updatedWallet = await storage.getProjectWallet(wallet.id);
      const updatedMilestones = await storage.getProjectMilestones(wallet.id);

      res.json({
        success: true,
        wallet: updatedWallet,
        milestones: updatedMilestones,
        released: releaseAmount,
        milestoneBonus: MILESTONE_BONUS_RATE,
        message: `Hito "${milestone.name}" aprobado. $${releaseAmount.toLocaleString("es-CL")} liberados al maestro. ¡Ganaste ${MILESTONE_BONUS_RATE} Copper Credits!`,
      });
    } catch (err) {
      console.error("Error approving milestone:", err);
      res.status(500).json({ error: "Error al aprobar hito" });
    }
  });

  app.post("/api/milestones/:milestoneId/reject", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.milestoneId);
      const milestone = await storage.getProjectMilestone(milestoneId);
      if (!milestone) return res.status(404).json({ error: "Hito no encontrado" });
      if (milestone.status !== MILESTONE_STATUS.SUBMITTED) {
        return res.status(400).json({ error: "Este hito no está pendiente de aprobación" });
      }

      const reason = req.body.reason || "Rechazado por el cliente";

      await storage.updateProjectMilestone(milestoneId, {
        status: MILESTONE_STATUS.PENDING,
        rejectedReason: reason,
        submittedAt: null,
        photoUrl: null,
        photoUrl2: null,
        maestroNote: null,
      });

      const wallet = await storage.getProjectWallet(milestone.projectWalletId);
      if (wallet) {
        await storage.createEscrowNotification({
          projectWalletId: wallet.id,
          recipientType: "maestro",
          recipientId: wallet.maestroId,
          type: NOTIFICATION_TYPES.MILESTONE_REJECTED,
          title: `Hito Rechazado: ${milestone.name}`,
          message: `El cliente rechazo tu avance "${milestone.name}": "${reason}". Corrige y vuelve a enviar.`,
        });
      }

      const updated = await storage.getProjectMilestone(milestoneId);
      res.json({
        success: true,
        milestone: updated,
        message: `Hito rechazado: ${reason}. El maestro puede volver a enviarlo.`,
      });
    } catch (err) {
      console.error("Error rejecting milestone:", err);
      res.status(500).json({ error: "Error al rechazar hito" });
    }
  });

  app.get("/api/config/country/:countryCode", (req, res) => {
    if (!isCountrySupported(req.params.countryCode)) {
      return res.status(400).json({
        error: "Pais no soportado",
        supported: getSupportedCountries().map(c => c.code),
      });
    }
    const config = getCountryConfig(req.params.countryCode);
    res.json(config);
  });

  app.get("/api/config/countries", (_req, res) => {
    res.json(getSupportedCountries());
  });

  app.post("/api/payments/recommend", (req, res) => {
    try {
      const { amount, countryCode, description } = req.body;
      if (!amount || !countryCode) {
        return res.status(400).json({ error: "amount y countryCode requeridos" });
      }
      const intent: PaymentIntent = {
        amount: Number(amount),
        countryCode,
        description: description || "Pago SmartBuild",
      };
      const recommendation = recommendPaymentGateway(intent);
      res.json(recommendation);
    } catch (err) {
      res.status(500).json({ error: "Error al calcular recomendacion de pago" });
    }
  });

  app.post("/api/payments/process", async (req, res) => {
    try {
      const { amount, countryCode, gatewayId, description, clientId, maestroId, walletId, marketplaceRequestId } = req.body;
      if (!amount || !countryCode || !gatewayId) {
        return res.status(400).json({ error: "amount, countryCode y gatewayId requeridos" });
      }
      const paymentReq: CreatePaymentRequest = {
        amount: Number(amount),
        countryCode,
        gatewayId,
        description: description || "Pago SmartBuild",
        clientLeadId: clientId ? Number(clientId) : undefined,
        maestroId: maestroId ? Number(maestroId) : undefined,
        projectWalletId: walletId ? Number(walletId) : undefined,
        marketplaceRequestId: marketplaceRequestId ? Number(marketplaceRequestId) : undefined,
      };
      const { transaction, gatewayResult } = await paymentService.createPayment(paymentReq);
      res.json({
        ...gatewayResult,
        paymentId: transaction.externalId,
        internalId: transaction.id,
        split: {
          ferreteria: transaction.montoFerreteria,
          platform: transaction.montoPlatforma,
          cashbackMaestro: transaction.montoCashbackMaestro,
          garantia: transaction.montoGarantia,
        },
      });
    } catch (err) {
      console.error("Error processing payment:", err);
      res.status(500).json({ error: "Error al procesar pago" });
    }
  });

  app.get("/api/payments/transaction/:externalId", async (req, res) => {
    try {
      const tx = await paymentService.getTransactionByExternalId(req.params.externalId);
      if (!tx) return res.status(404).json({ error: "Transaccion no encontrada" });
      res.json(tx);
    } catch {
      res.status(500).json({ error: "Error al consultar transaccion" });
    }
  });

  app.get("/api/payments/client/:clientLeadId", async (req, res) => {
    try {
      const txs = await paymentService.getTransactionsByClient(parseInt(req.params.clientLeadId));
      res.json(txs);
    } catch {
      res.status(500).json({ error: "Error al consultar transacciones" });
    }
  });

  app.get("/api/payments/maestro/:maestroId", async (req, res) => {
    try {
      const txs = await paymentService.getTransactionsByMaestro(parseInt(req.params.maestroId));
      res.json(txs);
    } catch {
      res.status(500).json({ error: "Error al consultar transacciones" });
    }
  });

  // === WEBHOOKS (no auth required — signature verification instead) ===

  app.post("/api/webhooks/fintoc", async (req, res) => {
    try {
      const signature = req.headers["fintoc-signature"] as string || "";
      const secret = process.env.FINTOC_WEBHOOK_SECRET || "";
      const isProduction = process.env.NODE_ENV === "production";

      if (secret) {
        if (!signature) {
          if (isProduction) {
            console.warn("Fintoc webhook: missing signature in production");
            return res.status(401).json({ error: "Firma requerida" });
          }
        } else {
          const rawBody = JSON.stringify(req.body);
          const valid = paymentService.verifyFintocSignature(rawBody, signature, secret);
          if (!valid) {
            console.warn("Fintoc webhook: invalid signature");
            return res.status(401).json({ error: "Firma invalida" });
          }
        }
      }

      const body = req.body;
      const event = body.type || body.event || "";
      const data = body.data || {};

      let mappedEvent = "payment_pending";
      if (event === "payment_intent.succeeded" || event === "link.credentials_entered") {
        mappedEvent = "payment_approved";
      } else if (event === "payment_intent.failed") {
        mappedEvent = "payment_rejected";
      }

      const webhookPayload: WebhookPayload = {
        provider: "fintoc",
        event: mappedEvent,
        transactionId: data.id || data.payment_intent_id || "",
        status: mappedEvent,
        amount: data.amount ? Number(data.amount) : undefined,
        rawPayload: body,
        signature,
      };

      const result = await paymentService.handleWebhook(webhookPayload);

      if (!result.processed) {
        console.warn("Fintoc webhook: transaction not found", webhookPayload.transactionId);
        return res.status(200).json({ received: true, processed: false });
      }

      res.json({ received: true, processed: true, status: result.transaction?.status });
    } catch (err) {
      console.error("Fintoc webhook error:", err);
      res.status(500).json({ error: "Error procesando webhook" });
    }
  });

  app.post("/api/webhooks/mercadopago", async (req, res) => {
    try {
      const xSignature = req.headers["x-signature"] as string || "";
      const xRequestId = req.headers["x-request-id"] as string || "";
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
      const isProduction = process.env.NODE_ENV === "production";

      const body = req.body;
      const dataId = body.data?.id || body.id || "";

      if (secret) {
        if (!xSignature) {
          if (isProduction) {
            console.warn("MercadoPago webhook: missing signature in production");
            return res.status(401).json({ error: "Firma requerida" });
          }
        } else {
          const valid = paymentService.verifyMercadoPagoSignature(xSignature, xRequestId, dataId, secret);
          if (!valid) {
            console.warn("MercadoPago webhook: invalid signature");
            return res.status(401).json({ error: "Firma invalida" });
          }
        }
      }

      const action = body.action || body.type || "";
      let mappedEvent = "payment_pending";
      if (action === "payment.created") {
        mappedEvent = "payment_pending";
      } else if (action === "payment.updated" || action === "payment_approved") {
        const status = body.data?.status || "";
        if (status === "approved") mappedEvent = "payment_approved";
        else if (status === "rejected") mappedEvent = "payment_rejected";
        else if (status === "refunded") mappedEvent = "payment_refunded";
        else mappedEvent = "payment_pending";
      }

      const webhookPayload: WebhookPayload = {
        provider: "mercadopago",
        event: mappedEvent,
        transactionId: dataId.toString(),
        status: mappedEvent,
        amount: body.data?.transaction_amount ? Number(body.data.transaction_amount) : undefined,
        rawPayload: body,
        signature: xSignature,
      };

      const result = await paymentService.handleWebhook(webhookPayload);

      if (!result.processed) {
        console.warn("MercadoPago webhook: transaction not found", webhookPayload.transactionId);
        return res.status(200).json({ received: true, processed: false });
      }

      res.json({ received: true, processed: true, status: result.transaction?.status });
    } catch (err) {
      console.error("MercadoPago webhook error:", err);
      res.status(500).json({ error: "Error procesando webhook" });
    }
  });

  app.post("/api/payments/split", (req, res) => {
    try {
      const { amount, countryCode } = req.body;
      if (!amount || !countryCode) {
        return res.status(400).json({ error: "amount y countryCode requeridos" });
      }
      const split = getPaymentSplit(Number(amount), countryCode);
      res.json(split);
    } catch {
      res.status(500).json({ error: "Error al calcular split" });
    }
  });

  app.post("/api/payments/tax", (req, res) => {
    try {
      const { amount, countryCode } = req.body;
      if (!amount || !countryCode) {
        return res.status(400).json({ error: "amount y countryCode requeridos" });
      }
      const tax = calculateTax(Number(amount), countryCode);
      res.json(tax);
    } catch {
      res.status(500).json({ error: "Error al calcular impuesto" });
    }
  });

  app.post("/api/notifications/:recipientType/:recipientId/mark-read", async (req, res) => {
    try {
      const { recipientType, recipientId } = req.params;
      await storage.markNotificationsRead(recipientType, parseInt(recipientId));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Error al marcar notificaciones" });
    }
  });

  // === Payment Links (Quick Pay via WhatsApp) ===
  const VALID_GATEWAYS = ["fintoc", "mercadopago", "culqi"];

  app.post("/api/payment-links", isAuthenticated, async (req: any, res) => {
    try {
      const { type, amount, description, maestroId, clientLeadId, projectWalletId, countryCode, expiresInHours } = req.body;
      if (!type || !amount || !description) {
        return res.status(400).json({ error: "type, amount y description requeridos" });
      }

      const userId = req.user?.id;
      let verifiedMaestroId = maestroId ? Number(maestroId) : null;

      if (verifiedMaestroId && userId) {
        const maestro = await storage.getMaestroByUserId(userId);
        if (!maestro || maestro.id !== verifiedMaestroId) {
          return res.status(403).json({ error: "No tienes permiso para crear enlaces con este maestro" });
        }
      }

      const token = generatePaymentToken();
      const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : new Date(Date.now() + 72 * 3600000);

      const link = await storage.createPaymentLink({
        token,
        type,
        amount: Number(amount),
        description,
        createdById: userId || null,
        maestroId: verifiedMaestroId,
        clientLeadId: clientLeadId ? Number(clientLeadId) : null,
        projectWalletId: projectWalletId ? Number(projectWalletId) : null,
        countryCode: countryCode || "CL",
        status: "active",
        expiresAt,
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const payUrl = `${baseUrl}/pagar/${token}`;

      res.json({ ...link, payUrl });
    } catch (err) {
      console.error("Error creating payment link:", err);
      res.status(500).json({ error: "Error al crear enlace de pago" });
    }
  });

  app.get("/api/payment-links/:token", async (req, res) => {
    try {
      const link = await storage.getPaymentLinkByToken(req.params.token);
      if (!link) return res.status(404).json({ error: "Enlace no encontrado" });

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Enlace expirado", link: { ...link, status: "expired" } });
      }

      if (link.status !== "active") {
        return res.status(410).json({ error: "Enlace ya utilizado", link });
      }

      let maestroInfo = null;
      if (link.maestroId) {
        const maestro = await storage.getMaestroById(link.maestroId);
        if (maestro) {
          maestroInfo = {
            id: maestro.id,
            displayName: maestro.displayName,
            specialty: maestro.specialty,
            city: maestro.city,
            avgRating: maestro.avgRating,
            kycVerified: maestro.kycVerified,
          };
        }
      }

      res.json({ ...link, maestroInfo });
    } catch (err) {
      res.status(500).json({ error: "Error al obtener enlace" });
    }
  });

  app.post("/api/payment-links/:token/use", async (req, res) => {
    try {
      const link = await storage.getPaymentLinkByToken(req.params.token);
      if (!link) return res.status(404).json({ error: "Enlace no encontrado" });
      if (link.status !== "active") return res.status(410).json({ error: "Enlace ya utilizado" });
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Enlace expirado" });
      }

      const { clientName, clientEmail, clientPhone, gatewayId } = req.body;
      if (!clientName || !clientEmail || !clientPhone) {
        return res.status(400).json({ error: "Nombre, email y telefono requeridos" });
      }

      const gateway = gatewayId || "mercadopago";
      if (!VALID_GATEWAYS.includes(gateway)) {
        return res.status(400).json({ error: "Pasarela de pago no soportada" });
      }

      await storage.updatePaymentLinkStatus(link.id, "processing");

      let clientLead = await storage.getClientLeadByEmail(clientEmail);
      if (!clientLead) {
        clientLead = await storage.createClientLead({
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          maestroId: link.maestroId,
          referralCode: null,
        });

        const couponCode = generateCouponCode();
        await storage.createCoupon({
          code: couponCode,
          clientLeadId: clientLead.id,
          discountPercent: 10,
          status: "active",
        });

        await storage.createClientCredit({
          clientLeadId: clientLead.id,
          amount: 500,
          reason: "Bienvenida - Registro via enlace de pago",
        });
      }

      const paymentReq: CreatePaymentRequest = {
        amount: link.amount,
        countryCode: link.countryCode || "CL",
        gatewayId: gateway,
        description: link.description,
        clientLeadId: clientLead.id,
        maestroId: link.maestroId || undefined,
        projectWalletId: link.projectWalletId || undefined,
      };

      const { transaction, gatewayResult } = await paymentService.createPayment(paymentReq);

      await storage.updatePaymentLinkStatus(link.id, "used", { usedAt: new Date() } as any);

      res.json({
        success: true,
        clientLead: { id: clientLead.id, name: clientLead.name, email: clientLead.email },
        payment: {
          ...gatewayResult,
          paymentId: transaction.externalId,
        },
      });
    } catch (err) {
      console.error("Error using payment link:", err);
      res.status(500).json({ error: "Error al procesar pago" });
    }
  });

  // === Mi Obra Resguardada ===
  app.get("/api/obra-resguardada/:clientLeadId", async (req, res) => {
    try {
      const clientLeadId = parseInt(req.params.clientLeadId);
      const wallets = await storage.getProjectWalletsByClient(clientLeadId);

      const walletsEnriched = await Promise.all(wallets.map(async (w) => {
        const transactions = await storage.getWalletTransactions(w.id);
        const milestones = await storage.getProjectMilestones(w.id);
        const withdrawals = await storage.getWithdrawalRequestsByWallet(w.id);
        const maestro = await storage.getMaestroById(w.maestroId);

        const releasedWithdrawals = withdrawals
          .filter(wr => wr.status === "RELEASED")
          .reduce((sum, wr) => sum + wr.amount, 0);

        const executedCost = transactions
          .filter(t => t.type === "MILESTONE_RELEASE" || t.type === "MATERIAL_ALLOCATION")
          .reduce((sum, t) => sum + t.amount, 0) + releasedWithdrawals;

        const protectedBalance = Math.max(0, w.totalAmount - executedCost);

        const timeline = [
          ...transactions.map(t => ({
            id: `tx-${t.id}`,
            date: t.createdAt,
            type: "transaction" as const,
            amount: t.amount,
            description: t.description,
            transactionType: t.type,
            fromAccount: t.fromAccount,
            toAccount: t.toAccount,
            validated: ["DEPOSIT", "MILESTONE_RELEASE", "MATERIAL_ALLOCATION", "GUARANTEE_RELEASE"].includes(t.type),
          })),
          ...withdrawals.map(wr => ({
            id: `wd-${wr.id}`,
            date: wr.createdAt,
            type: "withdrawal" as const,
            amount: wr.amount,
            description: `Retiro por QR - ${wr.qrToken}`,
            transactionType: "WITHDRAWAL",
            fromAccount: "escrow",
            toAccount: "maestro",
            validated: wr.status === "RELEASED",
            status: wr.status,
          })),
        ].sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        return {
          id: w.id,
          description: w.description,
          totalAmount: w.totalAmount,
          materialsAmount: w.materialsAmount,
          laborAmount: w.laborAmount,
          guaranteeAmount: w.guaranteeAmount,
          status: w.status,
          maestroAvailable: w.maestroAvailable,
          maestroBlocked: w.maestroBlocked,
          ferreteriaAllocated: w.ferreteriaAllocated,
          guaranteeFund: w.guaranteeFund,
          protectedBalance,
          executedCost,
          maestroName: maestro?.displayName || "Maestro",
          milestones,
          timeline,
          createdAt: w.createdAt,
        };
      }));

      res.json({ wallets: walletsEnriched });
    } catch (err) {
      console.error("Error Mi Obra Resguardada:", err);
      res.status(500).json({ error: "Error al obtener datos de obra resguardada" });
    }
  });

  // === Suscripción Hogar Seguro ===
  app.get("/api/subscriptions/me", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const clientLeadId = req.query.clientLeadId ? parseInt(req.query.clientLeadId as string) : undefined;
      
      let sub;
      if (clientLeadId) {
        sub = await storage.getSubscriptionByClientLead(clientLeadId);
      } else if (userId) {
        sub = await storage.getSubscriptionByUserId(userId);
      }
      
      res.json({ subscription: sub || null, plans: SUBSCRIPTION_PLANS });
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo suscripción" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const parsed = insertHomeownerSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
      }

      const plan = SUBSCRIPTION_PLANS[parsed.data.planType as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.MONTHLY;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      const sub = await storage.createSubscription({
        ...parsed.data,
        monthlyPrice: plan.price,
        expiresAt,
      });

      if (parsed.data.userId) {
        await storage.updateUserRole(parsed.data.userId, USER_ROLES.HOME_OWNER);
      }

      res.json(sub);
    } catch (err) {
      res.status(500).json({ error: "Error creando suscripción" });
    }
  });

  app.post("/api/subscriptions/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sub = await storage.cancelSubscription(id);
      res.json(sub);
    } catch (err) {
      res.status(500).json({ error: "Error cancelando suscripción" });
    }
  });

  app.get("/api/admin/subscriptions", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const allSubs = await storage.getAllSubscriptions();
      const subsWithClients = await Promise.all(
        allSubs.map(async (sub) => {
          let clientName = "—";
          let clientEmail = "—";
          if (sub.clientLeadId) {
            const lead = await storage.getClientLeadById(sub.clientLeadId);
            if (lead) {
              clientName = lead.name;
              clientEmail = lead.email || "—";
            }
          }
          return { ...sub, clientName, clientEmail };
        })
      );
      res.json(subsWithClients);
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo suscripciones" });
    }
  });

  // === Simulador de Inversión / Tokenización ===
  app.post("/api/simulator/investment", (req, res) => {
    try {
      const { projectValue, tokenCount, termMonths } = req.body;
      if (!projectValue || !tokenCount || !termMonths) {
        return res.status(400).json({ error: "projectValue, tokenCount y termMonths requeridos" });
      }

      const tokenValue = Math.round(projectValue / tokenCount);
      const monthlyReturn = 0.012; // 1.2% monthly return
      const projectedReturns: { month: number; value: number; accumulated: number }[] = [];
      let accumulated = 0;

      for (let m = 1; m <= termMonths; m++) {
        const monthValue = Math.round(projectValue * monthlyReturn);
        accumulated += monthValue;
        projectedReturns.push({ month: m, value: monthValue, accumulated });
      }

      const totalReturn = accumulated;
      const annualizedReturn = ((1 + monthlyReturn) ** 12 - 1) * 100;
      const guaranteeFundPercent = 2;
      const guaranteeFund = Math.round(projectValue * guaranteeFundPercent / 100);

      res.json({
        projectValue,
        tokenCount,
        tokenValue,
        termMonths,
        monthlyReturnPercent: monthlyReturn * 100,
        annualizedReturnPercent: Math.round(annualizedReturn * 100) / 100,
        totalReturn,
        guaranteeFund,
        guaranteeFundPercent,
        projectedReturns,
      });
    } catch (err) {
      res.status(500).json({ error: "Error en simulación" });
    }
  });

  // === Custody Yield / Token Rewards ===
  app.get("/api/rewards/client/:clientLeadId", async (req, res) => {
    try {
      const clientLeadId = parseInt(req.params.clientLeadId);
      const rewards = await storage.getUserRewardsByClient(clientLeadId);
      const totalTokens = await storage.getUserRewardsTotalByClient(clientLeadId);
      res.json({ rewards, totalTokens });
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo recompensas" });
    }
  });

  app.post("/api/rewards/calculate-yield", async (req, res) => {
    try {
      const { clientLeadId } = req.body;
      if (!clientLeadId) return res.status(400).json({ error: "clientLeadId requerido" });

      const wallets = await storage.getProjectWalletsByClient(clientLeadId);
      const today = new Date().toISOString().split("T")[0];
      const createdRewards: any[] = [];

      for (const wallet of wallets) {
        if (wallet.status !== "HELD_IN_ESCROW" && wallet.status !== "SPLIT_ALLOCATED" && wallet.status !== "IN_PROGRESS") continue;

        const transactions = await storage.getWalletTransactions(wallet.id);
        const releasedWithdrawals = (await storage.getWithdrawalRequestsByWallet(wallet.id))
          .filter(wr => wr.status === "RELEASED")
          .reduce((sum, wr) => sum + wr.amount, 0);

        const executedCost = transactions
          .filter(t => t.type === "MILESTONE_RELEASE" || t.type === "MATERIAL_ALLOCATION")
          .reduce((sum, t) => sum + t.amount, 0) + releasedWithdrawals;

        const frozenBalance = Math.max(0, wallet.totalAmount - executedCost);
        if (frozenBalance <= 0) continue;

        const existingRewards = await storage.getUserRewardsByWallet(wallet.id);
        const alreadyToday = existingRewards.some(r => r.date === today);
        if (alreadyToday) continue;

        const tokenAmount = frozenBalance * DAILY_CUSTODY_RATE;

        const reward = await storage.createUserReward({
          clientLeadId,
          projectWalletId: wallet.id,
          rewardType: "CUSTODY_YIELD",
          tokenAmount: tokenAmount.toFixed(6),
          frozenBalance,
          dailyRate: DAILY_CUSTODY_RATE.toFixed(8),
          description: `Rendimiento diario sobre $${frozenBalance.toLocaleString("es-CL")} en custodia`,
          date: today,
        });

        createdRewards.push(reward);
      }

      const totalTokens = await storage.getUserRewardsTotalByClient(clientLeadId);
      res.json({ createdRewards, totalTokens, calculatedAt: today });
    } catch (err) {
      res.status(500).json({ error: "Error calculando rendimiento" });
    }
  });

  // === Copper Credits (Bitcopper Wallet) ===

  app.get("/api/copper-credits/:clientLeadId", async (req, res) => {
    try {
      const clientLeadId = parseInt(req.params.clientLeadId);
      const balance = await storage.getCopperCreditBalance(clientLeadId);
      const history = await storage.getCopperCreditsByClient(clientLeadId);
      res.json({ balance, history: history.slice(0, 20) });
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo créditos" });
    }
  });

  app.post("/api/copper-credits/redeem", async (req, res) => {
    try {
      const { clientLeadId, amount, redeemType, referenceId } = req.body;
      if (!clientLeadId || !amount || !redeemType) {
        return res.status(400).json({ error: "Datos incompletos" });
      }
      if (redeemType !== COPPER_CREDIT_TYPES.REDEMPTION_SECURITY_FEE &&
          redeemType !== COPPER_CREDIT_TYPES.REDEMPTION_FERRETERIA) {
        return res.status(400).json({ error: "Los Copper Credits solo pueden usarse para el Fee de Seguridad o descuentos en Ferreterías asociadas." });
      }
      const redeemAmount = parseFloat(amount);
      if (redeemAmount <= 0) return res.status(400).json({ error: "Monto inválido" });

      const currentBalance = await storage.getCopperCreditBalance(clientLeadId);
      if (currentBalance < redeemAmount) {
        return res.status(400).json({ error: "Saldo insuficiente de Copper Credits" });
      }

      const newBalance = currentBalance - redeemAmount;
      const description = redeemType === COPPER_CREDIT_TYPES.REDEMPTION_SECURITY_FEE
        ? `Canje: Fee de Seguridad (-${redeemAmount.toFixed(2)} CC)`
        : `Canje: Descuento Ferretería (-${redeemAmount.toFixed(2)} CC)`;

      const credit = await storage.createCopperCredit({
        clientLeadId,
        amount: (-redeemAmount).toFixed(2),
        type: redeemType,
        description,
        referenceId: referenceId || null,
        balanceAfter: newBalance.toFixed(2),
      });

      res.json({ success: true, credit, newBalance });
    } catch (err) {
      res.status(500).json({ error: "Error al canjear créditos" });
    }
  });

  // === Ferretería Coupon Generation & Validation ===

  app.post("/api/ferreteria-coupons/generate", async (req, res) => {
    try {
      const { clientLeadId, storeName, discountPercent, ccCost } = req.body;
      if (!clientLeadId || !storeName || !discountPercent || !ccCost) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const currentBalance = await storage.getCopperCreditBalance(clientLeadId);
      if (currentBalance < ccCost) {
        return res.status(400).json({ error: "Saldo insuficiente de Copper Credits" });
      }

      const code = generateFerreteriaCouponCode();

      const newBalance = currentBalance - ccCost;
      await storage.createCopperCredit({
        clientLeadId,
        amount: (-ccCost).toFixed(2),
        type: COPPER_CREDIT_TYPES.REDEMPTION_FERRETERIA,
        description: `Canje: Cupón ${code} para ${storeName} (-${ccCost} CC)`,
        referenceId: null,
        balanceAfter: newBalance.toFixed(2),
      });

      const coupon = await storage.createFerreteriaCoupon({
        code,
        clientLeadId,
        storeName,
        discountPercent,
        ccCost,
        status: COUPON_STATUS.ACTIVE,
      });

      res.json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ error: "Error al generar cupón" });
    }
  });

  app.get("/api/ferreteria-coupons/validate/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();
      if (!code) {
        return res.status(400).json({ valid: false, error: "Código vacío" });
      }

      const coupon = await storage.getFerreteriaCouponByCode(code);
      if (!coupon) {
        return res.status(404).json({ valid: false, error: "Cupón no encontrado" });
      }

      if (coupon.status === COUPON_STATUS.USED) {
        return res.json({
          valid: false,
          error: "Este cupón ya fue utilizado",
          usedAt: coupon.usedAt,
        });
      }

      if (coupon.status === COUPON_STATUS.EXPIRED) {
        return res.json({ valid: false, error: "Este cupón ha expirado" });
      }

      const clientName = await storage.getClientName(coupon.clientLeadId);

      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          storeName: coupon.storeName,
          discountPercent: coupon.discountPercent,
          clientName,
          createdAt: coupon.createdAt,
        },
      });
    } catch (err) {
      res.status(500).json({ valid: false, error: "Error al validar cupón" });
    }
  });

  app.post("/api/ferreteria-coupons/use/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().trim();
      const coupon = await storage.getFerreteriaCouponByCode(code);
      if (!coupon) {
        return res.status(404).json({ error: "Cupón no encontrado" });
      }
      if (coupon.status !== COUPON_STATUS.ACTIVE) {
        return res.status(400).json({ error: "Este cupón ya no está activo" });
      }
      const updated = await storage.markCouponUsed(coupon.id);
      res.json({ success: true, coupon: updated });
    } catch (err) {
      res.status(500).json({ error: "Error al marcar cupón como usado" });
    }
  });

  // === Nightly Cron Job: Calculate Custody Yield & Credit Copper Credits ===

  async function nightlyYieldCalculation() {
    try {
      const clients = await storage.getAllClientLeadsWithWallets();
      const today = new Date().toISOString().split("T")[0];
      let totalProcessed = 0;

      for (const client of clients) {
        const wallets = await storage.getProjectWalletsByClient(client.id);

        for (const wallet of wallets) {
          if (wallet.status !== "HELD_IN_ESCROW" && wallet.status !== "SPLIT_ALLOCATED" && wallet.status !== "IN_PROGRESS") continue;

          const transactions = await storage.getWalletTransactions(wallet.id);
          const releasedWithdrawals = (await storage.getWithdrawalRequestsByWallet(wallet.id))
            .filter(wr => wr.status === "RELEASED")
            .reduce((sum, wr) => sum + wr.amount, 0);

          const executedCost = transactions
            .filter(t => t.type === "MILESTONE_RELEASE" || t.type === "MATERIAL_ALLOCATION")
            .reduce((sum, t) => sum + t.amount, 0) + releasedWithdrawals;

          const frozenBalance = Math.max(0, wallet.totalAmount - executedCost);
          if (frozenBalance <= 0) continue;

          const existingRewards = await storage.getUserRewardsByWallet(wallet.id);
          const alreadyToday = existingRewards.some(r => r.date === today);
          if (alreadyToday) continue;

          const tokenAmount = frozenBalance * DAILY_CUSTODY_RATE;

          await storage.createUserReward({
            clientLeadId: client.id,
            projectWalletId: wallet.id,
            rewardType: "CUSTODY_YIELD",
            tokenAmount: tokenAmount.toFixed(6),
            frozenBalance,
            dailyRate: DAILY_CUSTODY_RATE.toFixed(8),
            description: `Rendimiento diario sobre $${frozenBalance.toLocaleString("es-CL")} en custodia`,
            date: today,
          });

          const currentBalance = await storage.getCopperCreditBalance(client.id);
          const newBalance = currentBalance + tokenAmount;
          await storage.createCopperCredit({
            clientLeadId: client.id,
            amount: tokenAmount.toFixed(2),
            type: COPPER_CREDIT_TYPES.CUSTODY_YIELD,
            description: `Rendimiento diario: ${tokenAmount.toFixed(2)} CC por $${frozenBalance.toLocaleString("es-CL")} en custodia`,
            referenceId: wallet.id,
            balanceAfter: newBalance.toFixed(2),
          });

          totalProcessed++;
        }

        if (totalProcessed > 0) {
          const totalTokens = await storage.getUserRewardsTotalByClient(client.id);
          await storage.createEscrowNotification({
            projectWalletId: wallets[0]?.id || 0,
            recipientType: "client",
            recipientId: client.id,
            type: "CUSTODY_YIELD_NOTIFICATION",
            title: "Rendimiento Diario de Custodia",
            message: `Has ganado ${totalTokens.toFixed(2)} Copper Credits hoy gracias a tu fondo de resguardo. ¡Tu dinero sigue trabajando para ti!`,
          });
        }
      }

      console.log(`[CRON] Nightly yield calculation completed: ${totalProcessed} wallets processed`);
      return totalProcessed;
    } catch (err) {
      console.error("[CRON] Error in nightly yield calculation:", err);
      return 0;
    }
  }

  // Schedule nightly at midnight (00:00)
  function scheduleNightlyCron() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      nightlyYieldCalculation();
      setInterval(nightlyYieldCalculation, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    console.log(`[CRON] Nightly yield job scheduled. Next run in ${Math.round(msUntilMidnight / 60000)} minutes.`);
  }

  scheduleNightlyCron();

  app.post("/api/cron/nightly-yield", async (_req, res) => {
    const processed = await nightlyYieldCalculation();
    res.json({ success: true, walletsProcessed: processed, calculatedAt: new Date().toISOString() });
  });

  // === PDF Certificate Generator ===
  app.get("/api/certificate/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const wallet = await storage.getProjectWallet(walletId);
      if (!wallet) return res.status(404).json({ error: "Wallet no encontrado" });

      const maestro = await storage.getMaestroById(wallet.maestroId);
      const client = await storage.getClientLeadById(wallet.clientLeadId);
      const transactions = await storage.getWalletTransactions(walletId);
      const rewards = await storage.getUserRewardsByWallet(walletId);
      const totalRewardTokens = rewards.reduce((sum, r) => sum + parseFloat(r.tokenAmount), 0);

      const releasedWithdrawals = (await storage.getWithdrawalRequestsByWallet(walletId))
        .filter(wr => wr.status === "RELEASED")
        .reduce((sum, wr) => sum + wr.amount, 0);

      const executedCost = transactions
        .filter(t => t.type === "MILESTONE_RELEASE" || t.type === "MATERIAL_ALLOCATION")
        .reduce((sum, t) => sum + t.amount, 0) + releasedWithdrawals;

      const protectedBalance = Math.max(0, wallet.totalAmount - executedCost);

      const certId = generateCertificateId();
      const qrUrl = `${req.protocol}://${req.get("host")}/api/certificate/verify/${certId}`;

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: "Certificado de Resguardo de Fondos",
          Author: "Bitcopper - SmartBuild",
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="certificado-resguardo-${certId}.pdf"`);
      doc.pipe(res);

      doc.rect(0, 0, doc.page.width, 120).fill("#1a2744");

      doc.fontSize(22).fillColor("#c77b3f").text("BITCOPPER", 60, 30, { align: "left" });
      doc.fontSize(10).fillColor("#ffffff").text("SmartBuild APU Engine", 60, 55);
      doc.fontSize(16).fillColor("#ffffff").text("Certificado de Resguardo de Fondos", 60, 80, { align: "center" });

      doc.fillColor("#333333");
      doc.moveDown(4);

      doc.fontSize(11).fillColor("#666666").text(`Certificado N°: ${certId}`, { align: "right" });
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}`, { align: "right" });
      doc.moveDown(1.5);

      doc.rect(60, doc.y, doc.page.width - 120, 1).fill("#c77b3f");
      doc.moveDown(1);

      doc.fontSize(13).fillColor("#1a2744").text("Información del Proyecto", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");
      doc.text(`ID de Obra: #${wallet.id}`);
      doc.text(`Descripción: ${wallet.description}`);
      doc.text(`Maestro: ${maestro?.displayName || "N/A"}`);
      doc.text(`Cliente: ${client?.name || "N/A"}`);
      doc.text(`Estado: ${wallet.status}`);
      doc.moveDown(1.5);

      doc.fontSize(13).fillColor("#1a2744").text("Detalle Financiero", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");

      const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;
      doc.text(`Monto Total en Custodia: ${formatCLP(wallet.totalAmount)}`);
      doc.text(`Saldo Protegido: ${formatCLP(protectedBalance)}`);
      doc.text(`Costo Ejecutado: ${formatCLP(executedCost)}`);
      doc.text(`Fondo de Garantía: ${formatCLP(wallet.guaranteeFund)}`);
      doc.moveDown(0.5);
      doc.text(`Tokens Acumulados por Custodia: ${totalRewardTokens.toFixed(2)} tokens`);
      doc.moveDown(1.5);

      doc.rect(60, doc.y, doc.page.width - 120, 1).fill("#c77b3f");
      doc.moveDown(1);

      doc.fontSize(13).fillColor("#1a2744").text("Historial de Transacciones", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#333333");

      const recentTx = transactions.slice(0, 10);
      for (const tx of recentTx) {
        const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("es-CL") : "N/A";
        doc.text(`${date} — ${tx.type}: ${formatCLP(tx.amount)} — ${tx.description}`);
      }
      if (transactions.length > 10) {
        doc.text(`... y ${transactions.length - 10} transacciones más`);
      }
      doc.moveDown(2);

      doc.rect(60, doc.y, doc.page.width - 120, 80).fill("#f5f5f0");
      const boxY = doc.y;
      doc.fontSize(9).fillColor("#666666").text(
        `Este certificado acredita que los fondos indicados se encuentran en custodia bajo el sistema Bitcopper, sujetos a las condiciones del contrato de obra. Los fondos solo se liberan con autorización del cliente.`,
        70, boxY + 10, { width: doc.page.width - 140 }
      );
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#999999").text(`QR de Validación: ${qrUrl}`, 70, boxY + 55);

      doc.moveDown(3);
      doc.rect(60, doc.y, doc.page.width - 120, 1).fill("#c77b3f");
      doc.moveDown(1);

      doc.fontSize(11).fillColor("#1a2744").text("Cláusulas de Resguardo Bitcopper Tech", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#555555");
      doc.text("1. Los fondos depositados en custodia serán liberados únicamente con la autorización expresa del cliente, conforme a los hitos pactados en el contrato de obra.");
      doc.text("2. Bitcopper Tech actúa exclusivamente como custodio tecnológico de los fondos y no como parte contractual entre cliente y maestro.");
      doc.text("3. La liberación parcial o total de fondos no implica garantía sobre la calidad final de la obra, la cual queda sujeta a los acuerdos directos entre las partes.");
      doc.text("4. En caso de disputa, Bitcopper Tech podrá actuar como mediador conforme a los términos del servicio vigentes al momento de la transacción.");
      doc.text("5. Los tokens de rendimiento por custodia se acumulan diariamente sobre el saldo congelado y no constituyen instrumentos financieros regulados.");
      doc.moveDown(1.5);

      doc.fontSize(8).fillColor("#999999").text("Pago Protegido por Bitcopper · SmartBuild APU Engine", { align: "center" });

      doc.end();
    } catch (err) {
      console.error("Error generating certificate:", err);
      res.status(500).json({ error: "Error generando certificado" });
    }
  });

  app.get("/api/certificate/verify/:certId", async (req, res) => {
    try {
      const certId = req.params.certId;
      const walletIdMatch = certId.match(/^CERT-/);
      if (!walletIdMatch) {
        return res.json({ valid: false, certId, message: "Formato de certificado inválido." });
      }
      res.json({
        valid: true,
        certId,
        issuer: "Bitcopper - SmartBuild APU Engine",
        message: "Este certificado fue emitido por el sistema de custodia Bitcopper. Los fondos del proyecto están protegidos.",
        verifiedAt: new Date().toISOString(),
      });
    } catch {
      res.json({ valid: false, message: "Error al verificar certificado." });
    }
  });

  // === Retiro por QR (Withdrawal Requests) ===
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const { projectWalletId, maestroId, clientLeadId, amount } = req.body;
      if (!projectWalletId || !maestroId || !clientLeadId || !amount) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const wallet = await storage.getProjectWallet(projectWalletId);
      if (!wallet) return res.status(404).json({ error: "Wallet no encontrado" });
      if (wallet.maestroAvailable < amount) {
        return res.status(400).json({ error: "Fondos insuficientes" });
      }

      const qrToken = generateWithdrawalToken();
      const wr = await storage.createWithdrawalRequest({
        projectWalletId,
        maestroId,
        clientLeadId,
        amount,
        qrToken,
      });

      res.json(wr);
    } catch (err) {
      res.status(500).json({ error: "Error creando solicitud de retiro" });
    }
  });

  app.get("/api/withdrawals/token/:qrToken", async (req, res) => {
    try {
      const wr = await storage.getWithdrawalRequestByToken(req.params.qrToken);
      if (!wr) return res.status(404).json({ error: "Token no encontrado" });
      res.json(wr);
    } catch (err) {
      res.status(500).json({ error: "Error buscando retiro" });
    }
  });

  app.get("/api/withdrawals/maestro/:maestroId", async (req, res) => {
    try {
      const wrs = await storage.getWithdrawalRequestsByMaestro(parseInt(req.params.maestroId));
      res.json(wrs);
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo retiros" });
    }
  });

  app.get("/api/withdrawals/client/:clientLeadId", async (req, res) => {
    try {
      const wrs = await storage.getWithdrawalRequestsByClient(parseInt(req.params.clientLeadId));
      res.json(wrs);
    } catch (err) {
      res.status(500).json({ error: "Error obteniendo retiros" });
    }
  });

  app.post("/api/withdrawals/:id/scan", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wr = await storage.getWithdrawalRequest(id);
      if (!wr) return res.status(404).json({ error: "Retiro no encontrado" });
      if (wr.status !== WITHDRAWAL_STATUS.PENDING) {
        return res.status(400).json({ error: "Este retiro ya fue procesado" });
      }
      
      const updated = await storage.updateWithdrawalRequest(id, {
        status: WITHDRAWAL_STATUS.QR_SCANNED,
        maestroScannedAt: new Date(),
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Error procesando escaneo" });
    }
  });

  app.post("/api/withdrawals/:id/confirm", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wr = await storage.getWithdrawalRequest(id);
      if (!wr) return res.status(404).json({ error: "Retiro no encontrado" });
      if (wr.status !== WITHDRAWAL_STATUS.QR_SCANNED && wr.status !== WITHDRAWAL_STATUS.PENDING) {
        return res.status(400).json({ error: "Esta solicitud ya fue procesada" });
      }

      const wallet = await storage.getProjectWallet(wr.projectWalletId);
      if (!wallet) return res.status(404).json({ error: "Wallet no encontrado" });
      if (wallet.maestroAvailable < wr.amount) {
        return res.status(400).json({ error: "Fondos insuficientes en wallet" });
      }

      await storage.updateProjectWallet(wr.projectWalletId, {
        maestroAvailable: wallet.maestroAvailable - wr.amount,
      });

      await storage.createWalletTransaction({
        projectWalletId: wr.projectWalletId,
        type: "MILESTONE_RELEASE",
        amount: wr.amount,
        description: `Retiro confirmado por cliente - QR ${wr.qrToken}`,
        fromAccount: "escrow",
        toAccount: "maestro",
      });

      const updated = await storage.updateWithdrawalRequest(id, {
        status: WITHDRAWAL_STATUS.RELEASED,
        clientConfirmedAt: new Date(),
        releasedAt: new Date(),
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Error confirmando retiro" });
    }
  });

  app.post("/api/withdrawals/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      const wr = await storage.getWithdrawalRequest(id);
      if (!wr) return res.status(404).json({ error: "Retiro no encontrado" });

      const updated = await storage.updateWithdrawalRequest(id, {
        status: WITHDRAWAL_STATUS.REJECTED,
        rejectedReason: reason || "Rechazado por cliente",
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Error rechazando retiro" });
    }
  });

  // === Landing Leads (ultra-simple capture) ===
  app.post("/api/landing-leads", async (req, res) => {
    try {
      const { name, phone, tipoObra, role } = req.body;
      if (!name || !phone || !tipoObra || !role) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
      }
      if (!["maestro", "homeowner"].includes(role)) {
        return res.status(400).json({ error: "Rol invalido" });
      }
      const lead = await storage.createLandingLead({ name, phone, tipoObra, role });
      res.json(lead);
    } catch (err) {
      console.error("Error creating landing lead:", err);
      res.status(500).json({ error: "Error al registrar contacto" });
    }
  });

  app.get("/api/landing-leads", isAuthenticated, async (req: any, res) => {
    try {
      const leads = await storage.getAllLandingLeads();
      res.json(leads);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener leads" });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingMaterials = await storage.getMaterials();
  if (existingMaterials.length === 0) {
    
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
