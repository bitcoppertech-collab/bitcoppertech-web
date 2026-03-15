import * as dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import multer from "multer";
import { apuItems, subcontratos } from "../shared/schema";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
import { Pool } from "pg";
import { eq, desc, and } from "drizzle-orm";
import {
  users, projects, partidas, pagos, alertas, demoRequests,
  insertProjectSchema, insertPartidaSchema, insertPagoSchema, insertDemoRequestSchema
} from "../shared/schema";

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const PgSession = connectPgSimple(session);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "smartbuild-enterprise-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  }
}));

// ── AUTH MIDDLEWARE ────────────────────────────────────────────────
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) return res.status(401).json({ error: "No autenticado" });
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) return res.status(401).json({ error: "No autenticado" });
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Sin permisos" });
  req.user = user;
  next();
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
    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, companyName: user.companyName });
  } catch (e: any) {
    console.error("LOGIN ERROR:", e.message, e.stack);
    res.status(500).json({ error: e.message ?? "Error del servidor" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "No autenticado" });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, companyName: user.companyName });
});

// ── PROJECTS ──────────────────────────────────────────────────────
app.get("/api/projects", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId;
  const userRole = (req.session as any).userRole;
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
  const parsed = insertProjectSchema.safeParse({ ...req.body, ownerId: (req.session as any).userId });
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
  const userId = (req.session as any).userId;
  const userRole = (req.session as any).userRole;
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SmartBuild Enterprise API → http://localhost:${PORT}`));
