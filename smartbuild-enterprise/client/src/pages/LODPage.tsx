import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { Upload, FileText, CheckCircle, Clock, XCircle, AlertTriangle, Plus } from "lucide-react";

const LOD_NIVELES = [100, 200, 300, 350, 400, 500];
const DOC_TIPOS = ["IFC", "RVT", "PDF", "DWG", "XLSX", "IMG", "OTHER"];

const ESTADO_LOD: Record<string, { label: string; color: string; icon: any }> = {
  pendiente:    { label: "Pendiente",     color: "#6A7A8A", icon: Clock },
  en_analisis:  { label: "Analizando...", color: "#C17F3A", icon: Clock },
  aprobado:     { label: "Aprobado",      color: "#2ECC71", icon: CheckCircle },
  observado:    { label: "Con obs.",      color: "#E8A855", icon: AlertTriangle },
  rechazado:    { label: "Rechazado",     color: "#E05040", icon: XCircle },
};

function DocRow({ doc, onRemove }: { doc: any; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(193,127,58,0.1)] rounded-sm">
      <FileText size={13} className="text-[#C17F3A] flex-shrink-0" />
      <span className="text-xs text-white flex-1 truncate">{doc.nombre}</span>
      <span className="text-[10px] font-mono text-[#6A7A8A] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-sm">{doc.tipo}</span>
      <button onClick={onRemove} className="text-[#3A4A5A] hover:text-red-400 transition-colors">
        <XCircle size={13} />
      </button>
    </div>
  );
}

export default function LODPage() {
  const [, params] = useRoute("/projects/:id/lod");
  const projectId = parseInt(params?.id ?? "0");
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nivel: 300,
    software: "",
    responsable_bim: "",
    modo_premium: false,
  });
  const [documentos, setDocumentos] = useState<{ nombre: string; tipo: string; storage_key: string }[]>([]);
  const [newDoc, setNewDoc] = useState({ nombre: "", tipo: "IFC" });

  const { data: lods = [], isLoading } = useQuery({
    queryKey: ["lods", projectId],
    queryFn: () => apiRequest("GET", `/projects/${projectId}/lod`),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiRequest("GET", `/projects/${projectId}`),
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/projects/${projectId}/lod`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lods", projectId] });
      setShowForm(false);
      setDocumentos([]);
      setForm({ nivel: 300, software: "", responsable_bim: "", modo_premium: false });
    },
  });

  function addDoc() {
    if (!newDoc.nombre.trim()) return;
    setDocumentos(d => [...d, {
      nombre: newDoc.nombre,
      tipo: newDoc.tipo,
      storage_key: `pending/${Date.now()}_${newDoc.nombre}`,
    }]);
    setNewDoc({ nombre: "", tipo: "IFC" });
  }

  const inputClass = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A] transition-colors";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">
            {project?.name ?? "Proyecto"} · LOD
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue',sans-serif" }}>
            MODELOS BIM
          </h1>
          <p className="text-sm text-[#6A7A8A] mt-1">
            Los modelos se envían automáticamente al ITIA de SmartBuild City para validación.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold px-5 py-2.5 text-sm rounded-sm transition-colors"
        >
          <Plus size={16} /> Subir LOD
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.3)] w-full max-w-lg rounded-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(193,127,58,0.12)] sticky top-0 bg-[#1C2B3A] z-10">
              <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Nuevo LOD</div>
              <button onClick={() => setShowForm(false)} className="text-[#6A7A8A] hover:text-white text-lg">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nivel LOD */}
              <div>
                <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">Nivel LOD *</label>
                <div className="grid grid-cols-6 gap-2">
                  {LOD_NIVELES.map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, nivel: n }))}
                      className={`py-2 text-sm font-bold rounded-sm border transition-colors ${form.nivel === n
                        ? "bg-[#C17F3A] border-[#C17F3A] text-[#0D1820]"
                        : "bg-[rgba(255,255,255,0.04)] border-[rgba(193,127,58,0.2)] text-[#6A7A8A] hover:border-[#C17F3A]"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Software */}
              <div>
                <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">Software BIM</label>
                <select value={form.software} onChange={e => setForm(f => ({ ...f, software: e.target.value }))} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {["Revit 2024", "Revit 2025", "ArchiCAD 27", "Tekla Structures", "Civil 3D", "Navisworks", "Otro"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Responsable BIM */}
              <div>
                <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">Responsable BIM *</label>
                <input
                  type="text"
                  placeholder="Ing. Nombre Apellido"
                  value={form.responsable_bim}
                  onChange={e => setForm(f => ({ ...f, responsable_bim: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* Modo premium */}
              <div className="flex items-center gap-3 p-3 bg-[rgba(193,127,58,0.06)] border border-[rgba(193,127,58,0.15)] rounded-sm">
                <input type="checkbox" id="premium" checked={form.modo_premium}
                  onChange={e => setForm(f => ({ ...f, modo_premium: e.target.checked }))}
                  className="w-4 h-4 accent-[#C17F3A]" />
                <label htmlFor="premium" className="text-sm text-[#E8A855] cursor-pointer">
                  Modo Premium — análisis ITIA con IA avanzada
                </label>
              </div>

              {/* Documentos */}
              <div>
                <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">
                  Documentos · {documentos.length} adjuntos
                </label>
                <div className="space-y-2 mb-3">
                  {documentos.map((d, i) => (
                    <DocRow key={i} doc={d} onRemove={() => setDocumentos(docs => docs.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="nombre_archivo.ifc"
                    value={newDoc.nombre}
                    onChange={e => setNewDoc(d => ({ ...d, nombre: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addDoc()}
                    className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-xs rounded-sm outline-none focus:border-[#C17F3A]"
                  />
                  <select value={newDoc.tipo} onChange={e => setNewDoc(d => ({ ...d, tipo: e.target.value }))}
                    className="bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-2 text-xs rounded-sm outline-none">
                    {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={addDoc}
                    className="px-3 py-2 bg-[rgba(193,127,58,0.15)] border border-[rgba(193,127,58,0.3)] text-[#C17F3A] rounded-sm text-xs hover:bg-[rgba(193,127,58,0.25)] transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <p className="text-[10px] text-[#4A5A6A] font-mono mt-2">
                  Agrega los nombres de los archivos. En producción se integra con S3/Supabase Storage.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 border-t border-[rgba(193,127,58,0.08)] pt-4">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-[rgba(193,127,58,0.2)] text-[#6A7A8A] hover:text-white py-2.5 text-sm rounded-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => mutation.mutate({ ...form, documentos })}
                disabled={!form.responsable_bim || mutation.isPending}
                className="flex-1 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold py-2.5 text-sm rounded-sm transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? "Subiendo..." : "Subir LOD → ITIA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista LODs */}
      {isLoading ? (
        <div className="text-[#6A7A8A] font-mono text-sm animate-pulse">Cargando modelos...</div>
      ) : lods.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[rgba(193,127,58,0.2)] rounded-sm">
          <Upload size={40} className="text-[#3A4A5A] mx-auto mb-4" />
          <p className="text-[#6A7A8A]">Sin modelos LOD. Sube el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lods.map((lod: any) => {
            const est = ESTADO_LOD[lod.estado] ?? ESTADO_LOD.pendiente;
            const Icon = est.icon;
            return (
              <div key={lod.id} className={`bg-[#1C2B3A] border rounded-sm p-5 ${lod.activo ? "border-[rgba(193,127,58,0.4)]" : "border-[rgba(193,127,58,0.1)]"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-bold text-lg" style={{ fontFamily: "'Bebas Neue',sans-serif" }}>
                        LOD {lod.nivel}
                      </span>
                      {lod.activo && (
                        <span className="text-[9px] font-mono text-[#2ECC71] bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.25)] px-2 py-0.5 rounded-sm uppercase tracking-widest">
                          Activo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6A7A8A]">
                      {lod.software && <span>{lod.software} · </span>}
                      {lod.responsable_bim} · {new Date(lod.subido_at).toLocaleDateString("es-CL")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: est.color }}>
                    <Icon size={16} />
                    <span className="text-sm font-mono">{est.label}</span>
                  </div>
                </div>

                {/* Documentos */}
                {lod.documentos?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {lod.documentos.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-[rgba(255,255,255,0.03)] rounded-sm">
                        <FileText size={12} className="text-[#C17F3A]" />
                        <span className="text-xs text-[#8A9BAC] flex-1">{d.nombre}</span>
                        <span className="text-[10px] font-mono text-[#4A5A6A] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-sm">{d.tipo}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] font-mono text-[#4A5A6A]">
                  <span>{lod.total_docs ?? 0} documentos</span>
                  {lod.modo_premium && <span className="text-[#C17F3A]">✦ Premium</span>}
                  <span className="ml-auto">ID: {lod.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
