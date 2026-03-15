// client/src/pages/PresupuestoPage.tsx
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { ChevronDown, ChevronRight, Users, Package, Truck, FileText } from "lucide-react";

const fUF = (n: number | string) =>
  `UF ${parseFloat(String(n)).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TIPO_ICON: Record<string, any> = {
  mano_obra: Users,
  material: Package,
  maquinaria: Truck,
  subcontrato: FileText,
};

const TIPO_COLOR: Record<string, string> = {
  mano_obra: "#C17F3A",
  material: "#4A9EDB",
  maquinaria: "#7B68EE",
  subcontrato: "#5AB87A",
};

const TIPO_LABEL: Record<string, string> = {
  mano_obra: "Mano de obra",
  material: "Material",
  maquinaria: "Maquinaria",
  subcontrato: "Subcontrato",
};

function ApuDetalle({ partidaId }: { partidaId: number }) {
  const { data: apuItems = [] } = useQuery({
    queryKey: ["apu", partidaId],
    queryFn: () => apiRequest("GET", `/partidas/${partidaId}/apu`),
  });
  const { data: subcontratos = [] } = useQuery({
    queryKey: ["subcontratos", partidaId],
    queryFn: () => apiRequest("GET", `/partidas/${partidaId}/subcontratos`),
  });

  const grupos: Record<string, any[]> = {};
  for (const item of apuItems) {
    if (!grupos[item.tipo]) grupos[item.tipo] = [];
    grupos[item.tipo].push(item);
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0F1C28" }}>
      {Object.entries(grupos).map(([tipo, items]) => {
        const Icon = TIPO_ICON[tipo] ?? FileText;
        const color = TIPO_COLOR[tipo] ?? "#888";
        const subtotal = items.reduce((s, i) => s + parseFloat(i.totalUf ?? i.total_uf ?? "0"), 0);
        return (
          <div key={tipo} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 2rem 0.25rem 3rem",
              color, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              <Icon size={12} />
              {TIPO_LABEL[tipo] ?? tipo}
              <span style={{ marginLeft: "auto", color: "#6A7A8A", fontWeight: 400 }}>{fUF(subtotal)}</span>
            </div>
            {items.map((item, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 90px 80px",
                padding: "0.3rem 2rem 0.3rem 4rem",
                fontSize: 12, color: "#8A9AAA",
                borderBottom: "1px solid rgba(255,255,255,0.02)",
              }}>
                <span>{item.descripcion}</span>
                <span style={{ textAlign: "right" }}>{item.unidad}</span>
                <span style={{ textAlign: "right" }}>{parseFloat(item.cantidad ?? "0").toLocaleString("es-CL")}</span>
                <span style={{ textAlign: "right", color: "#C17F3A" }}>
                  {fUF(parseFloat(item.totalUf ?? item.total_uf ?? "0"))}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {subcontratos.length > 0 && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 2rem 0.25rem 3rem",
            color: "#5AB87A", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <FileText size={12} />
            Subcontratos
            <span style={{ marginLeft: "auto", color: "#6A7A8A", fontWeight: 400 }}>
              {fUF(subcontratos.reduce((s: number, sc: any) => s + parseFloat(sc.montoUf ?? sc.monto_uf ?? "0"), 0))}
            </span>
          </div>
          {subcontratos.map((sc: any, i: number) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 80px",
              padding: "0.3rem 2rem 0.3rem 4rem",
              fontSize: 12, color: "#8A9AAA",
              borderBottom: "1px solid rgba(255,255,255,0.02)",
            }}>
              <span>{sc.proveedor}{sc.descripcion ? ` — ${sc.descripcion}` : ""}</span>
              <span style={{ textAlign: "right", color: "#5AB87A" }}>
                {fUF(parseFloat(sc.montoUf ?? sc.monto_uf ?? "0"))}
              </span>
            </div>
          ))}
        </div>
      )}

      {apuItems.length === 0 && subcontratos.length === 0 && (
        <div style={{ padding: "0.75rem 3rem", fontSize: 12, color: "#4A5A6A" }}>
          Sin ítems APU registrados
        </div>
      )}
    </div>
  );
}

function PartidaRow({ partida, index }: { partida: any; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "grid",
          gridTemplateColumns: "24px 60px 1fr 60px 90px 90px 80px",
          padding: "0.65rem 1rem",
          cursor: "pointer",
          background: open ? "#172230" : index % 2 === 0 ? "#1C2B3A" : "#192638",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          alignItems: "center",
          transition: "background 0.1s",
        }}
      >
        <span style={{ color: "#4A5A6A" }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#4A5A6A" }}>{partida.categoria?.split(" ")[0] ?? ""}.{String(index + 1).padStart(3, "0")}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E8F0" }}>{partida.nombre}</span>
        <span style={{ fontSize: 12, color: "#6A7A8A", textAlign: "center" }}>{partida.unidad ?? "—"}</span>
        <span style={{ fontSize: 12, color: "#6A7A8A", textAlign: "right" }}>
          {parseFloat(partida.cantidad ?? "0").toLocaleString("es-CL", { maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: 12, color: "#6A7A8A", textAlign: "right" }}>
          {parseFloat(partida.precioUnitarioUf ?? partida.precio_unitario_uf ?? "0").toFixed(4)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#C17F3A", textAlign: "right" }}>
          {fUF(parseFloat(partida.presupuesto ?? "0"))}
        </span>
      </div>
      {open && <ApuDetalle partidaId={partida.id} />}
    </>
  );
}

export default function PresupuestoPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiRequest("GET", `/projects/${id}`),
  });
  const { data: partidas = [], isLoading } = useQuery({
    queryKey: ["partidas", id],
    queryFn: () => apiRequest("GET", `/projects/${id}/partidas`),
  });

  // Agrupar por categoría (capítulo)
  const capitulos: Record<string, any[]> = {};
  for (const p of partidas) {
    const cap = p.categoria ?? "Sin capítulo";
    if (!capitulos[cap]) capitulos[cap] = [];
    capitulos[cap].push(p);
  }

  const grandTotal = partidas.reduce((s: number, p: any) => s + parseFloat(p.presupuesto ?? "0"), 0);

  return (
    <div style={{ padding: "1.5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Presupuesto APU
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
          {project?.name ?? "Cargando..."}
        </h1>
        {project?.client && <p style={{ color: "#6A7A8A", fontSize: 13, marginTop: 4 }}>{project.client}</p>}
      </div>

      {/* Summary bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1, background: "rgba(193,127,58,0.08)",
        border: "1px solid rgba(193,127,58,0.08)",
        marginBottom: "1.5rem",
      }}>
        {[
          { label: "Total presupuesto", value: fUF(grandTotal), highlight: true },
          { label: "Capítulos", value: Object.keys(capitulos).length },
          { label: "Partidas", value: partidas.length },
        ].map(s => (
          <div key={s.label} style={{ background: "#1C2B3A", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6A7A8A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.highlight ? "#C17F3A" : "#E0E8F0" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "24px 60px 1fr 60px 90px 90px 80px",
        padding: "0.5rem 1rem",
        fontSize: 10, fontWeight: 600, color: "#4A5A6A",
        letterSpacing: "0.08em", textTransform: "uppercase",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 1,
      }}>
        <span />
        <span>Código</span>
        <span>Partida</span>
        <span style={{ textAlign: "center" }}>Un.</span>
        <span style={{ textAlign: "right" }}>Cantidad</span>
        <span style={{ textAlign: "right" }}>P.Unit UF</span>
        <span style={{ textAlign: "right" }}>Total UF</span>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#4A5A6A", fontSize: 13 }}>Cargando partidas...</div>
      )}

      {/* Capítulos */}
      {Object.entries(capitulos).map(([capNombre, capPartidas]) => {
        const capTotal = capPartidas.reduce((s, p) => s + parseFloat(p.presupuesto ?? "0"), 0);
        return (
          <div key={capNombre} style={{ marginBottom: "0.5rem", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
            {/* Capítulo header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0.6rem 1rem",
              background: "#0F1C28",
              borderBottom: "1px solid rgba(193,127,58,0.12)",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#C17F3A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {capNombre}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#C17F3A", fontFamily: "monospace" }}>
                {fUF(capTotal)}
              </span>
            </div>

            {/* Partidas del capítulo */}
            {capPartidas.map((p, i) => (
              <PartidaRow key={p.id} partida={p} index={i} />
            ))}
          </div>
        );
      })}

      {/* Grand total */}
      {partidas.length > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 1.25rem",
          background: "#0F1C28",
          border: "1px solid rgba(193,127,58,0.2)",
          borderRadius: 4, marginTop: "0.5rem",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#C17F3A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Total general
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#C17F3A", fontFamily: "monospace" }}>
            {fUF(grandTotal)}
          </span>
        </div>
      )}

      {partidas.length === 0 && !isLoading && (
        <div style={{
          textAlign: "center", padding: "3rem",
          border: "1px dashed rgba(193,127,58,0.2)", borderRadius: 4,
          color: "#4A5A6A", fontSize: 13,
        }}>
          Sin partidas — importa un presupuesto para comenzar →{" "}
          <a href={`/projects/${id}/import`} style={{ color: "#C17F3A" }}>Importar</a>
        </div>
      )}
    </div>
  );
}
