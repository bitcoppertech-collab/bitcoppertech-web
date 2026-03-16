import { useState, useEffect } from "react";
import { Link } from "wouter";

const API = import.meta.env.VITE_API_URL || "";
function getToken() {
  try { return JSON.parse(localStorage.getItem("sb_user") || "{}").token || ""; }
  catch { return ""; }
}
function headers() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

const TIPO_COLOR: Record<string, string> = {
  fatalidad: "border-red-600 bg-red-900/20 text-red-400",
  accidente: "border-orange-500 bg-orange-900/20 text-orange-400",
  incidente: "border-yellow-500 bg-yellow-900/20 text-yellow-400",
  casi_accidente: "border-blue-500 bg-blue-900/20 text-blue-400",
};

export default function CodelcoPage() {
  const [tab, setTab] = useState<"contratos"|"incidentes"|"kpis"|"edp">("contratos");
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratoSel, setContratoSel] = useState<any>(null);
  const [incidentes, setIncidentes] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [edps, setEdps] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => { cargarContratos(); }, []);
  useEffect(() => {
    if (contratoSel) {
      cargarIncidentes();
      cargarKpis();
      cargarEdps();
    }
  }, [contratoSel]);

  async function cargarContratos() {
    const r = await fetch(`${API}/api/mineria/codelco/contratos`, { headers: headers() });
    const data = await r.json();
    setContratos(data);
    if (data.length > 0 && !contratoSel) setContratoSel(data[0]);
  }

  async function cargarIncidentes() {
    const r = await fetch(`${API}/api/mineria/codelco/contratos/${contratoSel.id}/incidentes`, { headers: headers() });
    setIncidentes(await r.json());
  }

  async function cargarKpis() {
    const r = await fetch(`${API}/api/mineria/codelco/contratos/${contratoSel.id}/kpis`, { headers: headers() });
    setKpis(await r.json());
  }

  async function cargarEdps() {
    const r = await fetch(`${API}/api/mineria/codelco/contratos/${contratoSel.id}/edp`, { headers: headers() });
    setEdps(await r.json());
  }

  async function guardar() {
    setSaving(true);
    try {
      let url = `${API}/api/mineria/codelco/contratos`;
      if (tab === "incidentes") url = `${API}/api/mineria/codelco/contratos/${contratoSel.id}/incidentes`;
      if (tab === "kpis") url = `${API}/api/mineria/codelco/contratos/${contratoSel.id}/kpis`;
      if (tab === "edp") url = `${API}/api/mineria/codelco/contratos/${contratoSel.id}/edp`;
      await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(form) });
      setShowForm(false);
      setForm({});
      cargarContratos();
      if (contratoSel) { cargarIncidentes(); cargarKpis(); cargarEdps(); }
    } finally { setSaving(false); }
  }

  const tabs = [
    { key: "contratos", label: "CONTRATOS" },
    { key: "incidentes", label: "INCIDENTES RESSO" },
    { key: "kpis", label: "KPIs" },
    { key: "edp", label: "ESTADOS DE PAGO" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/mineria">
            <a className="text-[#6A7A8A] hover:text-white text-xs font-mono">← MINERÍA</a>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              CODELCO
            </h1>
            <p className="text-[#6A7A8A] text-[10px] font-mono">RESSO · REMA · ECF · EDP</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setForm({}); }}
          className="px-4 py-2 bg-[#C17F3A] text-white text-xs font-mono font-bold tracking-widest hover:bg-[#A66B2E] transition-colors">
          + NUEVO
        </button>
      </div>

      {/* SELECTOR CONTRATO */}
      {contratos.length > 0 && tab !== "contratos" && (
        <div className="mb-4 flex gap-2 flex-wrap">
          {contratos.map((c: any) => (
            <button key={c.id} onClick={() => setContratoSel(c)}
              className={`px-3 py-1.5 text-xs font-mono border transition-colors ${contratoSel?.id === c.id ? "border-[#C17F3A] bg-[rgba(193,127,58,0.15)] text-[#C17F3A]" : "border-[rgba(255,255,255,0.1)] text-[#6A7A8A] hover:border-[#C17F3A]"}`}>
              {c.numero_contrato} — {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 mb-6 border-b border-[rgba(255,255,255,0.06)]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-[10px] font-mono tracking-widest transition-colors ${tab === t.key ? "text-[#C17F3A] border-b-2 border-[#C17F3A]" : "text-[#6A7A8A] hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.3)] p-6 mb-6">
          <h2 className="text-[#C17F3A] text-xs font-mono tracking-widest mb-4">
            NUEVO {tab === "contratos" ? "CONTRATO" : tab === "incidentes" ? "INCIDENTE" : tab === "kpis" ? "KPI" : "EDP"}
          </h2>

          {tab === "contratos" && (
            <div className="grid grid-cols-2 gap-4">
              {[["numeroContrato","N° Contrato"],["nombre","Nombre"],["division","División"],["administradorEecc","Administrador EECC"],["administradorCodelco","Administrador Codelco"]].map(([key, label]) => (
                <div key={key}>
                  <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">{label.toUpperCase()}</label>
                  <input value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
                </div>
              ))}
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">CLASIFICACIÓN</label>
                <select value={form.clasificacion||""} onChange={e => setForm({...form,clasificacion:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  <option value="">Seleccionar</option>
                  {["I","II","III","IV"].map(v => <option key={v} value={v}>Tipo {v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">MONTO (UF)</label>
                <input type="number" value={form.montoUf||""} onChange={e => setForm({...form,montoUf:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
            </div>
          )}

          {tab === "incidentes" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">TIPO</label>
                <select value={form.tipo||""} onChange={e => setForm({...form,tipo:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  <option value="">Seleccionar</option>
                  {[["fatalidad","Fatalidad"],["accidente","Accidente"],["incidente","Incidente"],["casi_accidente","Casi Accidente"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">ECF APLICABLE</label>
                <select value={form.ecf||""} onChange={e => setForm({...form,ecf:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  <option value="ninguno">Ninguno</option>
                  <option value="ECF3">ECF3 — Máquinas Industriales</option>
                  <option value="ECF4">ECF4 — Vehículos Livianos</option>
                  <option value="ECF21">ECF21 — Transporte de Cargas</option>
                </select>
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">LUGAR</label>
                <input value={form.lugar||""} onChange={e => setForm({...form,lugar:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">REPORTADO POR</label>
                <input value={form.reportadoPor||""} onChange={e => setForm({...form,reportadoPor:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">LESIONADOS</label>
                <input type="number" value={form.lesionados||""} onChange={e => setForm({...form,lesionados:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">DÍAS PERDIDOS</label>
                <input type="number" value={form.diasPerdidos||""} onChange={e => setForm({...form,diasPerdidos:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">DESCRIPCIÓN</label>
                <textarea value={form.descripcion||""} onChange={e => setForm({...form,descripcion:e.target.value})} rows={3}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">CAUSA RAÍZ</label>
                <textarea value={form.causaRaiz||""} onChange={e => setForm({...form,causaRaiz:e.target.value})} rows={2}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">MEDIDA CORRECTIVA</label>
                <textarea value={form.medidaCorrectiva||""} onChange={e => setForm({...form,medidaCorrectiva:e.target.value})} rows={2}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
            </div>
          )}

          {tab === "kpis" && (
            <div className="grid grid-cols-3 gap-4">
              {[["periodo","Período (ej: 2026-03)"],["avanceFisico","Avance Físico (%)"],["cumplimientoSeguridad","Cumpl. Seguridad (%)"],["cumplimientoAmbiental","Cumpl. Ambiental (%)"],["hhTrabajadas","HH Trabajadas"],["hhCapacitacion","HH Capacitación"],["nTrabajadores","N° Trabajadores"]].map(([key,label]) => (
                <div key={key}>
                  <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">{label.toUpperCase()}</label>
                  <input value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
                </div>
              ))}
              <div className="col-span-3">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">OBSERVACIONES</label>
                <textarea value={form.observaciones||""} onChange={e => setForm({...form,observaciones:e.target.value})} rows={2}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
            </div>
          )}

          {tab === "edp" && (
            <div className="grid grid-cols-2 gap-4">
              {[["numeroEdp","N° EDP"],["periodo","Período"],["montoUf","Monto (UF)"]].map(([key,label]) => (
                <div key={key}>
                  <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">{label.toUpperCase()}</label>
                  <input value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
                </div>
              ))}
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">ESTADO</label>
                <select value={form.estado||"borrador"} onChange={e => setForm({...form,estado:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  {[["borrador","Borrador"],["enviado","Enviado"],["aprobado","Aprobado"],["rechazado","Rechazado"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">OBSERVACIONES</label>
                <textarea value={form.observaciones||""} onChange={e => setForm({...form,observaciones:e.target.value})} rows={2}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[rgba(255,255,255,0.1)] text-[#6A7A8A] text-xs font-mono hover:border-white hover:text-white transition-colors">
              CANCELAR
            </button>
            <button onClick={guardar} disabled={saving}
              className="px-6 py-2 bg-[#C17F3A] text-white text-xs font-mono font-bold tracking-widest hover:bg-[#A66B2E] transition-colors disabled:opacity-50">
              {saving ? "GUARDANDO..." : "GUARDAR"}
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO TABS */}
      {tab === "contratos" && (
        <div className="space-y-3">
          {contratos.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin contratos Codelco</p>
            </div>
          ) : contratos.map((c: any) => (
            <div key={c.id} onClick={() => setContratoSel(c)}
              className={`bg-[#1C2B3A] border p-5 cursor-pointer transition-colors ${contratoSel?.id === c.id ? "border-[#C17F3A]" : "border-[rgba(255,255,255,0.05)] hover:border-[rgba(193,127,58,0.3)]"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-mono font-bold text-sm">{c.numero_contrato} — {c.nombre}</div>
                  <div className="text-[#6A7A8A] text-[10px] font-mono mt-1">{c.division} · Tipo {c.clasificacion} · AdC: {c.administrador_eecc}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#C17F3A] font-mono text-sm font-bold">UF {parseFloat(c.monto_uf||0).toLocaleString()}</div>
                  <div className={`text-[10px] font-mono mt-1 ${c.estado === "ejecucion" ? "text-green-400" : c.estado === "desmovilizacion" ? "text-red-400" : "text-yellow-400"}`}>
                    {c.estado?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "incidentes" && (
        <div className="space-y-3">
          {incidentes.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin incidentes registrados ✓</p>
            </div>
          ) : incidentes.map((i: any) => (
            <div key={i.id} className={`border p-5 ${TIPO_COLOR[i.tipo] || "border-[rgba(255,255,255,0.05)] bg-[#1C2B3A]"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-mono font-bold uppercase">{i.tipo?.replace("_"," ")}</span>
                  {i.ecf && i.ecf !== "ninguno" && <span className="ml-2 text-[10px] font-mono bg-[rgba(193,127,58,0.2)] text-[#C17F3A] px-2 py-0.5">{i.ecf}</span>}
                  <div className="text-white text-sm font-mono mt-1">{i.descripcion}</div>
                  <div className="text-[10px] font-mono opacity-60 mt-1">{i.lugar} · {new Date(i.fecha).toLocaleDateString("es-CL")} · {i.reportado_por}</div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-1 border ${i.estado === "cerrado" ? "border-green-500 text-green-400" : i.estado === "en_proceso" ? "border-yellow-500 text-yellow-400" : "border-red-500 text-red-400"}`}>
                  {i.estado?.toUpperCase()}
                </span>
              </div>
              {i.lesionados > 0 && <div className="text-[10px] font-mono opacity-70">Lesionados: {i.lesionados} · Días perdidos: {i.dias_perdidos}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "kpis" && (
        <div className="space-y-3">
          {kpis.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin KPIs registrados</p>
            </div>
          ) : kpis.map((k: any) => (
            <div key={k.id} className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-5">
              <div className="text-[#C17F3A] font-mono text-xs tracking-widest mb-3">PERÍODO {k.periodo}</div>
              <div className="grid grid-cols-4 gap-4">
                {[["Avance Físico",k.avance_fisico,"%"],["Cumpl. Seguridad",k.cumplimiento_seguridad,"%"],["Cumpl. Ambiental",k.cumplimiento_ambiental,"%"],["HH Trabajadas",k.hh_trabajadas,"hrs"],["HH Capacitación",k.hh_capacitacion,"hrs"],["N° Trabajadores",k.n_trabajadores,""]].map(([label,val,unit]) => (
                  <div key={label as string}>
                    <div className="text-[#6A7A8A] text-[10px] font-mono">{label as string}</div>
                    <div className="text-white font-mono font-bold">{val}{unit}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "edp" && (
        <div className="space-y-3">
          {edps.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin Estados de Pago</p>
            </div>
          ) : edps.map((e: any) => (
            <div key={e.id} className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-5 flex items-center justify-between">
              <div>
                <div className="text-white font-mono font-bold">EDP #{e.numero_edp} — {e.periodo}</div>
                <div className="text-[#6A7A8A] text-[10px] font-mono mt-1">{e.observaciones}</div>
              </div>
              <div className="text-right">
                <div className="text-[#C17F3A] font-mono font-bold">UF {parseFloat(e.monto_uf||0).toLocaleString()}</div>
                <div className={`text-[10px] font-mono mt-1 ${e.estado === "aprobado" ? "text-green-400" : e.estado === "rechazado" ? "text-red-400" : e.estado === "enviado" ? "text-yellow-400" : "text-[#6A7A8A]"}`}>
                  {e.estado?.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}