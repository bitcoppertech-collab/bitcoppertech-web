import * as dotenv from "dotenv";
import { signToken, requireAuth as jwtAuth } from "./auth";
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}
import express from "express";
import session from "express-session";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import multer from "multer";
import { apuItems, subcontratos } from "../shared/schema";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
import { Pool } from "pg";
import { eq, desc, and } from "drizzle-orm";
import { users, projects, partidas, pagos, alertas, demoRequests, libroObra,
  insertProjectSchema, insertPartidaSchema, insertPagoSchema, insertDemoRequestSchema, insertLibroObraSchema
} from "../shared/schema";

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',');
app.use(cors({ origin: (origin, cb) => { if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) cb(null,true); else cb(new Error('CORS')); }, credentials: true }));
app.use(express.json());
// Sessions replaced by JWT

// ── AUTH MIDDLEWARE ────────────────────────────────────────────────
const requireAuth = jwtAuth;

const requireAdmin = async (req: any, res: any, next: any) => {
  jwtAuth(req, res, async () => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Sin permisos" });
    req.user = user;
    next();
  });
};

// ── AUTH ROUTES ───────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Faltan campos" });
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user || !user.isActive) return res.status(401).json({ error: "Usuario no encontrado" });
    // Simple compare — in production use bcrypt
    if (user.password !== password) return res.status(401).json({ error: "Contraseña incorrecta" });
    const token = signToken({ userId: user.id, userRole: user.role });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, companyName: user.companyName, token });
  } catch (e: any) {
    console.error("LOGIN ERROR:", e.message, e.stack);
    res.status(500).json({ error: e.message ?? "Error del servidor" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/me", jwtAuth, async (req: any, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId));
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, companyName: user.companyName });
});

// ── PROJECTS ──────────────────────────────────────────────────────
app.get("/api/projects", requireAuth, async (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;
  const list = userRole === "admin"
    ? await db.select().from(projects).orderBy(desc(projects.createdAt))
    : await db.select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.createdAt));
  res.json(list);
});

app.get("/api/projects/:id", requireAuth, async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, parseInt(req.params.id)));
  if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });
  res.json(project);
});

app.post("/api/projects", requireAuth, async (req, res) => {
  const parsed = insertProjectSchema.safeParse({ ...req.body, ownerId: req.userId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [created] = await db.insert(projects).values(parsed.data).returning();
  res.status(201).json(created);
});

app.put("/api/projects/:id", requireAuth, async (req, res) => {
  const [updated] = await db.update(projects).set({ ...req.body, updatedAt: new Date() })
    .where(eq(projects.id, parseInt(req.params.id))).returning();
  res.json(updated);
});

// ── PARTIDAS ──────────────────────────────────────────────────────
app.get("/api/projects/:id/partidas", requireAuth, async (req, res) => {
  const list = await db.select().from(partidas)
    .where(eq(partidas.projectId, parseInt(req.params.id)))
    .orderBy(partidas.sortOrder);
  res.json(list);
});

app.post("/api/projects/:id/partidas", requireAuth, async (req, res) => {
  const parsed = insertPartidaSchema.safeParse({ ...req.body, projectId: parseInt(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [created] = await db.insert(partidas).values(parsed.data).returning();

  // Auto-generate alerta if deviation
  const ejecutado = parseFloat(created.ejecutado ?? "0");
  const presupuesto = parseFloat(created.presupuesto ?? "0");
  if (presupuesto > 0) {
    const dev = ((ejecutado - presupuesto) / presupuesto) * 100;
    if (dev > 8) {
      await db.insert(alertas).values({
        projectId: parseInt(req.params.id), partidaId: created.id, tipo: "danger",
        titulo: `${created.nombre} — desviación +${dev.toFixed(1)}%`,
        descripcion: `Ejecutado UF ${ejecutado} vs presupuesto UF ${presupuesto}.`
      });
    }
  }
  res.status(201).json(created);
});

app.put("/api/partidas/:id", requireAuth, async (req, res) => {
  const [updated] = await db.update(partidas).set({ ...req.body, updatedAt: new Date() })
    .where(eq(partidas.id, parseInt(req.params.id))).returning();

  // Recalculate estado
  const ej = parseFloat(updated.ejecutado ?? "0");
  const pre = parseFloat(updated.presupuesto ?? "0");
  const dev = pre > 0 ? ((ej - pre) / pre) * 100 : 0;
  const pg = pre > 0 ? (ej / pre) * 100 : 0;
  let estado = "pendiente";
  if (updated.avance > 0 || ej > 0) {
    if (dev > 8 || (pg > 90 && updated.avance < 80)) estado = "danger";
    else if (dev > 3 || (pg > 80 && updated.avance < 60)) estado = "warn";
    else estado = "ok";
  }
  const [final] = await db.update(partidas).set({ estado }).where(eq(partidas.id, updated.id)).returning();
  res.json(final);
});

// ── PAGOS ─────────────────────────────────────────────────────────
app.get("/api/projects/:id/pagos", requireAuth, async (req, res) => {
  const list = await db.select().from(pagos)
    .where(eq(pagos.projectId, parseInt(req.params.id)))
    .orderBy(desc(pagos.fecha));
  res.json(list);
});

app.post("/api/projects/:id/pagos", requireAuth, async (req, res) => {
  const parsed = insertPagoSchema.safeParse({ ...req.body, projectId: parseInt(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [created] = await db.insert(pagos).values(parsed.data).returning();

  // Update partida ejecutado
  if (created.partidaId) {
    const [p] = await db.select().from(partidas).where(eq(partidas.id, created.partidaId));
    if (p) {
      const newEj = parseFloat(p.ejecutado ?? "0") + parseFloat(created.monto);
      await db.update(partidas).set({ ejecutado: newEj.toString(), updatedAt: new Date() })
        .where(eq(partidas.id, p.id));
    }
  }

  // Update project totalExecuted
  const allPagos = await db.select().from(pagos).where(eq(pagos.projectId, parseInt(req.params.id)));
  const totalEj = allPagos.reduce((s, p) => s + parseFloat(p.monto), 0);
  await db.update(projects).set({ totalExecuted: totalEj.toString(), updatedAt: new Date() })
    .where(eq(projects.id, parseInt(req.params.id)));

  res.status(201).json(created);
});

// ── ALERTAS ───────────────────────────────────────────────────────
app.get("/api/projects/:id/alertas", requireAuth, async (req, res) => {
  const list = await db.select().from(alertas)
    .where(and(eq(alertas.projectId, parseInt(req.params.id)), eq(alertas.leida, false)))
    .orderBy(desc(alertas.createdAt));
  res.json(list);
});

app.put("/api/alertas/:id/leer", requireAuth, async (req, res) => {
  await db.update(alertas).set({ leida: true }).where(eq(alertas.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// ── DASHBOARD STATS ───────────────────────────────────────────────
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;
  const allProjects = userRole === "admin"
    ? await db.select().from(projects)
    : await db.select().from(projects).where(eq(projects.ownerId, userId));

  const totalBudget = allProjects.reduce((s, p) => s + parseFloat(p.totalBudget ?? "0"), 0);
  const totalExecuted = allProjects.reduce((s, p) => s + parseFloat(p.totalExecuted ?? "0"), 0);
  const avgProgress = allProjects.length
    ? Math.round(allProjects.reduce((s, p) => s + (p.globalProgress ?? 0), 0) / allProjects.length) : 0;

  res.json({
    totalProjects: allProjects.length,
    activeProjects: allProjects.filter(p => p.status === "activo").length,
    totalBudget, totalExecuted, avgProgress,
    deviation: totalBudget > 0 ? ((totalExecuted - totalBudget) / totalBudget * 100) : 0,
  });
});

// ── ADMIN: DEMO REQUESTS ──────────────────────────────────────────
app.post("/api/demo-requests", async (req, res) => {
  const parsed = insertDemoRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [created] = await db.insert(demoRequests).values(parsed.data).returning();
  res.status(201).json(created);
});

app.get("/api/admin/demo-requests", requireAdmin, async (req, res) => {
  const list = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  res.json(list);
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const list = await db.select().from(users).orderBy(desc(users.createdAt));
  res.json(list);
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const [created] = await db.insert(users).values(req.body).returning();
  res.status(201).json(created);
});

app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const [updated] = await db.update(users).set(req.body).where(eq(users.id, parseInt(req.params.id))).returning();
  res.json(updated);
});

// ── SEED ADMIN ────────────────────────────────────────────────────
app.post("/api/seed-admin", async (req, res) => {
  const existing = await db.select().from(users).where(eq(users.email, "bitcoppertech@gmail.com"));
  if (existing.length > 0) return res.json({ ok: true, message: "Admin ya existe" });
  const [admin] = await db.insert(users).values({
    email: "bitcoppertech@gmail.com",
    password: "SmartBuild2026!",
    name: "Pedro Ramos",
    role: "admin",
    companyName: "Bitcopper Tech SpA",
    plan: "enterprise",
    isActive: true,
  }).returning();
  res.status(201).json({ ok: true, admin: { email: admin.email, role: admin.role } });
});
app.post("/api/projects/:id/import", requireAuth, upload.single("file"), async (req: any, res: any) => {
  const projectId = parseInt(req.params.id);
  if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });
  let payload: any;
  try { payload = JSON.parse(req.file.buffer.toString("utf-8")); }
  catch { return res.status(400).json({ error: "Archivo JSON inválido" }); }
  if (!payload.capitulos || !Array.isArray(payload.capitulos))
    return res.status(400).json({ error: "Formato .smartbuild inválido" });
  try {
    let totalPresupuesto = 0;
    let sortOrder = 0;
    let totalPartidas = 0;
    for (const capitulo of payload.capitulos) {
      for (const p of capitulo.partidas ?? []) {
        const presupuesto = (p.cantidad ?? 1) * (p.precioUnitarioUF ?? 0);
        totalPresupuesto += presupuesto;
        const [partida] = await db.insert(partidas).values({
          projectId, nombre: p.nombre, categoria: capitulo.nombre,
          unidad: p.unidad ?? "gl", presupuesto: presupuesto.toFixed(2),
          ejecutado: "0", avance: 0, inicio: p.inicioTimeline ?? 0,
          fin: p.finTimeline ?? 100, estado: "pendiente", sortOrder: sortOrder++,
        }).returning();
        totalPartidas++;
        for (const apu of p.apu ?? []) {
          await db.insert(apuItems).values({
            partidaId: partida.id, tipo: apu.tipo ?? "material",
            descripcion: apu.descripcion, unidad: apu.unidad,
            cantidad: (apu.cantidad ?? 0).toString(),
            precioUnitarioUF: (apu.precioUF ?? apu.precioUnitarioUF ?? 0).toString(),
            totalUF: ((apu.cantidad ?? 0) * (apu.precioUF ?? apu.precioUnitarioUF ?? 0)).toFixed(4),
          });
        }
        for (const sub of p.subcontratos ?? []) {
          await db.insert(subcontratos).values({
            partidaId: partida.id, proveedor: sub.proveedor,
            descripcion: sub.descripcion ?? null,
            montoUF: (sub.montoUF ?? 0).toString(), estado: "pendiente",
          });
          await db.insert(pagos).values({
            projectId, partidaId: partida.id, nombrePartida: partida.nombre,
            monto: (sub.montoUF ?? 0).toString(), fecha: new Date(),
            estado: "pendiente", proveedor: sub.proveedor,
            descripcion: `Subcontrato: ${sub.proveedor}`,
          });
        }
      }
    }
    await db.update(projects).set({ totalBudget: totalPresupuesto.toFixed(2), updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    res.json({ ok: true, importado: { partidas: totalPartidas, totalUF: totalPresupuesto.toFixed(2), capitulos: payload.capitulos.length } });
  } catch (e: any) {
    res.status(500).json({ error: "Error al importar: " + e.message });
  }
});

app.get("/api/partidas/:id/apu", requireAuth, async (req: any, res: any) => {
  const list = await db.select().from(apuItems).where(eq(apuItems.partidaId, parseInt(req.params.id)));
  res.json(list);
});

app.get("/api/partidas/:id/subcontratos", requireAuth, async (req: any, res: any) => {
  const list = await db.select().from(subcontratos).where(eq(subcontratos.partidaId, parseInt(req.params.id)));
  res.json(list);
});
app.get("/api/projects/:id/lps/semanas", requireAuth, async (req: any, res: any) => {
  const result = await pool.query(
    `SELECT s.*, COUNT(c.id) as total_compromisos,
     SUM(CASE WHEN c.cumplido = true THEN 1 ELSE 0 END) as cumplidos
     FROM ent_lps_semanas s
     LEFT JOIN ent_lps_compromisos c ON c.semana_id = s.id
     WHERE s.project_id = $1
     GROUP BY s.id
     ORDER BY s.fecha_inicio DESC`,
    [parseInt(req.params.id)]
  );
  res.json(result.rows);
});


app.post("/api/projects/:id/lps/semanas", requireAuth, async (req: any, res: any) => {
  const { semana, fechaInicio, fechaFin } = req.body;
  const result = await pool.query(
    `INSERT INTO ent_lps_semanas (project_id, semana, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4) RETURNING *`,
    [parseInt(req.params.id), semana, fechaInicio, fechaFin]
  );
  res.status(201).json(result.rows[0]);
});

app.get("/api/lps/semanas/:semanaId/compromisos", requireAuth, async (req: any, res: any) => {
  const result = await pool.query(
    `SELECT c.*, p.nombre as partida_nombre FROM ent_lps_compromisos c
     LEFT JOIN ent_partidas p ON p.id = c.partida_id
     WHERE c.semana_id = $1 ORDER BY c.subcontrato, c.id`,
    [parseInt(req.params.semanaId)]
  );
  res.json(result.rows);
});

app.post("/api/lps/semanas/:semanaId/compromisos", requireAuth, async (req: any, res: any) => {
  const { projectId, subcontrato, descripcion, meta, partidaId } = req.body;
  const result = await pool.query(
    `INSERT INTO ent_lps_compromisos (semana_id, project_id, subcontrato, descripcion, meta, partida_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [parseInt(req.params.semanaId), projectId, subcontrato, descripcion, meta ?? null, partidaId ?? null]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/lps/compromisos/:id", requireAuth, async (req: any, res: any) => {
  const { cumplido, causaNoCumplimiento } = req.body;
  const result = await pool.query(
    `UPDATE ent_lps_compromisos SET cumplido = $1, causa_no_cumplimiento = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [cumplido, causaNoCumplimiento ?? null, parseInt(req.params.id)]
  );
  res.json(result.rows[0]);
});

app.delete("/api/lps/compromisos/:id", requireAuth, async (req: any, res: any) => {
  await pool.query(`DELETE FROM ent_lps_compromisos WHERE id = $1`, [parseInt(req.params.id)]);
  res.json({ ok: true });
});
// ── LIBRO DE OBRA ─────────────────────────────────────────────────
app.get("/api/projects/:id/libro-obra", requireAuth, async (req: any, res: any) => {
  try {
    const projectId = parseInt(req.params.id);
    const entradas = await db.select().from(libroObra)
      .where(eq(libroObra.projectId, projectId))
      .orderBy(desc(libroObra.fecha));
    res.json(entradas);
  } catch (e: any) {
    console.error("LIBRO_OBRA_ERROR:", e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/projects/:id/libro-obra", requireAuth, async (req: any, res: any) => {
  try {
    const projectId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const [nueva] = await db.insert(libroObra).values({
      ...req.body,
      projectId,
      autorId: req.userId,
      autorNombre: user.name,
      firmado: false,
    }).returning();
    res.json(nueva);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/libro-obra/:id", requireAuth, async (req: any, res: any) => {
  try {
    const [updated] = await db.update(libroObra)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(libroObra.id, parseInt(req.params.id)))
      .returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/libro-obra/:id/firmar", requireAuth, async (req: any, res: any) => {
  try {
    const [entrada] = await db.update(libroObra)
      .set({ firmado: true, updatedAt: new Date() })
      .where(eq(libroObra.id, parseInt(req.params.id)))
      .returning();
    res.json(entrada);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/libro-obra/:id", requireAuth, async (req: any, res: any) => {
  try {
    await db.delete(libroObra).where(eq(libroObra.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// ── MINERÍA: CODELCO ──────────────────────────────────────────────

// Contratos Codelco
app.get("/api/mineria/codelco/contratos", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_codelco_contratos WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/codelco/contratos", requireAuth, async (req: any, res: any) => {
  try {
    const { numeroContrato, nombre, division, clasificacion, estado, fechaInicio, fechaFin, montoUf, administradorEecc, administradorCodelco } = req.body;
    const result = await pool.query(
      `INSERT INTO min_codelco_contratos (owner_id, numero_contrato, nombre, division, clasificacion, estado, fecha_inicio, fecha_fin, monto_uf, administrador_eecc, administrador_codelco)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.userId, numeroContrato, nombre, division, clasificacion, estado, fechaInicio, fechaFin, montoUf, administradorEecc, administradorCodelco]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Incidentes Codelco
app.get("/api/mineria/codelco/contratos/:id/incidentes", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_codelco_incidentes WHERE contrato_id = $1 ORDER BY fecha DESC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/codelco/contratos/:id/incidentes", requireAuth, async (req: any, res: any) => {
  try {
    const { tipo, ecf, fecha, lugar, descripcion, lesionados, diasPerdidos, causaRaiz, medidaCorrectiva, reportadoPor } = req.body;
    const result = await pool.query(
      `INSERT INTO min_codelco_incidentes (contrato_id, tipo, ecf, fecha, lugar, descripcion, lesionados, dias_perdidos, causa_raiz, medida_correctiva, reportado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [parseInt(req.params.id), tipo, ecf, fecha, lugar, descripcion, lesionados||0, diasPerdidos||0, causaRaiz, medidaCorrectiva, reportadoPor]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/mineria/codelco/incidentes/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { estado, medidaCorrectiva } = req.body;
    const result = await pool.query(
      `UPDATE min_codelco_incidentes SET estado=$1, medida_correctiva=$2 WHERE id=$3 RETURNING *`,
      [estado, medidaCorrectiva, parseInt(req.params.id)]
    );
    res.json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// KPIs Codelco
app.get("/api/mineria/codelco/contratos/:id/kpis", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_codelco_kpis WHERE contrato_id = $1 ORDER BY periodo DESC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/codelco/contratos/:id/kpis", requireAuth, async (req: any, res: any) => {
  try {
    const { periodo, avanceFisico, cumplimientoSeguridad, cumplimientoAmbiental, hhTrabajadas, hhCapacitacion, nTrabajadores, observaciones } = req.body;
    const result = await pool.query(
      `INSERT INTO min_codelco_kpis (contrato_id, periodo, avance_fisico, cumplimiento_seguridad, cumplimiento_ambiental, hh_trabajadas, hh_capacitacion, n_trabajadores, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [parseInt(req.params.id), periodo, avanceFisico||0, cumplimientoSeguridad||0, cumplimientoAmbiental||0, hhTrabajadas||0, hhCapacitacion||0, nTrabajadores||0, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// EDP Codelco
app.get("/api/mineria/codelco/contratos/:id/edp", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_codelco_edp WHERE contrato_id = $1 ORDER BY numero_edp DESC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/codelco/contratos/:id/edp", requireAuth, async (req: any, res: any) => {
  try {
    const { numeroEdp, periodo, montoUf, estado, observaciones } = req.body;
    const result = await pool.query(
      `INSERT INTO min_codelco_edp (contrato_id, numero_edp, periodo, monto_uf, estado, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [parseInt(req.params.id), numeroEdp, periodo, montoUf||0, estado||'borrador', observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── MINERÍA: BHP ──────────────────────────────────────────────────

// Contratos BHP
app.get("/api/mineria/bhp/contratos", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_bhp_contratos WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/bhp/contratos", requireAuth, async (req: any, res: any) => {
  try {
    const { numeroContrato, nombre, operacion, estado, fechaInicio, fechaFin, montoUsd, contactoSupply } = req.body;
    const result = await pool.query(
      `INSERT INTO min_bhp_contratos (owner_id, numero_contrato, nombre, operacion, estado, fecha_inicio, fecha_fin, monto_usd, contacto_supply)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.userId, numeroContrato, nombre, operacion, estado||'activo', fechaInicio, fechaFin, montoUsd||0, contactoSupply]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// RFX BHP
app.get("/api/mineria/bhp/contratos/:id/rfx", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_bhp_rfx WHERE contrato_id = $1 ORDER BY created_at DESC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/bhp/contratos/:id/rfx", requireAuth, async (req: any, res: any) => {
  try {
    const { tipo, numero, titulo, fechaCierre, estado, respuesta, observaciones } = req.body;
    const result = await pool.query(
      `INSERT INTO min_bhp_rfx (contrato_id, owner_id, tipo, numero, titulo, fecha_cierre, estado, respuesta, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [parseInt(req.params.id), req.userId, tipo, numero, titulo, fechaCierre, estado||'pendiente', respuesta, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Scorecard BHP
app.get("/api/mineria/bhp/contratos/:id/scorecard", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      `SELECT * FROM min_bhp_scorecard WHERE contrato_id = $1 ORDER BY periodo DESC`,
      [parseInt(req.params.id)]
    );
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/mineria/bhp/contratos/:id/scorecard", requireAuth, async (req: any, res: any) => {
  try {
    const { periodo, seguridad, calidad, plazo, costo, sustentabilidad, comentarios } = req.body;
    const total = Math.round(((seguridad||0)+(calidad||0)+(plazo||0)+(costo||0)+(sustentabilidad||0))/5);
    const result = await pool.query(
      `INSERT INTO min_bhp_scorecard (contrato_id, periodo, seguridad, calidad, plazo, costo, sustentabilidad, puntaje_total, comentarios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [parseInt(req.params.id), periodo, seguridad||0, calidad||0, plazo||0, costo||0, sustentabilidad||0, total, comentarios]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
const PORT = process.env.PORT || 3001;
// ── WEBHOOKS CITY ─────────────────────────────────────────────────
import { createHmac } from 'crypto'

function verifyWebhookSignature(body: string, sig: string, secret: string) {
  return sig === `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

async function sendWebhook(url: string, event: string, payload: unknown, secret: string, attempt = 1): Promise<boolean> {
  const body = JSON.stringify({ event, payload, timestamp: Date.now() })
  const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-SmartBuild-Signature': sig, 'X-SmartBuild-Event': event },
      body,
    })
    if (res.ok) return true
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); return sendWebhook(url, event, payload, secret, attempt + 1) }
    return false
  } catch {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); return sendWebhook(url, event, payload, secret, attempt + 1) }
    return false
  }
}

// Recibe eventos desde smartbuild-city
app.post('/api/v1/webhooks/city', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const rawBody = req.body.toString()
  const sig = req.headers['x-smartbuild-signature'] ?? ''
  if (!verifyWebhookSignature(rawBody, sig, process.env.CITY_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Firma inválida' })
  }
  const { event, payload } = JSON.parse(rawBody)

  if (event === 'firma.registrada' || event === 'pago.liberado') {
    await pool.query(
      `UPDATE ent_hitos SET ito_estado=$1, ito_at=NOW() WHERE id=$2`,
      [event === 'pago.liberado' ? 'pago_liberado' : payload.decision, payload.hito_id]
    ).catch(() => {}) // tabla puede no existir aún
  }

  res.json({ ok: true })
})

// Envía evento a smartbuild-city (helper exportable)
export async function notifyCity(event: string, payload: unknown) {
  const url = process.env.CITY_WEBHOOK_URL
  const secret = process.env.ENTERPRISE_WEBHOOK_SECRET
  if (!url || !secret) return false
  return sendWebhook(url, event, payload, secret)
}
app.listen(PORT, () => console.log(`SmartBuild Enterprise API → http://localhost:${PORT}`));
