import { useDashboardStats, useProjects } from "@/hooks/use-projects";
import { Sidebar } from "@/components/Sidebar";
import { StatsCard } from "@/components/StatsCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { useState } from "react";
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package, 
  ArrowRight,
  Clock,
  ShoppingCart,
  AlertTriangle,
  Percent,
  Receipt,
  Banknote,
  Settings2
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function Dashboard() {
  const [utilityPercent, setUtilityPercent] = useState(20);
  const [ggPercent, setGgPercent] = useState(0);
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats(utilityPercent, ggPercent);
  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const LoadingCard = () => <Skeleton className="h-[140px] w-full rounded-2xl bg-card/50" />;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Panel de Control</h1>
            <p className="text-muted-foreground">Bienvenido a SmartBuild APU Engine.</p>
          </div>
          <div className="flex items-center gap-3">
            <CreateProjectDialog />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-in">
          <Card className="border-primary/20 bg-primary/5 backdrop-blur" data-testid="card-utility-percent">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Percent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">% Utilidad PYME</p>
                    <p className="text-xs text-muted-foreground">Define tu margen de ganancia deseado</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={utilityPercent}
                    onChange={(e) => setUtilityPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-24 bg-background text-center font-mono font-bold text-lg"
                    data-testid="input-utility-percent"
                  />
                  <span className="text-sm font-medium text-muted-foreground">%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 backdrop-blur" data-testid="card-gg-percent">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Settings2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">% Gastos Generales</p>
                    <p className="text-xs text-muted-foreground">Costos indirectos de administración y operación</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={ggPercent}
                    onChange={(e) => setGgPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-24 bg-background text-center font-mono font-bold text-lg"
                    data-testid="input-gg-percent"
                  />
                  <span className="text-sm font-medium text-muted-foreground">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoadingStats ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              <StatsCard 
                title="Costo Total Materiales" 
                value={`$${(stats?.totalMaterialCost || 0).toLocaleString()}`}
                description="Precio retail de mercado (mejor precio Sodimac/Easy)"
                icon={Receipt}
                className="border-blue-500/20 bg-blue-500/5"
                data-testid="stat-total-material-cost"
              />
              <StatsCard 
                title="Margen de Ganancia" 
                value={`$${(stats?.profitMargin || 0).toLocaleString()}`}
                description={`${utilityPercent}% sobre el costo de materiales`}
                icon={Banknote}
                trend={stats?.profitMargin && stats.profitMargin > 0 ? "up" : "neutral"}
                trendValue={stats?.profitMargin && stats.profitMargin > 0 ? `+${utilityPercent}%` : "Sin datos"}
                className="border-emerald-500/20 bg-emerald-500/5"
                data-testid="stat-profit-margin"
              />
              <StatsCard 
                title="Precio Final Sugerido" 
                value={`$${(stats?.suggestedPrice || 0).toLocaleString()}`}
                description={`Costo + GG (${ggPercent}%) + Utilidad (${utilityPercent}%) + IVA 19%`}
                icon={DollarSign}
                className="border-primary/20 bg-primary/5"
                data-testid="stat-suggested-price"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoadingStats ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              <StatsCard 
                title="Proyectos Activos" 
                value={stats?.totalProjects || 0}
                description="Total en cartera"
                icon={BarChart3}
                data-testid="stat-active-projects"
              />
              <StatsCard 
                title="Presupuesto Licitado" 
                value={`$${(stats?.totalBudgeted || 0).toLocaleString()}`}
                description="Valor original del Excel"
                icon={DollarSign}
                data-testid="stat-total-budget"
              />
              <StatsCard 
                title="Costo Proyectado" 
                value={`$${(stats?.totalProjectedCost || 0).toLocaleString()}`}
                description="Basado en precios de mercado"
                icon={TrendingUp}
                trend={stats?.totalProjectedCost && stats.totalProjectedCost > 0 ? (stats.totalBudgeted > stats.totalProjectedCost ? "up" : "down") : "neutral"}
                trendValue={stats?.totalProjectedCost && stats.totalProjectedCost > 0 ? (stats.totalBudgeted > stats.totalProjectedCost ? "Margen positivo" : "Margen negativo") : "Sin análisis"}
                data-testid="stat-projected-cost"
              />
              <StatsCard 
                title="Materiales" 
                value={stats?.materialsTracked || 0}
                description="En la biblioteca"
                icon={Package}
                data-testid="stat-materials"
              />
            </>
          )}
        </div>

        {!isLoadingStats && stats?.lossAlerts && stats.lossAlerts.length > 0 && (
          <div className="mb-8 animate-in" style={{ animationDelay: '30ms' }}>
            <Card className="overflow-hidden border-rose-500/30 bg-gradient-to-r from-rose-500/5 to-rose-500/10 backdrop-blur" data-testid="card-loss-alerts">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  Alerta de Viabilidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Los siguientes proyectos tienen un precio de licitación menor al costo de mercado. Esto significaría pérdida:
                </p>
                {stats.lossAlerts.map((alert: any) => (
                  <div key={alert.projectId} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                    <div>
                      <Link href={`/projects/${alert.projectId}`}>
                        <span className="font-medium text-rose-300 hover:underline cursor-pointer" data-testid={`link-alert-project-${alert.projectId}`}>
                          {alert.projectName}
                        </span>
                      </Link>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Licitación: <span className="font-mono">${alert.budgetPrice.toLocaleString()}</span></span>
                        <span>Costo Mercado: <span className="font-mono">${alert.marketCost.toLocaleString()}</span></span>
                      </div>
                    </div>
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                      -${alert.difference.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoadingStats && (stats?.storeMixSavings ?? 0) > 0 && (
          <div className="mb-8 animate-in" style={{ animationDelay: '50ms' }}>
            <Card className="overflow-hidden border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 backdrop-blur" data-testid="card-store-mix-savings">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <ShoppingCart className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-400 mb-1">Ahorro por Mix de Tiendas</p>
                      <h3 className="text-3xl font-bold tracking-tight text-emerald-500" data-testid="text-savings-amount">
                        ${(stats?.storeMixSavings || 0).toLocaleString()}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ahorro estimado al elegir el mejor precio entre Sodimac y Easy por cada material, en vez de comprar todo en una sola tienda.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <TrendingDown className="w-3 h-3 mr-1" /> Optimizado
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-6 animate-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Proyectos Recientes</h2>
            <Link href="/projects">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                Ver Todos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {isLoadingProjects ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full bg-card/50 rounded-xl" />)}
              </div>
            ) : projects?.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Sin proyectos aún</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Comienza creando tu primer proyecto de construcción y subiendo un presupuesto.
                </p>
                <CreateProjectDialog />
              </div>
            ) : (
              projects?.slice(0, 5).map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="group bg-card hover:bg-secondary/40 border border-border/50 rounded-xl p-4 flex items-center justify-between transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary/20" data-testid={`card-project-${project.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-border shadow-inner">
                        <span className="font-mono text-lg font-bold text-primary">
                          {project.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{project.client || "Sin Cliente"}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 
                            {project.createdAt ? format(new Date(project.createdAt), 'dd MMM yyyy') : 'N/A'}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Presupuesto</p>
                        <p className="font-mono font-medium">${Number(project.totalBudget).toLocaleString()}</p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={
                          project.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                          project.status === 'processing' ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" :
                          "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
                        }
                        data-testid={`badge-status-${project.id}`}
                      >
                        {project.status === 'completed' ? 'COMPLETADO' : project.status === 'processing' ? 'EN PROCESO' : 'BORRADOR'}
                      </Badge>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
