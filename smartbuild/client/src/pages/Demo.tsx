import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  Users,
  Building2,
  Coins,
  LogIn,
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
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

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

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export default function Demo() {
  return (
    <div className="min-h-screen bg-[#121212]">
      <header className="border-b border-cyan-900/30 bg-[#1a1a1a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={bitcoperLogo}
              alt="Bitcopper Tech SpA"
              className="w-10 h-10 rounded-lg object-contain"
            />
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">
                SmartBuild
              </h1>
              <p className="text-xs text-cyan-400 font-mono">
                DASHBOARD EJECUTIVO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Demo Ejecutivo
            </Badge>
            <span className="text-xs text-zinc-500 hidden md:inline">
              Bitcopper Tech SpA
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-3 animate-in" data-testid="section-demo-hero">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-white"
            data-testid="text-demo-title"
          >
            Dashboard Ejecutivo{" "}
            <span className="text-[#c77b3f]">SmartBuild</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Visión consolidada del flujo financiero, distribución de materiales y
            proyección de ventas de{" "}
            <span className="text-[#c77b3f] font-semibold">
              Bitcopper Tech SpA
            </span>
            .
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in"
          style={{ animationDelay: "50ms" }}
        >
          {[
            {
              label: "Proyectos Activos",
              value: "47",
              icon: Building2,
              glow: "shadow-cyan-500/10",
              iconColor: "text-cyan-400",
              borderColor: "border-cyan-900/40",
            },
            {
              label: "PYMEs Conectadas",
              value: "23",
              icon: Users,
              glow: "shadow-blue-500/10",
              iconColor: "text-blue-400",
              borderColor: "border-blue-900/40",
            },
            {
              label: "Tokens Activos",
              value: "252",
              icon: Coins,
              glow: "shadow-[#c77b3f]/10",
              iconColor: "text-[#c77b3f]",
              borderColor: "border-[#c77b3f]/30",
            },
            {
              label: "Tasa Conversión",
              value: "62.8%",
              icon: TrendingUp,
              glow: "shadow-emerald-500/10",
              iconColor: "text-emerald-400",
              borderColor: "border-emerald-900/40",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`bg-[#0d1320] border ${stat.borderColor} shadow-lg ${stat.glow}`}
              data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl font-bold font-mono text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card
          className="bg-gradient-to-r from-[#c77b3f]/10 via-[#0d1320] to-[#c77b3f]/10 border-[#c77b3f]/30 shadow-xl shadow-[#c77b3f]/5 animate-in"
          style={{ animationDelay: "75ms" }}
          data-testid="card-projected-sales"
        >
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#c77b3f]/10 border border-[#c77b3f]/30 flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-[#c77b3f]" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400 uppercase tracking-wider font-medium mb-1">
                    Ventas Proyectadas
                  </p>
                  <p
                    className="text-4xl md:text-5xl font-bold font-mono text-[#c77b3f]"
                    data-testid="text-projected-sales"
                  >
                    $500.000.000{" "}
                    <span className="text-lg text-zinc-500">CLP</span>
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

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in"
          style={{ animationDelay: "100ms" }}
        >
          <Card
            className="bg-[#0d1320] border-cyan-900/30 shadow-lg"
            data-testid="card-material-distribution"
          >
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
                    <Pie
                      data={materialDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {materialDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1320",
                        border: "1px solid rgba(6,182,212,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", color: "#71717a" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {materialDistribution.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-zinc-400 text-center">
                      {cat.name}
                    </span>
                    <span
                      className="text-lg font-bold font-mono text-white"
                      data-testid={`text-material-${cat.name.toLowerCase().replace(/[\s/]/g, "-")}`}
                    >
                      {cat.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-[#0d1320] border-cyan-900/30 shadow-lg"
            data-testid="card-tokenized-cashflow"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Coins className="w-5 h-5 text-[#c77b3f]" />
                Flujo de Caja Tokenizado
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Evolución mensual de tokens emitidos, quemados y activos en la
                plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tokenizedCashFlow}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(6,182,212,0.1)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1320",
                        border: "1px solid rgba(6,182,212,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      formatter={(v: string) =>
                        v === "emitidos"
                          ? "Tokens Emitidos"
                          : v === "quemados"
                            ? "Tokens Quemados"
                            : "Tokens Activos"
                      }
                      wrapperStyle={{ fontSize: "11px", color: "#71717a" }}
                    />
                    <Bar
                      dataKey="emitidos"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                      name="emitidos"
                      opacity={0.4}
                    />
                    <Bar
                      dataKey="quemados"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="quemados"
                      opacity={0.6}
                    />
                    <Bar
                      dataKey="activos"
                      fill="#c77b3f"
                      radius={[4, 4, 0, 0]}
                      name="activos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Total Emitidos
                  </p>
                  <p
                    className="text-lg font-bold font-mono text-cyan-400"
                    data-testid="text-tokens-emitidos"
                  >
                    1.850
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Quemados (Burn)
                  </p>
                  <p
                    className="text-lg font-bold font-mono text-red-400"
                    data-testid="text-tokens-quemados"
                  >
                    878
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    Circulación Activa
                  </p>
                  <p
                    className="text-lg font-bold font-mono text-[#c77b3f]"
                    data-testid="text-tokens-activos"
                  >
                    972
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer
          className="text-center pt-8 pb-10 border-t border-zinc-800/50 animate-in"
          style={{ animationDelay: "150ms" }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <img
              src={bitcoperLogo}
              alt="Bitcopper Tech SpA"
              className="w-6 h-6 rounded object-contain"
            />
            <span className="text-sm font-semibold text-[#c77b3f]">
              Bitcopper Tech SpA
            </span>
          </div>
          <p className="text-xs text-zinc-600 max-w-md mx-auto">
            Dashboard Ejecutivo — Datos simulados para presentación comercial.
          </p>
          <p className="text-[10px] text-zinc-700 mt-2">
            © 2026 Bitcopper Tech SpA — Todos los derechos reservados
          </p>
        </footer>
      </main>
    </div>
  );
}
