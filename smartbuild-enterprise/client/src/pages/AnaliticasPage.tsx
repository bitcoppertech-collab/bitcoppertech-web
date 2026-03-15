// client/src/pages/AnaliticasPage.tsx
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";

const fUF = (n: number) => `UF ${parseFloat(String(n)).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

export default function AnaliticasPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });
  const { data: pagos = [] } = useQuery({ queryKey: ["pagos", id], queryFn: () => apiRequest("GET", `/projects/${id}/pagos`) });

  // ── Analíticas de subcontratos por proveedor ──────────────────
  const proveedorMap: Record<string, { proveedor: string; pagos: any[]; totalPagado: number; totalPendiente: number }> = {};
  for (const p of pagos) {
    if (!p.proveedor) continue;
    if (!proveedorMap[p.proveedor]) {
      proveedorMap[p.proveedor] = { proveedor: p.proveedor, pagos: [], totalPagado: 0, totalPendiente: 0 };
    }
    proveedorMap[p.proveedor].pagos.push(p);
    const monto = parseFloat(p.monto ?? "0");
    if (p.estado === "pagado") proveedorMap[p.proveedor].totalPagado += monto;
    else proveedorMap[p.proveedor].totalPendiente += monto;
  }
  const proveedores = Object.values(proveedorMap).sort((a, b) => (b.totalPagado + b.totalPendiente) - (a.totalPagado + a.totalPendiente));

  // ── Velocidad de gasto (pagos por semana) ─────────────────────
  const pagosPorSemana: Record<string, number> = {};
  for (const p of pagos) {
    if (!p.fecha) continue;
    const d = new Date(p.fecha);
    const semana = `${d.getFullYear()}-S${Math.ceil(d.getDate() / 7)}`;
    pagosPorSemana[semana] = (pagosPorSemana[semana] ?? 0) + parseFloat(p.monto ?? "0");
  }
  const semanas = Object.entries(pagosPorSemana).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  const maxSemana = Math.max(...semanas.map(([, v]) => v), 1);

  // ── Desviación por partida ────────────────────────────────────
  const desviaciones = partidas
    .map((p: any) => {
      const pre = parseFloat(p.presupuesto ?? "0");
      const ej = parseFloat(p.ejecutado ?? "0");
      const dev = pre > 0 ? ((ej - pre) / pre) * 100 : 0;
      return { nombre: p.nombre, presupuesto: pre, ejecutado: ej, desviacion: dev, avance: p.avance ?? 0 };
    })
    .filter((p: any) => p.presupuesto > 0)
    .sort((a: any, b: any) => Math.abs(b.desviacion) - Math.abs(a.desviacion));

  // ── KPIs globales ─────────────────────────────────────────────
  const totalPresupuesto = partidas.reduce((s: number, p: any) => s + parseFloat(p.presupuesto ?? "0"), 0);
  const totalEjecutado = partidas.reduce((s: number, p: any) => s + parseFloat(p.ejecutado ?? "0"), 0);
  const totalPagado = pagos.filter((p: any) => p.estado === "pagado").reduce((s: number, p: any) => s + parseFloat(p.monto ?? "0"), 0);
  const totalPendiente = pagos.filter((p: any) => p.estado === "pendiente").reduce((s: number, p: any) => s + parseFloat(p.monto ?? "0"), 0);
  const desviacionGlobal = totalPresupuesto > 0 ? ((totalEjecutado - totalPresupuesto) / totalPresupuesto) * 100 : 0;
  const avgAvance = partidas.length ? partidas.reduce((s: number, p: any) => s + (p.avance ?? 0), 0) / partidas.length : 0;

  const s = { background: "#1C2B3A", padding: "1rem 1.25rem", borderRadius: 4 };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Analíticas
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
          {project?.name ?? "Cargando..."}
        </h1>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(193,127,58,0.08)", border: "1px solid rgba(193,127,58,0.08)", marginBottom: "1.5rem" }}>
        {[
          { label: "Presupuesto total", value: fUF(totalPresupuesto), icon: DollarSign, color: "#C17F3A" },
          { label: "Ejecutado", value: fUF(totalEjecutado), icon: TrendingUp, color: "#4A9EDB" },
          { label: "Desviación global", value: fPct(desviacionGlobal), icon: desviacionGlobal > 0 ? TrendingUp : TrendingDown, color: desviacionGlobal > 8 ? "#E84545" : desviacionGlobal > 3 ? "#E8A855" : "#2ECC71" },
          { label: "Avance promedio", value: `${avgAvance.toFixed(0)}%`, icon: CheckCircle, color: "#2ECC71" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ ...s }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 8 }}>
              <Icon size={14} color={color} />
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#6A7A8A", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Pagos pendientes vs pagados */}
        <div style={{ ...s }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Estado de pagos
          </div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1, background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)", borderRadius: 4, padding: "0.75rem" }}>
              <div style={{ fontSize: 10, color: "#2ECC71", fontFamily: "monospace", marginBottom: 4 }}>PAGADO</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#2ECC71" }}>{fUF(totalPagado)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(232,168,85,0.08)", border: "1px solid rgba(193,127,58,0.2)", borderRadius: 4, padding: "0.75rem" }}>
              <div style={{ fontSize: 10, color: "#E8A855", fontFamily: "monospace", marginBottom: 4 }}>PENDIENTE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E8A855" }}>{fUF(totalPendiente)}</div>
            </div>
          </div>
          {/* Barra */}
          {(totalPagado + totalPendiente) > 0 && (
            <div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(totalPagado / (totalPagado + totalPendiente)) * 100}%`, background: "#2ECC71", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#6A7A8A", marginTop: 4, fontFamily: "monospace" }}>
                {((totalPagado / (totalPagado + totalPendiente)) * 100).toFixed(0)}% pagado de {fUF(totalPagado + totalPendiente)} comprometido
              </div>
            </div>
          )}
          {pagos.length === 0 && <div style={{ fontSize: 12, color: "#4A5A6A", textAlign: "center", padding: "1rem" }}>Sin pagos registrados</div>}
        </div>

        {/* Velocidad de gasto */}
        <div style={{ ...s }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Velocidad de gasto — últimas semanas
          </div>
          {semanas.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
              {semanas.map(([semana, monto]) => (
                <div key={semana} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", background: "#C17F3A", borderRadius: "2px 2px 0 0", height: `${(monto / maxSemana) * 70}px`, minHeight: 2, transition: "height 0.3s" }} />
                  <div style={{ fontSize: 8, color: "#4A5A6A", fontFamily: "monospace", textAlign: "center" }}>{semana.split("-")[1]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#4A5A6A", textAlign: "center", padding: "1rem" }}>Sin datos de velocidad aún</div>
          )}
        </div>
      </div>

      {/* Desempeño por subcontrato */}
      <div style={{ ...s, marginBottom: "1rem" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Desempeño por proveedor / subcontrato
        </div>
        {proveedores.length === 0 && (
          <div style={{ fontSize: 12, color: "#4A5A6A", textAlign: "center", padding: "1.5rem" }}>Sin subcontratos registrados</div>
        )}
        {proveedores.map((prov) => {
          const total = prov.totalPagado + prov.totalPendiente;
          const pct = total > 0 ? (prov.totalPagado / total) * 100 : 0;
          return (
            <div key={prov.proveedor} style={{ marginBottom: "0.75rem", padding: "0.75rem 1rem", background: "#0F1C28", borderRadius: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#E0E8F0" }}>{prov.proveedor}</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#2ECC71", fontFamily: "monospace" }}>✓ {fUF(prov.totalPagado)}</span>
                  {prov.totalPendiente > 0 && <span style={{ fontSize: 11, color: "#E8A855", fontFamily: "monospace" }}>⏳ {fUF(prov.totalPendiente)}</span>}
                  <span style={{ fontSize: 11, color: "#6A7A8A", fontFamily: "monospace" }}>Total: {fUF(total)}</span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#2ECC71" : "#C17F3A", borderRadius: 3, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, color: "#4A5A6A", marginTop: 4, fontFamily: "monospace" }}>
                {prov.pagos.length} pago{prov.pagos.length !== 1 ? "s" : ""} · {pct.toFixed(0)}% pagado
              </div>
            </div>
          );
        })}
      </div>

      {/* Desviación por partida */}
      <div style={{ ...s }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Desviación por partida
        </div>
        {desviaciones.length === 0 && (
          <div style={{ fontSize: 12, color: "#4A5A6A", textAlign: "center", padding: "1.5rem" }}>Sin datos de ejecución aún</div>
        )}
        {desviaciones.map((p: any) => {
          const color = p.desviacion > 8 ? "#E84545" : p.desviacion > 3 ? "#E8A855" : p.desviacion < -3 ? "#4A9EDB" : "#2ECC71";
          const Icon = p.desviacion > 3 ? TrendingUp : p.desviacion < -3 ? TrendingDown : CheckCircle;
          return (
            <div key={p.nombre} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 60px", alignItems: "center", padding: "0.5rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: "0.5rem" }}>
              <span style={{ fontSize: 12, color: "#C0CDD8" }}>{p.nombre}</span>
              <span style={{ fontSize: 11, color: "#6A7A8A", textAlign: "right", fontFamily: "monospace" }}>{fUF(p.presupuesto)}</span>
              <span style={{ fontSize: 11, color: "#6A7A8A", textAlign: "right", fontFamily: "monospace" }}>{fUF(p.ejecutado)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: "right", fontFamily: "monospace" }}>{fPct(p.desviacion)}</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <Icon size={13} color={color} />
              </div>
            </div>
          );
        })}
        {desviaciones.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 60px", alignItems: "center", padding: "0.5rem 0.75rem", gap: "0.5rem", borderTop: "1px solid rgba(193,127,58,0.2)", marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#C17F3A", fontFamily: "monospace" }}>TOTAL</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#C17F3A", textAlign: "right", fontFamily: "monospace" }}>{fUF(totalPresupuesto)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#C17F3A", textAlign: "right", fontFamily: "monospace" }}>{fUF(totalEjecutado)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: desviacionGlobal > 3 ? "#E84545" : "#2ECC71", textAlign: "right", fontFamily: "monospace" }}>{fPct(desviacionGlobal)}</span>
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
