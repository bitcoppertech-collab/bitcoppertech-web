// ── AÑADIR AL FINAL DE shared/schema.ts ──────────────────────────

// ── APU ITEMS ─────────────────────────────────────────────────────
export const apuItems = pgTable("ent_apu_items", {
  id: serial("id").primaryKey(),
  partidaId: integer("partida_id").notNull().references(() => partidas.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(), // mano_obra | material | maquinaria | subcontrato
  descripcion: varchar("descripcion", { length: 255 }).notNull(),
  unidad: varchar("unidad", { length: 50 }),
  cantidad: decimal("cantidad", { precision: 15, scale: 4 }).default("0"),
  precioUnitarioUF: decimal("precio_unitario_uf", { precision: 15, scale: 6 }).default("0"),
  totalUF: decimal("total_uf", { precision: 15, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ApuItem = typeof apuItems.$inferSelect;
export type InsertApuItem = typeof apuItems.$inferInsert;

// ── SUBCONTRATOS ──────────────────────────────────────────────────
export const subcontratos = pgTable("ent_subcontratos", {
  id: serial("id").primaryKey(),
  partidaId: integer("partida_id").notNull().references(() => partidas.id, { onDelete: "cascade" }),
  proveedor: varchar("proveedor", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  montoUF: decimal("monto_uf", { precision: 15, scale: 4 }).default("0"),
  estado: varchar("estado", { length: 50 }).default("pendiente"), // pendiente | adjudicado | pagado
  createdAt: timestamp("created_at").defaultNow(),
});

export type Subcontrato = typeof subcontratos.$inferSelect;
export type InsertSubcontrato = typeof subcontratos.$inferInsert;

// ── MODIFICAR TAMBIÉN: agregar campos a partidas existente ─────────
// En la tabla ent_partidas, agregar estas columnas con una migración:
//   codigo_apu    VARCHAR(50)
//   cantidad      DECIMAL(15,4)
//   precio_unitario_uf DECIMAL(15,6)
//
// SQL para correr en Neon:
// ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS codigo_apu VARCHAR(50);
// ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS cantidad DECIMAL(15,4) DEFAULT 0;
// ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS precio_unitario_uf DECIMAL(15,6) DEFAULT 0;
// ALTER TABLE ent_partidas ADD COLUMN IF NOT EXISTS capitulo VARCHAR(100);
// CREATE TABLE IF NOT EXISTS ent_apu_items (
//   id SERIAL PRIMARY KEY,
//   partida_id INTEGER NOT NULL REFERENCES ent_partidas(id) ON DELETE CASCADE,
//   tipo VARCHAR(50) NOT NULL,
//   descripcion VARCHAR(255) NOT NULL,
//   unidad VARCHAR(50),
//   cantidad DECIMAL(15,4) DEFAULT 0,
//   precio_unitario_uf DECIMAL(15,6) DEFAULT 0,
//   total_uf DECIMAL(15,4) DEFAULT 0,
//   created_at TIMESTAMP DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS ent_subcontratos (
//   id SERIAL PRIMARY KEY,
//   partida_id INTEGER NOT NULL REFERENCES ent_partidas(id) ON DELETE CASCADE,
//   proveedor VARCHAR(255) NOT NULL,
//   descripcion TEXT,
//   monto_uf DECIMAL(15,4) DEFAULT 0,
//   estado VARCHAR(50) DEFAULT 'pendiente',
//   created_at TIMESTAMP DEFAULT NOW()
// );
