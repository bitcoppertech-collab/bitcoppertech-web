// ── AGREGAR EN server/index.ts ANTES DE const PORT ───────────────

// ── LAST PLANNER SYSTEM ───────────────────────────────────────────

app.get("/api/projects/:id/lps/semanas", requireAuth, async (req: any, res: any) => {
  const list = await db.execute(
    `SELECT s.*, COUNT(c.id) as total_compromisos,
     SUM(CASE WHEN c.cumplido = true THEN 1 ELSE 0 END) as cumplidos
     FROM ent_lps_semanas s
     LEFT JOIN ent_lps_compromisos c ON c.semana_id = s.id
     WHERE s.project_id = $1
     GROUP BY s.id
     ORDER BY s.fecha_inicio DESC`,
    [parseInt(req.params.id)]
  );
  res.json(list.rows);
});

app.post("/api/projects/:id/lps/semanas", requireAuth, async (req: any, res: any) => {
  const { semana, fechaInicio, fechaFin } = req.body;
  const result = await db.execute(
    `INSERT INTO ent_lps_semanas (project_id, semana, fecha_inicio, fecha_fin)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [parseInt(req.params.id), semana, fechaInicio, fechaFin]
  );
  res.status(201).json(result.rows[0]);
});

app.get("/api/lps/semanas/:semanaId/compromisos", requireAuth, async (req: any, res: any) => {
  const result = await db.execute(
    `SELECT c.*, p.nombre as partida_nombre
     FROM ent_lps_compromisos c
     LEFT JOIN ent_partidas p ON p.id = c.partida_id
     WHERE c.semana_id = $1
     ORDER BY c.subcontrato, c.id`,
    [parseInt(req.params.semanaId)]
  );
  res.json(result.rows);
});

app.post("/api/lps/semanas/:semanaId/compromisos", requireAuth, async (req: any, res: any) => {
  const { projectId, subcontrato, descripcion, meta, partidaId } = req.body;
  const result = await db.execute(
    `INSERT INTO ent_lps_compromisos (semana_id, project_id, subcontrato, descripcion, meta, partida_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [parseInt(req.params.semanaId), projectId, subcontrato, descripcion, meta ?? null, partidaId ?? null]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/lps/compromisos/:id", requireAuth, async (req: any, res: any) => {
  const { cumplido, causaNoCumplimiento } = req.body;
  const result = await db.execute(
    `UPDATE ent_lps_compromisos
     SET cumplido = $1, causa_no_cumplimiento = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [cumplido, causaNoCumplimiento ?? null, parseInt(req.params.id)]
  );
  res.json(result.rows[0]);
});

app.delete("/api/lps/compromisos/:id", requireAuth, async (req: any, res: any) => {
  await db.execute(`DELETE FROM ent_lps_compromisos WHERE id = $1`, [parseInt(req.params.id)]);
  res.json({ ok: true });
});
