import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Shield,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  FileText,
  Lock
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import sodimacLogo from "@/assets/images/sodimac-logo.png";
import easyLogo from "@/assets/images/easy-logo.png";

const conversionData = [
  { month: 'Ene', presupuestados: 45, comprados: 12, tasa: 26.7 },
  { month: 'Feb', presupuestados: 62, comprados: 22, tasa: 35.5 },
  { month: 'Mar', presupuestados: 78, comprados: 34, tasa: 43.6 },
  { month: 'Abr', presupuestados: 95, comprados: 48, tasa: 50.5 },
  { month: 'May', presupuestados: 124, comprados: 71, tasa: 57.3 },
  { month: 'Jun', presupuestados: 156, comprados: 98, tasa: 62.8 },
];

const volumeByCategory = [
  { name: 'Acero Estructural', value: 28, color: '#f97316' },
  { name: 'Cemento / Hormigón', value: 22, color: '#3b82f6' },
  { name: 'Madera', value: 15, color: '#10b981' },
  { name: 'Cerámicos / Revestimientos', value: 12, color: '#8b5cf6' },
  { name: 'Tuberías / Conexiones', value: 10, color: '#ec4899' },
  { name: 'Electricidad / Cables', value: 8, color: '#eab308' },
  { name: 'Otros', value: 5, color: '#6b7280' },
];

const projectedGMV = [
  { quarter: 'Q1 2026', sodimac: 42000000, easy: 31000000 },
  { quarter: 'Q2 2026', sodimac: 89000000, easy: 72000000 },
  { quarter: 'Q3 2026', sodimac: 156000000, easy: 128000000 },
  { quarter: 'Q4 2026', sodimac: 245000000, easy: 198000000 },
];

const conversionFunnel = [
  { stage: 'Ítems Presupuestados', count: 4520, pct: 100 },
  { stage: 'Cotizados en Plataforma', count: 3616, pct: 80 },
  { stage: 'Comparados (Sodimac vs Easy)', count: 2893, pct: 64 },
  { stage: 'Agregados al Carrito', count: 1808, pct: 40 },
  { stage: 'Compra Efectiva', count: 1085, pct: 24 },
];

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function Partners() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h1 className="font-bold text-lg tracking-tight">SmartBuild</h1>
              <p className="text-xs text-muted-foreground font-mono">APU ENGINE</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30">
            <Lock className="w-3 h-3 mr-1" />
            Portal de Alianzas Retail
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="text-center space-y-4 animate-in" data-testid="section-partners-hero">
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mx-auto">
            <Shield className="w-3.5 h-3.5" />
            Documento Confidencial — Solo para Partners Estratégicos
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight" data-testid="text-partners-title">
            Portal de Alianzas Retail
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SmartBuild canaliza presupuestos de construcción directamente hacia los principales retailers de Chile.
            Cada proyecto analizado genera demanda real de compra hacia sus tiendas.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <img src={sodimacLogo} alt="Sodimac" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-sm font-medium text-orange-400">Sodimac</span>
            </div>
            <span className="text-muted-foreground/30 text-2xl">×</span>
            <div className="flex items-center gap-2">
              <img src={easyLogo} alt="Easy" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-sm font-medium text-blue-400">Easy</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in" style={{ animationDelay: '50ms' }}>
          {[
            { label: 'Proyectos Activos', value: '47', icon: FileText, color: 'text-primary' },
            { label: 'Ítems Presupuestados', value: '4.520', icon: BarChart3, color: 'text-emerald-500' },
            { label: 'Tasa de Conversión', value: '62.8%', icon: TrendingUp, color: 'text-amber-500' },
            { label: 'PYMEs Conectadas', value: '23', icon: Users, color: 'text-blue-400' },
          ].map((stat) => (
            <Card key={stat.label} className="border-border shadow-md" data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Acumulado</Badge>
                </div>
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in" style={{ animationDelay: '100ms' }}>
          <Card className="border-border shadow-md" data-testid="card-conversion-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Conversión de Presupuesto a Compra Real
              </CardTitle>
              <CardDescription>
                Evolución mensual de ítems presupuestados vs. comprados efectivamente a través de la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [value, name === 'presupuestados' ? 'Presupuestados' : 'Comprados']}
                    />
                    <Legend formatter={(v: string) => v === 'presupuestados' ? 'Ítems Presupuestados' : 'Compras Efectivas'} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="presupuestados" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} name="presupuestados" />
                    <Bar dataKey="comprados" fill="#10b981" radius={[4, 4, 0, 0]} name="comprados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tasa de Conversión Actual</p>
                  <p className="text-2xl font-bold text-emerald-500">62.8%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Crecimiento MoM</p>
                  <p className="text-lg font-bold text-primary">+9.6%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md" data-testid="card-category-distribution">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
                Distribución por Categoría de Material
              </CardTitle>
              <CardDescription>
                Desglose del volumen de compra proyectado según categoría de material de construcción.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={volumeByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {volumeByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [`${value}%`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {volumeByCategory.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted-foreground truncate">{cat.name}</span>
                    <span className="font-mono font-medium ml-auto">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-md animate-in" style={{ animationDelay: '150ms' }} data-testid="card-gmv-projection">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              GMV Proyectado por Retailer — 2026
            </CardTitle>
            <CardDescription>
              Volumen bruto de mercancías (Gross Merchandise Volume) proyectado a canalizar hacia cada retailer a través de SmartBuild.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectedGMV} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSodimac" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEasy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="quarter" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} width={55} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [formatCLP(value), name === 'sodimac' ? 'Sodimac' : 'Easy']}
                  />
                  <Legend formatter={(v: string) => v === 'sodimac' ? 'Sodimac' : 'Easy'} wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="sodimac" stroke="#f97316" strokeWidth={2} fill="url(#gradSodimac)" name="sodimac" />
                  <Area type="monotone" dataKey="easy" stroke="#3b82f6" strokeWidth={2} fill="url(#gradEasy)" name="easy" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-6 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">GMV Total Anual Proyectado</p>
                <p className="text-2xl font-bold font-mono text-primary" data-testid="text-gmv-total">$961.000.000</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <img src={sodimacLogo} alt="" className="w-3 h-3 rounded-sm" /> Sodimac
                </p>
                <p className="text-xl font-bold font-mono text-orange-400" data-testid="text-gmv-sodimac">$532.000.000</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <img src={easyLogo} alt="" className="w-3 h-3 rounded-sm" /> Easy
                </p>
                <p className="text-xl font-bold font-mono text-blue-400" data-testid="text-gmv-easy">$429.000.000</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md animate-in" style={{ animationDelay: '175ms' }} data-testid="card-funnel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-amber-500" />
              Funnel de Conversión — Presupuesto a Compra
            </CardTitle>
            <CardDescription>
              Flujo completo desde la carga del presupuesto hasta la compra efectiva en retail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversionFunnel.map((step, i) => (
                <div key={step.stage} className="flex items-center gap-4" data-testid={`funnel-stage-${i}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{step.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{step.count.toLocaleString('es-CL')}</span>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">{step.pct}%</Badge>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${step.pct}%`,
                          background: `linear-gradient(90deg, hsl(var(--primary)) 0%, ${i === conversionFunnel.length - 1 ? '#10b981' : 'hsl(var(--primary))'} 100%)`,
                          opacity: 0.4 + (step.pct / 100) * 0.6
                        }}
                      />
                    </div>
                  </div>
                  {i < conversionFunnel.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="animate-in" style={{ animationDelay: '200ms' }} data-testid="section-certification">
          <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 via-card to-primary/5">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    En Proceso
                  </Badge>
                </div>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <h3 className="text-xl font-bold" data-testid="text-certification-title">
                    Integración con APIs de Sodimac y Easy en proceso de certificación
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Bitcopper Tech SpA está avanzando en el proceso de certificación técnica para la integración
                    directa con las APIs de inventario y precios de los principales retailers de construcción en Chile.
                    Esto permitirá precios en tiempo real, disponibilidad de stock actualizada, y un flujo de compra
                    integrado directamente desde SmartBuild hacia las plataformas de e-commerce de cada retailer.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    {[
                      { label: 'Precios en Tiempo Real', icon: Zap },
                      { label: 'Stock Actualizado', icon: CheckCircle2 },
                      { label: 'Compra Integrada', icon: Building2 },
                      { label: 'Trazabilidad Completa', icon: FileText },
                    ].map((feat) => (
                      <div key={feat.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <feat.icon className="w-3.5 h-3.5 text-primary" />
                        {feat.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <img src={sodimacLogo} alt="Sodimac" className="w-12 h-12 rounded-xl object-contain border border-border/50 p-1" />
                    <img src={easyLogo} alt="Easy" className="w-12 h-12 rounded-xl object-contain border border-border/50 p-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="text-center pt-6 pb-10 border-t border-border/30 animate-in" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-6 h-6 rounded object-contain" />
            <span className="text-sm font-semibold text-[#c77b3f]">Bitcopper Tech SpA</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Este portal contiene información confidencial destinada exclusivamente a potenciales socios comerciales.
            Los datos mostrados son proyecciones basadas en el crecimiento actual de la plataforma SmartBuild APU Engine.
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            © 2026 Bitcopper Tech SpA — Todos los derechos reservados
          </p>
        </footer>
      </main>
    </div>
  );
}
