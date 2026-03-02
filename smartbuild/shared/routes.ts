
import { z } from 'zod';
import { insertProjectSchema, insertBudgetItemSchema, projects, budgetItems, materials, insertMaterialSchema, type CreateProjectRequest, type UpdateProjectRequest, type UpdateBudgetItemRequest, type InsertProject } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id' as const,
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects' as const,
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/projects/:id/upload' as const,
      // FormData not typed in Zod for request body
      responses: {
        200: z.object({
          message: z.string(),
          itemsCount: z.number().optional(),
          format: z.string().optional(),
          sheetName: z.string().optional(),
          partidaName: z.string().optional(),
          itemNumber: z.string().optional(),
          unit: z.string().optional(),
          sections: z.array(z.string()).optional(),
          componentsCount: z.number().optional(),
          totalCostoAPU: z.number().nullable().optional(),
          itemsInserted: z.number().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    analyze: {
      method: 'POST' as const,
      path: '/api/projects/:id/analyze' as const,
      responses: {
        200: z.object({
          message: z.string(),
          jobId: z.string(),
        }),
      },
    },
    dashboard: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalProjects: z.number(),
          totalBudgeted: z.number(),
          totalProjectedCost: z.number(),
          potentialSavings: z.number(),
          materialsTracked: z.number(),
          storeMixSavings: z.number(),
          totalMaterialCost: z.number(),
          ggPercent: z.number(),
          ggAmount: z.number(),
          profitMargin: z.number(),
          suggestedPrice: z.number(),
          utilityPercent: z.number(),
          lossAlerts: z.array(z.object({
            projectName: z.string(),
            projectId: z.number(),
            budgetPrice: z.number(),
            marketCost: z.number(),
            difference: z.number(),
          })),
        }),
      },
    },
    syncPrices: {
      method: 'POST' as const,
      path: '/api/projects/:id/sync-prices' as const,
      responses: {
        200: z.object({
          message: z.string(),
          matchedCount: z.number(),
          totalItems: z.number(),
          syncTimestamp: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    financials: {
      method: 'GET' as const,
      path: '/api/projects/:id/financials' as const,
      responses: {
        200: z.object({
          excel: z.object({
            netoMateriales: z.number(),
            gastosGeneralesPercent: z.number(),
            gastosGeneralesAmount: z.number(),
            utilidadPercent: z.number(),
            utilidadAmount: z.number(),
            ivaPercent: z.number(),
            ivaAmount: z.number(),
            total: z.number(),
          }),
          real: z.object({
            netoMateriales: z.number(),
            gastosGeneralesPercent: z.number(),
            gastosGeneralesAmount: z.number(),
            utilidadPercent: z.number(),
            utilidadAmount: z.number(),
            ivaPercent: z.number(),
            ivaAmount: z.number(),
            total: z.number(),
          }),
          margenManiobra: z.object({
            deltaAmount: z.number(),
            deltaPercent: z.number(),
            status: z.enum(['favorable', 'riesgo', 'neutro']),
            utilidadRealPercent: z.number(),
          }),
          hasAnalysis: z.boolean(),
        }),
        404: errorSchemas.notFound,
      },
    }
  },
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:id/items' as const,
      responses: {
        200: z.array(z.custom<typeof budgetItems.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/items/:id' as const,
      input: insertBudgetItemSchema.partial(),
      responses: {
        200: z.custom<typeof budgetItems.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  materials: {
    list: {
      method: 'GET' as const,
      path: '/api/materials' as const,
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof materials.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/materials' as const,
      input: insertMaterialSchema,
      responses: {
        201: z.custom<typeof materials.$inferSelect>(),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProjectResponse = z.infer<typeof api.projects.get.responses[200]>;
export type BudgetItemResponse = z.infer<typeof api.items.list.responses[200]>[number];
export type DashboardStatsResponse = z.infer<typeof api.projects.dashboard.responses[200]>;
