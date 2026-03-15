import { useState, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { Upload, FileJson, CheckCircle, AlertTriangle, X, ChevronRight } from "lucide-react";

interface ImportResult {
  ok: boolean;
  importado?: { partidas: number; totalUF: string; capitulos: number };
  error?: string;
}

interface PreviewPartida {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitarioUF: number;
  subtotal: number;
  apuCount: number;
  subCount: number;
}

interface PreviewData {
  proyecto: string;
  capitulos: number;
  partidas: PreviewPartida[];
  totalUF: number;
}

export default function ImportPresupuesto() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = (f: File) => {
    setParseError(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.capitulos || !Array.isArray(json.capitulos)) {
          setParseError("El archivo no tiene el formato .smartbuild esperado.");
          return;
        }
        const allPartidas: PreviewPartida[] = [];
        let total = 0;
        for (const cap of json.capitulos) {
          for (const p of cap.partidas ?? []) {
            const sub = (p.cantidad ?? 1) * (p.precioUnitarioUF ?? 0);
            total += sub;
            allPartidas.push({
              codigo: p.codigo ?? "",
              nombre: p.nombre ?? "Sin nombre",
              unidad: p.unidad ?? "gl",
              cantidad: p.cantidad ?? 0,
              precioUnitarioUF: p.precioUnitarioUF ?? 0,
              subtotal: sub,
              apuCount: (p.apu ?? []).length,
              subCount: (p.subcontratos ?? []).length,
            });
          }
        }
        setPreview({ proyecto: json.proyecto?.nombre ?? "Sin nombre", capitulos: json.capitulos.length, partidas: allPartidas, totalUF: total });
      } catch {
        setParseError("No se pudo leer el archivo. Asegúrate de que sea un JSON válido.");
      }
    };
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/import`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Error de red al subir el archivo." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setParseError(null); };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: 13, color: "gray" }}>Proyecto #{projectId}</span>
          <ChevronRight size={13} />
          <span style={{ fontSize: 13 }}>Importar presupuesto</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Importar presupuesto APU</h1>
        <p style={{ color: "gray", marginTop: "0.4rem", fontSize: 14 }}>
          Sube un archivo <code>.smartbuild</code> exportado desde SmartBuild 1.
        </p>
      </div>

      {result?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={22} className="text-green-600" />
            <span className="font-semibold text-green-700 text-base">Presupuesto importado correctamente</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Partidas creadas", value: result.importado?.partidas },
              { label: "Capítulos", value: result.importado?.capitulos },
              { label: "Total presupuesto", value: `UF ${parseFloat(result.importado?.totalUF ?? "0").toLocaleString("es-CL", { minimumFractionDigits: 2 })}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-3">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <a href={`/projects/${projectId}/obra`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ver Control de Obra →</a>
            <button onClick={reset} className="border px-4 py-2 rounded-lg text-sm">Importar otro</button>
          </div>
        </div>
      )}

      {result?.ok === false && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500" />
          <span className="text-red-700 text-sm">{result.error}</span>
        </div>
      )}

      {!result?.ok && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragging ? "border-blue-400 bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-300"}`}
          >
            <input ref={inputRef} type="file" accept=".smartbuild,.json" onChange={handleFileChange} className="hidden" />
            {!file ? (
              <>
                <Upload size={36} className="mx-auto mb-3 text-gray-400" />
                <div className="font-semibold text-gray-700 mb-1">Arrastra tu archivo aquí</div>
                <div className="text-sm text-gray-400">o haz clic para buscar — acepta <code>.smartbuild</code> o <code>.json</code></div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <FileJson size={28} className="text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold text-sm">{file.name}</div>
                  <div className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="ml-4 p-1"><X size={16} /></button>
              </div>
            )}
          </div>

          {parseError && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2 items-start">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <span className="text-sm text-red-700">{parseError}</span>
            </div>
          )}

          {preview && !parseError && (
            <div className="mt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-semibold text-base">{preview.proyecto}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {preview.capitulos} capítulos · {preview.partidas.length} partidas · <strong>UF {preview.totalUF.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
                <button onClick={handleImport} disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                  {loading ? "Importando..." : "Importar presupuesto →"}
                </button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <div className="grid bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b"
                  style={{ gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px" }}>
                  <span>Código</span><span>Partida</span><span>Un.</span>
                  <span className="text-right">Cant.</span><span className="text-right">P.Unit UF</span>
                  <span className="text-right">Total UF</span><span className="text-center">APU/Sub</span>
                </div>
                {preview.partidas.map((p, i) => (
                  <div key={i} className={`grid px-4 py-2.5 text-sm border-b last:border-0 items-center ${i % 2 === 1 ? "bg-gray-50" : ""}`}
                    style={{ gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px" }}>
                    <span className="font-mono text-xs text-gray-400">{p.codigo}</span>
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-gray-400">{p.unidad}</span>
                    <span className="text-right">{p.cantidad.toLocaleString("es-CL")}</span>
                    <span className="text-right">{p.precioUnitarioUF.toFixed(4)}</span>
                    <span className="text-right font-semibold">{p.subtotal.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</span>
                    <span className="text-center text-xs text-gray-400">{p.apuCount}/{p.subCount}</span>
                  </div>
                ))}
                <div className="grid px-4 py-3 bg-gray-50 border-t-2 text-sm font-bold"
                  style={{ gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px" }}>
                  <span /><span className="text-gray-500">TOTAL</span>
                  <span /><span /><span />
                  <span className="text-right">{preview.totalUF.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</span>
                  <span />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
