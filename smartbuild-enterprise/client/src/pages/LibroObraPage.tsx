import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";
const CLIMAS = ["soleado", "nublado", "lluvia", "viento", "nieve"];
const CLIMA_ICON: Record<string, string> = {
  soleado: "☀️", nublado: "☁️", lluvia: "🌧️", viento: "💨", nieve: "❄️"
};

function getToken() {
  try { return localStorage.getItem("sb_token") || JSON.parse(localStorage.getItem("sb_user") || "{}").token || ""; }
  catch { return ""; }
}
function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

export default function LibroObraPage({ id: propId }: { id?: string }) {
  const { id: paramId } = useParams();
  const projectId = propId ?? paramId;
  const [entradas, setEntradas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clima: "soleado",
    temperatura: "",
    personalPresente: "",
    equiposPresentes: "",
    avances: "",
    incidentes: "",
    observaciones: "",
  });

  useEffect(() => { if (projectId) cargar(); }, [projectId]);

  async function cargar() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/projects/${projectId}/libro-obra`, { headers: headers() });
      const data = await r.json();
      setEntradas(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  async function guardar() {
    setSaving(true);
    try {
      await fetch(`${API}/api/projects/${projectId}/libro-obra`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          ...form,
          temperatura: form.temperatura ? parseInt(form.temperatura) : null,
          personalPresente: form.personalPresente ? parseInt(form.personalPresente) : 0,
        }),
      });
      setShowForm(false);
      setForm({ clima: "soleado", temperatura: "", personalPresente: "", equiposPresentes: "", avances: "", incidentes: "", observaciones: "" });
      await cargar();
    } finally { setSaving(false); }
  }

  async function firmar(id: number) {
    await fetch(`${API}/api/libro-obra/${id}/firmar`, { method: "PUT", headers: headers() });
    await cargar();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            LIBRO DE OBRA
          </h1>
          <p className="text-[#6A7A8A] text-xs font-mono mt-1">Registro oficial de actividades diarias</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#C17F3A] text-white text-xs font-mono font-bold tracking-widest hover:bg-[#A66B2E] transition-colors">
          + NUEVA ENTRADA
        </button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.3)] p-6 mb-6">
          <h2 className="text-[#C17F3A] text-xs font-mono tracking-widest mb-4">
            NUEVA ENTRADA — {new Date().toLocaleDateString("es-CL")}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">CLIMA</label>
              <div className="flex gap-2">
                {CLIMAS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, clima: c })}
                    className={`px-3 py-1.5 text-sm border transition-colors ${form.clima === c
                      ? "border-[#C17F3A] bg-[rgba(193,127,58,0.15)] text-white"
                      : "border-[rgba(255,255,255,0.1)] text-[#6A7A8A] hover:border-[#C17F3A]"}`}>
                    {CLIMA_ICON[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">TEMPERATURA (°C)</label>
              <input type="number" value={form.temperatura}
                onChange={e => setForm({ ...form, temperatura: e.target.value })}
                className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono"
                placeholder="ej: 22" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">PERSONAL PRESENTE</label>
              <input type="number" value={form.personalPresente}
                onChange={e => setForm({ ...form, personalPresente: e.target.value })}
                className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono"
                placeholder="N° personas" />
            </div>
            <div>
              <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">EQUIPOS PRESENTES</label>
              <input type="text" value={form.equiposPresentes}
                onChange={e => setForm({ ...form, equiposPresentes: e.target.value })}
                className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono"
                placeholder="ej: grúa, excavadora" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">AVANCES DEL DÍA</label>
            <textarea value={form.avances} onChange={e => setForm({ ...form, avances: e.target.value })} rows={3}
              className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none"
              placeholder="Describe los avances realizados..." />
          </div>
          <div className="mb-4">
            <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">INCIDENTES</label>
            <textarea value={form.incidentes} onChange={e => setForm({ ...form, incidentes: e.target.value })} rows={2}
              className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none"
              placeholder="Incidentes, accidentes o situaciones relevantes..." />
          </div>
          <div className="mb-6">
            <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">OBSERVACIONES</label>
            <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2}
              className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none"
              placeholder="Observaciones adicionales..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[rgba(255,255,255,0.1)] text-[#6A7A8A] text-xs font-mono hover:border-white hover:text-white transition-colors">
              CANCELAR
            </button>
            <button onClick={guardar} disabled={saving}
              className="px-6 py-2 bg-[#C17F3A] text-white text-xs font-mono font-bold tracking-widest hover:bg-[#A66B2E] transition-colors disabled:opacity-50">
              {saving ? "GUARDANDO..." : "GUARDAR ENTRADA"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE ENTRADAS */}
      {loading ? (
        <div className="text-[#6A7A8A] text-xs font-mono text-center py-12">Cargando entradas...</div>
      ) : entradas.length === 0 ? (
        <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-white font-mono text-sm">Sin entradas aún</p>
          <p className="text-[#6A7A8A] text-xs font-mono mt-1">Crea la primera entrada del libro de obra</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entradas.map((e: any) => (
            <div key={e.id} className={`bg-[#1C2B3A] border p-5 ${e.firmado ? "border-[rgba(193,127,58,0.4)]" : "border-[rgba(255,255,255,0.05)]"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CLIMA_ICON[e.clima] || "☀️"}</span>
                  <div>
                    <div className="text-white font-mono text-sm font-bold">
                      {new Date(e.fecha).toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
                    <div className="text-[#6A7A8A] text-[10px] font-mono mt-0.5">
                      {e.autorNombre} · {e.clima} {e.temperatura ? `· ${e.temperatura}°C` : ""} · {e.personalPresente ?? 0} personas
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {e.firmado ? (
                    <span className="px-2 py-1 bg-[rgba(193,127,58,0.15)] border border-[rgba(193,127,58,0.4)] text-[#C17F3A] text-[10px] font-mono tracking-widest">
                      ✓ FIRMADO
                    </span>
                  ) : (
                    <button onClick={() => firmar(e.id)}
                      className="px-3 py-1 border border-[rgba(193,127,58,0.3)] text-[#C17F3A] text-[10px] font-mono hover:bg-[rgba(193,127,58,0.1)] transition-colors">
                      FIRMAR
                    </button>
                  )}
                </div>
              </div>
              {e.equiposPresentes && (
                <div className="mb-2">
                  <span className="text-[#6A7A8A] text-[10px] font-mono tracking-widest">EQUIPOS · </span>
                  <span className="text-white text-xs font-mono">{e.equiposPresentes}</span>
                </div>
              )}
              {e.avances && (
                <div className="mb-2 p-3 bg-[rgba(0,200,100,0.05)] border-l-2 border-green-500">
                  <div className="text-[#6A7A8A] text-[10px] font-mono tracking-widest mb-1">AVANCES</div>
                  <p className="text-white text-xs font-mono leading-relaxed">{e.avances}</p>
                </div>
              )}
              {e.incidentes && (
                <div className="mb-2 p-3 bg-[rgba(255,100,0,0.05)] border-l-2 border-orange-500">
                  <div className="text-[#6A7A8A] text-[10px] font-mono tracking-widest mb-1">INCIDENTES</div>
                  <p className="text-white text-xs font-mono leading-relaxed">{e.incidentes}</p>
                </div>
              )}
              {e.observaciones && (
                <div className="p-3 bg-[rgba(255,255,255,0.02)] border-l-2 border-[#3A4A5A]">
                  <div className="text-[#6A7A8A] text-[10px] font-mono tracking-widest mb-1">OBSERVACIONES</div>
                  <p className="text-white text-xs font-mono leading-relaxed">{e.observaciones}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}