// client/src/pages/LastPlannerPage.tsx
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Plus, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const CAUSAS = [
  "Falta de materiales",
  "Mano de obra insuficiente",
  "Problema de diseño",
  "Condiciones climáticas",
  "Interferencia con otro subcontrato",
  "Cambio de prioridad",
  "Falta de equipos",
  "Otra",
];

function ppcColor(ppc: number) {
  if (ppc >= 80) return "#2ECC71";
  if (ppc >= 60) return "#E8A855";
  return "#E84545";
}

function getSemanaLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  const year = now.getFullYear();
  const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return { label: `S${week}-${year}`, inicio: start.toISOString().split("T")[0], fin: end.toISOString().split("T")[0], display: `${fmt(start)} — ${fmt(end)}` };
}

function CompromisoCard({ c, onUpdate, onDelete }: { c: any; onUpdate: (id: number, data: any) => void; onDelete: (id: number) => void }) {
  const [showCausa, setShowCausa] = useState(false);
  const [causa, setCausa] = useState(c.causa_no_cumplimiento ?? "");

  const handleCumplido = (val: boolean) => {
    if (!val) setShowCausa(true);
    else { setShowCausa(false); onUpdate(c.id, { cumplido: true, causaNoCumplimiento: null }); }
  };

  return (
    <div style={{
      background: "#0F1C28", borderRadius: 6,
      border: `1px solid ${c.cumplido === true ? "rgba(46,204,113,0.3)" : c.cumplido === false ? "rgba(232,69,69,0.3)" : "rgba(255,255,255,0.06)"}`,
      padding: "0.75rem 1rem", marginBottom: "0.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E0E8F0", marginBottom: 2 }}>{c.descripcion}</div>
          {c.meta && <div style={{ fontSize: 11, color: "#6A7A8A" }}>Meta: {c.meta}</div>}
          {c.partida_nombre && <div style={{ fontSize: 11, color: "#4A7A9A" }}>↳ {c.partida_nombre}</div>}
          {c.cumplido === false && c.causa_no_cumplimiento && (
            <div style={{ fontSize: 11, color: "#E84545", marginTop: 4 }}>⚠ {c.causa_no_cumplimiento}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
          {c.cumplido === null || c.cumplido === undefined ? (
            <>
              <button onClick={() => handleCumplido(true)}
                style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", color: "#2ECC71", fontSize: 11, fontWeight: 600 }}>
                ✓ Cumplido
              </button>
              <button onClick={() => handleCumplido(false)}
                style={{ background: "rgba(232,69,69,0.1)", border: "1px solid rgba(232,69,69,0.3)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", color: "#E84545", fontSize: 11, fontWeight: 600 }}>
                ✗ No cumplido
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: c.cumplido ? "#2ECC71" : "#E84545" }}>
              {c.cumplido ? "✓ Cumplido" : "✗ No cumplido"}
            </span>
          )}
          <button onClick={() => onDelete(c.id)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#3A4A5A" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {showCausa && (
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
          <div style={{ fontSize: 11, color: "#E8A855", marginBottom: "0.5rem" }}>Causa de no cumplimiento:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
            {CAUSAS.map(ca => (
              <button key={ca} onClick={() => setCausa(ca)}
                style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer", border: "1px solid", background: causa === ca ? "rgba(232,168,85,0.15)" : "transparent", borderColor: causa === ca ? "#E8A855" : "rgba(255,255,255,0.1)", color: causa === ca ? "#E8A855" : "#6A7A8A" }}>
                {ca}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input value={causa} onChange={e => setCausa(e.target.value)} placeholder="Especificar..."
              style={{ flex: 1, background: "#1C2B3A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "4px 8px", color: "#E0E8F0", fontSize: 12 }} />
            <button onClick={() => { onUpdate(c.id, { cumplido: false, causaNoCumplimiento: causa }); setShowCausa(false); }}
              style={{ background: "#E84545", border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600 }}>
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SemanaPanel({ semana, projectId, partidas }: { semana: any; projectId: string; partidas: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subcontrato: "", descripcion: "", meta: "", partidaId: "" });

  const { data: compromisos = [] } = useQuery({
    queryKey: ["lps-compromisos", semana.id],
    queryFn: () => apiRequest("GET", `/lps/semanas/${semana.id}/compromisos`),
    enabled: open,
  });

  const addCompromiso = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/lps/semanas/${semana.id}/compromisos`, { ...d, projectId: parseInt(projectId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lps-compromisos", semana.id] }); qc.invalidateQueries({ queryKey: ["lps-semanas", projectId] }); setShowForm(false); setForm({ subcontrato: "", descripcion: "", meta: "", partidaId: "" }); },
  });

  const updateCompromiso = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/lps/compromisos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lps-compromisos", semana.id] }); qc.invalidateQueries({ queryKey: ["lps-semanas", projectId] }); },
  });

  const deleteCompromiso = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/lps/compromisos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lps-compromisos", semana.id] }); qc.invalidateQueries({ queryKey: ["lps-semanas", projectId] }); },
  });

  const total = parseInt(semana.total_compromisos ?? "0");
  const cumplidos = parseInt(semana.cumplidos ?? "0");
  const ppc = total > 0 ? Math.round((cumplidos / total) * 100) : 0;

  // Agrupar por subcontrato
  const grupos: Record<string, any[]> = {};
  for (const c of compromisos) {
    if (!grupos[c.subcontrato]) grupos[c.subcontrato] = [];
    grupos[c.subcontrato].push(c);
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: "0.75rem", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.25rem", background: "#1C2B3A", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {open ? <ChevronUp size={14} color="#6A7A8A" /> : <ChevronDown size={14} color="#6A7A8A" />}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E0E8F0" }}>{semana.semana}</div>
            <div style={{ fontSize: 11, color: "#6A7A8A" }}>{semana.fecha_inicio} — {semana.fecha_fin}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#6A7A8A", fontFamily: "monospace", letterSpacing: "0.08em" }}>COMPROMISOS</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#C17F3A" }}>{cumplidos}/{total}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#6A7A8A", fontFamily: "monospace", letterSpacing: "0.08em" }}>PPC</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: ppcColor(ppc), fontFamily: "monospace" }}>{total > 0 ? `${ppc}%` : "—"}</div>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ padding: "1rem 1.25rem", background: "#162230" }}>
          {/* PPC bar */}
          {total > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${ppc}%`, background: ppcColor(ppc), borderRadius: 3, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#4A5A6A", marginTop: 4, fontFamily: "monospace" }}>
                PPC = {cumplidos} cumplidos / {total} compromisos = {ppc}%
              </div>
            </div>
          )}

          {/* Grupos por subcontrato */}
          {Object.entries(grupos).map(([sub, items]) => {
            const subTotal = items.length;
            const subCumplidos = items.filter(i => i.cumplido === true).length;
            const subPpc = subTotal > 0 ? Math.round((subCumplidos / subTotal) * 100) : 0;
            return (
              <div key={sub} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase" }}>{sub}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: ppcColor(subPpc) }}>PPC {subPpc}%</span>
                </div>
                {items.map(c => (
                  <CompromisoCard key={c.id} c={c}
                    onUpdate={(id, data) => updateCompromiso.mutate({ id, data })}
                    onDelete={(id) => deleteCompromiso.mutate(id)}
                  />
                ))}
              </div>
            );
          })}

          {compromisos.length === 0 && (
            <div style={{ fontSize: 12, color: "#4A5A6A", textAlign: "center", padding: "1rem" }}>Sin compromisos esta semana</div>
          )}

          {/* Formulario nuevo compromiso */}
          {showForm ? (
            <div style={{ background: "#0F1C28", borderRadius: 6, padding: "1rem", border: "1px solid rgba(193,127,58,0.2)", marginTop: "0.75rem" }}>
              <div style={{ fontSize: 11, color: "#C17F3A", fontFamily: "monospace", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>NUEVO COMPROMISO</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input placeholder="Subcontrato / empresa" value={form.subcontrato} onChange={e => setForm(f => ({ ...f, subcontrato: e.target.value }))}
                  style={{ background: "#1C2B3A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "6px 10px", color: "#E0E8F0", fontSize: 12 }} />
                <select value={form.partidaId} onChange={e => setForm(f => ({ ...f, partidaId: e.target.value }))}
                  style={{ background: "#1C2B3A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "6px 10px", color: form.partidaId ? "#E0E8F0" : "#6A7A8A", fontSize: 12 }}>
                  <option value="">Partida (opcional)</option>
                  {partidas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <input placeholder="Descripción del compromiso" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                style={{ width: "100%", background: "#1C2B3A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "6px 10px", color: "#E0E8F0", fontSize: 12, marginBottom: "0.5rem", boxSizing: "border-box" }} />
              <input placeholder="Meta / cantidad comprometida (ej: 50 m2)" value={form.meta} onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                style={{ width: "100%", background: "#1C2B3A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "6px 10px", color: "#E0E8F0", fontSize: 12, marginBottom: "0.75rem", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "5px 14px", cursor: "pointer", color: "#6A7A8A", fontSize: 12 }}>Cancelar</button>
                <button onClick={() => { if (!form.subcontrato || !form.descripcion) return; addCompromiso.mutate({ ...form, partidaId: form.partidaId ? parseInt(form.partidaId) : null }); }}
                  style={{ background: "#C17F3A", border: "none", borderRadius: 4, padding: "5px 14px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Agregar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "1px dashed rgba(193,127,58,0.3)", borderRadius: 4, padding: "6px 14px", cursor: "pointer", color: "#C17F3A", fontSize: 12, marginTop: "0.75rem" }}>
              <Plus size={13} /> Agregar compromiso
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LastPlannerPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showNuevaSemana, setShowNuevaSemana] = useState(false);
  const semanaActual = getSemanaLabel();

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: semanas = [], isLoading } = useQuery({ queryKey: ["lps-semanas", id], queryFn: () => apiRequest("GET", `/projects/${id}/lps/semanas`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });

  const createSemana = useMutation({
    mutationFn: () => apiRequest("POST", `/projects/${id}/lps/semanas`, { semana: semanaActual.label, fechaInicio: semanaActual.inicio, fechaFin: semanaActual.fin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lps-semanas", id] }); setShowNuevaSemana(false); },
  });

  // PPC histórico
  const historial = semanas.map((s: any) => {
    const total = parseInt(s.total_compromisos ?? "0");
    const cumplidos = parseInt(s.cumplidos ?? "0");
    return { semana: s.semana, ppc: total > 0 ? Math.round((cumplidos / total) * 100) : null };
  }).filter((s: any) => s.ppc !== null).reverse();
  const maxBar = 100;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Last Planner System</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>{project?.name ?? "Cargando..."}</h1>
        </div>
        <button onClick={() => setShowNuevaSemana(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#C17F3A", border: "none", borderRadius: 6, padding: "0.6rem 1.25rem", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /> Nueva semana
        </button>
      </div>

      {/* Modal nueva semana */}
      {showNuevaSemana && (
        <div style={{ background: "#1C2B3A", border: "1px solid rgba(193,127,58,0.3)", borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: 12, color: "#C17F3A", fontFamily: "monospace", marginBottom: "0.75rem" }}>CREAR SEMANA</div>
          <div style={{ fontSize: 14, color: "#E0E8F0", marginBottom: "0.25rem" }}>{semanaActual.label} — {semanaActual.display}</div>
          <div style={{ fontSize: 12, color: "#6A7A8A", marginBottom: "1rem" }}>{semanaActual.inicio} → {semanaActual.fin}</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setShowNuevaSemana(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "5px 14px", cursor: "pointer", color: "#6A7A8A", fontSize: 12 }}>Cancelar</button>
            <button onClick={() => createSemana.mutate()} style={{ background: "#C17F3A", border: "none", borderRadius: 4, padding: "5px 14px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600 }}>Crear semana</button>
          </div>
        </div>
      )}

      {/* PPC histórico */}
      {historial.length > 1 && (
        <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>PPC histórico</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
            {historial.map((h: any) => (
              <div key={h.semana} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: ppcColor(h.ppc), borderRadius: "2px 2px 0 0", height: `${(h.ppc / maxBar) * 52}px`, minHeight: 2 }} />
                <div style={{ fontSize: 9, color: "#4A5A6A", fontFamily: "monospace" }}>{h.semana.split("-")[0]}</div>
                <div style={{ fontSize: 9, color: ppcColor(h.ppc), fontFamily: "monospace", fontWeight: 700 }}>{h.ppc}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semanas */}
      {isLoading && <div style={{ textAlign: "center", padding: "2rem", color: "#4A5A6A", fontSize: 13 }}>Cargando...</div>}
      {!isLoading && semanas.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed rgba(193,127,58,0.2)", borderRadius: 8, color: "#4A5A6A", fontSize: 13 }}>
          Sin semanas aún — crea la primera semana para comenzar
        </div>
      )}
      {semanas.map((s: any) => <SemanaPanel key={s.id} semana={s} projectId={id!} partidas={partidas} />)}
    </div>
  );
}
