import { pgTable, serial, text, integer, decimal, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── USERS ──────────────────────────────────────────────────────────
export const users = pgTable("ent_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("client"), // admin | client
  companyName: varchar("company_name", { length: 255 }),
  plan: varchar("plan", { length: 50 }).notNull().default("enterprise"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });

// ── PROJECTS ───────────────────────────────────────────────────────
export const projects = pgTable("ent_projects", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  client: varchar("client", { length: 255 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("activo"), // activo | pausado | completado
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  totalBudget: decimal("total_budget", { precision: 15, scale: 2 }).default("0"),
  totalExecuted: decimal("total_executed", { precision: 15, scale: 2 }).default("0"),
  globalProgress: integer("global_progress").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });

// ── PARTIDAS (Control de Obra) ────────────────────────────────────
export const partidas = pgTable("ent_partidas", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  unidad: varchar("unidad", { length: 50 }),
  presupuesto: decimal("presupuesto", { precision: 15, scale: 2 }).notNull().default("0"),
  ejecutado: decimal("ejecutado", { precision: 15, scale: 2 }).notNull().default("0"),
  avance: integer("avance").notNull().default(0), // 0-100
  inicio: integer("inicio").notNull().default(0),   // % del timeline (0-100)
  fin: integer("fin").notNull().default(100),         // % del timeline (0-100)
  pisoRef: integer("piso_ref").default(0),            // piso en modelo 3D
  estado: varchar("estado", { length: 50 }).default("pendiente"), // pendiente | ok | warn | danger
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Partida = typeof partidas.$inferSelect;
export type InsertPartida = typeof partidas.$inferInsert;
export const insertPartidaSchema = createInsertSchema(partidas).omit({ id: true, createdAt: true, updatedAt: true });

// ── PAGOS ─────────────────────────────────────────────────────────
export const pagos = pgTable("ent_pagos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  partidaId: integer("partida_id").references(() => partidas.id),
  nombrePartida: varchar("nombre_partida", { length: 255 }),
  monto: decimal("monto", { precision: 15, scale: 2 }).notNull(),
  fecha: timestamp("fecha").notNull().defaultNow(),
  estado: varchar("estado", { length: 50 }).notNull().default("pendiente"), // pagado | pendiente
  descripcion: text("descripcion"),
  proveedor: varchar("proveedor", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Pago = typeof pagos.$inferSelect;
export type InsertPago = typeof pagos.$inferInsert;
export const insertPagoSchema = createInsertSchema(pagos).omit({ id: true, createdAt: true });

// ── ALERTAS ───────────────────────────────────────────────────────
export const alertas = pgTable("ent_alertas", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  partidaId: integer("partida_id").references(() => partidas.id),
  tipo: varchar("tipo", { length: 50 }).notNull(), // danger | warn | info
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  leida: boolean("leida").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Alerta = typeof alertas.$inferSelect;

// ── DEMO REQUESTS ─────────────────────────────────────────────────
export const demoRequests = pgTable("ent_demo_requests", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  empresa: varchar("empresa", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 100 }),
  estado: varchar("estado", { length: 50 }).notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DemoRequest = typeof demoRequests.$inferSelect;
export const insertDemoRequestSchema = createInsertSchema(demoRequests).omit({ id: true, estado: true, createdAt: true });

// ── APU ITEMS ─────────────────────────────────────────────────────
export const apuItems = pgTable("ent_apu_items", {
  id: serial("id").primaryKey(),
  partidaId: integer("partida_id").notNull().references(() => partidas.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  descripcion: varchar("descripcion", { length: 255 }).notNull(),
  unidad: varchar("unidad", { length: 50 }),
  cantidad: decimal("cantidad", { precision: 15, scale: 4 }).default("0"),
  precioUnitarioUF: decimal("precio_unitario_uf", { precision: 15, scale: 6 }).default("0"),
  totalUF: decimal("total_uf", { precision: 15, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ApuItem = typeof apuItems.$inferSelect;

// ── SUBCONTRATOS ──────────────────────────────────────────────────
export const subcontratos = pgTable("ent_subcontratos", {
  id: serial("id").primaryKey(),
  partidaId: integer("partida_id").notNull().references(() => partidas.id, { onDelete: "cascade" }),
  proveedor: varchar("proveedor", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  montoUF: decimal("monto_uf", { precision: 15, scale: 4 }).default("0"),
  estado: varchar("estado", { length: 50 }).default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Subcontrato = typeof subcontratos.$inferSelect;
// ── LIBRO DE OBRA ─────────────────────────────────────────────────
export const libroObra = pgTable("ent_libro_obra", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  autorNombre: varchar("autor_nombre", { length: 255 }),
  fecha: timestamp("fecha").notNull().defaultNow(),
  clima: varchar("clima", { length: 100 }),
  temperatura: integer("temperatura"),
  personalPresente: integer("personal_presente").default(0),
  equiposPresentes: text("equipos_presentes"),
  avances: text("avances"),
  incidentes: text("incidentes"),
  observaciones: text("observaciones"),
  fotos: jsonb("fotos").default([]),
  firmado: boolean("firmado").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LibroObra = typeof libroObra.$inferSelect;
export type InsertLibroObra = typeof libroObra.$inferInsert;
export const insertLibroObraSchema = createInsertSchema(libroObra).omit({
  id: true, createdAt: true, updatedAt: true
});