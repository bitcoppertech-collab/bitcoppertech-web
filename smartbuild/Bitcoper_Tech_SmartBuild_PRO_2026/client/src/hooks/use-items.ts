import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type UpdateBudgetItemRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useBudgetItems(projectId: number) {
  return useQuery({
    queryKey: ["/api/projects", projectId, "items"],
    queryFn: async () => {
      const url = buildUrl(api.items.list.path, { id: projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch budget items");
      return api.items.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useUpdateBudgetItem(projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateBudgetItemRequest }) => {
      const url = buildUrl(api.items.update.path, { id });
      const res = await fetch(url, {
        method: api.items.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update item");
      return api.items.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "items"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "financials"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: "No se pudo guardar el precio.", variant: "destructive" });
    },
  });
}
