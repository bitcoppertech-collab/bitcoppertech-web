import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Banknote,
  Flame,
  TrendingUp,
  Shield,
  Hash,
  Percent,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Hexagon,
} from "lucide-react";
import type { FinancingSimulation } from "@shared/schema";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

const COPPER = "#c47a2a";
const COPPER_LIGHT = "#d4943e";
const DARK_BLUE = "#1a2744";
const DARK_BLUE_LIGHT = "#2a3f6a";
const COPPER_BG = "rgba(196,122,42,0.08)";
const COPPER_BORDER = "rgba(196,122,42,0.25)";
const BLUE_BG = "rgba(26,39,68,0.3)";
const BLUE_BORDER = "rgba(42,63,106,0.4)";

export default function Financing() {
  const [tasaMensual, setTasaMensual] = useState(1.5);
  const [plazoMeses, setPlazoMeses] = useState(12);
  const [cuotasPagadas, setCuotasPagadas] = useState(0);
  const { toast } = useToast();

  const { data: simulations, isLoading } = useQuery<FinancingSimulation[]>({
    queryKey: ["/api/financing/simulate", tasaMensual, plazoMeses, cuotasPagadas],
    queryFn: async () => {
      const res = await fetch(`/api/financing/simulate?tasa=${tasaMensual}&plazo=${plazoMeses}&cuotas_pagadas=${cuotasPagadas}`);
      if (!res.ok) throw new Error("Error al cargar simulaciones");
      return res.json();
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", "/api/financing/burn-tokens", {
        projectId,
        cuotasPagadas,
        tasaMensual,
        plazoMeses,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tokens Quemados",
        description: `Capital pagado: $${data.capitalPagado?.toLocaleString()} — Interés ganado: $${data.interesGanado?.toLocaleString()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financing/simulate", tasaMensual, plazoMeses, cuotasPagadas] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo procesar la quema de tokens", variant: "destructive" });
    },
  });

  const totalRetorno = simulations?.reduce((acc, s) => acc + s.retornoBitcoper, 0) || 0;
  const totalFinanciado = simulations?.reduce((acc, s) => acc + s.montoFinanciar, 0) || 0;
  const totalIntereses = simulations?.reduce((acc, s) => acc + s.totalIntereses, 0) || 0;

  const formatCLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-12 h-12 rounded-xl" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1" data-testid="text-financing-title">Financiamiento</h1>
              <p className="text-muted-foreground">Panel de administración — Activos Digitales Tokenizados</p>
            </div>
          </div>
          <Badge
            className="self-start px-3 py-1.5"
            style={{ background: COPPER_BG, color: COPPER_LIGHT, border: `1px solid ${COPPER_BORDER}` }}
          >
            <Shield className="w-3 h-3 mr-1" /> Solo Admin
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card style={{ background: COPPER_BG, border: `1px solid ${COPPER_BORDER}` }} data-testid="card-param-tasa">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: "rgba(196,122,42,0.15)" }}>
                  <Percent className="w-4 h-4" style={{ color: COPPER_LIGHT }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: COPPER_LIGHT }}>Tasa Mensual</p>
                  <p className="text-xs text-muted-foreground">Interés mensual aplicado</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={tasaMensual}
                  onChange={(e) => setTasaMensual(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-background text-center font-mono font-bold"
                  data-testid="input-tasa-mensual"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: BLUE_BG, border: `1px solid ${BLUE_BORDER}` }} data-testid="card-param-plazo">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: "rgba(42,63,106,0.3)" }}>
                  <Calendar className="w-4 h-4" style={{ color: "#6b8fd4" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#6b8fd4" }}>Plazo</p>
                  <p className="text-xs text-muted-foreground">Meses de financiamiento</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={plazoMeses}
                  onChange={(e) => setPlazoMeses(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 bg-background text-center font-mono font-bold"
                  data-testid="input-plazo-meses"
                />
                <span className="text-sm text-muted-foreground">meses</span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: "rgba(196,122,42,0.05)", border: `1px solid rgba(196,122,42,0.15)` }} data-testid="card-param-cuotas">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: "rgba(196,122,42,0.12)" }}>
                  <Flame className="w-4 h-4" style={{ color: COPPER }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: COPPER }}>Cuotas Pagadas</p>
                  <p className="text-xs text-muted-foreground">Para simular quema de tokens</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={plazoMeses}
                  value={cuotasPagadas}
                  onChange={(e) => setCuotasPagadas(Math.max(0, Math.min(plazoMeses, Number(e.target.value) || 0)))}
                  className="w-24 bg-background text-center font-mono font-bold"
                  data-testid="input-cuotas-pagadas"
                />
                <span className="text-sm text-muted-foreground">de {plazoMeses}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card style={{ background: `linear-gradient(135deg, ${COPPER_BG}, rgba(196,122,42,0.12))`, border: `1px solid ${COPPER_BORDER}` }} data-testid="card-total-financiado">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-5 h-5" style={{ color: COPPER_LIGHT }} />
                <p className="text-sm font-medium" style={{ color: COPPER_LIGHT }}>Total Financiado</p>
              </div>
              <p className="text-2xl font-bold font-mono" data-testid="text-total-financiado">
                {isLoading ? "..." : formatCLP(totalFinanciado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">30% del costo directo de todos los proyectos</p>
            </CardContent>
          </Card>

          <Card style={{ background: `linear-gradient(135deg, ${BLUE_BG}, rgba(42,63,106,0.4))`, border: `1px solid ${BLUE_BORDER}` }} data-testid="card-total-intereses">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5" style={{ color: "#6b8fd4" }} />
                <p className="text-sm font-medium" style={{ color: "#6b8fd4" }}>Total Intereses Ganados</p>
              </div>
              <p className="text-2xl font-bold font-mono" data-testid="text-total-intereses">
                {isLoading ? "..." : formatCLP(totalIntereses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Intereses generados a {plazoMeses} meses</p>
            </CardContent>
          </Card>

          <Card style={{ background: `linear-gradient(135deg, rgba(196,122,42,0.06), rgba(42,63,106,0.2))`, border: `1px solid rgba(196,122,42,0.2)` }} data-testid="card-retorno-bitcoper">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5" style={{ color: COPPER_LIGHT }} />
                <p className="text-sm font-medium" style={{ color: COPPER_LIGHT }}>Retorno Bitcopper</p>
              </div>
              <p className="text-2xl font-bold font-mono" data-testid="text-retorno-bitcoper">
                {isLoading ? "..." : formatCLP(totalRetorno)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ingreso neto por financiamiento</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6" style={{ border: `1px solid ${COPPER_BORDER}` }} data-testid="card-simulations-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hexagon className="w-5 h-5" style={{ color: COPPER_LIGHT }} />
              Activos Digitales Tokenizados por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : !simulations || simulations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay proyectos para simular financiamiento.</p>
            ) : (
              <div className="space-y-3">
                {simulations.map((sim) => (
                  <div
                    key={sim.projectId}
                    className="p-4 rounded-lg transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${BLUE_BG}, rgba(196,122,42,0.04))`,
                      border: `1px solid ${sim.statusFinanciamiento === "aprobado" ? "rgba(16,185,129,0.3)" : COPPER_BORDER}`,
                    }}
                    data-testid={`financing-row-${sim.projectId}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Coins className="w-4 h-4" style={{ color: COPPER_LIGHT }} />
                          <h3 className="font-semibold">{sim.projectName}</h3>
                          <Badge
                            className="text-xs"
                            style={sim.statusFinanciamiento === "aprobado"
                              ? { background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
                              : { background: COPPER_BG, color: COPPER_LIGHT, border: `1px solid ${COPPER_BORDER}` }
                            }
                            data-testid={`badge-financing-status-${sim.projectId}`}
                          >
                            {sim.statusFinanciamiento === "aprobado" ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Aprobado</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> Pendiente</>
                            )}
                          </Badge>
                          <Badge
                            className="text-xs"
                            style={{ background: BLUE_BG, color: "#6b8fd4", border: `1px solid ${BLUE_BORDER}` }}
                          >
                            <Hexagon className="w-3 h-3 mr-1" /> Activo Digital Tokenizado
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Costo Directo</p>
                            <p className="font-mono font-medium">{formatCLP(sim.costoDirecto)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Monto a Financiar (30%)</p>
                            <p className="font-mono font-medium" style={{ color: COPPER_LIGHT }}>{formatCLP(sim.montoFinanciar)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Cuota Mensual</p>
                            <p className="font-mono font-medium">{formatCLP(sim.cuotaMensual)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Interés Ganado</p>
                            <p className="font-mono font-medium" style={{ color: "#6b8fd4" }}>{formatCLP(sim.retornoBitcoper)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="font-mono flex items-center gap-1" style={{ color: COPPER }}>
                            <Hash className="w-3 h-3" /> {sim.tokenId}
                          </span>
                          {cuotasPagadas > 0 && (
                            <>
                              <span>Capital pagado: <span className="font-mono" style={{ color: COPPER_LIGHT }}>{formatCLP(sim.capitalPagado)}</span></span>
                              <span>Saldo: <span className="font-mono" style={{ color: "#6b8fd4" }}>{formatCLP(sim.saldoPendiente)}</span></span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => burnMutation.mutate(sim.projectId)}
                        disabled={burnMutation.isPending}
                        className="shrink-0 text-white border-0"
                        style={{ background: `linear-gradient(135deg, ${COPPER}, ${DARK_BLUE})`, boxShadow: `0 4px 12px rgba(196,122,42,0.3)` }}
                        data-testid={`button-burn-tokens-${sim.projectId}`}
                      >
                        <Flame className="w-4 h-4 mr-1" />
                        Quemar Tokens
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
