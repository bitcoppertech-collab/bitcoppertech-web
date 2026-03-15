// ProjectDetailPage.tsx
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { HardHat, Box, ArrowRight, Upload } from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });

  const totalBudget = partidas.reduce((s: number, p: any) => s + parseFloat(p.presupuesto ?? 0), 0);
  const totalExec = partidas.reduce((s: number, p: any) => s + parseFloat(p.ejecutado ?? 0), 0);
  const fUF = (n: number) => `UF ${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Proyecto</div>
        <h1 className="text-4xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{project?.name ?? "Cargando..."}</h1>
        {project?.client && <p className="text-[#6A7A8A] text-sm mt-1">{project.client}</p>}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-px bg-[rgba(193,127,58,0.08)] border border-[rgba(193,127,58,0.08)] mb-8">
      {[
          { href: `/projects/${id}/presupuesto`, icon: "📐", label: "Presupuesto APU", desc: `${fUF(totalBudget)} presupuestado` },
          { href: `/projects/${id}/obra`, icon: "🏗️", label: "Control de Obra", desc: `${partidas.length} partidas · ${fUF(totalExec)} ejecutado` },
          { href: `/projects/${id}/bim`, icon: "🧊", label: "BIM 4D", desc: "Visor 3D + Timeline" },
          { href: `/projects/${id}/import`, icon: "📥", label: "Importar presupuesto", desc: "Subir archivo .smartbuild" },
          { href: `/projects/${id}/analiticas`, icon: "📊", label: "Analíticas", desc: "Subcontratos · desviaciones · velocidad" },
          { href: `/projects/${id}/lps`, icon: "📋", label: "Last Planner", desc: "Compromisos · PPC semanal" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href}>
            <a className="block bg-[#1C2B3A] p-6 hover:bg-[#152230] transition-colors">
              <div className="text-2xl mb-3">{icon}</div>
              <div className="font-bold text-white mb-1">{label}</div>
              <div className="text-xs text-[#6A7A8A]">{desc}</div>
              <div className="flex items-center gap-1 text-xs text-[#C17F3A] mt-3">Ver módulo <ArrowRight size={12} /></div>
            </a>
          </Link>
        ))}
      </div>

      {/* Quick partidas preview */}
      <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-3">Resumen de partidas</div>
      <div className="space-y-1.5">
        {partidas.slice(0, 5).map((p: any) => (
          <div key={p.id} className="flex items-center gap-4 bg-[#1C2B3A] border border-[rgba(255,255,255,0.04)] px-4 py-3">
            <div className="flex-1 text-sm font-medium text-white">{p.nombre}</div>
            <div className="text-xs font-mono text-[#6A7A8A]">{fUF(parseFloat(p.presupuesto ?? 0))}</div>
            <div className="w-20 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#C17F3A] rounded-full" style={{width:`${p.avance}%`}} />
            </div>
            <div className="text-[10px] font-mono text-[#6A7A8A]">{p.avance}%</div>
          </div>
        ))}
        {partidas.length === 0 && (
          <Link href={`/projects/${id}/obra`}>
            <a className="block text-center py-8 border border-dashed border-[rgba(193,127,58,0.2)] text-[#6A7A8A] text-sm hover:border-[rgba(193,127,58,0.4)] transition-colors">
              Sin partidas aún — Ir a Control de Obra →
            </a>
          </Link>
        )}
      </div>
    </div>
  );
}
