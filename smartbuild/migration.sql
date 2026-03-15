-- ── MIGRACIÓN NEON: correr en el SQL editor de Neon ─────────────

ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS codigo_apu VARCHAR(50);
ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS cantidad DECIMAL(15,4) DEFAULT 0;
ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS precio_unitario_uf DECIMAL(15,6) DEFAULT 0;
ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS capitulo VARCHAR(100);

CREATE TABLE IF NOT EXISTS ent_apu_items (
  id SERIAL PRIMARY KEY,
  partida_id INTEGER NOT NULL REFERENCES ent_partidas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  unidad VARCHAR(50),
  cantidad DECIMAL(15,4) DEFAULT 0,
  precio_unitario_uf DECIMAL(15,6) DEFAULT 0,
  total_uf DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ent_subcontratos (
  id SERIAL PRIMARY KEY,
  partida_id INTEGER NOT NULL REFERENCES ent_partidas(id) ON DELETE CASCADE,
  proveedor VARCHAR(255) NOT NULL,
  descripcion TEXT,
  monto_uf DECIMAL(15,4) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── VERIFICAR ────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
