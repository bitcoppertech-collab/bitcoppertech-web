
import { db } from "./db";
import {
  projects, budgetItems, materials, companySettings, registeredCustomers, demoRequests,
  type InsertProject, type InsertBudgetItem, type InsertMaterial,
  type Project, type BudgetItem, type Material, type CompanySettings,
  type UpdateProjectRequest, type UpdateBudgetItemRequest,
  type InsertCompanySettings, type DashboardStats,
  type RegisteredCustomer, type InsertCustomer,
  type DemoRequest, type InsertDemoRequest
} from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project>;
  
  // Budget Items
  getBudgetItems(projectId: number): Promise<BudgetItem[]>;
  getBudgetItem(id: number): Promise<BudgetItem | undefined>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  createBudgetItemsBulk(items: InsertBudgetItem[]): Promise<BudgetItem[]>;
  updateBudgetItem(id: number, updates: UpdateBudgetItemRequest): Promise<BudgetItem>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, updates: Partial<InsertMaterial>): Promise<Material | undefined>;
  
  // Company Settings
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(updates: Partial<InsertCompanySettings>): Promise<CompanySettings>;
  
  // Registered Customers
  getCustomers(): Promise<RegisteredCustomer[]>;
  getCustomerByEmail(email: string): Promise<RegisteredCustomer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<RegisteredCustomer>;

  // Demo Requests
  createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest>;
  getDemoRequests(): Promise<DemoRequest[]>;

  // Stats
  getDashboardStats(utilityPercent?: number, ggPercent?: number): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: UpdateProjectRequest): Promise<Project> {
    const [project] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async getBudgetItems(projectId: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId));
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

  async getDashboardStats(utilityPercent: number = 20, ggPercent: number = 0): Promise<DashboardStats> {
    const allProjects = await this.getProjects();
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
}

export const storage = new DatabaseStorage();
