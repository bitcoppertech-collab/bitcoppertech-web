// ── IMPORTAR AL INICIO DE server/index.ts ────────────────────────
// import { apuItems, subcontratos } from "../shared/schema";
// import multer from "multer";
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
//
// npm install multer @types/multer   (en smartbuild-enterprise)

// ── ENDPOINT: POST /api/projects/:id/import ──────────────────────
// Pegar en server/index.ts, antes del último app.listen(...)

app.post("/api/projects/:id/import", requireAuth, upload.single("file"), async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);

  if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

  let payload: any;
  try {
    payload = JSON.parse(req.file.buffer.toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "Archivo JSON inválido" });
  }

  // Validación básica del schema
  if (!payload.capitulos || !Array.isArray(payload.capitulos)) {
    return res.status(400).json({ error: "El archivo no tiene el formato .smartbuild esperado" });
  }

  try {
    let totalPresupuesto = 0;
    let sortOrder = 0;
    const createdPartidas: any[] = [];

    for (const capitulo of payload.capitulos) {
      for (const p of capitulo.partidas ?? []) {
        const presupuesto = (p.cantidad ?? 1) * (p.precioUnitarioUF ?? 0);
        totalPresupuesto += presupuesto;

        // Crear partida
        const [partida] = await db.insert(partidas).values({
          projectId,
          nombre: p.nombre,
          categoria: capitulo.nombre,
          unidad: p.unidad ?? "gl",
          presupuesto: presupuesto.toFixed(2),
          ejecutado: "0",
          avance: 0,
          inicio: p.inicioTimeline ?? 0,
          fin: p.finTimeline ?? 100,
          estado: "pendiente",
          sortOrder: sortOrder++,
          // campos extras si ya migraste:
          // codigoApu: p.codigo,
          // cantidad: p.cantidad,
          // precioUnitarioUF: p.precioUnitarioUF,
          // capitulo: capitulo.codigo,
        }).returning();

        createdPartidas.push(partida);

        // Insertar APU items
        for (const apu of p.apu ?? []) {
          const total = (apu.cantidad ?? 0) * (apu.precioUF ?? 0);
          await db.insert(apuItems).values({
            partidaId: partida.id,
            tipo: apu.tipo ?? "material",
            descripcion: apu.descripcion,
            unidad: apu.unidad,
            cantidad: (apu.cantidad ?? 0).toString(),
            precioUnitarioUF: (apu.precioUF ?? 0).toString(),
            totalUF: total.toFixed(4),
          });
        }

        // Insertar subcontratos
        for (const sub of p.subcontratos ?? []) {
          await db.insert(subcontratos).values({
            partidaId: partida.id,
            proveedor: sub.proveedor,
            descripcion: sub.descripcion ?? null,
            montoUF: (sub.montoUF ?? 0).toString(),
            estado: "pendiente",
          });

          // También registrar como pago pendiente
          await db.insert(pagos).values({
            projectId,
            partidaId: partida.id,
            nombrePartida: partida.nombre,
            monto: (sub.montoUF ?? 0).toString(),
            fecha: new Date(),
            estado: "pendiente",
            descripcion: `Subcontrato importado: ${sub.proveedor}`,
            proveedor: sub.proveedor,
          });
        }
      }
    }

    // Actualizar totalBudget del proyecto
    await db.update(projects)
      .set({ totalBudget: totalPresupuesto.toFixed(2), updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    res.json({
      ok: true,
      importado: {
        partidas: createdPartidas.length,
        totalUF: totalPresupuesto.toFixed(2),
        capitulos: payload.capitulos.length,
      }
    });

  } catch (e: any) {
    console.error("Import error:", e);
    res.status(500).json({ error: "Error al importar: " + e.message });
  }
});

// ── GET APU ITEMS de una partida ──────────────────────────────────
app.get("/api/partidas/:id/apu", requireAuth, async (req: any, res: any) => {
  const list = await db.select().from(apuItems)
    .where(eq(apuItems.partidaId, parseInt(req.params.id)));
  res.json(list);
});

// ── GET SUBCONTRATOS de una partida ──────────────────────────────
app.get("/api/partidas/:id/subcontratos", requireAuth, async (req: any, res: any) => {
  const list = await db.select().from(subcontratos)
    .where(eq(subcontratos.partidaId, parseInt(req.params.id)));
  res.json(list);
});
