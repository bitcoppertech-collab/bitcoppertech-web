import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { TrendingUp, TrendingDown, FolderOpen, HardHat, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

function KPI({ label, value, sub, subOk }: { label: string; value: string; sub?: string; subOk?: boolean }) {
  return (
    <div className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.1)] p-5">
      <div className="text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">{label}</div>
      <div className="text-3xl font-black text-white tracking-wide" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{value}</div>
      {sub && <div className={`text-xs mt-1 font-mono ${subOk === false ? "text-red-400" : subOk === true ? "text-[#2ECC71]" : "text-[#6A7A8A]"}`}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiRequest("GET", "/dashboard/stats"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiRequest("GET", "/projects"),
  });

  const fUF = (n: number) => `UF ${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
  const dev = stats?.deviation ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Panel principal</div>
        <h1 className="text-4xl font-black text-white tracking-wide" style={{fontFamily:"'Bebas Neue',sans-serif"}}>
          Bienvenido, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-[#6A7A8A] text-sm mt-1">{user?.companyName ?? "SmartBuild Enterprise"}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[rgba(193,127,58,0.08)] border border-[rgba(193,127,58,0.08)] mb-8">
        <KPI label="Proyectos activos" value={String(stats?.activeProjects ?? "—")} sub={`${stats?.totalProjects ?? 0} en total`} />
        <KPI label="Presupuesto total" value={stats ? fUF(stats.totalBudget) : "—"} sub="Contratos" />
        <KPI label="Ejecutado" value={stats ? fUF(stats.totalExecuted) : "—"}
          sub={dev !== 0 ? `${dev > 0 ? "+" : ""}${dev.toFixed(1)}% vs presupuesto` : "Sin desviación"}
          subOk={dev > 5 ? false : dev < -2 ? true : undefined} />
        <KPI label="Avance promedio" value={stats ? `${stats.avgProgress}%` : "—"} sub="Todas las partidas" />
      </div>

      {/* Projects list */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Proyectos recientes</div>
        <Link href="/projects">
          <a className="text-xs text-[#6A7A8A] hover:text-white flex items-center gap-1 transition-colors">
            Ver todos <ArrowRight size={12} />
          </a>
        </Link>
      </div>

      <div className="space-y-2">
        {projects.slice(0, 5).map((p: any) => {
          const budget = parseFloat(p.totalBudget ?? 0);
          const exec = parseFloat(p.totalExecuted ?? 0);
          const dev = budget > 0 ? ((exec - budget) / budget * 100) : 0;
          return (
            <div key={p.id} className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.1)] p-4 flex items-center gap-4 hover:border-[rgba(193,127,58,0.3)] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate">{p.name}</div>
                <div className="text-[11px] text-[#6A7A8A] font-mono mt-0.5">{p.client ?? "Sin cliente"}</div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-mono text-[#E8A855]">{fUF(budget)}</div>
                <div className={`text-[10px] font-mono ${dev > 5 ? "text-red-400" : "text-[#6A7A8A]"}`}>
                  {dev > 0 ? `+${dev.toFixed(1)}%` : dev < 0 ? `${dev.toFixed(1)}%` : "En presupuesto"}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1">
                <div className="w-24 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#C17F3A]" style={{width:`${p.globalProgress ?? 0}%`}} />
                </div>
                <div className="text-[10px] font-mono text-[#6A7A8A]">{p.globalProgress ?? 0}%</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/projects/${p.id}/obra`}>
                  <a className="p-2 text-[#6A7A8A] hover:text-[#C17F3A] transition-colors" title="Control de Obra">
                    <HardHat size={14} />
                  </a>
                </Link>
                <Link href={`/projects/${p.id}`}>
                  <a className="p-2 text-[#6A7A8A] hover:text-white transition-colors" title="Ver proyecto">
                    <ArrowRight size={14} />
                  </a>
                </Link>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-16 border border-dashed border-[rgba(193,127,58,0.2)] rounded-sm">
            <FolderOpen size={32} className="text-[#3A4A5A] mx-auto mb-3" />
            <p className="text-[#6A7A8A] text-sm">Sin proyectos aún</p>
            <Link href="/projects">
              <a className="mt-3 inline-block text-xs text-[#C17F3A] hover:underline">Crear primer proyecto →</a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
