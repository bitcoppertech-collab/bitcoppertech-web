// client/src/pages/ImportPresupuesto.tsx
import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "wouter";
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
  const navigate = useNavigate();
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
          setParseError("El archivo no tiene el formato .smartbuild esperado. Debe tener un campo 'capitulos'.");
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
        setPreview({
          proyecto: json.proyecto?.nombre ?? "Sin nombre",
          capitulos: json.capitulos.length,
          partidas: allPartidas,
          totalUF: total,
        });
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
      const res = await fetch(`/api/projects/${projectId}/import`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Error de red al subir el archivo." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setParseError(null);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span
            style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Proyecto #{projectId}
          </span>
          <ChevronRight size={13} color="var(--color-text-tertiary)" />
          <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Importar presupuesto</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          Importar presupuesto APU
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.4rem", fontSize: 14 }}>
          Sube un archivo <code style={{ background: "var(--color-background-secondary)", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>.smartbuild</code> exportado desde SmartBuild 1.
          Se crearán las partidas, ítems APU y subcontratos automáticamente.
        </p>
      </div>

      {/* Success state */}
      {result?.ok && (
        <div style={{
          background: "var(--color-background-success)",
          border: "1px solid var(--color-border-success)",
          borderRadius: 12,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <CheckCircle size={22} color="var(--color-text-success)" />
            <span style={{ fontWeight: 600, color: "var(--color-text-success)", fontSize: 16 }}>
              Presupuesto importado correctamente
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Partidas creadas", value: result.importado?.partidas },
              { label: "Capítulos", value: result.importado?.capitulos },
              { label: "Total presupuesto", value: `UF ${parseFloat(result.importado?.totalUF ?? "0").toLocaleString("es-CL", { minimumFractionDigits: 2 })}` },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--color-background-primary)", borderRadius: 8, padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button
              onClick={() => navigate(`/projects/${projectId}/obra`)}
              style={{
                background: "var(--color-text-success)", color: "#fff",
                border: "none", borderRadius: 8, padding: "0.5rem 1.25rem",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Ver Control de Obra →
            </button>
            <button
              onClick={reset}
              style={{
                background: "transparent", color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-secondary)", borderRadius: 8,
                padding: "0.5rem 1.25rem", fontSize: 14, cursor: "pointer",
              }}
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {result?.ok === false && (
        <div style={{
          background: "var(--color-background-danger)",
          border: "1px solid var(--color-border-danger)",
          borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <AlertTriangle size={18} color="var(--color-text-danger)" />
          <span style={{ color: "var(--color-text-danger)", fontSize: 14 }}>{result.error}</span>
        </div>
      )}

      {/* Drop zone */}
      {!result?.ok && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--color-border-info)" : file ? "var(--color-border-success)" : "var(--color-border-secondary)"}`,
              borderRadius: 14,
              padding: "2.5rem 2rem",
              textAlign: "center",
              cursor: file ? "default" : "pointer",
              background: dragging ? "var(--color-background-info)" : "var(--color-background-secondary)",
              transition: "all 0.15s ease",
              position: "relative",
            }}
          >
            <input ref={inputRef} type="file" accept=".smartbuild,.json" onChange={handleFileChange} style={{ display: "none" }} />

            {!file ? (
              <>
                <Upload size={36} color="var(--color-text-tertiary)" style={{ margin: "0 auto 1rem" }} />
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 6 }}>
                  Arrastra tu archivo aquí
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  o haz clic para buscar — acepta <code>.smartbuild</code> o <code>.json</code>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
                <FileJson size={28} color="var(--color-text-info)" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: "auto" }}
                >
                  <X size={16} color="var(--color-text-secondary)" />
                </button>
              </div>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div style={{
              marginTop: "1rem",
              background: "var(--color-background-danger)",
              border: "1px solid var(--color-border-danger)",
              borderRadius: 8, padding: "0.75rem 1rem",
              display: "flex", gap: "0.5rem", alignItems: "flex-start",
            }}>
              <AlertTriangle size={15} color="var(--color-text-danger)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--color-text-danger)" }}>{parseError}</span>
            </div>
          )}

          {/* Preview table */}
          {preview && !parseError && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>
                    Vista previa — {preview.proyecto}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {preview.capitulos} capítulos · {preview.partidas.length} partidas ·{" "}
                    <strong>UF {preview.totalUF.toLocaleString("es-CL", { minimumFractionDigits: 2 })}</strong> total
                  </div>
                </div>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  style={{
                    background: loading ? "var(--color-border-secondary)" : "#1a56db",
                    color: "#fff", border: "none", borderRadius: 8,
                    padding: "0.55rem 1.5rem", fontSize: 14, fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    transition: "background 0.15s",
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff", borderRadius: "50%",
                        display: "inline-block", animation: "spin 0.6s linear infinite",
                      }} />
                      Importando...
                    </>
                  ) : "Importar presupuesto →"}
                </button>
              </div>

              <div style={{
                border: "1px solid var(--color-border-tertiary)",
                borderRadius: 10, overflow: "hidden",
              }}>
                {/* Table header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px",
                  background: "var(--color-background-secondary)",
                  padding: "0.6rem 1rem",
                  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  borderBottom: "1px solid var(--color-border-tertiary)",
                }}>
                  <span>Código</span>
                  <span>Partida</span>
                  <span>Un.</span>
                  <span style={{ textAlign: "right" }}>Cant.</span>
                  <span style={{ textAlign: "right" }}>P.Unit UF</span>
                  <span style={{ textAlign: "right" }}>Total UF</span>
                  <span style={{ textAlign: "center" }}>APU / Sub</span>
                </div>

                {/* Rows */}
                {preview.partidas.map((p, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px",
                    padding: "0.65rem 1rem",
                    borderBottom: i < preview.partidas.length - 1 ? "1px solid var(--color-border-tertiary)" : "none",
                    fontSize: 13, color: "var(--color-text-primary)",
                    background: i % 2 === 0 ? "transparent" : "var(--color-background-secondary)",
                    alignItems: "center",
                  }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-secondary)" }}>{p.codigo}</span>
                    <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{p.unidad}</span>
                    <span style={{ textAlign: "right" }}>{p.cantidad.toLocaleString("es-CL")}</span>
                    <span style={{ textAlign: "right" }}>{p.precioUnitarioUF.toFixed(4)}</span>
                    <span style={{ textAlign: "right", fontWeight: 600 }}>
                      {p.subtotal.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ textAlign: "center", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {p.apuCount} / {p.subCount}
                    </span>
                  </div>
                ))}

                {/* Total row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 60px 80px 90px 80px 80px",
                  padding: "0.75rem 1rem",
                  background: "var(--color-background-secondary)",
                  borderTop: "2px solid var(--color-border-primary)",
                  fontSize: 13, fontWeight: 700,
                }}>
                  <span />
                  <span style={{ color: "var(--color-text-secondary)" }}>TOTAL</span>
                  <span /><span /><span />
                  <span style={{ textAlign: "right", color: "var(--color-text-primary)" }}>
                    {preview.totalUF.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
                  </span>
                  <span />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
