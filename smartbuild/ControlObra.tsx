import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Upload,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PartidaControl {
  id: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  presupuestado: number; // CLP total presupuestado
  ejecutado: number;     // CLP total ejecutado
  avancePct: number;     // % avance físico
  fotos: string[];       // URLs fotos
  pagos: Pago[];
}

interface Pago {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  receptor: string;
  tipo: "maestro" | "contratista" | "material";
}

// ─── Mock data (se reemplaza con API) ─────────────────────────────────────────

function mockPartidas(items: any[]): PartidaControl[] {
  return items.slice(0, 8).map((item, i) => ({
    id: item.id,
    descripcion: item.description,
    unidad: item.unit,
    cantidad: parseFloat(item.quantity),
    presupuestado: parseFloat(item.totalPrice || "0"),
    ejecutado: parseFloat(item.totalPrice || "0") * (0.1 + Math.random() * 0.6),
    avancePct: Math.round(10 + Math.random() * 70),
    fotos: [],
    pagos: i % 3 === 0 ? [
      { id: 1, descripcion: "Mano de obra semana 1", monto: 180000, fecha: "2026-03-01", receptor: "Jorge Pérez", tipo: "maestro" },
    ] : [],
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function desviacion(presupuestado: number, ejecutado: number) {
  if (!presupuestado) return 0;
  return ((ejecutado - presupuestado) / presupuestado) * 100;
}

function alertLevel(pct: number, avance: number): "ok" | "warning" | "danger" {
  const costoRelativo = avance > 0 ? (pct / avance) : 1;
  if (costoRelativo > 1.15) return "danger";
  if (costoRelativo > 1.05) return "warning";
  return "ok";
}

// ─── Sub-componente: Fila de Partida ──────────────────────────────────────────

function PartidaRow({
  partida,
  onUpdateAvance,
  onAddPago,
  onAddFoto,
}: {
  partida: PartidaControl;
  onUpdateAvance: (id: number, pct: number) => void;
  onAddPago: (id: number, pago: Omit<Pago, "id">) => void;
  onAddFoto: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editAvance, setEditAvance] = useState(false);
  const [avanceDraft, setAvanceDraft] = useState(partida.avancePct.toString());
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pago, setPago] = useState({ descripcion: "", monto: "", receptor: "", tipo: "maestro" as const, fecha: new Date().toISOString().split("T")[0] });

  const desv = desviacion(partida.presupuestado, partida.ejecutado);
  const level = alertLevel(partida.ejecutado / (partida.presupuestado || 1) * 100, partida.avancePct);

  const alertColor = {
    ok: "text-green-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  }[level];

  const progressColor = {
    ok: "bg-green-500",
    warning: "bg-amber-400",
    danger: "bg-red-500",
  }[level];

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      {/* Header de partida */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Alert icon */}
        <div className={`shrink-0 ${alertColor}`}>
          {level === "ok" && <CheckCircle2 className="w-4 h-4" />}
          {level === "warning" && <AlertTriangle className="w-4 h-4" />}
          {level === "danger" && <AlertTriangle className="w-4 h-4" />}
        </div>

        {/* Descripción */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{partida.descripcion}</p>
          <p className="text-xs text-muted-foreground">{partida.unidad}</p>
        </div>

        {/* Avance físico */}
        <div className="w-32 hidden sm:block">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Avance</span>
            <span className="text-xs font-mono text-foreground">{partida.avancePct}%</span>
          </div>
          <Progress value={partida.avancePct} className="h-1.5" />
        </div>

        {/* Costo ejecutado vs presupuestado */}
        <div className="text-right hidden md:block w-40">
          <p className="text-sm font-mono text-foreground">{formatCLP(partida.ejecutado)}</p>
          <p className="text-xs text-muted-foreground">de {formatCLP(partida.presupuestado)}</p>
        </div>

        {/* Desviación */}
        <div className={`text-right w-20 hidden lg:flex items-center justify-end gap-1 ${desv > 0 ? "text-red-400" : "text-green-400"}`}>
          {desv > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs font-mono">{desv > 0 ? "+" : ""}{desv.toFixed(1)}%</span>
        </div>

        {/* Fotos + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {partida.fotos.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Camera className="w-3 h-3" />{partida.fotos.length}
            </Badge>
          )}
          {partida.pagos.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <DollarSign className="w-3 h-3" />{partida.pagos.length}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Panel expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-muted/10 border-t border-border space-y-4">

          {/* Barra de avance editable */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 shrink-0">Avance físico:</span>
            {editAvance ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0} max={100}
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm font-mono text-foreground"
                  value={avanceDraft}
                  onChange={(e) => setAvanceDraft(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="sm" variant="default" className="h-7 px-3 text-xs"
                  onClick={() => {
                    const v = Math.min(100, Math.max(0, parseInt(avanceDraft) || 0));
                    onUpdateAvance(partida.id, v);
                    setEditAvance(false);
                  }}>
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => setEditAvance(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${partida.avancePct}%` }} />
                </div>
                <span className="text-sm font-mono text-foreground w-10 text-right">{partida.avancePct}%</span>
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={(e) => { e.stopPropagation(); setEditAvance(true); }}>
                  Actualizar
                </Button>
              </div>
            )}
          </div>

          {/* Alerta de desviación */}
          {level !== "ok" && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${level === "danger" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {level === "danger"
                ? `⚠️ Costo ejecutado supera en ${desv.toFixed(1)}% el presupuestado — revisar partida`
                : `Leve desviación de ${desv.toFixed(1)}% — monitorear`}
            </div>
          )}

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fotos de avance</span>
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => onAddFoto(partida.id)}>
                <Camera className="w-3 h-3" /> Agregar foto
              </Button>
            </div>
            {partida.fotos.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Sin fotos registradas</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {partida.fotos.map((f, i) => (
                  <img key={i} src={f} className="rounded-md aspect-square object-cover border border-border" alt={`foto ${i+1}`} />
                ))}
              </div>
            )}
          </div>

          {/* Pagos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos registrados</span>
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => setShowPagoForm(!showPagoForm)}>
                <Plus className="w-3 h-3" /> Registrar pago
              </Button>
            </div>

            {showPagoForm && (
              <div className="bg-muted/20 border border-border rounded-lg p-3 mb-3 grid grid-cols-2 gap-2">
                <input placeholder="Descripción" className="col-span-2 bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground" value={pago.descripcion} onChange={e => setPago({...pago, descripcion: e.target.value})} />
                <input placeholder="Monto CLP" type="number" className="bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground font-mono" value={pago.monto} onChange={e => setPago({...pago, monto: e.target.value})} />
                <input placeholder="Receptor" className="bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground" value={pago.receptor} onChange={e => setPago({...pago, receptor: e.target.value})} />
                <select className="bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground" value={pago.tipo} onChange={e => setPago({...pago, tipo: e.target.value as any})}>
                  <option value="maestro">Maestro</option>
                  <option value="contratista">Contratista</option>
                  <option value="material">Material</option>
                </select>
                <input type="date" className="bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground" value={pago.fecha} onChange={e => setPago({...pago, fecha: e.target.value})} />
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowPagoForm(false)}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => {
                    if (pago.descripcion && pago.monto && pago.receptor) {
                      onAddPago(partida.id, { ...pago, monto: parseFloat(pago.monto) });
                      setPago({ descripcion: "", monto: "", receptor: "", tipo: "maestro", fecha: new Date().toISOString().split("T")[0] });
                      setShowPagoForm(false);
                    }
                  }}>Guardar</Button>
                </div>
              </div>
            )}

            {partida.pagos.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Sin pagos registrados</p>
            ) : (
              <div className="space-y-1.5">
                {partida.pagos.map(p => (
                  <div key={p.id} className="flex items-center gap-3 text-xs bg-background rounded-md px-3 py-2 border border-border">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-foreground">{p.descripcion}</span>
                    <span className="text-muted-foreground">{p.receptor}</span>
                    <Badge variant="outline" className="text-xs capitalize">{p.tipo}</Badge>
                    <span className="font-mono text-primary">{formatCLP(p.monto)}</span>
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{p.fecha}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <span className="text-xs text-muted-foreground">Total pagado: </span>
                  <span className="text-xs font-mono font-semibold text-primary ml-2">
                    {formatCLP(partida.pagos.reduce((s, p) => s + p.monto, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal: ControlObra ────────────────────────────────────────

export function ControlObra({ items, projectName }: { items: any[]; projectName: string }) {
  const [partidas, setPartidas] = useState<PartidaControl[]>(() => mockPartidas(items));

  const totalPresupuestado = partidas.reduce((s, p) => s + p.presupuestado, 0);
  const totalEjecutado = partidas.reduce((s, p) => s + p.ejecutado, 0);
  const avancePromedio = partidas.length > 0
    ? Math.round(partidas.reduce((s, p) => s + p.avancePct, 0) / partidas.length)
    : 0;
  const alertas = partidas.filter(p => alertLevel(p.ejecutado / (p.presupuestado || 1) * 100, p.avancePct) !== "ok");
  const totalPagado = partidas.reduce((s, p) => s + p.pagos.reduce((sp, pg) => sp + pg.monto, 0), 0);

  const handleUpdateAvance = (id: number, pct: number) => {
    setPartidas(prev => prev.map(p => p.id === id ? { ...p, avancePct: pct } : p));
  };

  const handleAddPago = (id: number, pago: Omit<Pago, "id">) => {
    setPartidas(prev => prev.map(p =>
      p.id === id ? { ...p, pagos: [...p.pagos, { ...pago, id: Date.now() }] } : p
    ));
  };

  const handleAddFoto = (id: number) => {
    // En producción: abrir file picker y subir a storage
    alert("Función de carga de fotos — conectar a storage en producción");
  };

  return (
    <div className="space-y-6">

      {/* KPIs superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avance General</p>
            <p className="text-2xl font-bold text-primary">{avancePromedio}%</p>
            <Progress value={avancePromedio} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ejecutado</p>
            <p className="text-xl font-bold text-foreground font-mono">{formatCLP(totalEjecutado)}</p>
            <p className="text-xs text-muted-foreground">de {formatCLP(totalPresupuestado)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pagado a Fecha</p>
            <p className="text-xl font-bold text-foreground font-mono">{formatCLP(totalPagado)}</p>
            <p className="text-xs text-muted-foreground">{partidas.reduce((s,p) => s + p.pagos.length, 0)} transacciones</p>
          </CardContent>
        </Card>
        <Card className={`border ${alertas.length > 0 ? "border-red-500/40 bg-red-500/5" : "border-border bg-card"}`}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Alertas</p>
            <p className={`text-2xl font-bold ${alertas.length > 0 ? "text-red-400" : "text-green-400"}`}>{alertas.length}</p>
            <p className="text-xs text-muted-foreground">partidas con desviación</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas activas */}
      {alertas.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Partidas con desviación de costo</span>
          </div>
          <div className="space-y-1">
            {alertas.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate flex-1">{p.descripcion}</span>
                <span className="text-red-400 font-mono ml-4">
                  +{desviacion(p.presupuestado, p.ejecutado).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de partidas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Partidas — Control de Avance y Pagos</h3>
          <span className="text-xs text-muted-foreground">{partidas.length} partidas</span>
        </div>
        {partidas.map(p => (
          <PartidaRow
            key={p.id}
            partida={p}
            onUpdateAvance={handleUpdateAvance}
            onAddPago={handleAddPago}
            onAddFoto={handleAddFoto}
          />
        ))}
      </div>

    </div>
  );
}
