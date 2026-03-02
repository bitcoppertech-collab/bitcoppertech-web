import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_ORANGE = [245, 158, 11] as const;
const DARK_BG = [24, 24, 27] as const;
const HEADER_BG = [39, 39, 42] as const;
const TEXT_WHITE = [250, 250, 250] as const;
const TEXT_MUTED = [161, 161, 170] as const;
const ACCENT_GREEN = [16, 185, 129] as const;
const ACCENT_RED = [244, 63, 94] as const;

function formatCLP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function generateDocId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "SB-";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getTimestamp(): string {
  return new Date().toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export interface PDFSettings {
  companyName?: string | null;
  rut?: string | null;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  logoBase64?: string | null;
  firmaBase64?: string | null;
}

function drawHeader(doc: jsPDF, projectName: string, subtitle: string, settings: PDFSettings, landscape = false) {
  const pageWidth = landscape ? 297 : 210;
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, 40, "F");

  let logoEndX = 15;

  if (settings.logoBase64) {
    try {
      doc.addImage(settings.logoBase64, "PNG", 15, 6, 18, 18);
      logoEndX = 36;
    } catch {
      doc.setDrawColor(...BRAND_ORANGE);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, 6, 20, 18, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...BRAND_ORANGE);
      doc.text("Tu Logo", 25, 14, { align: "center" });
      doc.text("Aquí", 25, 18, { align: "center" });
      logoEndX = 38;
    }
  } else {
    doc.setDrawColor(...BRAND_ORANGE);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 6, 20, 18, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...BRAND_ORANGE);
    doc.text("Tu Logo", 25, 14, { align: "center" });
    doc.text("Aquí", 25, 18, { align: "center" });
    logoEndX = 38;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TEXT_WHITE);
  doc.text(settings.companyName || "SmartBuild", logoEndX + 2, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("APU Engine", logoEndX + 2, 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text(projectName, 15, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(subtitle, pageWidth - 15, 32, { align: "right" });

  doc.text(getFormattedDate(), pageWidth - 15, 14, { align: "right" });
}

function drawSignatureBox(doc: jsPDF, y: number, settings: PDFSettings, landscape = false) {
  const pageWidth = landscape ? 297 : 210;
  const boxWidth = 80;
  const boxX = pageWidth / 2 - boxWidth / 2;

  if (settings.firmaBase64) {
    try {
      doc.addImage(settings.firmaBase64, "PNG", boxX + 15, y, 50, 25);
    } catch {}
  }

  doc.setDrawColor(161, 161, 170);
  doc.setLineWidth(0.3);
  doc.line(boxX, y + 28, boxX + boxWidth, y + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_WHITE);
  doc.text("Firma Digital Autorizada", pageWidth / 2, y + 34, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  if (settings.companyName) {
    doc.text(settings.companyName, pageWidth / 2, y + 39, { align: "center" });
  }

  const validationDate = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } as Intl.DateTimeFormatOptions);
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text(`Documento validado digitalmente el ${validationDate}`, pageWidth / 2, y + 44, { align: "center" });
}

function drawFooter(doc: jsPDF, settings: PDFSettings, docId: string, timestamp: string, landscape = false) {
  const pageWidth = landscape ? 297 : 210;
  const pageHeight = landscape ? 210 : 297;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...HEADER_BG);
    doc.rect(0, pageHeight - 24, pageWidth, 24, "F");

    doc.setDrawColor(...BRAND_ORANGE);
    doc.setLineWidth(0.4);
    doc.line(15, pageHeight - 24, pageWidth - 15, pageHeight - 24);

    const leftX = 15;
    const rightX = pageWidth - 15;
    let lineY = pageHeight - 19;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND_ORANGE);
    const company = settings.companyName || "SmartBuild";
    const rut = settings.rut ? ` | RUT: ${settings.rut}` : "";
    doc.text(`${company}${rut}`, leftX, lineY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Página ${i} de ${pageCount}`, rightX, lineY, { align: "right" });

    lineY += 4;
    const emailStr = settings.email ? `Email: ${settings.email}` : "";
    const phoneStr = settings.phone ? `Tel: ${settings.phone}` : "";
    const contactLine = [emailStr, phoneStr].filter(Boolean).join("  |  ");
    if (contactLine) {
      doc.text(contactLine, leftX, lineY);
    }

    lineY += 4;
    const addr = settings.address || "";
    const contact = settings.contact || "";
    const addrLine = [addr, contact].filter(Boolean).join(" | ");
    if (addrLine) {
      doc.setFontSize(5.5);
      doc.text(addrLine, leftX, lineY);
    }

    lineY += 4;
    doc.setFontSize(5.5);
    doc.text(`Generado: ${timestamp}  |  ID: ${docId}`, leftX, lineY);
    doc.text("\u00A9 2026 SmartBuild APU Engine \u2014 Bitcoper Tech SpA. Todos los derechos reservados.", rightX, lineY, { align: "right" });
  }
}

interface FinancialData {
  excel: {
    netoMateriales: number;
    gastosGeneralesPercent: number;
    gastosGeneralesAmount: number;
    utilidadPercent: number;
    utilidadAmount: number;
    ivaPercent: number;
    ivaAmount: number;
    total: number;
  };
  real: {
    netoMateriales: number;
    gastosGeneralesPercent: number;
    gastosGeneralesAmount: number;
    utilidadPercent: number;
    utilidadAmount: number;
    ivaPercent: number;
    ivaAmount: number;
    total: number;
  };
  margenManiobra: {
    deltaAmount: number;
    deltaPercent: number;
    status: string;
    utilidadRealPercent: number;
  };
  hasAnalysis: boolean;
}

interface BudgetItem {
  id: number;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string | null;
  totalPrice: string | null;
  status: string | null;
  commercialDescription: string | null;
  marketPrice: string | null;
  supplier: string | null;
}

export function exportPresupuestoPDF(
  projectName: string,
  items: BudgetItem[],
  financials: FinancialData,
  settings: PDFSettings = {}
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const docId = generateDocId();
  const timestamp = getTimestamp();

  drawHeader(doc, projectName, "Presupuesto de Obra", settings);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_WHITE);
  doc.text("Detalle de Partidas", 15, 50);

  autoTable(doc, {
    startY: 54,
    head: [["#", "Descripción", "Unidad", "Cantidad", "P. Unitario", "Total"]],
    body: items.map((item, i) => [
      (i + 1).toString(),
      item.description,
      item.unit || "-",
      Number(item.quantity).toLocaleString("es-CL"),
      item.unitPrice ? formatCLP(Number(item.unitPrice)) : "-",
      item.totalPrice ? formatCLP(Number(item.totalPrice)) : "-",
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: [...TEXT_WHITE] as [number, number, number],
      cellPadding: 3,
      lineColor: [63, 63, 70],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...HEADER_BG] as [number, number, number],
      textColor: [...BRAND_ORANGE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [30, 30, 34] as [number, number, number],
    },
    bodyStyles: {
      fillColor: [...DARK_BG] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 15, right: 15, bottom: 32 },
    pageBreak: "auto",
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(...DARK_BG);
        doc.rect(0, 0, 210, 10, "F");
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  let currentY = finalY + 10;

  if (currentY > 190) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(15, currentY, 180, 85, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text("Desglose Financiero", 25, currentY + 10);

  const col1X = 25;
  const col2X = 110;
  let rowY = currentY + 20;

  const drawFinRow = (label: string, excelVal: string, realVal: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label, col1X, rowY);
    const excelColor = bold ? BRAND_ORANGE : TEXT_WHITE;
    doc.setTextColor(excelColor[0], excelColor[1], excelColor[2]);
    doc.text(excelVal, col1X + 60, rowY, { align: "right" });
    const realColor = bold ? ACCENT_GREEN : TEXT_WHITE;
    doc.setTextColor(realColor[0], realColor[1], realColor[2]);
    doc.text(realVal, col2X + 60, rowY, { align: "right" });
    rowY += 7;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text("Licitado (Excel)", col1X + 60, rowY - 5, { align: "right" });
  doc.setTextColor(...ACCENT_GREEN);
  doc.text("Real (Live)", col2X + 60, rowY - 5, { align: "right" });
  rowY += 2;

  drawFinRow("Costo Directo Neto", formatCLP(financials.excel.netoMateriales), formatCLP(financials.real.netoMateriales));
  drawFinRow(`Gastos Generales (${financials.excel.gastosGeneralesPercent}%)`, formatCLP(financials.excel.gastosGeneralesAmount), formatCLP(financials.real.gastosGeneralesAmount));
  drawFinRow(`Utilidad (${financials.excel.utilidadPercent}%)`, formatCLP(financials.excel.utilidadAmount), formatCLP(financials.real.utilidadAmount));

  const excelSubFacturable = financials.excel.netoMateriales + financials.excel.gastosGeneralesAmount + financials.excel.utilidadAmount;
  const realSubFacturable = financials.real.netoMateriales + financials.real.gastosGeneralesAmount + financials.real.utilidadAmount;
  doc.setDrawColor(63, 63, 70);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(col1X, rowY - 3, col2X + 60, rowY - 3);
  doc.setLineDashPattern([], 0);
  drawFinRow("Subtotal Neto Facturable", formatCLP(excelSubFacturable), formatCLP(realSubFacturable));

  drawFinRow(`IVA (${financials.excel.ivaPercent}%)`, formatCLP(financials.excel.ivaAmount), formatCLP(financials.real.ivaAmount));

  doc.setDrawColor(63, 63, 70);
  doc.line(col1X, rowY - 3, col2X + 60, rowY - 3);
  rowY += 2;

  drawFinRow("TOTAL PROYECTO", formatCLP(financials.excel.total), formatCLP(financials.real.total), true);

  let sigY = currentY + 90;
  if (sigY > 230) {
    doc.addPage();
    sigY = 30;
  }
  drawSignatureBox(doc, sigY, settings);

  drawFooter(doc, settings, docId, timestamp);
  doc.save(`SmartBuild_Presupuesto_${projectName.replace(/\s+/g, "_")}.pdf`);
}

export function exportAPUDetailPDF(
  projectName: string,
  items: BudgetItem[],
  settings: PDFSettings = {}
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const docId = generateDocId();
  const timestamp = getTimestamp();

  drawHeader(doc, projectName, "Análisis de Precios Unitarios (APU)", settings);

  let currentY = 48;
  const matchedItems = items.filter((i) => i.status === "matched" && i.marketPrice);
  const unmatchedItems = items.filter((i) => i.status !== "matched" || !i.marketPrice);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_WHITE);
  doc.text("Partidas Analizadas", 15, currentY);
  currentY += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`${matchedItems.length} partidas vinculadas a precios de mercado`, 15, currentY + 4);
  currentY += 10;

  if (matchedItems.length > 0) {
    const deltaValues = matchedItems.map((item) => {
      const budgetPrice = Number(item.unitPrice || 0);
      const mktPrice = Number(item.marketPrice || 0);
      return mktPrice - budgetPrice;
    });

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Descripción Original", "Material Comercial", "Proveedor", "P. Presupuesto", "P. Mercado", "Δ Precio"]],
      body: matchedItems.map((item, i) => {
        const budgetPrice = Number(item.unitPrice || 0);
        const mktPrice = Number(item.marketPrice || 0);
        const delta = deltaValues[i];
        const deltaStr = delta > 0 ? `+${formatCLP(delta)}` : delta < 0 ? `-${formatCLP(Math.abs(delta))}` : formatCLP(0);
        return [
          (i + 1).toString(),
          item.description,
          item.commercialDescription || "-",
          item.supplier || "WEB",
          budgetPrice ? formatCLP(budgetPrice) : "-",
          formatCLP(mktPrice),
          deltaStr,
        ];
      }),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        textColor: [...TEXT_WHITE] as [number, number, number],
        cellPadding: 2.5,
        lineColor: [63, 63, 70],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [...HEADER_BG] as [number, number, number],
        textColor: [...BRAND_ORANGE] as [number, number, number],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [30, 30, 34] as [number, number, number],
      },
      bodyStyles: {
        fillColor: [...DARK_BG] as [number, number, number],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 22, halign: "right" },
      },
      margin: { left: 15, right: 15, bottom: 32 },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 6) {
          const rowIndex = data.row.index;
          const numDelta = deltaValues[rowIndex];
          if (numDelta > 0) {
            data.cell.styles.textColor = [...ACCENT_RED];
          } else if (numDelta < 0) {
            data.cell.styles.textColor = [...ACCENT_GREEN];
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  }

  if (unmatchedItems.length > 0) {
    currentY += 10;
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Partidas Sin Vincular", 15, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Descripción", "Unidad", "Cantidad", "P. Unitario", "Total"]],
      body: unmatchedItems.map((item, i) => [
        (i + 1).toString(),
        item.description,
        item.unit || "-",
        Number(item.quantity).toLocaleString("es-CL"),
        item.unitPrice ? formatCLP(Number(item.unitPrice)) : "-",
        item.totalPrice ? formatCLP(Number(item.totalPrice)) : "-",
      ]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [...TEXT_MUTED] as [number, number, number],
        cellPadding: 2.5,
        lineColor: [63, 63, 70],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [...HEADER_BG] as [number, number, number],
        textColor: [...TEXT_MUTED] as [number, number, number],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        fillColor: [...DARK_BG] as [number, number, number],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 15, right: 15, bottom: 32 },
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  }

  let sigY = currentY + 15;
  if (sigY > 230) {
    doc.addPage();
    sigY = 30;
  }
  drawSignatureBox(doc, sigY, settings);

  drawFooter(doc, settings, docId, timestamp);
  doc.save(`SmartBuild_APU_${projectName.replace(/\s+/g, "_")}.pdf`);
}

export function exportGanttPDF(
  projectName: string,
  items: BudgetItem[],
  settings: PDFSettings = {}
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const docId = generateDocId();
  const timestamp = getTimestamp();

  drawHeader(doc, projectName, "Carta Gantt — Cronograma de Obra", settings, true);

  const ganttData = items.map((item, index) => {
    const quantity = parseFloat(item.quantity) || 0;
    const durationDays = Math.max(1, Math.ceil(quantity / 250));
    const previousItems = items.slice(0, index);
    const startOffset = previousItems.reduce(
      (acc, curr) => acc + Math.max(1, Math.ceil((parseFloat(curr.quantity) || 0) / 250)),
      0
    );
    return {
      name: item.description,
      start: startOffset,
      duration: durationDays,
      end: startOffset + durationDays,
    };
  });

  const totalDays = ganttData.length > 0 ? Math.max(...ganttData.map((d) => d.end)) : 1;

  const marginLeft = 15;
  const labelWidth = 65;
  const chartLeft = marginLeft + labelWidth + 3;
  const chartRight = 297 - 15;
  const chartWidth = chartRight - chartLeft;
  const barHeight = 6;
  const rowGap = 3;
  const rowHeight = barHeight + rowGap;
  let startY = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Actividad", marginLeft, startY - 2);
  doc.text("Línea de Tiempo (días)", chartLeft, startY - 2);

  const tickCount = Math.min(totalDays, 20);
  const tickInterval = Math.ceil(totalDays / tickCount);
  doc.setFontSize(6);
  doc.setTextColor(...TEXT_MUTED);
  for (let d = 0; d <= totalDays; d += tickInterval) {
    const tx = chartLeft + (d / totalDays) * chartWidth;
    doc.text(`D${d}`, tx, startY - 6, { align: "center" });
    doc.setDrawColor(63, 63, 70);
    doc.setLineWidth(0.1);
    doc.line(tx, startY - 4, tx, startY + ganttData.length * rowHeight);
  }

  const maxRowsPerPage = Math.floor((210 - startY - 55) / rowHeight);

  ganttData.forEach((task, i) => {
    if (i > 0 && i % maxRowsPerPage === 0) {
      doc.addPage("a4", "landscape");
      startY = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Actividad", marginLeft, startY - 2);
      doc.text("Línea de Tiempo (días)", chartLeft, startY - 2);

      for (let d = 0; d <= totalDays; d += tickInterval) {
        const tx = chartLeft + (d / totalDays) * chartWidth;
        doc.setFontSize(6);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`D${d}`, tx, startY - 6, { align: "center" });
        doc.setDrawColor(63, 63, 70);
        doc.setLineWidth(0.1);
        doc.line(tx, startY - 4, tx, startY + Math.min(ganttData.length - i, maxRowsPerPage) * rowHeight);
      }
    }

    const rowIndex = i % maxRowsPerPage;
    const y = startY + rowIndex * rowHeight;

    if (rowIndex % 2 === 0) {
      doc.setFillColor(30, 30, 34);
      doc.rect(marginLeft, y - 1, chartRight - marginLeft, rowHeight, "F");
    }

    const label = task.name.length > 35 ? task.name.substring(0, 35) + "..." : task.name;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_WHITE);
    doc.text(label, marginLeft + 2, y + barHeight - 1.5);

    const barX = chartLeft + (task.start / totalDays) * chartWidth;
    const barW = Math.max(2, (task.duration / totalDays) * chartWidth);
    doc.setFillColor(...BRAND_ORANGE);
    doc.roundedRect(barX, y, barW, barHeight, 1, 1, "F");

    if (barW > 12) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${task.duration}d`, barX + barW / 2, y + barHeight - 1.8, { align: "center" });
    }
  });

  const lastRowY = startY + Math.min(ganttData.length % maxRowsPerPage || maxRowsPerPage, ganttData.length) * rowHeight;

  let summaryY = lastRowY + 8;
  if (summaryY > 145) {
    doc.addPage("a4", "landscape");
    summaryY = 20;
  }

  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(marginLeft, summaryY, 120, 16, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text("Resumen:", marginLeft + 5, summaryY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_WHITE);
  doc.text(`${ganttData.length} actividades`, marginLeft + 35, summaryY + 6);
  doc.text(`Duración total estimada: ${totalDays} días`, marginLeft + 5, summaryY + 12);

  drawSignatureBox(doc, summaryY + 22, settings, true);

  drawFooter(doc, settings, docId, timestamp, true);
  doc.save(`SmartBuild_Gantt_${projectName.replace(/\s+/g, "_")}.pdf`);
}
