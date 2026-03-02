import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const USER_ROLES = {
  USER: "USER",
  HOME_OWNER: "HOME_OWNER",
  MAESTRO: "MAESTRO",
  DISTRIBUTOR: "DISTRIBUTOR",
  ADMIN: "ADMIN",
} as const;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  referredByCode: varchar("referred_by_code"),
  role: varchar("role").notNull().default("USER"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Distributors / Partners (referral system)
export const distributors = pgTable("distributors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  code: varchar("code").notNull().unique(),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  email: varchar("distributor_email"),
  phone: varchar("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Distributor = typeof distributors.$inferSelect;
export type InsertDistributor = typeof distributors.$inferInsert;

// Maestro (Worker) profiles — reputation system
export const maestros = pgTable("maestros", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  displayName: varchar("display_name").notNull(),
  specialty: varchar("specialty"),
  bio: text("bio"),
  phone: varchar("phone"),
  city: varchar("city"),
  avgRating: decimal("avg_rating", { precision: 3, scale: 2 }).default("0"),
  ratingCount: integer("rating_count").default(0),
  creditScore: integer("credit_score").default(0),
  creditBalance: integer("credit_balance").default(0),
  activeStreak: integer("active_streak").default(0),
  hasActiveBadge: boolean("has_active_badge").default(false),
  trustLevel: integer("trust_level").default(0),
  lastActiveDate: date("last_active_date"),
  documentoOrigen: varchar("documento_origen"),
  tipoDocumentoOrigen: varchar("tipo_documento_origen"),
  rutChileno: varchar("rut_chileno"),
  estadoRut: varchar("estado_rut").default("sin_rut"),
  docPhotoUrl: varchar("doc_photo_url"),
  kycVerified: boolean("kyc_verified").default(false),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Maestro = typeof maestros.$inferSelect;
export type InsertMaestro = typeof maestros.$inferInsert;
export const insertMaestroSchema = createInsertSchema(maestros).omit({ id: true, avgRating: true, ratingCount: true, creditScore: true, creditBalance: true, activeStreak: true, hasActiveBadge: true, trustLevel: true, lastActiveDate: true, kycVerified: true, createdAt: true, updatedAt: true });

export const kycUpdateSchema = z.object({
  documentoOrigen: z.string().max(50).optional(),
  tipoDocumentoOrigen: z.enum(["dni_extranjero", "pasaporte"]).optional(),
  rutChileno: z.string().max(20).optional(),
  estadoRut: z.enum(["sin_rut", "provisorio", "definitivo"]).optional(),
});

export function getDocumentStatusLabel(maestro: { documentoOrigen?: string | null; tipoDocumentoOrigen?: string | null; rutChileno?: string | null; estadoRut?: string | null; kycVerified?: boolean | null; docPhotoUrl?: string | null }) {
  const parts: { label: string; status: "verified" | "pending" | "none" }[] = [];
  if (maestro.documentoOrigen && maestro.tipoDocumentoOrigen) {
    const tipoLabel = maestro.tipoDocumentoOrigen === "pasaporte" ? "Pasaporte" : "DNI Extranjero";
    parts.push({ label: `${tipoLabel} Validado`, status: maestro.docPhotoUrl ? "verified" : "pending" });
  }
  if (maestro.rutChileno) {
    const estadoLabel = maestro.estadoRut === "definitivo" ? "RUT Definitivo" : maestro.estadoRut === "provisorio" ? "RUT Provisorio" : "RUT";
    parts.push({ label: `${estadoLabel}`, status: maestro.estadoRut === "definitivo" ? "verified" : "pending" });
  }
  return parts;
}

export function getMaestroLevel(avgRating: number, ratingCount: number): string {
  if (ratingCount < 3) return "Novato";
  if (avgRating >= 4.5 && ratingCount >= 10) return "Master";
  if (avgRating >= 3.5 && ratingCount >= 5) return "Experto";
  return "Novato";
}

// Work completions — QR-based job closure tokens
export const workCompletions = pgTable("work_completions", {
  id: serial("id").primaryKey(),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  projectDescription: varchar("project_description").notNull(),
  clientName: varchar("client_name"),
  token: varchar("token").notNull().unique(),
  status: varchar("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WorkCompletion = typeof workCompletions.$inferSelect;
export type InsertWorkCompletion = typeof workCompletions.$inferInsert;
export const insertWorkCompletionSchema = createInsertSchema(workCompletions).omit({ id: true, token: true, status: true, expiresAt: true, createdAt: true });

// Reviews — client ratings of maestro work
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  workCompletionId: integer("work_completion_id").notNull().references(() => workCompletions.id),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  stars: integer("stars").notNull(),
  comment: text("comment"),
  clientName: varchar("client_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });

export const submitReviewSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  clientName: z.string().max(100).optional(),
});

// Crew members — workers in maestro's team
export const crewMembers = pgTable("crew_members", {
  id: serial("id").primaryKey(),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  name: varchar("name").notNull(),
  role: varchar("role").notNull().default("Ayudante"),
  phone: varchar("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CrewMember = typeof crewMembers.$inferSelect;
export type InsertCrewMember = typeof crewMembers.$inferInsert;
export const insertCrewMemberSchema = createInsertSchema(crewMembers).omit({ id: true, createdAt: true });

// Attendance records — daily check-in per worker
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  crewMemberId: integer("crew_member_id").notNull().references(() => crewMembers.id),
  date: date("date").notNull(),
  present: boolean("present").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

// Daily logs — photo evidence of work progress
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  date: date("date").notNull(),
  photoUrl: varchar("photo_url").notNull(),
  photoUrl2: varchar("photo_url_2"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

// Client Leads — captured from QR scan / review submissions
export const clientLeads = pgTable("client_leads", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email").notNull(),
  maestroId: integer("maestro_id").references(() => maestros.id),
  sourceToken: varchar("source_token"),
  referralCode: varchar("referral_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ClientLead = typeof clientLeads.$inferSelect;
export type InsertClientLead = typeof clientLeads.$inferInsert;
export const insertClientLeadSchema = createInsertSchema(clientLeads).omit({ id: true, createdAt: true });

// Coupons — welcome discount codes for new clients
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code").notNull().unique(),
  clientLeadId: integer("client_lead_id").references(() => clientLeads.id),
  discountPercent: integer("discount_percent").notNull().default(10),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Marketplace Requests — purchase intents or budget requests
export const marketplaceRequests = pgTable("marketplace_requests", {
  id: serial("id").primaryKey(),
  clientLeadId: integer("client_lead_id").references(() => clientLeads.id),
  clientName: varchar("client_name").notNull(),
  clientPhone: varchar("client_phone").notNull(),
  clientEmail: varchar("client_email").notNull(),
  requestType: varchar("request_type").notNull(),
  items: jsonb("items").notNull(),
  maestroId: integer("maestro_id").references(() => maestros.id),
  referringMaestroId: integer("referring_maestro_id").references(() => maestros.id),
  status: varchar("status").notNull().default("pending"),
  totalEstimate: varchar("total_estimate"),
  commissionFerreteria: varchar("commission_ferreteria"),
  commissionBitcopper: varchar("commission_bitcopper"),
  cashbackMaestro: varchar("cashback_maestro"),
  notes: text("notes"),
  referralCode: varchar("referral_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MarketplaceRequest = typeof marketplaceRequests.$inferSelect;
export type InsertMarketplaceRequest = typeof marketplaceRequests.$inferInsert;

// Client Credits — rewards ledger for referral system
export const clientCredits = pgTable("client_credits", {
  id: serial("id").primaryKey(),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  amount: integer("amount").notNull(),
  reason: varchar("reason").notNull(),
  relatedRequestId: integer("related_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ClientCredit = typeof clientCredits.$inferSelect;
export type InsertClientCredit = typeof clientCredits.$inferInsert;

// === ESCROW / PROJECT WALLET SYSTEM ===

// Project Wallets — escrow accounts holding client payments
export const projectWallets = pgTable("project_wallets", {
  id: serial("id").primaryKey(),
  marketplaceRequestId: integer("marketplace_request_id").references(() => marketplaceRequests.id),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  description: varchar("description").notNull(),
  totalAmount: integer("total_amount").notNull(),
  materialsAmount: integer("materials_amount").notNull().default(0),
  laborAmount: integer("labor_amount").notNull().default(0),
  guaranteeAmount: integer("guarantee_amount").notNull().default(0),
  guaranteePercent: integer("guarantee_percent").notNull().default(2),
  status: varchar("status").notNull().default("HELD_IN_ESCROW"),
  // Available balances
  maestroAvailable: integer("maestro_available").notNull().default(0),
  maestroBlocked: integer("maestro_blocked").notNull().default(0),
  ferreteriaAllocated: integer("ferreteria_allocated").notNull().default(0),
  guaranteeFund: integer("guarantee_fund").notNull().default(0),
  fundingStatus: varchar("funding_status").default("NOT_FUNDED"), // NOT_FUNDED, FUNDED
  tokenizationAmount: integer("tokenization_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ProjectWallet = typeof projectWallets.$inferSelect;
export type InsertProjectWallet = typeof projectWallets.$inferInsert;
export const insertProjectWalletSchema = createInsertSchema(projectWallets).omit({
  id: true, status: true, maestroAvailable: true, maestroBlocked: true,
  ferreteriaAllocated: true, guaranteeFund: true, createdAt: true, updatedAt: true,
});

// Wallet Transactions — append-only ledger of all money movements
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  type: varchar("type").notNull(),
  amount: integer("amount").notNull(),
  fromAccount: varchar("from_account").notNull(),
  toAccount: varchar("to_account").notNull(),
  description: varchar("description").notNull(),
  milestoneId: integer("milestone_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

// Project Milestones — progressive release of maestro labor payments
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  name: varchar("name").notNull(),
  description: varchar("milestone_description"),
  releasePercent: integer("release_percent").notNull(),
  releaseAmount: integer("release_amount").notNull().default(0),
  status: varchar("status").notNull().default("PENDING"),
  photoUrl: varchar("photo_url"),
  photoUrl2: varchar("photo_url_2"),
  maestroNote: text("maestro_note"),
  clientApproval: boolean("client_approval").default(false),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof projectMilestones.$inferInsert;
export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true, releaseAmount: true, status: true, clientApproval: true,
  submittedAt: true, approvedAt: true, rejectedReason: true, createdAt: true,
});

// Purchase Orders — orders to ferreterías for materials
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  ferreteriaName: varchar("ferreteria_name").notNull(),
  items: jsonb("items").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// Escrow status constants
export const ESCROW_STATUS = {
  HELD_IN_ESCROW: "HELD_IN_ESCROW",
  SPLIT_ALLOCATED: "SPLIT_ALLOCATED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  DISPUTED: "DISPUTED",
} as const;

export const MILESTONE_STATUS = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const TRANSACTION_TYPES = {
  CLIENT_DEPOSIT: "CLIENT_DEPOSIT",
  MATERIAL_ALLOCATION: "MATERIAL_ALLOCATION",
  GUARANTEE_DEDUCTION: "GUARANTEE_DEDUCTION",
  LABOR_BLOCKED: "LABOR_BLOCKED",
  MILESTONE_RELEASE: "MILESTONE_RELEASE",
  PURCHASE_ORDER: "PURCHASE_ORDER",
} as const;

// Escrow Notifications — transparency alerts for clients & maestros
export const escrowNotifications = pgTable("escrow_notifications", {
  id: serial("id").primaryKey(),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  recipientType: varchar("recipient_type").notNull(), // "client" | "maestro"
  recipientId: integer("recipient_id").notNull(),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EscrowNotification = typeof escrowNotifications.$inferSelect;
export type InsertEscrowNotification = typeof escrowNotifications.$inferInsert;

export const NOTIFICATION_TYPES = {
  DEPOSIT_RECEIVED: "DEPOSIT_RECEIVED",
  MATERIALS_PAID: "MATERIALS_PAID",
  MILESTONE_SUBMITTED: "MILESTONE_SUBMITTED",
  MILESTONE_APPROVED: "MILESTONE_APPROVED",
  MILESTONE_REJECTED: "MILESTONE_REJECTED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
} as const;

// Payment Transactions — tracks every payment through the system
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id").notNull().unique(), // UUID or gateway-generated ID
  provider: varchar("provider").notNull(), // 'fintoc', 'mercadopago', 'stripe_future'
  providerTransactionId: varchar("provider_transaction_id"), // ID from the payment gateway
  status: varchar("status").notNull().default("pendiente"), // pendiente, procesando, pagado, fallido, reembolsado
  montoTotal: decimal("monto_total", { precision: 15, scale: 2 }).notNull(),
  montoGarantia: decimal("monto_garantia", { precision: 15, scale: 2 }).default("0"),
  montoLiberado: decimal("monto_liberado", { precision: 15, scale: 2 }).default("0"),
  montoComision: decimal("monto_comision", { precision: 15, scale: 2 }).default("0"),
  montoFerreteria: decimal("monto_ferreteria", { precision: 15, scale: 2 }).default("0"),
  montoPlatforma: decimal("monto_platforma", { precision: 15, scale: 2 }).default("0"),
  montoCashbackMaestro: decimal("monto_cashback_maestro", { precision: 15, scale: 2 }).default("0"),
  countryCode: varchar("country_code").default("CL"),
  currency: varchar("currency").default("CLP"),
  marketplaceRequestId: integer("marketplace_request_id").references(() => marketplaceRequests.id),
  projectWalletId: integer("project_wallet_id").references(() => projectWallets.id),
  clientLeadId: integer("client_lead_id").references(() => clientLeads.id),
  maestroId: integer("maestro_id").references(() => maestros.id),
  description: text("description"),
  metadata: jsonb("metadata"), // gateway-specific data, webhook payloads
  webhookReceivedAt: timestamp("webhook_received_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const PAYMENT_STATUS = {
  PENDIENTE: "pendiente",
  PROCESANDO: "procesando",
  PAGADO: "pagado",
  FALLIDO: "fallido",
  REEMBOLSADO: "reembolsado",
} as const;

export const PAYMENT_PROVIDERS = {
  FINTOC: "fintoc",
  MERCADOPAGO: "mercadopago",
  CULQI: "culqi",
  STRIPE: "stripe_future",
} as const;

// Add payment-related notification types
export const PAYMENT_NOTIFICATION_TYPES = {
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
} as const;

// Schema for accepting budget / creating escrow
export const acceptBudgetSchema = z.object({
  clientLeadId: z.number(),
  maestroId: z.number(),
  description: z.string().min(1).max(500),
  totalAmount: z.number().min(1),
  materialsAmount: z.number().min(0),
  laborAmount: z.number().min(0),
  guaranteePercent: z.number().min(0).max(10).default(2),
  items: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    supplier: z.string().optional(),
  })).optional(),
  milestones: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    releasePercent: z.number().min(1).max(100),
  })).optional(),
  marketplaceRequestId: z.number().optional(),
});

// Schema for submitting milestone progress
export const submitMilestoneSchema = z.object({
  photoUrl: z.string().min(1),
  photoUrl2: z.string().optional(),
  maestroNote: z.string().max(1000).optional(),
});

// Updated review schema — now requires name, phone, email
export const submitReviewWithLeadSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  clientName: z.string().min(1, "Nombre es requerido").max(100),
  clientPhone: z.string().min(8, "Teléfono es requerido").max(20),
  clientEmail: z.string().email("Correo inválido").max(100),
  referralCode: z.string().max(20).optional(),
});

// === Suscripción Hogar Seguro ===
export const homeownerSubscriptions = pgTable("homeowner_subscriptions", {
  id: serial("id").primaryKey(),
  clientLeadId: integer("client_lead_id").references(() => clientLeads.id),
  userId: varchar("user_id"),
  planType: varchar("plan_type").notNull().default("MONTHLY"), // MONTHLY, ANNUAL
  status: varchar("status").notNull().default("ACTIVE"), // ACTIVE, CANCELLED, EXPIRED
  hasComplianceInsurance: boolean("has_compliance_insurance").notNull().default(true),
  priorityDispute: boolean("priority_dispute").notNull().default(true),
  monthlyPrice: integer("monthly_price").notNull().default(9990),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HomeownerSubscription = typeof homeownerSubscriptions.$inferSelect;
export type InsertHomeownerSubscription = typeof homeownerSubscriptions.$inferInsert;
export const insertHomeownerSubscriptionSchema = createInsertSchema(homeownerSubscriptions).omit({
  id: true, status: true, startedAt: true, cancelledAt: true, createdAt: true,
});

export const SUBSCRIPTION_PLANS = {
  MONTHLY: { type: "MONTHLY", price: 9990, label: "Mensual", durationDays: 30 },
  ANNUAL: { type: "ANNUAL", price: 89900, label: "Anual", durationDays: 365 },
} as const;

// === Withdrawal Requests (Retiro por QR) ===
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  maestroId: integer("maestro_id").notNull().references(() => maestros.id),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  amount: integer("amount").notNull(),
  status: varchar("status").notNull().default("PENDING"), // PENDING, QR_SCANNED, CLIENT_CONFIRMED, RELEASED, REJECTED
  qrToken: varchar("qr_token").notNull().unique(),
  maestroScannedAt: timestamp("maestro_scanned_at"),
  clientConfirmedAt: timestamp("client_confirmed_at"),
  releasedAt: timestamp("released_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

export const WITHDRAWAL_STATUS = {
  PENDING: "PENDING",
  QR_SCANNED: "QR_SCANNED",
  CLIENT_CONFIRMED: "CLIENT_CONFIRMED",
  RELEASED: "RELEASED",
  REJECTED: "REJECTED",
} as const;

export const FUNDING_STATUS = {
  NOT_FUNDED: "NOT_FUNDED",
  FUNDED: "FUNDED",
} as const;

export function generateWithdrawalToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "WD-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// === User Rewards (Custody Yield) ===
export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  projectWalletId: integer("project_wallet_id").notNull().references(() => projectWallets.id),
  rewardType: varchar("reward_type").notNull().default("CUSTODY_YIELD"),
  tokenAmount: decimal("token_amount", { precision: 15, scale: 6 }).notNull(),
  frozenBalance: integer("frozen_balance").notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 8 }).notNull(),
  description: varchar("description"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserReward = typeof userRewards.$inferSelect;
export type InsertUserReward = typeof userRewards.$inferInsert;
export const insertUserRewardSchema = createInsertSchema(userRewards).omit({ id: true, createdAt: true });

export const REWARD_TYPES = {
  CUSTODY_YIELD: "CUSTODY_YIELD",
  MILESTONE_BONUS: "MILESTONE_BONUS",
} as const;

export const DAILY_CUSTODY_RATE = 0.00015; // 0.015% daily ~ 5.5% annualized

// === Copper Credits (Bitcopper Wallet) ===
export const copperCredits = pgTable("copper_credits", {
  id: serial("id").primaryKey(),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type").notNull(), // CUSTODY_YIELD, MILESTONE_BONUS, REDEMPTION_SECURITY_FEE, REDEMPTION_FERRETERIA
  description: varchar("description"),
  referenceId: integer("reference_id"), // links to project_wallet_id, milestone_id, etc.
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CopperCredit = typeof copperCredits.$inferSelect;
export type InsertCopperCredit = typeof copperCredits.$inferInsert;
export const insertCopperCreditSchema = createInsertSchema(copperCredits).omit({ id: true, createdAt: true });

export const COPPER_CREDIT_TYPES = {
  CUSTODY_YIELD: "CUSTODY_YIELD",
  MILESTONE_BONUS: "MILESTONE_BONUS",
  REDEMPTION_SECURITY_FEE: "REDEMPTION_SECURITY_FEE",
  REDEMPTION_FERRETERIA: "REDEMPTION_FERRETERIA",
} as const;

export const MILESTONE_BONUS_RATE = 50; // 50 Copper Credits per approved milestone

export function generateCertificateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CERT-";
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// === Payment Links (Quick Pay via WhatsApp) ===
export const PAYMENT_LINK_TYPES = {
  SUBSCRIPTION: "SUBSCRIPTION",
  SECURITY_FEE: "SECURITY_FEE",
  ESCROW_DEPOSIT: "ESCROW_DEPOSIT",
  CUSTOM: "CUSTOM",
} as const;

export const paymentLinks = pgTable("payment_links", {
  id: serial("id").primaryKey(),
  token: varchar("token").notNull().unique(),
  type: varchar("type").notNull(),
  amount: integer("amount").notNull(),
  description: varchar("description").notNull(),
  createdById: varchar("created_by_id"),
  maestroId: integer("maestro_id").references(() => maestros.id),
  clientLeadId: integer("client_lead_id").references(() => clientLeads.id),
  projectWalletId: integer("project_wallet_id").references(() => projectWallets.id),
  countryCode: varchar("country_code").notNull().default("CL"),
  status: varchar("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertPaymentLink = typeof paymentLinks.$inferInsert;
export const insertPaymentLinkSchema = createInsertSchema(paymentLinks).omit({ id: true, createdAt: true });

export function generatePaymentToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PAY-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SMART-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const landingLeads = pgTable("landing_leads", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  phone: varchar("phone").notNull(),
  tipoObra: varchar("tipo_obra").notNull(),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LandingLead = typeof landingLeads.$inferSelect;
export type InsertLandingLead = typeof landingLeads.$inferInsert;
export const insertLandingLeadSchema = createInsertSchema(landingLeads).omit({ id: true, createdAt: true });

export const ferreteriaCoupons = pgTable("ferreteria_coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code").notNull().unique(),
  clientLeadId: integer("client_lead_id").notNull().references(() => clientLeads.id),
  storeName: varchar("store_name").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  ccCost: integer("cc_cost").notNull(),
  status: varchar("status").notNull().default("ACTIVE"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FerreteriaCoupon = typeof ferreteriaCoupons.$inferSelect;
export type InsertFerreteriaCoupon = typeof ferreteriaCoupons.$inferInsert;
export const insertFerreteriaCouponSchema = createInsertSchema(ferreteriaCoupons).omit({ id: true, createdAt: true, usedAt: true });

export const COUPON_STATUS = {
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
} as const;

export function generateFerreteriaCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BTC-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
