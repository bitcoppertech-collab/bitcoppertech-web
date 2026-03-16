
-- Libro de Obra
CREATE TABLE IF NOT EXISTS ent_libro_obra (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES ent_projects(id) ON DELETE CASCADE,
  autor_id INTEGER NOT NULL REFERENCES ent_users(id),
  autor_nombre VARCHAR(255),
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  clima VARCHAR(100),
  temperatura INTEGER,
  personal_presente INTEGER DEFAULT 0,
  equipos_presentes TEXT,
  avances TEXT,
  incidentes TEXT,
  observaciones TEXT,
  fotos JSONB DEFAULT '[]',
  firmado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
