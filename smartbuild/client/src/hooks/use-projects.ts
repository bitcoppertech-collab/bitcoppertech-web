import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateProjectRequest, type UpdateProjectRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useProjects() {
  return useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projects.list.responses[200].parse(await res.json());
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const url = buildUrl(api.projects.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch project");
      return api.projects.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export class PlanLimitError extends Error {
  code = "PLAN_LIMIT_REACHED" as const;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const res = await fetch(api.projects.create.path, {
        method: api.projects.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body.code === "PLAN_LIMIT_REACHED") {
          throw new PlanLimitError(body.message);
        }
        if (res.status === 400) {
          throw new Error(body.message || "Error de validación");
        }
        throw new Error("Failed to create project");
      }
      return api.projects.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (err) => {
      if (err instanceof PlanLimitError) return;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Error al eliminar proyecto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.dashboard.path] });
      toast({ title: "Proyecto eliminado", description: "El proyecto ha sido eliminado exitosamente" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateProjectRequest }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al actualizar proyecto");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id, "financials"] });
      queryClient.invalidateQueries({ queryKey: [api.projects.dashboard.path] });
    },
  });
}

export function useAnalyzeProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.projects.analyze.path, { id });
      const res = await fetch(url, {
        method: api.projects.analyze.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to start analysis");
      return api.projects.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "financials"] });
      queryClient.invalidateQueries({ queryKey: [api.projects.dashboard.path] });
      
      toast({ title: "Análisis Completado", description: data.message });
    },
  });
}

export function useDashboardStats(utilityPercent: number = 20, ggPercent: number = 0) {
  return useQuery({
    queryKey: [api.projects.dashboard.path, utilityPercent, ggPercent],
    queryFn: async () => {
      const url = `${api.projects.dashboard.path}?utilityPercent=${utilityPercent}&ggPercent=${ggPercent}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.projects.dashboard.responses[200].parse(await res.json());
    },
  });
}

export function useProjectFinancials(id: number) {
  return useQuery({
    queryKey: ["/api/projects", id, "financials"],
    queryFn: async () => {
      const url = buildUrl(api.projects.financials.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch financials");
      return api.projects.financials.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useSyncPrices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.projects.syncPrices.path, { id });
      const res = await fetch(url, {
        method: api.projects.syncPrices.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Error al sincronizar precios");
      return api.projects.syncPrices.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "financials"] });
      queryClient.invalidateQueries({ queryKey: [api.projects.dashboard.path] });

      toast({ title: "Precios Sincronizados", description: data.message });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUploadBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const url = buildUrl(api.projects.upload.path, { id });
      const res = await fetch(url, {
        method: api.projects.upload.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Error al subir el presupuesto";
        try {
          const body = await res.json();
          errorMessage = body.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      return api.projects.upload.responses[200].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id, "financials"] });
      queryClient.invalidateQueries({ queryKey: [api.projects.dashboard.path] });
      
      const desc = data.format === "apu"
        ? `${data.message} — ${data.componentsCount ?? 0} componentes cargados`
        : data.message;
      toast({ title: "Carga Exitosa", description: desc });
    },
    onError: (err) => {
      toast({ title: "Error en la Carga", description: err.message, variant: "destructive" });
    },
  });
}
