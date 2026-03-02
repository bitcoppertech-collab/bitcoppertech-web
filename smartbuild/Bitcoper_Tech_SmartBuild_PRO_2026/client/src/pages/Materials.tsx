import { useMaterials, useUpdateMaterialStatus } from "@/hooks/use-materials";
import { Sidebar } from "@/components/Sidebar";
import { 
  Search, 
  ShoppingCart, 
  TrendingDown, 
  Package,
  CheckCircle2,
  Truck,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_FLOW = ["Pendiente de Compra", "En Tránsito", "Recibido en Obra", "Comprado"];

function getNextStatus(current: string): string {
  const idx = STATUS_FLOW.findIndex(s => current.toLowerCase().startsWith(s.toLowerCase().slice(0, 8)));
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[0];
  return STATUS_FLOW[idx + 1];
}

function getStatusIcon(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('comprado') || s.includes('recibido')) return CheckCircle2;
  if (s.includes('tránsito') || s.includes('transito')) return Truck;
  return Clock;
}

function getStatusStyle(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('comprado')) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20";
  if (s.includes('recibido')) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20";
  if (s.includes('tránsito') || s.includes('transito')) return "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20";
  return "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20";
}

export default function Materials() {
  const [search, setSearch] = useState("");
  const { data: materials, isLoading } = useMaterials(search);
  const updateStatus = useUpdateMaterialStatus();
  const { toast } = useToast();

  function handleStatusToggle(material: any) {
    const next = getNextStatus(material.status || "Pendiente de Compra");
    updateStatus.mutate(
      { id: material.id, status: next },
      {
        onSuccess: () => {
          toast({
            title: "Estado actualizado",
            description: `${material.name}: ${next}`,
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo actualizar el estado",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Biblioteca de Materiales</h1>
            <p className="text-muted-foreground">Comparación de precios en tiempo real de Sodimac y Easy.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar materiales..." 
              className="pl-9 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-materials"
            />
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Motor de Comparación de Precios</CardTitle>
              <CardDescription>
                Matching de SKU en vivo para acero, cubiertas y materiales estructurales.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 font-medium">
                    <tr>
                      <th className="px-6 py-4">Material / SKU</th>
                      <th className="px-6 py-4 text-center">Unidad</th>
                      <th className="px-6 py-4 text-right">Precio Base</th>
                      <th className="px-6 py-4 text-center">Sodimac</th>
                      <th className="px-6 py-4 text-center">Easy</th>
                      <th className="px-6 py-4 text-center">Mejor Opción</th>
                      <th className="px-6 py-4 text-center">Estado de Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {isLoading ? (
                      [1, 2, 3].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 w-48 bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 w-8 mx-auto bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 w-16 ml-auto bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 w-20 mx-auto bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 w-20 mx-auto bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 w-24 mx-auto bg-secondary rounded" /></td>
                          <td className="px-6 py-4 text-center"><div className="h-4 w-24 mx-auto bg-secondary rounded" /></td>
                        </tr>
                      ))
                    ) : (
                      materials?.map((material: any) => {
                        const StatusIcon = getStatusIcon(material.status);
                        return (
                          <tr key={material.id} className="hover:bg-secondary/20 transition-colors" data-testid={`row-material-${material.id}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-primary">
                                  <Package className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-foreground">{material.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-muted-foreground">{material.unit}</td>
                            <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                              ${Number(material.currentPrice).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {material.sodimacPrice ? (
                                <div className={cn(
                                  "p-2 rounded-lg border",
                                  material.cheapest === 'Sodimac' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"
                                )}>
                                  <p className="text-xs text-muted-foreground mb-1">Sodimac</p>
                                  <p className={cn(
                                    "font-mono font-bold",
                                    material.cheapest === 'Sodimac' ? "text-emerald-500" : "text-foreground"
                                  )} data-testid={`text-sodimac-price-${material.id}`}>
                                    ${Number(material.sodimacPrice).toLocaleString()}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin Datos</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {material.easyPrice ? (
                                <div className={cn(
                                  "p-2 rounded-lg border",
                                  material.cheapest === 'Easy' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"
                                )}>
                                  <p className="text-xs text-muted-foreground mb-1">Easy</p>
                                  <p className={cn(
                                    "font-mono font-bold",
                                    material.cheapest === 'Easy' ? "text-emerald-500" : "text-foreground"
                                  )} data-testid={`text-easy-price-${material.id}`}>
                                    ${Number(material.easyPrice).toLocaleString()}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin Datos</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {material.cheapest ? (
                                <Badge className="bg-emerald-500 text-white border-0">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  {material.cheapest}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Manual
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn("text-xs font-bold uppercase gap-1.5 transition-all", getStatusStyle(material.status))}
                                onClick={() => handleStatusToggle(material)}
                                disabled={updateStatus.isPending}
                                data-testid={`button-status-${material.id}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {material.status || "Pendiente de Compra"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
