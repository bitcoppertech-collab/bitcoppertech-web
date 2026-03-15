import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  Pause,
  SkipBack,
  ZoomIn,
  ZoomOut,
  Info,
  Clock,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Fase {
  id: number;
  nombre: string;
  inicio: Date;
  fin: Date;
  color: string;
  partidas: PartidaBIM[];
  dependencias: number[]; // ids de fases que deben terminar antes
}

interface PartidaBIM {
  id: number;
  descripcion: string;
  avancePct: number;
  presupuestado: number;
}

type ViewMode = "semanas" | "meses";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFecha(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function formatMes(d: Date): string {
  return d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}

// ─── Generar fases desde items del presupuesto ────────────────────────────────

const COLORES = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#F97316", "#84CC16",
];

function generarFases(items: any[]): Fase[] {
  if (!items?.length) return [];

  // Agrupar por categoría (primeras palabras de descripción como heurística)
  const grupos: Record<string, any[]> = {};
  items.forEach(item => {
    const palabras = item.description?.split(" ") || ["General"];
    const key = palabras.slice(0, 2).join(" ");
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(item);
  });

  const hoy = new Date();
  hoy.setDate(1); // inicio del mes actual
  let cursor = new Date(hoy);

  return Object.entries(grupos).slice(0, 8).map(([nombre, partidas], i) => {
    const duracion = 14 + Math.floor(Math.random() * 30);
    const inicio = new Date(cursor);
    const fin = addDays(inicio, duracion);
    // Solapamiento del 30% entre fases
    cursor = addDays(cursor, Math.round(duracion * 0.7));

    return {
      id: i + 1,
      nombre,
      inicio,
      fin,
      color: COLORES[i % COLORES.length],
      dependencias: i > 0 ? [i] : [],
      partidas: partidas.map(p => ({
        id: p.id,
        descripcion: p.description,
        avancePct: Math.round(Math.random() * 80),
        presupuestado: parseFloat(p.totalPrice || "0"),
      })),
    };
  });
}

// ─── Barra de Gantt ───────────────────────────────────────────────────────────

function BarraGantt({
  fase,
  inicioVista,
  diasVista,
  totalWidth,
  fechaHoy,
  avancePct,
  onClick,
  selected,
}: {
  fase: Fase;
  inicioVista: Date;
  diasVista: number;
  totalWidth: number;
  fechaHoy: Date;
  avancePct: number;
  onClick: () => void;
  selected: boolean;
}) {
  const startDay = Math.max(0, diffDays(inicioVista, fase.inicio));
  const endDay = Math.min(diasVista, diffDays(inicioVista, fase.fin));
  const duracion = endDay - startDay;

  if (duracion <= 0) return null;

  const left = (startDay / diasVista) * totalWidth;
  const width = (duracion / diasVista) * totalWidth;

  // Línea de avance físico
  const avanceWidth = (avancePct / 100) * width;

  return (
    <div
      className="absolute top-1 bottom-1 rounded-md cursor-pointer transition-all overflow-hidden group"
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 4)}px`,
        backgroundColor: fase.color + "33",
        border: `2px solid ${fase.color}`,
        outline: selected ? `2px solid white` : "none",
        outlineOffset: "2px",
      }}
      onClick={onClick}
    >
      {/* Barra de avance */}
      <div
        className="absolute top-0 left-0 bottom-0 rounded-sm transition-all"
        style={{ width: `${avancePct}%`, backgroundColor: fase.color + "66" }}
      />
      {/* Label */}
      {width > 60 && (
        <span
          className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
          style={{ color: fase.color }}
        >
          {avancePct}%
        </span>
      )}
      {/* Tooltip en hover */}
      <div className="absolute top-full left-0 z-20 hidden group-hover:block bg-popover border border-border rounded-md p-2 text-xs shadow-xl min-w-[160px] mt-1">
        <p className="font-semibold text-foreground mb-1">{fase.nombre}</p>
        <p className="text-muted-foreground">Inicio: {formatFecha(fase.inicio)}</p>
        <p className="text-muted-foreground">Fin: {formatFecha(fase.fin)}</p>
        <p className="text-muted-foreground">Avance: {avancePct}%</p>
      </div>
    </div>
  );
}

// ─── Componente principal: BIM4D ──────────────────────────────────────────────

export function BIM4D({ items, projectName }: { items: any[]; projectName: string }) {
  const [fases] = useState<Fase[]>(() => generarFases(items));
  const [selectedFase, setSelectedFase] = useState<Fase | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("semanas");
  const [offsetDias, setOffsetDias] = useState(0);
  const [simDay, setSimDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  const diasVista = viewMode === "semanas" ? 56 : 120; // 8 semanas o 4 meses
  const BAR_WIDTH = 800;

  const fechaHoy = useMemo(() => new Date(), []);

  const inicioVista = useMemo(() => {
    const d = new Date(fechaHoy);
    d.setDate(d.getDate() + offsetDias);
    return d;
  }, [fechaHoy, offsetDias]);

  const finVista = useMemo(() => addDays(inicioVista, diasVista), [inicioVista, diasVista]);

  // Cabecera de fechas
  const ticksFechas = useMemo(() => {
    const ticks: { label: string; x: number }[] = [];
    const paso = viewMode === "semanas" ? 7 : 30;
    let d = new Date(inicioVista);
    while (d <= finVista) {
      const x = (diffDays(inicioVista, d) / diasVista) * BAR_WIDTH;
      ticks.push({ label: viewMode === "semanas" ? formatFecha(d) : formatMes(d), x });
      d = addDays(d, paso);
    }
    return ticks;
  }, [inicioVista, finVista, viewMode, diasVista]);

  // Posición de hoy + simulación
  const xHoy = useMemo(() => {
    const d = diffDays(inicioVista, fechaHoy);
    return (d / diasVista) * BAR_WIDTH;
  }, [inicioVista, fechaHoy, diasVista]);

  const xSim = useMemo(() => {
    const d = diffDays(inicioVista, addDays(fechaHoy, simDay));
    return (d / diasVista) * BAR_WIDTH;
  }, [inicioVista, fechaHoy, simDay, diasVista]);

  // Avance por fase según simulación
  const avanceFase = (fase: Fase): number => {
    const simFecha = addDays(fechaHoy, simDay);
    const total = diffDays(fase.inicio, fase.fin);
    if (total <= 0) return 0;
    const transcurrido = diffDays(fase.inicio, simFecha);
    return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)));
  };

  // Stats generales
  const fasesActivas = fases.filter(f => {
    const sim = addDays(fechaHoy, simDay);
    return f.inicio <= sim && f.fin >= sim;
  });
  const fasesTerminadas = fases.filter(f => f.fin < addDays(fechaHoy, simDay));
  const avanceGeneral = fases.length > 0
    ? Math.round(fases.reduce((s, f) => s + avanceFase(f), 0) / fases.length)
    : 0;

  // Animación simulación
  const maxSimDays = useMemo(() => {
    if (!fases.length) return 0;
    const maxFin = fases.reduce((m, f) => f.fin > m ? f.fin : m, fases[0].fin);
    return diffDays(fechaHoy, maxFin) + 7;
  }, [fases, fechaHoy]);

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avance 4D</p>
            <p className="text-2xl font-bold text-primary">{avanceGeneral}%</p>
            <Progress value={avanceGeneral} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fases Activas</p>
            <p className="text-2xl font-bold text-amber-400">{fasesActivas.length}</p>
            <p className="text-xs text-muted-foreground">de {fases.length} total</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-400">{fasesTerminadas.length}</p>
            <p className="text-xs text-muted-foreground">fases finalizadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Simulando</p>
            <p className="text-sm font-bold text-foreground">{formatFecha(addDays(fechaHoy, simDay))}</p>
            <p className="text-xs text-muted-foreground">{simDay >= 0 ? `+${simDay}` : simDay} días</p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Navegación */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOffsetDias(o => o - diasVista)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOffsetDias(0)}>
            Hoy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOffsetDias(o => o + diasVista)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Vista */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button size="sm" variant={viewMode === "semanas" ? "secondary" : "ghost"} className="h-7 px-3 text-xs" onClick={() => setViewMode("semanas")}>
            Semanas
          </Button>
          <Button size="sm" variant={viewMode === "meses" ? "secondary" : "ghost"} className="h-7 px-3 text-xs" onClick={() => setViewMode("meses")}>
            Meses
          </Button>
        </div>

        {/* Simulación 4D */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Simulación 4D:</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSimDay(0)}>
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <input
            type="range"
            min={-30}
            max={maxSimDays}
            value={simDay}
            onChange={e => setSimDay(parseInt(e.target.value))}
            className="w-32 accent-primary"
          />
          <span className="text-xs font-mono text-foreground w-20">{formatFecha(addDays(fechaHoy, simDay))}</span>
        </div>
      </div>

      {/* Gantt 4D */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Timeline 4D — {projectName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${BAR_WIDTH + 200}px` }}>
              {/* Cabecera de fechas */}
              <div className="flex border-b border-border">
                <div className="w-48 shrink-0 px-3 py-2 text-xs text-muted-foreground border-r border-border">Fase</div>
                <div className="relative flex-1 h-8">
                  {ticksFechas.map((t, i) => (
                    <div key={i} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${t.x}px` }}>
                      <div className="h-2 w-px bg-border" />
                      <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filas de fases */}
              {fases.map(fase => (
                <div
                  key={fase.id}
                  className={`flex border-b border-border/50 hover:bg-muted/10 transition-colors ${selectedFase?.id === fase.id ? "bg-muted/20" : ""}`}
                >
                  {/* Label */}
                  <div
                    className="w-48 shrink-0 px-3 py-2 flex items-center gap-2 cursor-pointer border-r border-border"
                    onClick={() => setSelectedFase(selectedFase?.id === fase.id ? null : fase)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fase.color }} />
                    <span className="text-xs text-foreground truncate">{fase.nombre}</span>
                  </div>

                  {/* Barra */}
                  <div className="relative flex-1 h-10" style={{ width: `${BAR_WIDTH}px` }}>
                    {/* Grid lines */}
                    {ticksFechas.map((t, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${t.x}px` }} />
                    ))}

                    {/* Línea de hoy */}
                    {xHoy >= 0 && xHoy <= BAR_WIDTH && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400/60 z-10" style={{ left: `${xHoy}px` }}>
                        <div className="absolute -top-1 left-0.5 text-xs text-blue-400 whitespace-nowrap">hoy</div>
                      </div>
                    )}

                    {/* Línea de simulación */}
                    {xSim >= 0 && xSim <= BAR_WIDTH && xSim !== xHoy && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10" style={{ left: `${xSim}px` }}>
                        <div className="absolute top-1 left-0.5 text-xs text-amber-400 whitespace-nowrap">sim</div>
                      </div>
                    )}

                    <BarraGantt
                      fase={fase}
                      inicioVista={inicioVista}
                      diasVista={diasVista}
                      totalWidth={BAR_WIDTH}
                      fechaHoy={addDays(fechaHoy, simDay)}
                      avancePct={avanceFase(fase)}
                      onClick={() => setSelectedFase(selectedFase?.id === fase.id ? null : fase)}
                      selected={selectedFase?.id === fase.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-400" />Hoy</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-400" />Simulación</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/30 border border-primary" />Fase planificada</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/60" />Avance ejecutado</div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de fase seleccionada */}
      {selectedFase && (
        <Card className="bg-card border-border" style={{ borderLeftColor: selectedFase.color, borderLeftWidth: "4px" }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedFase.color }} />
              {selectedFase.nombre}
              <Badge variant="outline" className="ml-auto text-xs">
                {formatFecha(selectedFase.inicio)} → {formatFecha(selectedFase.fin)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-muted-foreground">Avance simulado:</span>
              <Progress value={avanceFase(selectedFase)} className="flex-1 h-2" />
              <span className="text-sm font-mono text-foreground">{avanceFase(selectedFase)}%</span>
            </div>
            <div className="space-y-1.5">
              {selectedFase.partidas.map(p => (
                <div key={p.id} className="flex items-center gap-3 text-xs">
                  {p.avancePct >= 100
                    ? <CheckSquare className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    : <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="flex-1 text-foreground truncate">{p.descripcion}</span>
                  <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.avancePct}%` }} />
                  </div>
                  <span className="text-muted-foreground w-8 text-right">{p.avancePct}%</span>
                </div>
              ))}
            </div>
            {selectedFase.dependencias.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Depende de: {selectedFase.dependencias.map(d => fases.find(f => f.id === d)?.nombre).filter(Boolean).join(", ")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
