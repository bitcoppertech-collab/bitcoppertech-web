import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { AlertTriangle, CheckCircle, Clock, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

function getEstado(p: any) {
  const ej = parseFloat(p.ejecutado ?? 0);
  const pre = parseFloat(p.presupuesto ?? 0);
  const d = pre > 0 ? ((ej - pre) / pre * 100) : 0;
  const pg = pre > 0 ? (ej / pre * 100) : 0;
  if (p.avance === 0 && ej === 0) return "pendiente";
  if (d > 8 || (pg > 90 && p.avance < 80)) return "danger";
  if (d > 3 || (pg > 80 && p.avance < 60)) return "warn";
  return "ok";
}

const ESTADO_STYLE: Record<string, string> = {
  ok:       "text-[#2ECC71] bg-[rgba(46,204,113,0.1)] border-[rgba(46,204,113,0.25)]",
  warn:     "text-[#E8A855] bg-[rgba(193,127,58,0.1)] border-[rgba(193,127,58,0.3)]",
  danger:   "text-red-400 bg-red-900/10 border-red-900/30",
  pendiente:"text-[#6A7A8A] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]",
};
const ESTADO_LABEL: Record<string, string> = { ok:"Al día", warn:"En riesgo", danger:"Desviada", pendiente:"Pendiente" };
const BAR_COLOR: Record<string, string> = { ok:"#2ECC71", warn:"#C17F3A", danger:"#E84545", pendiente:"#3A4A5A" };

function fUF(n: number) { return `UF ${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`; }

export default function ControlObraPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selPartida, setSelPartida] = useState<any>(null);
  const [showNewPartida, setShowNewPartida] = useState(false);
  const [showNewPago, setShowNewPago] = useState(false);
  const [filterEstado, setFilterEstado] = useState("");
  const [newPartida, setNewPartida] = useState({ nombre: "", categoria: "", presupuesto: "", ejecutado: "", avance: "0" });
  const [newPago, setNewPago] = useState({ monto: "", fecha: new Date().toISOString().split("T")[0], descripcion: "", estado: "pendiente", partidaId: "" });

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });
  const { data: pagosData = [] } = useQuery({ queryKey: ["pagos", id], queryFn: () => apiRequest("GET", `/projects/${id}/pagos`) });
  const { data: alertasData = [] } = useQuery({ queryKey: ["alertas", id], queryFn: () => apiRequest("GET", `/projects/${id}/alertas`) });

  const createPartida = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/projects/${id}/partidas`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partidas", id] }); setShowNewPartida(false); setNewPartida({ nombre: "", categoria: "", presupuesto: "", ejecutado: "", avance: "0" }); },
  });
  const updatePartida = useMutation({
    mutationFn: ({ pid, data }: any) => apiRequest("PUT", `/partidas/${pid}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partidas", id] }),
  });
  const createPago = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/projects/${id}/pagos`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagos", id] }); qc.invalidateQueries({ queryKey: ["partidas", id] }); setShowNewPago(false); setNewPago({ monto: "", fecha: new Date().toISOString().split("T")[0], descripcion: "", estado: "pendiente", partidaId: "" }); },
  });

  const filtered = filterEstado ? partidas.filter((p: any) => getEstado(p) === filterEstado) : partidas;
  const totalBudget = partidas.reduce((s: number, p: any) => s + parseFloat(p.presupuesto ?? 0), 0);
  const totalExec = partidas.reduce((s: number, p: any) => s + parseFloat(p.ejecutado ?? 0), 0);
  const avgProgress = partidas.length ? Math.round(partidas.reduce((s: number, p: any) => s + (p.avance ?? 0), 0) / partidas.length) : 0;
  const totalPagado = pagosData.filter((p: any) => p.estado === "pagado").reduce((s: number, p: any) => s + parseFloat(p.monto ?? 0), 0);
  const dev = totalBudget > 0 ? ((totalExec - totalBudget) / totalBudget * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Control de Obra</div>
        <h1 className="text-4xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{project?.name ?? "Proyecto"}</h1>
        {project?.client && <p className="text-[#6A7A8A] text-sm mt-1">{project.client}</p>}
      </div>

      {/* Alertas activas */}
      {alertasData.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertasData.map((a: any) => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 border-l-2 rounded-sm text-sm
              ${a.tipo === "danger" ? "bg-red-900/10 border-red-500 text-red-400" : "bg-[rgba(193,127,58,0.08)] border-[#C17F3A] text-[#E8A855]"}`}>
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div><strong>{a.titulo}</strong>{a.descripcion && <span className="text-[#6A7A8A] ml-2">{a.descripcion}</span>}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[rgba(193,127,58,0.08)] border border-[rgba(193,127,58,0.08)] mb-6">
        {[
          { label: "Presupuesto", value: fUF(totalBudget) },
          { label: "Ejecutado", value: fUF(totalExec), sub: dev !== 0 ? `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%` : "En presupuesto", subColor: dev > 5 ? "text-red-400" : dev < 0 ? "text-[#2ECC71]" : "text-[#6A7A8A]" },
          { label: "Avance global", value: `${avgProgress}%` },
          { label: "Total pagado", value: fUF(totalPagado) },
        ].map(({ label, value, sub, subColor }) => (
          <div key={label} className="bg-[#1C2B3A] p-4">
            <div className="text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1.5">{label}</div>
            <div className="text-2xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{value}</div>
            {sub && <div className={`text-[10px] font-mono mt-0.5 ${subColor}`}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Partidas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Avance por partida</div>
          <div className="flex items-center gap-2">
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-[#6A7A8A] text-xs px-3 py-1.5 rounded-sm font-mono outline-none">
              <option value="">Todas</option>
              <option value="ok">Al día</option>
              <option value="warn">En riesgo</option>
              <option value="danger">Desviada</option>
            </select>
            <button onClick={() => setShowNewPartida(true)}
              className="flex items-center gap-1.5 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-xs px-3 py-1.5 rounded-sm transition-colors">
              <Plus size={12} />Partida
            </button>
          </div>
        </div>

        <div className="border border-[rgba(193,127,58,0.12)] overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[rgba(193,127,58,0.06)] border-b border-[rgba(193,127,58,0.1)]">
                {["Partida","Presupuesto","Ejecutado","Avance","Estado"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const estado = getEstado(p);
                const barCol = BAR_COLOR[estado];
                const isSelected = selPartida?.id === p.id;
                return (
                  <>
                    <tr key={p.id} onClick={() => setSelPartida(isSelected ? null : p)}
                      className={`border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors
                        ${isSelected ? "bg-[rgba(193,127,58,0.08)]" : "hover:bg-[rgba(255,255,255,0.02)]"}`}>
                      <td className="px-4 py-3 font-medium text-white truncate max-w-[200px]">{p.nombre}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6A7A8A]">{fUF(parseFloat(p.presupuesto ?? 0))}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#E8A855]">{parseFloat(p.ejecutado ?? 0) > 0 ? fUF(parseFloat(p.ejecutado)) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden min-w-[60px]">
                            <div className="h-full rounded-full" style={{width:`${p.avance}%`, background: barCol}} />
                          </div>
                          <span className="text-xs font-mono" style={{color:barCol}}>{p.avance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm ${ESTADO_STYLE[estado]}`}>
                          {ESTADO_LABEL[estado]}
                        </span>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr key={`det-${p.id}`} className="bg-[rgba(193,127,58,0.04)] border-b border-[rgba(193,127,58,0.1)]">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                            {[
                              { label: "Saldo", value: fUF(parseFloat(p.presupuesto ?? 0) - parseFloat(p.ejecutado ?? 0)) },
                              { label: "Desviación", value: parseFloat(p.presupuesto ?? 0) > 0 ? `${(((parseFloat(p.ejecutado ?? 0) - parseFloat(p.presupuesto ?? 0)) / parseFloat(p.presupuesto ?? 0)) * 100).toFixed(1)}%` : "—" },
                              { label: "Categoría", value: p.categoria || "—" },
                              { label: "Estado", value: ESTADO_LABEL[getEstado(p)] },
                            ].map(({ label, value }) => (
                              <div key={label} className="border-l border-[rgba(193,127,58,0.25)] pl-3">
                                <div className="text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-0.5">{label}</div>
                                <div className="text-sm font-bold text-white">{value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-[#6A7A8A] uppercase">Actualizar avance:</span>
                            {[0, 25, 50, 75, 100].map(pct => (
                              <button key={pct} onClick={() => updatePartida.mutate({ pid: p.id, data: { avance: pct } })}
                                className={`text-xs font-mono px-2.5 py-1 border rounded-sm transition-colors
                                  ${p.avance === pct ? "bg-[#C17F3A] border-[#C17F3A] text-[#0D1820] font-bold" : "border-[rgba(193,127,58,0.2)] text-[#6A7A8A] hover:border-[#C17F3A] hover:text-white"}`}>
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#6A7A8A] text-sm">Sin partidas. Agrega la primera.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nueva partida form */}
      {showNewPartida && (
        <div className="mb-6 bg-[#1C2B3A] border border-[rgba(193,127,58,0.25)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Nueva partida</div>
            <button onClick={() => setShowNewPartida(false)}><X size={14} className="text-[#6A7A8A]" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              { key: "nombre", label: "Nombre *", placeholder: "Ej: Estructura H.A." },
              { key: "categoria", label: "Categoría", placeholder: "Ej: Estructura" },
              { key: "presupuesto", label: "Presupuesto (UF)", placeholder: "0", type: "number" },
              { key: "ejecutado", label: "Ejecutado (UF)", placeholder: "0", type: "number" },
              { key: "avance", label: "% Avance", placeholder: "0", type: "number" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">{label}</label>
                <input type={type || "text"} placeholder={placeholder}
                  value={(newPartida as any)[key]} onChange={e => setNewPartida(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]" />
              </div>
            ))}
          </div>
          <button onClick={() => createPartida.mutate(newPartida)} disabled={!newPartida.nombre || createPartida.isPending}
            className="bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-sm px-5 py-2 rounded-sm transition-colors disabled:opacity-50">
            {createPartida.isPending ? "Agregando..." : "Agregar partida"}
          </button>
        </div>
      )}

      {/* Registro de pagos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Registro de pagos</div>
          <button onClick={() => setShowNewPago(true)}
            className="flex items-center gap-1.5 border border-[rgba(193,127,58,0.25)] hover:border-[#C17F3A] text-[#6A7A8A] hover:text-white text-xs px-3 py-1.5 rounded-sm transition-colors">
            <Plus size={12} />Registrar pago
          </button>
        </div>

        {showNewPago && (
          <div className="mb-4 bg-[#1C2B3A] border border-[rgba(193,127,58,0.25)] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Nuevo pago</span>
              <button onClick={() => setShowNewPago(false)}><X size={14} className="text-[#6A7A8A]" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">Partida</label>
                <select value={newPago.partidaId} onChange={e => setNewPago(f => ({ ...f, partidaId: e.target.value, nombrePartida: partidas.find((p: any) => p.id == e.target.value)?.nombre }))}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]">
                  <option value="">Sin partida</option>
                  {partidas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">Monto (UF) *</label>
                <input type="number" placeholder="0" value={newPago.monto} onChange={e => setNewPago(f => ({ ...f, monto: e.target.value }))}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]" />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">Fecha</label>
                <input type="date" value={newPago.fecha} onChange={e => setNewPago(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]" />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">Estado</label>
                <select value={newPago.estado} onChange={e => setNewPago(f => ({ ...f, estado: e.target.value }))}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]">
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
            </div>
            <button onClick={() => createPago.mutate(newPago)} disabled={!newPago.monto || createPago.isPending}
              className="bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-sm px-5 py-2 rounded-sm transition-colors disabled:opacity-50">
              {createPago.isPending ? "Registrando..." : "Registrar"}
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          {pagosData.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 bg-[#1C2B3A] border border-[rgba(255,255,255,0.04)] px-4 py-3 text-sm hover:border-[rgba(193,127,58,0.2)] transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.estado === "pagado" ? "bg-[#2ECC71]" : "bg-[#C17F3A]"}`} />
              <div className="flex-1 font-medium text-white truncate">{p.nombrePartida ?? "Pago general"}</div>
              <div className="text-[11px] font-mono text-[#6A7A8A]">{new Date(p.fecha).toLocaleDateString("es-CL")}</div>
              <div className="text-[11px] font-mono text-[#E8A855] font-bold min-w-[80px] text-right">{fUF(parseFloat(p.monto))}</div>
              <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm ${p.estado === "pagado" ? ESTADO_STYLE.ok : ESTADO_STYLE.warn}`}>
                {p.estado}
              </span>
            </div>
          ))}
          {pagosData.length === 0 && (
            <div className="text-center py-8 text-[#6A7A8A] text-sm border border-dashed border-[rgba(193,127,58,0.1)] rounded-sm">Sin pagos registrados</div>
          )}
        </div>
      </div>
    </div>
  );
}
