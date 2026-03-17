import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { FolderOpen, HardHat, ArrowRight } from "lucide-react";

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

      {/* App Móvil */}
      <div className="mt-8 bg-[#1C2B3A] border border-[rgba(193,127,58,0.1)] p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">App Móvil</div>
            <h2 className="text-xl font-black text-white tracking-wide" style={{fontFamily:"'Bebas Neue',sans-serif"}}>
              SmartBuild Field
            </h2>
            <p className="text-[#6A7A8A] text-xs mt-1 max-w-md">
              Registra avance de obra, compromisos LPS y fotos directamente desde terreno. Disponible para iOS y Android.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="#" className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(193,127,58,0.3)] text-[#C17F3A] text-xs font-mono hover:bg-[rgba(193,127,58,0.08)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
            <a href="https://expo.dev/accounts/smartbuild-enterprise/projects/smartbuild-field/builds/0f663e47-7324-40b4-8168-71abc3dc3774" 
   target="_blank"
   className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(193,127,58,0.3)] text-[#C17F3A] text-xs font-mono hover:bg-[rgba(193,127,58,0.08)] transition-colors">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.3.17.64.19.96.07l13.2-7.07-2.89-2.89-11.27 9.89zm-1.14-20.7C2 3.4 2 3.78 2 4.16v15.69c0 .38.04.75.18 1.1l.06.06 8.79-8.79v-.21L2.1 3.01l-.06.05zM20.49 10.7l-2.83-1.52-3.17 3.17 3.17 3.17 2.85-1.52c.81-.46.81-1.84-.02-2.3zM4.14.24L17.34 7.3l-2.89 2.89L3.18.3C3.5.18 3.84.2 4.14.24z"/></svg>
  Android APK
</a>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)] flex items-center gap-3">
  <div className="w-2 h-2 rounded-full bg-green-500" />
  <span className="text-[10px] font-mono text-[#6A7A8A]">DISPONIBLE — Descarga la app para comenzar</span>
</div>
      </div>

    </div>
  );
}
