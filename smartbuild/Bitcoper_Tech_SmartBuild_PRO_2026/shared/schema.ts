
import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Projects/Budgets uploaded by users
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  client: text("client"),
  status: text("status").default("draft"), // draft, processing, completed
  totalBudget: decimal("total_budget", { precision: 15, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }).default("0"),
  projectedProfit: decimal("projected_profit", { precision: 15, scale: 2 }).default("0"),
  subtotalNeto: decimal("subtotal_neto", { precision: 15, scale: 2 }),
  gastosGeneralesPercent: decimal("gastos_generales_percent", { precision: 5, scale: 2 }),
  utilidadPercent: decimal("utilidad_percent", { precision: 5, scale: 2 }),
  ivaPercent: decimal("iva_percent", { precision: 5, scale: 2 }).default("19"),
  totalExcel: decimal("total_excel", { precision: 15, scale: 2 }),
  lastPriceSync: timestamp("last_price_sync"),
  tokenId: text("token_id"),
  statusFinanciamiento: text("status_financiamiento").default("pendiente"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget Items (imported from Excel)
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  description: text("description").notNull(), // e.g., "Acero estructural kg"
  unit: text("unit").notNull(), // e.g., "kg", "m2", "un"
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }), // Original budget price
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }),
  
  // APU Analysis fields
  commercialDescription: text("commercial_description"), // e.g., "Tiras de 6m"
  commercialUnit: text("commercial_unit"),
  marketPrice: decimal("market_price", { precision: 15, scale: 2 }), // Scraped price
  supplier: text("supplier"), // e.g., "Sodimac", "Easy"
  
  sodimacPrice: decimal("sodimac_price", { precision: 15, scale: 2 }),
  easyPrice: decimal("easy_price", { precision: 15, scale: 2 }),
  sodimacName: text("sodimac_name"),
  easyName: text("easy_name"),
  sodimacBrand: text("sodimac_brand"),
  easyBrand: text("easy_brand"),
  sodimacStock: boolean("sodimac_stock"),
  easyStock: boolean("easy_stock"),
  
  manHoursPerUnit: decimal("man_hours_per_unit", { precision: 10, scale: 4 }),
  totalManHours: decimal("total_man_hours", { precision: 15, scale: 2 }),
  
  status: text("status").default("pending"), // pending, matched, priced
});

// Materials/Resources (for APU breakdown - simplified for MVP)
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 2 }),
  supplier: text("supplier"),
  status: text("status").default("Pendiente de Compra"), // Pendiente de Compra, En Tránsito desde Sodimac, Recibido en Obra
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").default("SmartBuild SpA"),
  rut: text("rut").default("76.XXX.XXX-X"),
  address: text("address").default("Santiago, Chile"),
  contact: text("contact").default("contacto@smartbuild.cl"),
  email: text("email").default("contacto@smartbuild.cl"),
  phone: text("phone").default("+56 9 1234 5678"),
  logoBase64: text("logo_base64"),
  firmaBase64: text("firma_base64"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers registered via external landing page (post-Webpay payment)
export const registeredCustomers = pgTable("registered_customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  rut: text("rut"),
  company: text("company"),
  phone: text("phone"),
  plan: text("plan").default("starter"),
  paymentStatus: text("payment_status").default("approved"),
  webpayToken: text("webpay_token"),
  webpayOrderId: text("webpay_order_id"),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Demo Requests (from commercial landing page)
export const demoRequests = pgTable("demo_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const projectsRelations = relations(projects, ({ many }) => ({
  items: many(budgetItems),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  project: one(projects, {
    fields: [budgetItems.projectId],
    references: [projects.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, lastUpdated: true });

// === EXPLICIT API CONTRACT TYPES ===

// Projects
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type CreateProjectRequest = InsertProject;
export type UpdateProjectRequest = Partial<InsertProject>;

// Budget Items
export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type CreateBudgetItemRequest = InsertBudgetItem;
export type BulkCreateBudgetItemsRequest = { items: InsertBudgetItem[] };
export type UpdateBudgetItemRequest = Partial<InsertBudgetItem>;

// Materials
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

// Registered Customers (Webpay)
export const insertCustomerSchema = createInsertSchema(registeredCustomers).omit({ id: true, createdAt: true });
export type RegisteredCustomer = typeof registeredCustomers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export const externalRegisterSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  rut: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  plan: z.string().optional(),
  webpayToken: z.string().optional(),
  webpayOrderId: z.string().optional(),
  amountPaid: z.string().optional(),
});
export type ExternalRegisterRequest = z.infer<typeof externalRegisterSchema>;

// Dashboard Stats
export interface DashboardStats {
  totalProjects: number;
  totalBudgeted: number;
  totalProjectedCost: number;
  potentialSavings: number;
  materialsTracked: number;
  storeMixSavings: number;
  totalMaterialCost: number;
  ggPercent: number;
  ggAmount: number;
  profitMargin: number;
  suggestedPrice: number;
  utilityPercent: number;
  lossAlerts: { projectName: string; projectId: number; budgetPrice: number; marketCost: number; difference: number }[];
}

// Company Settings
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true, updatedAt: true });
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;

// Scraper/APU Job Response
export interface APUAnalysisResponse {
  itemId: number;
  original: string;
  match: string;
  confidence: number;
  marketPrice: number;
  supplier: string;
}

// Demo Requests
export const insertDemoRequestSchema = createInsertSchema(demoRequests).omit({ id: true, createdAt: true });
export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;

// Financing Simulation Types (admin-only, not exposed in client PDFs)
export interface FinancingSimulation {
  projectId: number;
  projectName: string;
  costoDirecto: number;
  montoFinanciar: number;
  tasaMensual: number;
  plazoMeses: number;
  cuotaMensual: number;
  totalIntereses: number;
  retornoBitcoper: number;
  capitalPagado: number;
  interesGanado: number;
  saldoPendiente: number;
  tokenId: string;
  statusFinanciamiento: string;
}

export interface BurnTokensResult {
  tokenId: string;
  capitalInicial: number;
  capitalPagado: number;
  interesGanado: number;
  saldoPendiente: number;
  cuotasRestantes: number;
  retornoBitcoper: number;
}

// Auth (Replit Auth integration)
export * from "./models/auth";
