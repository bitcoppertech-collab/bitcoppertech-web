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

export default function BHPPage() {
  const [tab, setTab] = useState<"contratos"|"rfx"|"scorecard">("contratos");
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratoSel, setContratoSel] = useState<any>(null);
  const [rfxList, setRfxList] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => { cargarContratos(); }, []);
  useEffect(() => {
    if (contratoSel) { cargarRfx(); cargarScorecard(); }
  }, [contratoSel]);

  async function cargarContratos() {
    const r = await fetch(`${API}/api/mineria/bhp/contratos`, { headers: headers() });
    const data = await r.json();
    setContratos(data);
    if (data.length > 0 && !contratoSel) setContratoSel(data[0]);
  }

  async function cargarRfx() {
    const r = await fetch(`${API}/api/mineria/bhp/contratos/${contratoSel.id}/rfx`, { headers: headers() });
    setRfxList(await r.json());
  }

  async function cargarScorecard() {
    const r = await fetch(`${API}/api/mineria/bhp/contratos/${contratoSel.id}/scorecard`, { headers: headers() });
    setScorecards(await r.json());
  }

  async function guardar() {
    setSaving(true);
    try {
      let url = `${API}/api/mineria/bhp/contratos`;
      if (tab === "rfx") url = `${API}/api/mineria/bhp/contratos/${contratoSel.id}/rfx`;
      if (tab === "scorecard") url = `${API}/api/mineria/bhp/contratos/${contratoSel.id}/scorecard`;
      await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(form) });
      setShowForm(false);
      setForm({});
      cargarContratos();
      if (contratoSel) { cargarRfx(); cargarScorecard(); }
    } finally { setSaving(false); }
  }

  const tabs = [
    { key: "contratos", label: "CONTRATOS" },
    { key: "rfx", label: "RFQ / RFI" },
    { key: "scorecard", label: "SCORECARD" },
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
              BHP
            </h1>
            <p className="text-[#6A7A8A] text-[10px] font-mono">GCMS · RFQ/RFI · SCORECARD</p>
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
              {c.numero_contrato || c.id} — {c.nombre}
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
            NUEVO {tab === "contratos" ? "CONTRATO" : tab === "rfx" ? "RFQ/RFI" : "SCORECARD"}
          </h2>

          {tab === "contratos" && (
            <div className="grid grid-cols-2 gap-4">
              {[["numeroContrato","N° Contrato"],["nombre","Nombre"],["operacion","Operación (ej: Escondida)"],["contactoSupply","Contacto Supply BHP"]].map(([key,label]) => (
                <div key={key}>
                  <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">{(label as string).toUpperCase()}</label>
                  <input value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
                </div>
              ))}
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">MONTO (USD)</label>
                <input type="number" value={form.montoUsd||""} onChange={e => setForm({...form,montoUsd:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">ESTADO</label>
                <select value={form.estado||"activo"} onChange={e => setForm({...form,estado:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  {[["activo","Activo"],["suspendido","Suspendido"],["cerrado","Cerrado"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {tab === "rfx" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">TIPO</label>
                <select value={form.tipo||"RFQ"} onChange={e => setForm({...form,tipo:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  <option value="RFQ">RFQ — Solicitud de Cotización</option>
                  <option value="RFI">RFI — Solicitud de Información</option>
                </select>
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">N° REFERENCIA</label>
                <input value={form.numero||""} onChange={e => setForm({...form,numero:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">TÍTULO</label>
                <input value={form.titulo||""} onChange={e => setForm({...form,titulo:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">FECHA CIERRE</label>
                <input type="date" value={form.fechaCierre||""} onChange={e => setForm({...form,fechaCierre:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">ESTADO</label>
                <select value={form.estado||"pendiente"} onChange={e => setForm({...form,estado:e.target.value})}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono">
                  {[["pendiente","Pendiente"],["respondido","Respondido"],["rechazado","Rechazado"],["adjudicado","Adjudicado"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">RESPUESTA / OBSERVACIONES</label>
                <textarea value={form.respuesta||""} onChange={e => setForm({...form,respuesta:e.target.value})} rows={3}
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono resize-none" />
              </div>
            </div>
          )}

          {tab === "scorecard" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">PERÍODO</label>
                <input value={form.periodo||""} onChange={e => setForm({...form,periodo:e.target.value})}
                  placeholder="ej: 2026-03"
                  className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
              </div>
              {[["seguridad","Seguridad"],["calidad","Calidad"],["plazo","Plazo"],["costo","Costo"],["sustentabilidad","Sustentabilidad"]].map(([key,label]) => (
                <div key={key}>
                  <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">{(label as string).toUpperCase()} (0-100)</label>
                  <input type="number" min="0" max="100" value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full bg-[#0D1820] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm font-mono" />
                </div>
              ))}
              <div className="col-span-3">
                <label className="text-[#6A7A8A] text-[10px] font-mono tracking-widest block mb-1">COMENTARIOS</label>
                <textarea value={form.comentarios||""} onChange={e => setForm({...form,comentarios:e.target.value})} rows={2}
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

      {/* CONTENIDO */}
      {tab === "contratos" && (
        <div className="space-y-3">
          {contratos.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin contratos BHP</p>
            </div>
          ) : contratos.map((c: any) => (
            <div key={c.id} onClick={() => setContratoSel(c)}
              className={`bg-[#1C2B3A] border p-5 cursor-pointer transition-colors ${contratoSel?.id === c.id ? "border-[#C17F3A]" : "border-[rgba(255,255,255,0.05)] hover:border-[rgba(193,127,58,0.3)]"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-mono font-bold text-sm">{c.numero_contrato} — {c.nombre}</div>
                  <div className="text-[#6A7A8A] text-[10px] font-mono mt-1">{c.operacion} · Supply: {c.contacto_supply}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#C17F3A] font-mono text-sm font-bold">USD {parseFloat(c.monto_usd||0).toLocaleString()}</div>
                  <div className={`text-[10px] font-mono mt-1 ${c.estado === "activo" ? "text-green-400" : c.estado === "cerrado" ? "text-red-400" : "text-yellow-400"}`}>
                    {c.estado?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "rfx" && (
        <div className="space-y-3">
          {rfxList.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin RFQ/RFI registrados</p>
            </div>
          ) : rfxList.map((r: any) => (
            <div key={r.id} className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 border ${r.tipo === "RFQ" ? "border-blue-500 text-blue-400" : "border-purple-500 text-purple-400"}`}>{r.tipo}</span>
                    <span className="text-[#6A7A8A] text-[10px] font-mono">{r.numero}</span>
                  </div>
                  <div className="text-white font-mono text-sm">{r.titulo}</div>
                  <div className="text-[#6A7A8A] text-[10px] font-mono mt-1">
                    Cierre: {r.fecha_cierre ? new Date(r.fecha_cierre).toLocaleDateString("es-CL") : "—"}
                  </div>
                  {r.respuesta && <div className="text-[#6A7A8A] text-xs font-mono mt-2 italic">{r.respuesta}</div>}
                </div>
                <span className={`text-[10px] font-mono px-2 py-1 border ${
                  r.estado === "adjudicado" ? "border-green-500 text-green-400" :
                  r.estado === "rechazado" ? "border-red-500 text-red-400" :
                  r.estado === "respondido" ? "border-yellow-500 text-yellow-400" :
                  "border-[rgba(255,255,255,0.1)] text-[#6A7A8A]"}`}>
                  {r.estado?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "scorecard" && (
        <div className="space-y-4">
          {scorecards.length === 0 ? (
            <div className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-12 text-center">
              <p className="text-white font-mono text-sm">Sin scorecards registrados</p>
            </div>
          ) : scorecards.map((s: any) => (
            <div key={s.id} className="bg-[#1C2B3A] border border-[rgba(255,255,255,0.05)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[#C17F3A] font-mono text-xs tracking-widest">PERÍODO {s.periodo}</div>
                <div className={`text-2xl font-black font-mono ${s.puntaje_total >= 80 ? "text-green-400" : s.puntaje_total >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {s.puntaje_total}/100
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[["Seguridad",s.seguridad],["Calidad",s.calidad],["Plazo",s.plazo],["Costo",s.costo],["Sustentabilidad",s.sustentabilidad]].map(([label,val]) => (
                  <div key={label as string} className="text-center">
                    <div className="text-[#6A7A8A] text-[10px] font-mono mb-1">{label as string}</div>
                    <div className="relative h-2 bg-[#0D1820] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(val as number) >= 80 ? "bg-green-500" : (val as number) >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${val}%` }} />
                    </div>
                    <div className="text-white font-mono text-xs mt-1">{val}</div>
                  </div>
                ))}
              </div>
              {s.comentarios && <div className="text-[#6A7A8A] text-xs font-mono mt-3 italic">{s.comentarios}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}