import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Package,
  Check,
  MessageSquare,
  Bug,
  Star,
  Crown,
  Zap,
  HelpCircle,
  Users,
  Building2,
  Coins,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/images/hero-construction.png";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

const PLANS = [
  {
    name: "Maestro Pro",
    price: 9990,
    description: "Para maestros independientes y contratistas",
    icon: Zap,
    color: "blue",
    popular: false,
    features: [
      "1 proyecto activo",
      "Importación Excel básica",
      "Comparación Sodimac / Easy",
      "Exportación PDF simple",
      "Soporte por email",
    ],
  },
  {
    name: "PYME Constructora",
    price: 34900,
    description: "Para pequeñas y medianas constructoras",
    icon: Star,
    color: "primary",
    popular: true,
    features: [
      "Hasta 10 proyectos activos",
      "Importación Excel ilimitada",
      "Motor de precios completo",
      "Análisis financiero avanzado",
      "Exportación PDF con logo y firma",
      "Diagrama Gantt",
      "Carrito de compras por tienda",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    price: 89000,
    description: "Para grandes constructoras y corporaciones",
    icon: Crown,
    color: "amber",
    popular: false,
    features: [
      "Proyectos ilimitados",
      "Todas las funcionalidades PYME",
      "API de integración externa",
      "Panel de financiamiento",
      "Multi-usuario con roles",
      "Dashboard personalizado",
      "Simulación de tokens",
      "Soporte dedicado 24/7",
    ],
  },
];

const materialDistribution = [
  { name: "Cemento", value: 38, color: "#c77b3f" },
  { name: "Perfiles de Acero", value: 35, color: "#3b82f6" },
  { name: "Electricidad / Cables", value: 27, color: "#06b6d4" },
];

const tokenizedCashFlow = [
  { month: "Ene", emitidos: 120, quemados: 45, activos: 75 },
  { month: "Feb", emitidos: 185, quemados: 78, activos: 107 },
  { month: "Mar", emitidos: 260, quemados: 115, activos: 145 },
  { month: "Abr", emitidos: 340, quemados: 162, activos: 178 },
  { month: "May", emitidos: 425, quemados: 210, activos: 215 },
  { month: "Jun", emitidos: 520, quemados: 268, activos: 252 },
];

const EXEC_STATS = [
  { label: "Proyectos Activos", value: "47", icon: Building2, iconColor: "text-cyan-400", borderColor: "border-cyan-900/40" },
  { label: "PYMEs Conectadas", value: "23", icon: Users, iconColor: "text-blue-400", borderColor: "border-blue-900/40" },
  { label: "Tokens Activos", value: "252", icon: Coins, iconColor: "text-[#c77b3f]", borderColor: "border-[#c77b3f]/30" },
  { label: "Tasa Conversión", value: "62.8%", icon: TrendingUp, iconColor: "text-emerald-400", borderColor: "border-emerald-900/40" },
];

function formatCLP(price: number): string {
  return `$${price.toLocaleString('es-CL')}`;
}

export default function LandingPage() {
  const [activeView, setActiveView] = useState<"plataforma" | "dashboard">("plataforma");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackType, setFeedbackType] = useState("error");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackMessage("");
      setFeedbackType("error");
    }, 300);
  }

  function handleDialogChange(open: boolean) {
    setFeedbackOpen(open);
    if (!open) {
      setTimeout(() => setFeedbackSent(false), 300);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">SmartBuild APU</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {activeView === "plataforma" ? (
              <>
                <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
                <a href="#how" className="hover:text-foreground transition-colors">Cómo Funciona</a>
                <a href="#planes" className="hover:text-foreground transition-colors">Planes</a>
              </>
            ) : (
              <>
                <span className="text-zinc-400">Métricas Comerciales</span>
                <span className="text-zinc-400">Bitcopper Tech SpA</span>
              </>
            )}
          </div>
          <a href="/login">
            <Button className="shadow-lg shadow-primary/20" data-testid="button-login-nav">
              Iniciar Sesión
            </Button>
          </a>
        </div>
      </nav>

      <div className="fixed top-16 left-0 right-0 z-40 border-b border-border/30 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-2 py-3">
          <button
            onClick={() => setActiveView("plataforma")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              activeView === "plataforma"
                ? "text-white shadow-lg shadow-[#b87333]/30"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700/50"
            )}
            style={activeView === "plataforma" ? { background: "linear-gradient(135deg, #b87333, #a0622d)" } : undefined}
            data-testid="tab-plataforma"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Plataforma Operativa
            </span>
          </button>
          <button
            onClick={() => setActiveView("dashboard")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              activeView === "dashboard"
                ? "text-white shadow-lg shadow-[#b87333]/30"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 border border-zinc-700/50"
            )}
            style={activeView === "dashboard" ? { background: "linear-gradient(135deg, #b87333, #a0622d)" } : undefined}
            data-testid="tab-dashboard"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard Ejecutivo
            </span>
          </button>
        </div>
      </div>

      {activeView === "plataforma" && (<>
      <section className="pt-44 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              Motor de Precios Sodimac & Easy en tiempo real
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight">
              Presupuestos de
              <br />
              <span className="text-primary">Construcción</span>
              <br />
              Inteligentes
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Sube tu Excel, compara precios de mercado Sodimac y Easy automáticamente, y genera análisis financiero profesional con márgenes reales para PYMEs constructoras en Chile.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/login">
                <Button size="lg" className="shadow-lg shadow-primary/25 text-base px-8" data-testid="button-login-hero">
                  Comenzar Gratis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="#planes">
                <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-view-plans">
                  Ver Planes
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Acceso seguro
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-500" />
                35+ materiales
              </span>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <img
              src={heroImage}
              alt="Construcción moderna"
              className="relative rounded-2xl shadow-2xl ring-1 ring-white/5 transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SmartBuild automatiza el análisis de precios unitarios para constructoras chilenas, ahorrando horas de cotización manual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">Importación Excel</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sube tu presupuesto en Excel y el sistema extrae automáticamente los ítems, cantidades, unidades y precios unitarios.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Precios de Mercado</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Comparación automática con precios de Sodimac y Easy. Identifica el mejor precio, marca y disponibilidad de stock.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold">Análisis Financiero</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Cascada financiera completa: Costo Directo, Gastos Generales, Utilidad, IVA. Exporta reportes PDF profesionales con tu logo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Cómo Funciona</h2>
          <p className="text-muted-foreground mb-12 max-w-lg mx-auto">Tres pasos simples para optimizar tus presupuestos</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sube tu Excel", desc: "Arrastra tu presupuesto y el sistema identifica los ítems automáticamente." },
              { step: "2", title: "Sincroniza Precios", desc: "Compara con Sodimac y Easy para encontrar el mejor precio por cada material." },
              { step: "3", title: "Exporta tu APU", desc: "Genera PDFs profesionales con desglose financiero y firma digital." },
            ].map((item) => (
              <div key={item.step} className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </>)}

      {activeView === "dashboard" && (
      <section id="dashboard" className="pt-44 pb-20 px-6 bg-[#121212]" data-testid="section-exec-dashboard">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Dashboard Ejecutivo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white" data-testid="text-exec-dashboard-title">
              Dashboard Ejecutivo <span className="text-[#c77b3f]">SmartBuild</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Visión consolidada del flujo financiero, distribución de materiales y proyección de ventas de{" "}
              <span className="text-[#c77b3f] font-semibold">Bitcopper Tech SpA</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {EXEC_STATS.map((stat) => (
              <Card
                key={stat.label}
                className={`bg-[#1a1a1a] border ${stat.borderColor} shadow-lg`}
                data-testid={`card-exec-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card
            className="bg-gradient-to-r from-[#c77b3f]/10 via-[#1a1a1a] to-[#c77b3f]/10 border-[#c77b3f]/30 shadow-xl shadow-[#c77b3f]/5"
            data-testid="card-projected-sales"
          >
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#c77b3f]/10 border border-[#c77b3f]/30 flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-[#c77b3f]" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400 uppercase tracking-wider font-medium mb-1">Ventas Proyectadas</p>
                    <p className="text-4xl md:text-5xl font-bold font-mono text-[#c77b3f]" data-testid="text-projected-sales">
                      $500.000.000 <span className="text-lg text-zinc-500">CLP</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    +34.5% YoY
                  </Badge>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-sm px-3 py-1">
                    <Zap className="w-4 h-4 mr-1.5" />
                    Proyección 2026
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#1a1a1a] border-cyan-900/30 shadow-lg" data-testid="card-material-distribution">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Distribución de Materiales
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Composición del volumen de compra por categoría principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={materialDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" nameKey="name" stroke="none">
                        {materialDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} formatter={(value: number, name: string) => [`${value}%`, name]} />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "#71717a" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {materialDistribution.map((cat) => (
                    <div key={cat.name} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-zinc-400 text-center">{cat.name}</span>
                      <span className="text-lg font-bold font-mono text-white" data-testid={`text-material-${cat.name.toLowerCase().replace(/[\s/]/g, "-")}`}>
                        {cat.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] border-cyan-900/30 shadow-lg" data-testid="card-tokenized-cashflow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <Coins className="w-5 h-5 text-[#c77b3f]" />
                  Flujo de Caja Tokenizado
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Evolución mensual de tokens emitidos, quemados y activos en la plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenizedCashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                      <Legend formatter={(v: string) => v === "emitidos" ? "Tokens Emitidos" : v === "quemados" ? "Tokens Quemados" : "Tokens Activos"} wrapperStyle={{ fontSize: "11px", color: "#71717a" }} />
                      <Bar dataKey="emitidos" fill="#06b6d4" radius={[4, 4, 0, 0]} name="emitidos" opacity={0.4} />
                      <Bar dataKey="quemados" fill="#ef4444" radius={[4, 4, 0, 0]} name="quemados" opacity={0.6} />
                      <Bar dataKey="activos" fill="#c77b3f" radius={[4, 4, 0, 0]} name="activos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Emitidos</p>
                    <p className="text-lg font-bold font-mono text-cyan-400" data-testid="text-tokens-emitidos">1.850</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Quemados (Burn)</p>
                    <p className="text-lg font-bold font-mono text-red-400" data-testid="text-tokens-quemados">878</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Circulación Activa</p>
                    <p className="text-lg font-bold font-mono text-[#c77b3f]" data-testid="text-tokens-activos">972</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {activeView === "plataforma" && (<>
      <section id="planes" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4" data-testid="text-plans-title">Planes y Membresías</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tu negocio. Todos los precios en CLP (pesos chilenos), pago mensual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isPrimary = plan.popular;
              return (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    isPrimary
                      ? "border-primary/50 bg-gradient-to-b from-primary/5 to-primary/10 shadow-lg shadow-primary/10 scale-[1.02] md:scale-105"
                      : "border-border/50 bg-card/50"
                  )}
                  data-testid={`card-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {isPrimary && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                  )}
                  <CardHeader className="pb-4">
                    {isPrimary && (
                      <Badge className="w-fit mb-2 bg-primary/20 text-primary border-primary/30" data-testid="badge-popular">
                        Más Popular
                      </Badge>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                        plan.color === 'blue' ? "bg-blue-500/10" :
                        plan.color === 'amber' ? "bg-amber-500/10" :
                        "bg-primary/10"
                      )}>
                        <Icon className={cn("w-5 h-5",
                          plan.color === 'blue' ? "text-blue-500" :
                          plan.color === 'amber' ? "text-amber-500" :
                          "text-primary"
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-plan-name-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="text-xs">{plan.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-3xl font-bold font-mono tracking-tight" data-testid={`text-plan-price-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        {formatCLP(plan.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                          <Check className={cn("w-4 h-4 mt-0.5 shrink-0",
                            isPrimary ? "text-primary" : "text-emerald-500"
                          )} />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <a href="/login">
                      <Button
                        className={cn("w-full mt-4",
                          isPrimary ? "shadow-lg shadow-primary/20" : ""
                        )}
                        variant={isPrimary ? "default" : "outline"}
                        size="lg"
                        data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {isPrimary ? "Comenzar Ahora" : "Seleccionar Plan"}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Todos los precios incluyen IVA. Cancela cuando quieras sin compromiso.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#0d1117]" data-testid="section-faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#c77b3f]/10 text-[#c77b3f] border-[#c77b3f]/30">
              <HelpCircle className="w-3 h-3 mr-1" />
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3" data-testid="text-faq-title">
              Preguntas Frecuentes
            </h2>
            <p className="text-zinc-400">
              Todo lo que necesitas saber sobre SmartBuild APU Engine.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="q1" className="border border-zinc-800 rounded-xl px-5 bg-zinc-900/50 data-[state=open]:border-[#c77b3f]/40" data-testid="faq-item-1">
              <AccordionTrigger className="text-left text-white text-sm md:text-base no-underline hover:no-underline" data-testid="faq-trigger-1">
                ¿Qué es SmartBuild y para quién está diseñado?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 text-sm leading-relaxed" data-testid="faq-content-1">
                SmartBuild es un motor de Análisis de Precios Unitarios (APU) diseñado para PYMEs constructoras, contratistas y maestros de obra en Chile. Te permite importar tu presupuesto Excel, comparar automáticamente los precios de materiales en Sodimac y Easy, y optimizar tus costos de construcción con datos en tiempo real.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q2" className="border border-zinc-800 rounded-xl px-5 bg-zinc-900/50 data-[state=open]:border-[#c77b3f]/40" data-testid="faq-item-2">
              <AccordionTrigger className="text-left text-white text-sm md:text-base no-underline hover:no-underline" data-testid="faq-trigger-2">
                ¿Cómo funciona la comparación de precios con Sodimac y Easy?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 text-sm leading-relaxed" data-testid="faq-content-2">
                Nuestro motor de precios cruza automáticamente cada ítem de tu presupuesto con un catálogo de más de 34 productos en ambas tiendas. Identifica la mejor opción de compra, muestra disponibilidad de stock, y calcula el ahorro total al elegir el mejor precio entre ambos retailers para cada material.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q3" className="border border-zinc-800 rounded-xl px-5 bg-zinc-900/50 data-[state=open]:border-[#c77b3f]/40" data-testid="faq-item-3">
              <AccordionTrigger className="text-left text-white text-sm md:text-base no-underline hover:no-underline" data-testid="faq-trigger-3">
                ¿Puedo exportar mis presupuestos en PDF con mi logo?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 text-sm leading-relaxed" data-testid="faq-content-3">
                Sí. En los planes PYME Constructora y Enterprise puedes configurar el logo, nombre, RUT y firma digital de tu empresa. Los PDF generados incluyen tu branding profesional, el desglose financiero completo y la comparación de precios, listos para presentar a tu cliente o mandante.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q4" className="border border-zinc-800 rounded-xl px-5 bg-zinc-900/50 data-[state=open]:border-[#c77b3f]/40" data-testid="faq-item-4">
              <AccordionTrigger className="text-left text-white text-sm md:text-base no-underline hover:no-underline" data-testid="faq-trigger-4">
                ¿Qué formatos de Excel acepta SmartBuild?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 text-sm leading-relaxed" data-testid="faq-content-4">
                SmartBuild acepta archivos .xlsx estándar. El sistema lee automáticamente las columnas ITEM, DESCRIPCIÓN, UNIDAD, CANTIDAD y PRECIO UNITARIO de tu presupuesto. No necesitas adaptar tu formato actual — el motor de importación se encarga de mapear las columnas correctamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q5" className="border border-zinc-800 rounded-xl px-5 bg-zinc-900/50 data-[state=open]:border-[#c77b3f]/40" data-testid="faq-item-5">
              <AccordionTrigger className="text-left text-white text-sm md:text-base no-underline hover:no-underline" data-testid="faq-trigger-5">
                ¿SmartBuild tiene costo? ¿Puedo probarlo gratis?
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 text-sm leading-relaxed" data-testid="faq-content-5">
                Puedes registrarte y probar la plataforma sin costo. El plan Maestro Pro comienza desde $9.990 CLP/mes e incluye 1 proyecto activo con comparación de precios completa. Para equipos más grandes, el plan PYME Constructora ofrece hasta 10 proyectos y funcionalidades avanzadas por $34.900 CLP/mes.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-12">
            <a href="/login">
              <Button size="lg" className="bg-[#c77b3f] text-white border-0 text-base px-10 py-6 shadow-lg shadow-[#c77b3f]/20" data-testid="button-faq-cta">
                <Zap className="w-5 h-5 mr-2" />
                ¡Empieza Gratis Ahora!
              </Button>
            </a>
            <p className="text-zinc-500 text-xs mt-3">Sin tarjeta de crédito requerida. Comienza en segundos.</p>
          </div>
        </div>
      </section>
      </>)}

      <footer className="border-t border-border/30 py-8 px-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 SmartBuild APU Engine — Bitcopper Tech SpA. Todos los derechos reservados.</p>
      </footer>

      <Dialog open={feedbackOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-50 rounded-full shadow-xl shadow-primary/30 h-14 w-14 p-0 md:w-auto md:px-5 md:rounded-xl"
            data-testid="button-feedback-trigger"
          >
            <Bug className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline text-sm">Reportar Error</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" data-testid="dialog-feedback">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Reportar Error / Feedback
            </DialogTitle>
            <DialogDescription>
              Tu opinión nos ayuda a mejorar SmartBuild. Todos los reportes son revisados por nuestro equipo.
            </DialogDescription>
          </DialogHeader>

          {feedbackSent ? (
            <div className="py-8 text-center space-y-4" data-testid="feedback-success">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-emerald-400" data-testid="text-feedback-thanks">
                  ¡Gracias por ser parte de la evolución de Bitcopper!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tu reporte ha sido recibido y será recompensado.
                </p>
              </div>
              <Button variant="outline" onClick={() => handleDialogChange(false)} data-testid="button-feedback-close">
                Cerrar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4" data-testid="form-feedback">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Tipo de reporte</Label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error / Bug</SelectItem>
                    <SelectItem value="mejora">Sugerencia de Mejora</SelectItem>
                    <SelectItem value="feature">Nueva Funcionalidad</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-name">Nombre (opcional)</Label>
                <Input
                  id="feedback-name"
                  placeholder="Tu nombre"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  data-testid="input-feedback-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-email">Email (opcional)</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  data-testid="input-feedback-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-message">Descripción</Label>
                <Textarea
                  id="feedback-message"
                  placeholder="Describe el error o sugerencia con el mayor detalle posible..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                  required
                  data-testid="textarea-feedback-message"
                />
              </div>

              <Button type="submit" className="w-full" data-testid="button-feedback-submit">
                <Bug className="w-4 h-4 mr-2" />
                Enviar Reporte
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
