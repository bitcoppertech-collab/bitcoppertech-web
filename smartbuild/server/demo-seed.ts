import { storage } from "./storage";

export async function seedDemoProject(ownerId: string) {
  try {
    const existing = await storage.getProjects(ownerId);
    if (existing.length > 0) return;

    const project = await storage.createProject(
      {
        name: "Proyecto Demo: Casa Modelo",
        description: "Proyecto de ejemplo pre-cargado con presupuesto real de una casa habitacional de 120m². Explora las funcionalidades de SmartBuild: análisis de precios, comparación Sodimac vs Easy, y control de costos.",
        client: "Cliente Demo",
        status: "completed",
        totalBudget: "85000000",
      },
      ownerId
    );

    const demoItems = [
      { description: "Excavación y movimiento de tierra", unit: "m3", quantity: "45", unitPrice: "12500", totalPrice: "562500" },
      { description: "Hormigón H-30 para fundaciones", unit: "m3", quantity: "18", unitPrice: "95000", totalPrice: "1710000" },
      { description: "Acero estructural A63-42H barras 12mm", unit: "kg", quantity: "2800", unitPrice: "1150", totalPrice: "3220000" },
      { description: "Enfierradura malla acma C-139", unit: "m2", quantity: "120", unitPrice: "4500", totalPrice: "540000" },
      { description: "Moldaje madera terciado 18mm", unit: "m2", quantity: "95", unitPrice: "8500", totalPrice: "807500" },
      { description: "Albañilería ladrillo fiscal", unit: "m2", quantity: "180", unitPrice: "18500", totalPrice: "3330000" },
      { description: "Cemento Melón Especial 25kg", unit: "saco", quantity: "350", unitPrice: "4500", totalPrice: "1575000" },
      { description: "Arena gruesa", unit: "m3", quantity: "25", unitPrice: "22000", totalPrice: "550000" },
      { description: "Gravilla 3/4\"", unit: "m3", quantity: "15", unitPrice: "18000", totalPrice: "270000" },
      { description: "Madera pino 2x4\" cepillada", unit: "pulgada", quantity: "850", unitPrice: "1200", totalPrice: "1020000" },
      { description: "Plancha PV4 Zinc Alum 0.4mm x 3.6m", unit: "un", quantity: "65", unitPrice: "12500", totalPrice: "812500" },
      { description: "Aislación lana mineral 80mm", unit: "m2", quantity: "120", unitPrice: "5800", totalPrice: "696000" },
      { description: "Plancha yeso cartón 12.5mm STD", unit: "un", quantity: "85", unitPrice: "4200", totalPrice: "357000" },
      { description: "Cerámica piso 45x45 antideslizante", unit: "m2", quantity: "95", unitPrice: "8900", totalPrice: "845500" },
      { description: "Pintura látex interior blanco 4L", unit: "un", quantity: "28", unitPrice: "15900", totalPrice: "445200" },
      { description: "Tubería PVC sanitario 110mm x 3m", unit: "un", quantity: "15", unitPrice: "8500", totalPrice: "127500" },
      { description: "Tubería cobre tipo L 1/2\" x 3m", unit: "un", quantity: "20", unitPrice: "12800", totalPrice: "256000" },
      { description: "Cable eléctrico THHN 2.5mm²", unit: "m", quantity: "450", unitPrice: "650", totalPrice: "292500" },
      { description: "Tablero eléctrico 12 polos", unit: "un", quantity: "1", unitPrice: "45000", totalPrice: "45000" },
      { description: "Ventana aluminio corredera 120x120", unit: "un", quantity: "8", unitPrice: "89000", totalPrice: "712000" },
      { description: "Puerta interior MDF 80x200", unit: "un", quantity: "6", unitPrice: "55000", totalPrice: "330000" },
      { description: "Puerta principal madera sólida", unit: "un", quantity: "1", unitPrice: "185000", totalPrice: "185000" },
      { description: "Grifería lavaplatos monocomando", unit: "un", quantity: "1", unitPrice: "35000", totalPrice: "35000" },
      { description: "WC completo con estanque", unit: "un", quantity: "2", unitPrice: "65000", totalPrice: "130000" },
      { description: "Lavamanos pedestal blanco", unit: "un", quantity: "2", unitPrice: "32000", totalPrice: "64000" },
    ];

    const bulkItems = demoItems.map((item) => ({
      projectId: project.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      status: "pending",
    }));

    await storage.createBudgetItemsBulk(bulkItems);

    await storage.updateProject(project.id, {
      subtotalNeto: "18928200",
      gastosGeneralesPercent: "15",
      utilidadPercent: "10",
      ivaPercent: "19",
      totalExcel: "85000000",
    });
  } catch (err) {
    console.error("[Demo Seed] Error creating demo project:", err);
  }
}
