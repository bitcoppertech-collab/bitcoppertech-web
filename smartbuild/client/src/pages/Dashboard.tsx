import { useDashboardStats, useProjects } from "@/hooks/use-projects";
import { Sidebar } from "@/components/Sidebar";
import { StatsCard } from "@/components/StatsCard";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { useState, useMemo, useEffect, useCallback } from "react";
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
  Settings2,
  Search,
  CheckCircle2,
  Store,
  Building2,
  ShieldCheck
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import sodimacLogo from "@/assets/images/sodimac-logo.png";
import easyLogo from "@/assets/images/easy-logo.png";

interface StoreProduct {
  name: string;
  brand: string;
  sku: string;
  price: number;
  unit: string;
  stock: boolean;
  url: string;
}

interface CatalogItem {
  id: string;
  category: string;
  keywords: string[];
  sodimac: StoreProduct;
  easy: StoreProduct;
  bestPrice: number;
  bestSupplier: 'Sodimac' | 'Easy';
}

interface CartEntry {
  catalogId: string;
  store: 'sodimac' | 'easy';
  price: number;
  name: string;
}

type PaymentMethod = 'contado' | 'debito' | 'credito' | 'orden_compra';

function getCreditSurcharge(installments: number): number {
  switch (installments) {
    case 3: return 0.0299;
    case 6: return 0.0499;
    case 12: return 0.0799;
    case 18: return 0.1199;
    default: return 0;
  }
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function Dashboard() {
  const [utilityPercent, setUtilityPercent] = useState(20);
  const [ggPercent, setGgPercent] = useState(15);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const queryClient = useQueryClient();

  const { data: companySettings } = useQuery<{ defaultGGPercent?: string; defaultUtilidadPercent?: string }>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (companySettings && !settingsLoaded) {
      const savedUtil = Number(companySettings.defaultUtilidadPercent || 20);
      const savedGG = Number(companySettings.defaultGGPercent || 15);
      setUtilityPercent(savedUtil);
      setGgPercent(savedGG);
      setSettingsLoaded(true);
    }
  }, [companySettings, settingsLoaded]);

  const saveSettingsToServer = useCallback(async (newUtil: number, newGG: number) => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultUtilidadPercent: newUtil.toString(), defaultGGPercent: newGG.toString() }),
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    } catch {}
  }, [queryClient]);

  const handleUtilityChange = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setUtilityPercent(clamped);
    saveSettingsToServer(clamped, ggPercent);
  }, [ggPercent, saveSettingsToServer]);

  const handleGGChange = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setGgPercent(clamped);
    saveSettingsToServer(utilityPercent, clamped);
  }, [utilityPercent, saveSettingsToServer]);

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats(utilityPercent, ggPercent);
  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const { data: catalog, isLoading: isLoadingCatalog } = useQuery<CatalogItem[]>({
    queryKey: ['/api/catalog'],
  });

  const [catalogSearch, setCatalogSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("contado");
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [cart, setCart] = useState<CartEntry[]>([]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return catalog.filter(item =>
      item.sodimac.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
      item.easy.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
      item.keywords.some(k => k.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  function addToCart(store: 'sodimac' | 'easy', item: CatalogItem) {
    setCart(prev => {
      const exists = prev.find(c => c.catalogId === item.id && c.store === store);
      if (exists) {
        return prev.filter(c => !(c.catalogId === item.id && c.store === store));
      }
      const product = store === 'sodimac' ? item.sodimac : item.easy;
      return [...prev, { catalogId: item.id, store, price: product.price, name: product.name }];
    });
  }

  function isInCart(store: 'sodimac' | 'easy', catalogId: string) {
    return cart.some(c => c.catalogId === catalogId && c.store === store);
  }

  const surchargeRate = paymentMethod === 'credito' ? getCreditSurcharge(creditInstallments) : 0;

  const cartSodimac = cart.filter(c => c.store === 'sodimac');
  const cartEasy = cart.filter(c => c.store === 'easy');
  const cartSodimacBase = cartSodimac.reduce((s, c) => s + c.price, 0);
  const cartEasyBase = cartEasy.reduce((s, c) => s + c.price, 0);
  const cartTotalBase = cartSodimacBase + cartEasyBase;
  const cartTotalWithSurcharge = Math.round(cartTotalBase * (1 + surchargeRate));

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
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs gap-1.5" data-testid="button-admin-panel">
                <ShieldCheck className="w-3.5 h-3.5" />
                Panel Administrador
              </Button>
            </Link>
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
                    onChange={(e) => handleUtilityChange(Number(e.target.value) || 0)}
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
                    onChange={(e) => handleGGChange(Number(e.target.value) || 0)}
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

        <div className="mb-8 animate-in" style={{ animationDelay: '55ms' }}>
          <Card className="overflow-hidden border-border shadow-md" data-testid="card-retail-volume">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Volumen de Compra Proyectado hacia Retail
              </CardTitle>
              <CardDescription>
                Proyección de volumen de compras canalizadas por SmartBuild hacia los principales retailers de construcción en Chile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { month: 'Mar', sodimac: 12400000, easy: 8900000 },
                      { month: 'Abr', sodimac: 18700000, easy: 14200000 },
                      { month: 'May', sodimac: 24500000, easy: 19800000 },
                      { month: 'Jun', sodimac: 31200000, easy: 26400000 },
                      { month: 'Jul', sodimac: 38900000, easy: 32100000 },
                      { month: 'Ago', sodimac: 47600000, easy: 41500000 },
                    ]}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString('es-CL')}`,
                        name === 'sodimac' ? 'Sodimac' : 'Easy'
                      ]}
                      labelFormatter={(label: string) => `Mes: ${label} 2026`}
                    />
                    <Legend
                      formatter={(value: string) => value === 'sodimac' ? 'Sodimac' : 'Easy'}
                      wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Bar dataKey="sodimac" fill="#f97316" radius={[4, 4, 0, 0]} name="sodimac" />
                    <Bar dataKey="easy" fill="#3b82f6" radius={[4, 4, 0, 0]} name="easy" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Proyección Semestral Total</p>
                  <p className="text-lg font-bold font-mono text-primary" data-testid="text-projected-total">$296.300.000</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    <span className="inline-flex items-center gap-1"><img src={sodimacLogo} alt="" className="w-3 h-3 rounded-sm" /> Sodimac</span>
                  </p>
                  <p className="text-lg font-bold font-mono text-orange-400" data-testid="text-projected-sodimac">$173.300.000</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    <span className="inline-flex items-center gap-1"><img src={easyLogo} alt="" className="w-3 h-3 rounded-sm" /> Easy</span>
                  </p>
                  <p className="text-lg font-bold font-mono text-blue-400" data-testid="text-projected-easy">$142.900.000</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 animate-in" style={{ animationDelay: '60ms' }}>
          <Card className="overflow-hidden border-border shadow-md" data-testid="card-master-price-table">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2" data-testid="text-master-price-title">
                    <Store className="w-5 h-5 text-primary" />
                    Tabla Maestra de Precios
                  </CardTitle>
                  <CardDescription>
                    Catálogo completo con precios en tiempo real de Sodimac y Easy. Agrega ítems al carrito para calcular el total del proyecto.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar materiales..."
                    className="pl-9 bg-card"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    data-testid="input-catalog-search"
                  />
                </div>
              </div>
            </CardHeader>

            <div className="px-6 py-3 border-y border-border/50 bg-secondary/10">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold text-muted-foreground uppercase">Medio de Pago:</span>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="flex items-center gap-3"
                >
                  {([
                    { value: "contado", label: "Contado / Transferencia" },
                    { value: "debito", label: "Débito" },
                    { value: "credito", label: "Tarjeta de Crédito" },
                    { value: "orden_compra", label: "Orden de Compra" },
                  ] as const).map(opt => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <RadioGroupItem value={opt.value} id={`dash-pm-${opt.value}`} data-testid={`radio-dash-payment-${opt.value}`} />
                      <Label htmlFor={`dash-pm-${opt.value}`} className={cn("text-xs cursor-pointer", paymentMethod === opt.value ? "text-primary font-medium" : "text-muted-foreground")}>
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {paymentMethod === "credito" && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                    <span className="text-xs text-muted-foreground">Cuotas:</span>
                    <Select
                      value={String(creditInstallments)}
                      onValueChange={(v) => setCreditInstallments(Number(v))}
                    >
                      <SelectTrigger className="w-[180px] h-7 text-xs" data-testid="select-dash-installments">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Sin recargo)</SelectItem>
                        <SelectItem value="3">3 cuotas (+2.99%)</SelectItem>
                        <SelectItem value="6">6 cuotas (+4.99%)</SelectItem>
                        <SelectItem value="12">12 cuotas (+7.99%)</SelectItem>
                        <SelectItem value="18">18 cuotas (+11.99%)</SelectItem>
                      </SelectContent>
                    </Select>
                    {creditInstallments > 1 && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                        Recargo: +{(getCreditSurcharge(creditInstallments) * 100).toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/30">
                  {cartSodimac.length > 0 && (
                    <Badge variant="outline" className="text-orange-400 border-orange-500/30" data-testid="text-dash-cart-sodimac">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Sodimac: {cartSodimac.length} ítems — {formatCLP(Math.round(cartSodimacBase * (1 + surchargeRate)))}
                    </Badge>
                  )}
                  {cartEasy.length > 0 && (
                    <Badge variant="outline" className="text-blue-400 border-blue-500/30" data-testid="text-dash-cart-easy">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Easy: {cartEasy.length} ítems — {formatCLP(Math.round(cartEasyBase * (1 + surchargeRate)))}
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Proyecto</p>
                      <p className="text-lg font-bold font-mono text-primary" data-testid="text-dash-cart-total">
                        {formatCLP(cartTotalWithSurcharge)}
                      </p>
                    </div>
                    {surchargeRate > 0 && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
                        Base: {formatCLP(cartTotalBase)} + {(surchargeRate * 100).toFixed(2)}%
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCart([])}
                      className="text-xs text-muted-foreground"
                      data-testid="button-clear-cart"
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <CardContent className="p-0">
              {isLoadingCatalog ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-card/50 rounded" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/20">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-orange-400 uppercase tracking-wider">Sodimac</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-blue-400 uppercase tracking-wider">Easy</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-400 uppercase tracking-wider">Mejor</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carrito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalog.map((item) => (
                        <tr key={item.id} className="border-b border-border/30 transition-colors" data-testid={`row-catalog-${item.id}`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-sm" data-testid={`text-catalog-name-${item.id}`}>{item.sodimac.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {item.sodimac.brand} / {item.easy.brand}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.sodimac.unit}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("font-mono text-sm", item.bestSupplier === 'Sodimac' ? "text-emerald-400 font-bold" : "text-foreground")}>
                              {formatCLP(item.sodimac.price)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("font-mono text-sm", item.bestSupplier === 'Easy' ? "text-emerald-400 font-bold" : "text-foreground")}>
                              {formatCLP(item.easy.price)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={cn("text-[10px]",
                              item.bestSupplier === 'Sodimac' ? "text-orange-400 border-orange-500/30" : "text-blue-400 border-blue-500/30"
                            )}>
                              {item.bestSupplier}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 text-[10px]">
                              <span className={item.sodimac.stock ? "text-emerald-500" : "text-rose-400"}>
                                S: {item.sodimac.stock ? '✓' : '✗'}
                              </span>
                              <span className={item.easy.stock ? "text-emerald-500" : "text-rose-400"}>
                                E: {item.easy.stock ? '✓' : '✗'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1.5">
                              <Button
                                variant={isInCart('sodimac', item.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => addToCart('sodimac', item)}
                                className={cn("text-[10px] w-full max-w-[140px] gap-1.5",
                                  isInCart('sodimac', item.id)
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "text-muted-foreground"
                                )}
                                data-testid={`button-cart-sodimac-${item.id}`}
                              >
                                <img src={sodimacLogo} alt="Sodimac" className="w-4 h-4 rounded-sm object-contain" />
                                {isInCart('sodimac', item.id) ? "✓ Sodimac" : "Comprar en Sodimac"}
                              </Button>
                              <Button
                                variant={isInCart('easy', item.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => addToCart('easy', item)}
                                className={cn("text-[10px] w-full max-w-[140px] gap-1.5",
                                  isInCart('easy', item.id)
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "text-muted-foreground"
                                )}
                                data-testid={`button-cart-easy-${item.id}`}
                              >
                                <img src={easyLogo} alt="Easy" className="w-4 h-4 rounded-sm object-contain" />
                                {isInCart('easy', item.id) ? "✓ Easy" : "Comprar en Easy"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCatalog.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            No se encontraron materiales con ese filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            {cart.length > 0 && (
              <div className="px-6 py-4 border-t border-border/50 bg-primary/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Resumen del Carrito</p>
                      <p className="text-xs text-muted-foreground">
                        {cart.length} ítems seleccionados • Medio de pago: {
                          paymentMethod === 'contado' ? 'Contado/Transferencia' :
                          paymentMethod === 'debito' ? 'Débito' :
                          paymentMethod === 'credito' ? `Tarjeta de Crédito (${creditInstallments} cuotas)` :
                          'Orden de Compra'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total del Proyecto</p>
                    <p className="text-2xl font-bold font-mono text-primary" data-testid="text-dash-project-total">
                      {formatCLP(cartTotalWithSurcharge)}
                    </p>
                    {surchargeRate > 0 && (
                      <p className="text-[10px] text-amber-500">
                        Base {formatCLP(cartTotalBase)} + recargo {(surchargeRate * 100).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20" data-testid="text-payment-gateway">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-[11px] text-emerald-400/90 leading-snug">
                    Pago procesado mediante <span className="font-semibold text-emerald-400">Bitcopper Gateway</span> — Fondos garantizados por Smart Contract
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="mb-8 animate-in" style={{ animationDelay: '65ms' }}>
          <div className="border border-border/50 rounded-xl bg-gradient-to-r from-[#1a2744]/30 via-card to-[#1a2744]/30 px-6 py-5" data-testid="section-partnerships-footer">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <img src={sodimacLogo} alt="Sodimac" className="w-8 h-8 rounded-lg object-contain opacity-70" />
                <img src={easyLogo} alt="Easy" className="w-8 h-8 rounded-lg object-contain opacity-70" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-[#c77b3f]">Bitcopper Tech</span> busca la integración oficial mediante API con los principales retailers de Chile para mejorar la precisión de costos en la industria.
                </p>
              </div>
              <Badge variant="outline" className="hidden md:flex text-[10px] text-muted-foreground border-border/50 shrink-0">
                Alianza Estratégica
              </Badge>
            </div>
          </div>
        </div>

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
