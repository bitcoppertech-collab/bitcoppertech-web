-- ── Fase 3: Tabla LOD en SmartBuild Enterprise ───────────────────
-- Ejecutar en Supabase → smartbuild-enterprise → SQL Editor

CREATE TABLE IF NOT EXISTS ent_lod (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES ent_projects(id) ON DELETE CASCADE,
  partida_id    INTEGER REFERENCES ent_partidas(id) ON DELETE SET NULL,
  nivel         INTEGER NOT NULL CHECK (nivel IN (100,200,300,350,400,500)),
  software      VARCHAR(100),
  responsable_bim VARCHAR(255),
  modo_premium  BOOLEAN NOT NULL DEFAULT false,
  activo        BOOLEAN NOT NULL DEFAULT true,
  estado        VARCHAR(50) NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','en_analisis','aprobado','observado','rechazado')),
  storage_key   TEXT,
  subido_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ent_lod_documentos (
  id          SERIAL PRIMARY KEY,
  lod_id      INTEGER NOT NULL REFERENCES ent_lod(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('IFC','RVT','PDF','DWG','XLSX','IMG','OTHER')),
  storage_key TEXT NOT NULL,
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ent_lod_fotos (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES ent_projects(id) ON DELETE CASCADE,
  lod_id      INTEGER REFERENCES ent_lod(id) ON DELETE SET NULL,
  autor_id    INTEGER NOT NULL,
  autor_nombre VARCHAR(255),
  url         TEXT NOT NULL,
  storage_key TEXT,
  lat         DECIMAL(10,8),
  lng         DECIMAL(11,8),
  descripcion TEXT,
  tomada_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lod_project ON ent_lod(project_id);
CREATE INDEX IF NOT EXISTS idx_lod_estado  ON ent_lod(estado);
CREATE INDEX IF NOT EXISTS idx_lod_docs    ON ent_lod_documentos(lod_id);
CREATE INDEX IF NOT EXISTS idx_lod_fotos   ON ent_lod_fotos(project_id);

-- RLS
ALTER TABLE ent_lod            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ent_lod_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ent_lod_fotos      ENABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 'ent_lod' AS tabla, COUNT(*) FROM ent_lod
UNION ALL
SELECT 'ent_lod_documentos', COUNT(*) FROM ent_lod_documentos
UNION ALL
SELECT 'ent_lod_fotos', COUNT(*) FROM ent_lod_fotos;
