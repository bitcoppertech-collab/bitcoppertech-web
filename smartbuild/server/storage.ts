
import { db } from "./db";
import {
  projects, budgetItems, materials, companySettings, registeredCustomers, demoRequests, bugReports, adminTransactions, users, distributors,
  type InsertProject, type InsertBudgetItem, type InsertMaterial,
  type Project, type BudgetItem, type Material, type CompanySettings,
  type UpdateProjectRequest, type UpdateBudgetItemRequest,
  type InsertCompanySettings, type DashboardStats,
  type RegisteredCustomer, type InsertCustomer,
  type DemoRequest, type InsertDemoRequest,
  type BugReport, type InsertBugReport,
  type AdminTransaction, type InsertAdminTransaction,
  type User, type Distributor, type InsertDistributor
} from "@shared/schema";
import {
  maestros, workCompletions, reviews, crewMembers, attendanceRecords, dailyLogs,
  clientLeads, coupons, marketplaceRequests, clientCredits,
  projectWallets, walletTransactions, projectMilestones, purchaseOrders, escrowNotifications,
  paymentTransactions,
  homeownerSubscriptions,
  withdrawalRequests,
  userRewards,
  type Maestro, type InsertMaestro,
  type WorkCompletion, type InsertWorkCompletion,
  type Review, type InsertReview,
  type CrewMember, type InsertCrewMember,
  type AttendanceRecord, type InsertAttendanceRecord,
  type DailyLog, type InsertDailyLog,
  type ClientLead, type InsertClientLead,
  type Coupon, type InsertCoupon,
  type MarketplaceRequest, type InsertMarketplaceRequest,
  type ClientCredit, type InsertClientCredit,
  type ProjectWallet, type InsertProjectWallet,
  type WalletTransaction, type InsertWalletTransaction,
  type ProjectMilestone, type InsertProjectMilestone,
  type PurchaseOrder, type InsertPurchaseOrder,
  type EscrowNotification, type InsertEscrowNotification,
  type PaymentTransaction, type InsertPaymentTransaction,
  type HomeownerSubscription, type InsertHomeownerSubscription,
  type WithdrawalRequest, type InsertWithdrawalRequest,
  type UserReward, type InsertUserReward,
  copperCredits,
  type CopperCredit, type InsertCopperCredit,
  paymentLinks,
  type PaymentLink, type InsertPaymentLink,
  landingLeads,
  type LandingLead, type InsertLandingLead,
  ferreteriaCoupons,
  type FerreteriaCoupon, type InsertFerreteriaCoupon,
} from "@shared/models/auth";
import { eq, and, sql, desc, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  getProjects(ownerId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject, ownerId: string): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  
  getBudgetItems(projectId: number): Promise<BudgetItem[]>;
  getBudgetItem(id: number): Promise<BudgetItem | undefined>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  createBudgetItemsBulk(items: InsertBudgetItem[]): Promise<BudgetItem[]>;
  updateBudgetItem(id: number, updates: UpdateBudgetItemRequest): Promise<BudgetItem>;
  deleteBudgetItemsByProject(projectId: number): Promise<void>;
  
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, updates: Partial<InsertMaterial>): Promise<Material | undefined>;
  
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(updates: Partial<InsertCompanySettings>): Promise<CompanySettings>;
  
  getCustomers(): Promise<RegisteredCustomer[]>;
  getCustomerByEmail(email: string): Promise<RegisteredCustomer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<RegisteredCustomer>;

  createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest>;
  getDemoRequests(): Promise<DemoRequest[]>;

  createBugReport(report: InsertBugReport): Promise<BugReport>;
  getBugReports(): Promise<BugReport[]>;

  getAdminTransactions(): Promise<AdminTransaction[]>;
  createAdminTransaction(transaction: InsertAdminTransaction): Promise<AdminTransaction>;
  updateAdminTransactionStatus(id: number, estado: string): Promise<AdminTransaction>;

  getDashboardStats(ownerId: string, utilityPercent?: number, ggPercent?: number): Promise<DashboardStats>;

  getAllUsers(): Promise<User[]>;
  getUserProjectCount(userId: string): Promise<number>;

  getDistributors(): Promise<Distributor[]>;
  getDistributor(id: number): Promise<Distributor | undefined>;
  getDistributorByCode(code: string): Promise<Distributor | undefined>;
  getDistributorByUserId(userId: string): Promise<Distributor | undefined>;
  createDistributor(distributor: InsertDistributor): Promise<Distributor>;
  updateDistributor(id: number, updates: Partial<InsertDistributor>): Promise<Distributor>;

  getReferralCountByCode(code: string): Promise<number>;
  applyReferralCode(userId: string, code: string): Promise<void>;
  getUserReferralCode(userId: string): Promise<string | null>;

  getMaestroByUserId(userId: string): Promise<Maestro | undefined>;
  getMaestroById(id: number): Promise<Maestro | undefined>;
  getMaestroByDocument(documentoOrigen: string): Promise<Maestro | undefined>;
  getMaestroByRut(rutChileno: string): Promise<Maestro | undefined>;
  createMaestro(maestro: InsertMaestro): Promise<Maestro>;
  updateMaestro(id: number, updates: Partial<InsertMaestro>): Promise<Maestro>;
  updateMaestroKyc(id: number, updates: { documentoOrigen?: string; tipoDocumentoOrigen?: string; rutChileno?: string; estadoRut?: string; docPhotoUrl?: string; kycVerified?: boolean }): Promise<Maestro>;
  getMaestros(): Promise<Maestro[]>;

  createWorkCompletion(wc: InsertWorkCompletion): Promise<WorkCompletion>;
  getWorkCompletionByToken(token: string): Promise<WorkCompletion | undefined>;
  getWorkCompletionsByMaestro(maestroId: number): Promise<WorkCompletion[]>;
  updateWorkCompletionStatus(id: number, status: string): Promise<WorkCompletion>;

  createReview(review: InsertReview): Promise<Review>;
  getReviewsByMaestro(maestroId: number): Promise<Review[]>;
  updateMaestroRatingStats(maestroId: number): Promise<Maestro>;
  incrementMaestroCreditScore(maestroId: number, amount: number): Promise<Maestro>;

  getCrewMembers(maestroId: number): Promise<CrewMember[]>;
  createCrewMember(member: InsertCrewMember): Promise<CrewMember>;
  updateCrewMember(id: number, updates: Partial<InsertCrewMember>): Promise<CrewMember>;
  deleteCrewMember(id: number): Promise<void>;

  getAttendanceByDate(maestroId: number, date: string): Promise<AttendanceRecord[]>;
  getAttendanceByDateRange(maestroId: number, startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  upsertAttendance(maestroId: number, crewMemberId: number, date: string, present: boolean): Promise<AttendanceRecord>;

  getDailyLog(maestroId: number, date: string): Promise<DailyLog | undefined>;
  getDailyLogsByRange(maestroId: number, startDate: string, endDate: string): Promise<DailyLog[]>;
  createDailyLog(log: InsertDailyLog): Promise<DailyLog>;

  recalcMaestroStreak(maestroId: number): Promise<Maestro>;

  createClientLead(lead: InsertClientLead): Promise<ClientLead>;
  getClientLeadByEmail(email: string): Promise<ClientLead | undefined>;
  getClientLeadById(id: number): Promise<ClientLead | undefined>;
  getClientReferralCount(clientLeadId: number): Promise<number>;

  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  getCouponsByClientLead(clientLeadId: number): Promise<Coupon[]>;

  createMarketplaceRequest(request: InsertMarketplaceRequest): Promise<MarketplaceRequest>;
  getMarketplaceRequestsByClient(clientLeadId: number): Promise<MarketplaceRequest[]>;
  getMarketplaceRequestsByMaestro(maestroId: number): Promise<MarketplaceRequest[]>;
  updateMarketplaceRequestStatus(id: number, status: string): Promise<MarketplaceRequest>;

  createClientCredit(credit: InsertClientCredit): Promise<ClientCredit>;
  getClientCredits(clientLeadId: number): Promise<ClientCredit[]>;
  getClientCreditBalance(clientLeadId: number): Promise<number>;

  getMaestrosByFilters(city?: string, minRating?: number, specialty?: string): Promise<Maestro[]>;
  getCompletedObrasCountByMaestro(maestroId: number): Promise<number>;

  // === Escrow / Project Wallet ===
  createProjectWallet(wallet: InsertProjectWallet): Promise<ProjectWallet>;
  getProjectWallet(id: number): Promise<ProjectWallet | undefined>;
  getProjectWalletsByClient(clientLeadId: number): Promise<ProjectWallet[]>;
  getProjectWalletsByMaestro(maestroId: number): Promise<ProjectWallet[]>;
  updateProjectWallet(id: number, updates: Partial<InsertProjectWallet & { status: string; maestroAvailable: number; maestroBlocked: number; ferreteriaAllocated: number; guaranteeFund: number }>): Promise<ProjectWallet>;

  createWalletTransaction(tx: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(projectWalletId: number): Promise<WalletTransaction[]>;

  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  getProjectMilestones(projectWalletId: number): Promise<ProjectMilestone[]>;
  getProjectMilestone(id: number): Promise<ProjectMilestone | undefined>;
  updateProjectMilestone(id: number, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone>;

  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrders(projectWalletId: number): Promise<PurchaseOrder[]>;
  updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrder>;

  createEscrowNotification(notification: InsertEscrowNotification): Promise<EscrowNotification>;
  getEscrowNotifications(recipientType: string, recipientId: number): Promise<EscrowNotification[]>;
  getUnreadNotificationCount(recipientType: string, recipientId: number): Promise<number>;
  markNotificationsRead(recipientType: string, recipientId: number): Promise<void>;

  // === Homeowner Subscriptions ===
  getSubscriptionByClientLead(clientLeadId: number): Promise<HomeownerSubscription | undefined>;
  getSubscriptionByUserId(userId: string): Promise<HomeownerSubscription | undefined>;
  getAllSubscriptions(): Promise<HomeownerSubscription[]>;
  createSubscription(sub: InsertHomeownerSubscription): Promise<HomeownerSubscription>;
  cancelSubscription(id: number): Promise<HomeownerSubscription>;

  // === User Role ===
  updateUserRole(userId: string, role: string): Promise<void>;

  // === Withdrawal Requests ===
  createWithdrawalRequest(wr: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  getWithdrawalRequestByToken(qrToken: string): Promise<WithdrawalRequest | undefined>;
  getWithdrawalRequestsByMaestro(maestroId: number): Promise<WithdrawalRequest[]>;
  getWithdrawalRequestsByClient(clientLeadId: number): Promise<WithdrawalRequest[]>;
  getWithdrawalRequestsByWallet(projectWalletId: number): Promise<WithdrawalRequest[]>;
  updateWithdrawalRequest(id: number, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest>;

  // === Payment Transactions ===
  createPaymentTransaction(tx: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransactionById(id: number): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByExternalId(externalId: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByProviderId(providerTransactionId: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionsByClient(clientLeadId: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionsByMaestro(maestroId: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionsByWallet(projectWalletId: number): Promise<PaymentTransaction[]>;
  updatePaymentTransactionStatus(id: number, status: string, updates?: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction>;

  // === User Rewards (Custody Yield) ===
  createUserReward(reward: InsertUserReward): Promise<UserReward>;
  getUserRewardsByClient(clientLeadId: number): Promise<UserReward[]>;
  getUserRewardsByWallet(projectWalletId: number): Promise<UserReward[]>;
  getUserRewardsTotalByClient(clientLeadId: number): Promise<number>;

  // === Copper Credits (Bitcopper Wallet) ===
  createCopperCredit(credit: InsertCopperCredit): Promise<CopperCredit>;
  getCopperCreditsByClient(clientLeadId: number): Promise<CopperCredit[]>;
  getCopperCreditBalance(clientLeadId: number): Promise<number>;
  getAllClientLeadsWithWallets(): Promise<{ id: number; name: string }[]>;

  // === Landing Leads ===
  createLandingLead(lead: InsertLandingLead): Promise<LandingLead>;
  getAllLandingLeads(): Promise<LandingLead[]>;

  // === Payment Links ===
  createPaymentLink(link: InsertPaymentLink): Promise<PaymentLink>;
  getPaymentLinkByToken(token: string): Promise<PaymentLink | undefined>;
  updatePaymentLinkStatus(id: number, status: string, updates?: Partial<PaymentLink>): Promise<PaymentLink>;
  getPaymentLinksByCreator(createdById: string): Promise<PaymentLink[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(ownerId: string): Promise<Project[]> {
    return await db.select().from(projects)
      .where(eq(projects.ownerId, ownerId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject, ownerId: string): Promise<Project> {
    const [project] = await db.insert(projects).values({ ...insertProject, ownerId }).returning();
    return project;
  }

  async updateProject(id: number, updates: UpdateProjectRequest): Promise<Project> {
    const [project] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(budgetItems).where(eq(budgetItems.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getBudgetItems(projectId: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId)).orderBy(asc(budgetItems.sortOrder), asc(budgetItems.id));
  }

  async getBudgetItem(id: number): Promise<BudgetItem | undefined> {
    const [item] = await db.select().from(budgetItems).where(eq(budgetItems.id, id));
    return item;
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const [created] = await db.insert(budgetItems).values(item).returning();
    return created;
  }

  async createBudgetItemsBulk(items: InsertBudgetItem[]): Promise<BudgetItem[]> {
    if (items.length === 0) return [];
    return await db.insert(budgetItems).values(items).returning();
  }

  async updateBudgetItem(id: number, updates: UpdateBudgetItemRequest): Promise<BudgetItem> {
    const [updated] = await db.update(budgetItems)
      .set(updates)
      .where(eq(budgetItems.id, id))
      .returning();
    return updated;
  }

  async deleteBudgetItemsByProject(projectId: number): Promise<void> {
    await db.delete(budgetItems).where(eq(budgetItems.projectId, projectId));
  }

  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(material).returning();
    return created;
  }

  async updateMaterial(id: number, updates: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db.update(materials)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updated;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const rows = await db.select().from(companySettings);
    if (rows.length > 0) return rows[0];
    const [created] = await db.insert(companySettings).values({}).returning();
    return created;
  }

  async updateCompanySettings(updates: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    const current = await this.getCompanySettings();
    const [updated] = await db.update(companySettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companySettings.id, current.id))
      .returning();
    return updated;
  }

  async getCustomers(): Promise<RegisteredCustomer[]> {
    return await db.select().from(registeredCustomers).orderBy(desc(registeredCustomers.createdAt));
  }

  async getCustomerByEmail(email: string): Promise<RegisteredCustomer | undefined> {
    const [customer] = await db.select().from(registeredCustomers).where(eq(registeredCustomers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<RegisteredCustomer> {
    const [created] = await db.insert(registeredCustomers).values(customer).returning();
    return created;
  }

  async createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest> {
    const [demo] = await db.insert(demoRequests).values(request).returning();
    return demo;
  }

  async getDemoRequests(): Promise<DemoRequest[]> {
    return await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  }

  async createBugReport(report: InsertBugReport): Promise<BugReport> {
    const [created] = await db.insert(bugReports).values(report).returning();
    return created;
  }

  async getBugReports(): Promise<BugReport[]> {
    return await db.select().from(bugReports).orderBy(desc(bugReports.createdAt));
  }

  async getAdminTransactions(): Promise<AdminTransaction[]> {
    return await db.select().from(adminTransactions).orderBy(desc(adminTransactions.createdAt));
  }

  async createAdminTransaction(transaction: InsertAdminTransaction): Promise<AdminTransaction> {
    const [created] = await db.insert(adminTransactions).values(transaction).returning();
    return created;
  }

  async updateAdminTransactionStatus(id: number, estado: string): Promise<AdminTransaction> {
    const [updated] = await db.update(adminTransactions)
      .set({ estado })
      .where(eq(adminTransactions.id, id))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserProjectCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(projects).where(eq(projects.ownerId, userId));
    return result[0]?.count ?? 0;
  }

  async getDistributors(): Promise<Distributor[]> {
    return await db.select().from(distributors).orderBy(desc(distributors.createdAt));
  }

  async getDistributor(id: number): Promise<Distributor | undefined> {
    const [d] = await db.select().from(distributors).where(eq(distributors.id, id));
    return d;
  }

  async getDistributorByCode(code: string): Promise<Distributor | undefined> {
    const [d] = await db.select().from(distributors).where(eq(distributors.code, code.toUpperCase()));
    return d;
  }

  async getDistributorByUserId(userId: string): Promise<Distributor | undefined> {
    const [d] = await db.select().from(distributors).where(eq(distributors.userId, userId));
    return d;
  }

  async createDistributor(distributor: InsertDistributor): Promise<Distributor> {
    const [created] = await db.insert(distributors).values({ ...distributor, code: distributor.code.toUpperCase() }).returning();
    return created;
  }

  async updateDistributor(id: number, updates: Partial<InsertDistributor>): Promise<Distributor> {
    const [updated] = await db.update(distributors).set(updates).where(eq(distributors.id, id)).returning();
    return updated;
  }

  async getReferralCountByCode(code: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.referredByCode, code.toUpperCase()));
    return result[0]?.count ?? 0;
  }

  async applyReferralCode(userId: string, code: string): Promise<void> {
    await db.update(users).set({ referredByCode: code.toUpperCase() }).where(eq(users.id, userId));
  }

  async getUserReferralCode(userId: string): Promise<string | null> {
    const [user] = await db.select({ referredByCode: users.referredByCode }).from(users).where(eq(users.id, userId));
    return user?.referredByCode ?? null;
  }

  async getMaestroByUserId(userId: string): Promise<Maestro | undefined> {
    const [m] = await db.select().from(maestros).where(eq(maestros.userId, userId));
    return m;
  }

  async getMaestroById(id: number): Promise<Maestro | undefined> {
    const [m] = await db.select().from(maestros).where(eq(maestros.id, id));
    return m;
  }

  async getMaestroByDocument(documentoOrigen: string): Promise<Maestro | undefined> {
    const [m] = await db.select().from(maestros).where(eq(maestros.documentoOrigen, documentoOrigen));
    return m;
  }

  async getMaestroByRut(rutChileno: string): Promise<Maestro | undefined> {
    const [m] = await db.select().from(maestros).where(eq(maestros.rutChileno, rutChileno));
    return m;
  }

  async createMaestro(maestro: InsertMaestro): Promise<Maestro> {
    const [created] = await db.insert(maestros).values(maestro).returning();
    return created;
  }

  async updateMaestro(id: number, updates: Partial<InsertMaestro>): Promise<Maestro> {
    const [updated] = await db.update(maestros).set({ ...updates, updatedAt: new Date() }).where(eq(maestros.id, id)).returning();
    return updated;
  }

  async updateMaestroKyc(id: number, updates: { documentoOrigen?: string; tipoDocumentoOrigen?: string; rutChileno?: string; estadoRut?: string; docPhotoUrl?: string; kycVerified?: boolean }): Promise<Maestro> {
    const setData: any = { ...updates, updatedAt: new Date() };
    if (updates.docPhotoUrl) {
      setData.kycVerified = true;
    }
    const [updated] = await db.update(maestros).set(setData).where(eq(maestros.id, id)).returning();
    return updated;
  }

  async getMaestros(): Promise<Maestro[]> {
    return await db.select().from(maestros).where(eq(maestros.isPublic, true)).orderBy(desc(maestros.avgRating));
  }

  async createWorkCompletion(wc: InsertWorkCompletion): Promise<WorkCompletion> {
    const [created] = await db.insert(workCompletions).values(wc).returning();
    return created;
  }

  async getWorkCompletionByToken(token: string): Promise<WorkCompletion | undefined> {
    const [wc] = await db.select().from(workCompletions).where(eq(workCompletions.token, token));
    return wc;
  }

  async getWorkCompletionsByMaestro(maestroId: number): Promise<WorkCompletion[]> {
    return await db.select().from(workCompletions).where(eq(workCompletions.maestroId, maestroId)).orderBy(desc(workCompletions.createdAt));
  }

  async updateWorkCompletionStatus(id: number, status: string): Promise<WorkCompletion> {
    const [updated] = await db.update(workCompletions).set({ status }).where(eq(workCompletions.id, id)).returning();
    return updated;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async getReviewsByMaestro(maestroId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.maestroId, maestroId)).orderBy(desc(reviews.createdAt));
  }

  async updateMaestroRatingStats(maestroId: number): Promise<Maestro> {
    const allReviews = await this.getReviewsByMaestro(maestroId);
    const count = allReviews.length;
    const avg = count > 0 ? allReviews.reduce((s, r) => s + r.stars, 0) / count : 0;
    const [updated] = await db.update(maestros)
      .set({ avgRating: avg.toFixed(2), ratingCount: count, updatedAt: new Date() })
      .where(eq(maestros.id, maestroId))
      .returning();
    return updated;
  }

  async incrementMaestroCreditScore(maestroId: number, amount: number): Promise<Maestro> {
    const [updated] = await db.update(maestros)
      .set({
        creditScore: sql`${maestros.creditScore} + ${amount}`,
        creditBalance: sql`${maestros.creditBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(maestros.id, maestroId))
      .returning();
    return updated;
  }

  async getCrewMembers(maestroId: number): Promise<CrewMember[]> {
    return await db.select().from(crewMembers)
      .where(and(eq(crewMembers.maestroId, maestroId), eq(crewMembers.isActive, true)))
      .orderBy(crewMembers.name);
  }

  async createCrewMember(member: InsertCrewMember): Promise<CrewMember> {
    const [created] = await db.insert(crewMembers).values(member).returning();
    return created;
  }

  async updateCrewMember(id: number, updates: Partial<InsertCrewMember>): Promise<CrewMember> {
    const [updated] = await db.update(crewMembers).set(updates).where(eq(crewMembers.id, id)).returning();
    return updated;
  }

  async deleteCrewMember(id: number): Promise<void> {
    await db.update(crewMembers).set({ isActive: false }).where(eq(crewMembers.id, id));
  }

  async getAttendanceByDate(maestroId: number, date: string): Promise<AttendanceRecord[]> {
    return await db.select().from(attendanceRecords)
      .where(and(eq(attendanceRecords.maestroId, maestroId), eq(attendanceRecords.date, date)));
  }

  async getAttendanceByDateRange(maestroId: number, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.maestroId, maestroId),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate)
      ))
      .orderBy(attendanceRecords.date);
  }

  async upsertAttendance(maestroId: number, crewMemberId: number, date: string, present: boolean): Promise<AttendanceRecord> {
    const existing = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.maestroId, maestroId),
        eq(attendanceRecords.crewMemberId, crewMemberId),
        eq(attendanceRecords.date, date)
      ));
    if (existing.length > 0) {
      const [updated] = await db.update(attendanceRecords)
        .set({ present })
        .where(eq(attendanceRecords.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(attendanceRecords).values({ maestroId, crewMemberId, date, present }).returning();
    return created;
  }

  async getDailyLog(maestroId: number, date: string): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs)
      .where(and(eq(dailyLogs.maestroId, maestroId), eq(dailyLogs.date, date)));
    return log;
  }

  async getDailyLogsByRange(maestroId: number, startDate: string, endDate: string): Promise<DailyLog[]> {
    return await db.select().from(dailyLogs)
      .where(and(
        eq(dailyLogs.maestroId, maestroId),
        gte(dailyLogs.date, startDate),
        lte(dailyLogs.date, endDate)
      ))
      .orderBy(desc(dailyLogs.date));
  }

  async createDailyLog(log: InsertDailyLog): Promise<DailyLog> {
    const [created] = await db.insert(dailyLogs).values(log).returning();
    return created;
  }

  async recalcMaestroStreak(maestroId: number): Promise<Maestro> {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const attendance = await this.getAttendanceByDate(maestroId, dateStr);
      const log = await this.getDailyLog(maestroId, dateStr);
      const hasAttendance = attendance.some(a => a.present);
      const hasLog = !!log;

      if (hasAttendance && hasLog) {
        streak++;
      } else if (i === 0) {
        break;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const hasActiveBadge = streak >= 5;
    const dailyLogCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(dailyLogs).where(eq(dailyLogs.maestroId, maestroId));
    const trustLevel = dailyLogCount[0]?.count ?? 0;

    const [updated] = await db.update(maestros)
      .set({
        activeStreak: streak,
        hasActiveBadge,
        trustLevel,
        lastActiveDate: todayStr,
        updatedAt: new Date(),
      })
      .where(eq(maestros.id, maestroId))
      .returning();
    return updated;
  }

  async getDashboardStats(ownerId: string, utilityPercent: number = 20, ggPercent: number = 0): Promise<DashboardStats> {
    const allProjects = await this.getProjects(ownerId);
    const allMaterials = await this.getMaterials();
    
    let totalBudgeted = 0;
    allProjects.forEach(p => {
      totalBudgeted += Number(p.totalBudget || 0);
    });

    let totalMaterialCost = 0;
    let allSodimacTotal = 0;
    let allEasyTotal = 0;
    let mixTotal = 0;
    let hasPricingData = false;
    const lossAlerts: DashboardStats['lossAlerts'] = [];

    for (const p of allProjects) {
      const items = await this.getBudgetItems(p.id);
      let projectMarketCost = 0;

      for (const item of items) {
        const qty = Number(item.quantity || 0);
        const originalUP = Number(item.unitPrice || 0);
        const originalTotal = Number(item.totalPrice || 0) || (qty * originalUP);

        if (item.status === 'matched' && item.marketPrice) {
          hasPricingData = true;
          const bestPrice = Number(item.marketPrice);
          const itemCost = qty * bestPrice;
          totalMaterialCost += itemCost;
          projectMarketCost += itemCost;

          const sodP = Number(item.sodimacPrice || 0);
          const easP = Number(item.easyPrice || 0);
          if (sodP > 0) allSodimacTotal += qty * sodP;
          if (easP > 0) allEasyTotal += qty * easP;
          mixTotal += qty * bestPrice;
        } else {
          projectMarketCost += originalTotal;
        }
      }

      if (hasPricingData && projectMarketCost > 0) {
        const budgetTotal = Number(p.totalBudget || 0);
        if (budgetTotal > 0 && budgetTotal < projectMarketCost) {
          lossAlerts.push({
            projectName: p.name,
            projectId: p.id,
            budgetPrice: budgetTotal,
            marketCost: Math.round(projectMarketCost),
            difference: Math.round(projectMarketCost - budgetTotal),
          });
        }
      }
    }

    const singleStoreWorst = Math.max(allSodimacTotal, allEasyTotal);
    const storeMixSavings = hasPricingData ? singleStoreWorst - mixTotal : 0;

    const ggAmount = Math.round(totalMaterialCost * (ggPercent / 100));
    const profitMargin = Math.round(totalMaterialCost * (utilityPercent / 100));
    const subtotalNeto = totalMaterialCost + ggAmount + profitMargin;
    const ivaAmount = Math.round(subtotalNeto * 0.19);
    const suggestedPrice = subtotalNeto + ivaAmount;

    return {
      totalProjects: allProjects.length,
      totalBudgeted,
      totalProjectedCost: totalMaterialCost,
      potentialSavings: totalBudgeted - totalMaterialCost,
      materialsTracked: allMaterials.length,
      storeMixSavings,
      totalMaterialCost,
      ggPercent,
      ggAmount,
      profitMargin,
      suggestedPrice,
      utilityPercent,
      lossAlerts,
    };
  }

  async createClientLead(lead: InsertClientLead): Promise<ClientLead> {
    const [created] = await db.insert(clientLeads).values(lead).returning();
    return created;
  }

  async getClientLeadByEmail(email: string): Promise<ClientLead | undefined> {
    const [lead] = await db.select().from(clientLeads).where(eq(clientLeads.email, email));
    return lead;
  }

  async getClientLeadById(id: number): Promise<ClientLead | undefined> {
    const [lead] = await db.select().from(clientLeads).where(eq(clientLeads.id, id));
    return lead;
  }

  async getClientReferralCount(clientLeadId: number): Promise<number> {
    const results = await db.select().from(clientLeads).where(eq(clientLeads.referralCode, String(clientLeadId)));
    return results.length;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [created] = await db.insert(coupons).values(coupon).returning();
    return created;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [c] = await db.select().from(coupons).where(eq(coupons.code, code));
    return c;
  }

  async getCouponsByClientLead(clientLeadId: number): Promise<Coupon[]> {
    return await db.select().from(coupons).where(eq(coupons.clientLeadId, clientLeadId));
  }

  async createMarketplaceRequest(request: InsertMarketplaceRequest): Promise<MarketplaceRequest> {
    const [created] = await db.insert(marketplaceRequests).values(request).returning();
    return created;
  }

  async getMarketplaceRequestsByClient(clientLeadId: number): Promise<MarketplaceRequest[]> {
    return await db.select().from(marketplaceRequests)
      .where(eq(marketplaceRequests.clientLeadId, clientLeadId))
      .orderBy(desc(marketplaceRequests.createdAt));
  }

  async getMarketplaceRequestsByMaestro(maestroId: number): Promise<MarketplaceRequest[]> {
    return await db.select().from(marketplaceRequests)
      .where(eq(marketplaceRequests.maestroId, maestroId))
      .orderBy(desc(marketplaceRequests.createdAt));
  }

  async updateMarketplaceRequestStatus(id: number, status: string): Promise<MarketplaceRequest> {
    const [updated] = await db.update(marketplaceRequests)
      .set({ status })
      .where(eq(marketplaceRequests.id, id))
      .returning();
    return updated;
  }

  async createClientCredit(credit: InsertClientCredit): Promise<ClientCredit> {
    const [created] = await db.insert(clientCredits).values(credit).returning();
    return created;
  }

  async getClientCredits(clientLeadId: number): Promise<ClientCredit[]> {
    return await db.select().from(clientCredits)
      .where(eq(clientCredits.clientLeadId, clientLeadId))
      .orderBy(desc(clientCredits.createdAt));
  }

  async getClientCreditBalance(clientLeadId: number): Promise<number> {
    const result = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
      .from(clientCredits)
      .where(eq(clientCredits.clientLeadId, clientLeadId));
    return result[0]?.total ?? 0;
  }

  async getMaestrosByFilters(city?: string, minRating?: number, specialty?: string): Promise<Maestro[]> {
    const conditions = [eq(maestros.isPublic, true)];
    if (city) {
      conditions.push(eq(maestros.city, city));
    }
    if (specialty) {
      conditions.push(eq(maestros.specialty, specialty));
    }
    const query = db.select().from(maestros).where(and(...conditions));
    const results = await query.orderBy(desc(maestros.avgRating));
    if (minRating && minRating > 0) {
      return results.filter(m => Number(m.avgRating) >= minRating);
    }
    return results;
  }

  async getCompletedObrasCountByMaestro(maestroId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(projectWallets)
      .where(and(
        eq(projectWallets.maestroId, maestroId),
        eq(projectWallets.status, "COMPLETED")
      ));
    return Number(result[0]?.count ?? 0);
  }

  // === Escrow / Project Wallet ===

  async createProjectWallet(wallet: InsertProjectWallet): Promise<ProjectWallet> {
    const [created] = await db.insert(projectWallets).values(wallet).returning();
    return created;
  }

  async getProjectWallet(id: number): Promise<ProjectWallet | undefined> {
    const [wallet] = await db.select().from(projectWallets).where(eq(projectWallets.id, id));
    return wallet;
  }

  async getProjectWalletsByClient(clientLeadId: number): Promise<ProjectWallet[]> {
    return await db.select().from(projectWallets)
      .where(eq(projectWallets.clientLeadId, clientLeadId))
      .orderBy(desc(projectWallets.createdAt));
  }

  async getProjectWalletsByMaestro(maestroId: number): Promise<ProjectWallet[]> {
    return await db.select().from(projectWallets)
      .where(eq(projectWallets.maestroId, maestroId))
      .orderBy(desc(projectWallets.createdAt));
  }

  async updateProjectWallet(id: number, updates: Partial<InsertProjectWallet & { status: string; maestroAvailable: number; maestroBlocked: number; ferreteriaAllocated: number; guaranteeFund: number }>): Promise<ProjectWallet> {
    const [updated] = await db.update(projectWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectWallets.id, id))
      .returning();
    return updated;
  }

  async createWalletTransaction(tx: InsertWalletTransaction): Promise<WalletTransaction> {
    const [created] = await db.insert(walletTransactions).values(tx).returning();
    return created;
  }

  async getWalletTransactions(projectWalletId: number): Promise<WalletTransaction[]> {
    return await db.select().from(walletTransactions)
      .where(eq(walletTransactions.projectWalletId, projectWalletId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [created] = await db.insert(projectMilestones).values(milestone).returning();
    return created;
  }

  async getProjectMilestones(projectWalletId: number): Promise<ProjectMilestone[]> {
    return await db.select().from(projectMilestones)
      .where(eq(projectMilestones.projectWalletId, projectWalletId))
      .orderBy(projectMilestones.id);
  }

  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id));
    return milestone;
  }

  async updateProjectMilestone(id: number, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const [updated] = await db.update(projectMilestones)
      .set(updates)
      .where(eq(projectMilestones.id, id))
      .returning();
    return updated;
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [created] = await db.insert(purchaseOrders).values(order).returning();
    return created;
  }

  async getPurchaseOrders(projectWalletId: number): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.projectWalletId, projectWalletId))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrder> {
    const [updated] = await db.update(purchaseOrders)
      .set({ status, confirmedAt: status === "CONFIRMED" ? new Date() : undefined })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return updated;
  }

  async createEscrowNotification(notification: InsertEscrowNotification): Promise<EscrowNotification> {
    const [created] = await db.insert(escrowNotifications).values(notification).returning();
    return created;
  }

  async getEscrowNotifications(recipientType: string, recipientId: number): Promise<EscrowNotification[]> {
    return await db.select().from(escrowNotifications)
      .where(and(
        eq(escrowNotifications.recipientType, recipientType),
        eq(escrowNotifications.recipientId, recipientId)
      ))
      .orderBy(desc(escrowNotifications.createdAt));
  }

  async getUnreadNotificationCount(recipientType: string, recipientId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(escrowNotifications)
      .where(and(
        eq(escrowNotifications.recipientType, recipientType),
        eq(escrowNotifications.recipientId, recipientId),
        eq(escrowNotifications.read, false)
      ));
    return result[0]?.count || 0;
  }

  async markNotificationsRead(recipientType: string, recipientId: number): Promise<void> {
    await db.update(escrowNotifications)
      .set({ read: true })
      .where(and(
        eq(escrowNotifications.recipientType, recipientType),
        eq(escrowNotifications.recipientId, recipientId),
        eq(escrowNotifications.read, false)
      ));
  }

  // === Homeowner Subscriptions ===
  async getSubscriptionByClientLead(clientLeadId: number): Promise<HomeownerSubscription | undefined> {
    const [sub] = await db.select().from(homeownerSubscriptions)
      .where(and(eq(homeownerSubscriptions.clientLeadId, clientLeadId), eq(homeownerSubscriptions.status, "ACTIVE")));
    return sub;
  }

  async getSubscriptionByUserId(userId: string): Promise<HomeownerSubscription | undefined> {
    const [sub] = await db.select().from(homeownerSubscriptions)
      .where(and(eq(homeownerSubscriptions.userId, userId), eq(homeownerSubscriptions.status, "ACTIVE")));
    return sub;
  }

  async getAllSubscriptions(): Promise<HomeownerSubscription[]> {
    return db.select().from(homeownerSubscriptions).orderBy(desc(homeownerSubscriptions.createdAt));
  }

  async createSubscription(sub: InsertHomeownerSubscription): Promise<HomeownerSubscription> {
    const [created] = await db.insert(homeownerSubscriptions).values(sub).returning();
    return created;
  }

  async cancelSubscription(id: number): Promise<HomeownerSubscription> {
    const [updated] = await db.update(homeownerSubscriptions)
      .set({ status: "CANCELLED", cancelledAt: new Date() })
      .where(eq(homeownerSubscriptions.id, id))
      .returning();
    return updated;
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

  // === Withdrawal Requests ===
  async createWithdrawalRequest(wr: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [created] = await db.insert(withdrawalRequests).values(wr).returning();
    return created;
  }

  async getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined> {
    const [wr] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id));
    return wr;
  }

  async getWithdrawalRequestByToken(qrToken: string): Promise<WithdrawalRequest | undefined> {
    const [wr] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.qrToken, qrToken));
    return wr;
  }

  async getWithdrawalRequestsByMaestro(maestroId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.maestroId, maestroId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalRequestsByClient(clientLeadId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.clientLeadId, clientLeadId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalRequestsByWallet(projectWalletId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.projectWalletId, projectWalletId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: number, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest> {
    const [updated] = await db.update(withdrawalRequests)
      .set(updates)
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return updated;
  }

  // === Payment Transactions ===
  async createPaymentTransaction(tx: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [created] = await db.insert(paymentTransactions).values(tx).returning();
    return created;
  }

  async getPaymentTransactionById(id: number): Promise<PaymentTransaction | undefined> {
    const [tx] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return tx;
  }

  async getPaymentTransactionByExternalId(externalId: string): Promise<PaymentTransaction | undefined> {
    const [tx] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.externalId, externalId));
    return tx;
  }

  async getPaymentTransactionByProviderId(providerTransactionId: string): Promise<PaymentTransaction | undefined> {
    const [tx] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.providerTransactionId, providerTransactionId));
    return tx;
  }

  async getPaymentTransactionsByClient(clientLeadId: number): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.clientLeadId, clientLeadId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async getPaymentTransactionsByMaestro(maestroId: number): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.maestroId, maestroId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async getPaymentTransactionsByWallet(projectWalletId: number): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.projectWalletId, projectWalletId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async updatePaymentTransactionStatus(id: number, status: string, updates?: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction> {
    const [updated] = await db.update(paymentTransactions)
      .set({ ...updates, status, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, id))
      .returning();
    return updated;
  }

  async createUserReward(reward: InsertUserReward): Promise<UserReward> {
    const [created] = await db.insert(userRewards).values(reward).returning();
    return created;
  }

  async getUserRewardsByClient(clientLeadId: number): Promise<UserReward[]> {
    return await db.select().from(userRewards)
      .where(eq(userRewards.clientLeadId, clientLeadId))
      .orderBy(desc(userRewards.createdAt));
  }

  async getUserRewardsByWallet(projectWalletId: number): Promise<UserReward[]> {
    return await db.select().from(userRewards)
      .where(eq(userRewards.projectWalletId, projectWalletId))
      .orderBy(desc(userRewards.createdAt));
  }

  async getUserRewardsTotalByClient(clientLeadId: number): Promise<number> {
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${userRewards.tokenAmount}::numeric), 0)`
    }).from(userRewards).where(eq(userRewards.clientLeadId, clientLeadId));
    return parseFloat(result[0]?.total || "0");
  }

  async createCopperCredit(credit: InsertCopperCredit): Promise<CopperCredit> {
    const [created] = await db.insert(copperCredits).values(credit).returning();
    return created;
  }

  async getCopperCreditsByClient(clientLeadId: number): Promise<CopperCredit[]> {
    return await db.select().from(copperCredits)
      .where(eq(copperCredits.clientLeadId, clientLeadId))
      .orderBy(desc(copperCredits.createdAt));
  }

  async getCopperCreditBalance(clientLeadId: number): Promise<number> {
    const result = await db.select({
      balance: sql<string>`COALESCE((SELECT balance_after FROM copper_credits WHERE client_lead_id = ${clientLeadId} ORDER BY id DESC LIMIT 1), '0')`
    }).from(sql`(SELECT 1) AS dummy`);
    return parseFloat(result[0]?.balance || "0");
  }

  async getAllClientLeadsWithWallets(): Promise<{ id: number; name: string }[]> {
    const results = await db.selectDistinct({
      id: clientLeads.id,
      name: clientLeads.name,
    }).from(clientLeads)
      .innerJoin(projectWallets, eq(clientLeads.id, projectWallets.clientLeadId));
    return results;
  }

  async createPaymentLink(link: InsertPaymentLink): Promise<PaymentLink> {
    const [result] = await db.insert(paymentLinks).values(link).returning();
    return result;
  }

  async getPaymentLinkByToken(token: string): Promise<PaymentLink | undefined> {
    const [result] = await db.select().from(paymentLinks).where(eq(paymentLinks.token, token));
    return result;
  }

  async updatePaymentLinkStatus(id: number, status: string, updates?: Partial<PaymentLink>): Promise<PaymentLink> {
    const [result] = await db.update(paymentLinks)
      .set({ status, ...updates })
      .where(eq(paymentLinks.id, id))
      .returning();
    return result;
  }

  async getPaymentLinksByCreator(createdById: string): Promise<PaymentLink[]> {
    return await db.select().from(paymentLinks)
      .where(eq(paymentLinks.createdById, createdById))
      .orderBy(desc(paymentLinks.createdAt));
  }

  async createLandingLead(lead: InsertLandingLead): Promise<LandingLead> {
    const [result] = await db.insert(landingLeads).values(lead).returning();
    return result;
  }

  async getAllLandingLeads(): Promise<LandingLead[]> {
    return await db.select().from(landingLeads).orderBy(desc(landingLeads.createdAt));
  }

  async createFerreteriaCoupon(coupon: InsertFerreteriaCoupon): Promise<FerreteriaCoupon> {
    const [result] = await db.insert(ferreteriaCoupons).values(coupon).returning();
    return result;
  }

  async getFerreteriaCouponByCode(code: string): Promise<FerreteriaCoupon | undefined> {
    const [result] = await db.select().from(ferreteriaCoupons).where(eq(ferreteriaCoupons.code, code));
    return result;
  }

  async markCouponUsed(id: number): Promise<FerreteriaCoupon> {
    const [result] = await db.update(ferreteriaCoupons)
      .set({ status: "USED", usedAt: new Date() })
      .where(eq(ferreteriaCoupons.id, id))
      .returning();
    return result;
  }

  async getClientName(clientLeadId: number): Promise<string> {
    const [result] = await db.select({ name: clientLeads.name }).from(clientLeads).where(eq(clientLeads.id, clientLeadId));
    return result?.name || "Cliente";
  }
}

export const storage = new DatabaseStorage();
