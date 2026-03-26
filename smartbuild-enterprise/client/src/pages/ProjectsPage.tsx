import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { Plus, FolderOpen, HardHat, Box, X, Search, Loader } from "lucide-react";

// ── Mercado Público lookup ────────────────────────────────────────────────────
async function buscarLicitacion(codigo: string) {
  // API pública Mercado Público Chile
  const url = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${encodeURIComponent(codigo)}&ticket=${import.meta.env.VITE_MERCADO_PUBLICO_TICKET ?? 'anon'}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo conectar con Mercado Público')
  const data = await res.json()
  if (!data.Listado?.length) throw new Error('Licitación no encontrada')
  const l = data.Listado[0]
  return {
    nombre:       l.Nombre ?? '',
    cliente:      l.Unidad?.Nombre ?? l.Comprador?.NombreOrganismo ?? '',
    ubicacion:    l.Unidad?.Region ?? '',
    descripcion:  l.Descripcion ?? '',
    presupuesto:  l.MontoEstimado ? String(Math.round(l.MontoEstimado / 30000)) : '', // CLP → UF aprox
    tipo_obra:    l.Tipo ?? '',
    fecha_inicio: l.FechaInicio?.split('T')[0] ?? '',
    fecha_cierre: l.FechaCierre?.split('T')[0] ?? '',
  }
}

// ── Modal nuevo proyecto ──────────────────────────────────────────────────────
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [codigoLicitacion, setCodigoLicitacion] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorLicitacion, setErrorLicitacion] = useState('')
  const [licitacionCargada, setLicitacionCargada] = useState(false)
  const [form, setForm] = useState({
    name: '', client: '', location: '', description: '',
    totalBudget: '', codigo_licitacion: '', tipo_obra: '',
  })

  async function handleBuscarLicitacion() {
    if (!codigoLicitacion.trim()) return
    setBuscando(true)
    setErrorLicitacion('')
    try {
      const datos = await buscarLicitacion(codigoLicitacion.trim())
      setForm(f => ({
        ...f,
        name:              datos.nombre,
        client:            datos.cliente,
        location:          datos.ubicacion,
        description:       datos.descripcion,
        totalBudget:       datos.presupuesto,
        codigo_licitacion: codigoLicitacion.trim(),
        tipo_obra:         datos.tipo_obra,
      }))
      setLicitacionCargada(true)
    } catch (err: any) {
      setErrorLicitacion(err.message)
    } finally {
      setBuscando(false)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest('POST', '/projects', {
      ...data,
      totalBudget: data.totalBudget || '0',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onClose() },
  })

  const inputClass = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-4 py-2.5 text-sm rounded-sm outline-none focus:border-[#C17F3A] transition-colors"
  const labelClass = "block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1.5"

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.3)] w-full max-w-md rounded-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(193,127,58,0.12)] sticky top-0 bg-[#1C2B3A] z-10">
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Nuevo Proyecto</div>
          <button onClick={onClose} className="text-[#6A7A8A] hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Lookup Mercado Público */}
          <div className="bg-[rgba(193,127,58,0.06)] border border-[rgba(193,127,58,0.2)] rounded-sm p-4">
            <div className="text-[9px] font-mono text-[#C17F3A] uppercase tracking-widest mb-3">
              Importar desde Mercado Público
            </div>
            <div className="flex gap-2">
              <input
                value={codigoLicitacion}
                onChange={e => { setCodigoLicitacion(e.target.value); setLicitacionCargada(false); setErrorLicitacion('') }}
                onKeyDown={e => e.key === 'Enter' && handleBuscarLicitacion()}
                placeholder="Ej: 1057-21-LE24"
                className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A] transition-colors font-mono"
              />
              <button
                onClick={handleBuscarLicitacion}
                disabled={buscando || !codigoLicitacion.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-sm rounded-sm transition-colors disabled:opacity-50"
              >
                {buscando
                  ? <Loader size={14} className="animate-spin" />
                  : <Search size={14} />}
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {errorLicitacion && (
              <div className="mt-2 text-xs text-red-400 font-mono">{errorLicitacion}</div>
            )}
            {licitacionCargada && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#1D9E75] font-mono">
                <span>✓</span>
                <span>Datos importados de Mercado Público · {codigoLicitacion}</span>
              </div>
            )}
            <div className="mt-2 text-[10px] text-[#4A5A6A] font-mono">
              Ingresa el código de licitación para pre-llenar el formulario automáticamente.
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(193,127,58,0.1)]" />
            <span className="text-[9px] font-mono text-[#4A5A6A] uppercase tracking-widest">o ingresa manualmente</span>
            <div className="flex-1 h-px bg-[rgba(193,127,58,0.1)]" />
          </div>

          {/* Campos del formulario */}
          {[
            { key: 'name',        label: 'Nombre del proyecto *', placeholder: 'Ej: Pavimentación Av. Los Libertadores' },
            { key: 'client',      label: 'Municipio / Cliente',   placeholder: 'Ej: Municipalidad de Calama' },
            { key: 'location',    label: 'Ubicación',             placeholder: 'Ej: Calama, Antofagasta' },
            { key: 'totalBudget', label: 'Presupuesto (UF)',      placeholder: 'Ej: 420000', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                type={type ?? 'text'}
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}

          {/* Tipo de obra */}
          <div>
            <label className={labelClass}>Tipo de obra</label>
            <select
              value={form.tipo_obra}
              onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))}
              className={inputClass + ' cursor-pointer'}
            >
              <option value="">Seleccionar tipo...</option>
              {['Vialidad', 'Edificación', 'Sanitaria', 'Espacios públicos', 'Movilidad'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Código licitación (readonly si fue importado) */}
          <div>
            <label className={labelClass}>Código licitación {licitacionCargada && <span className="text-[#1D9E75]">· importado</span>}</label>
            <input
              type="text"
              placeholder="Ej: 1057-21-LE24"
              value={form.codigo_licitacion}
              onChange={e => setForm(f => ({ ...f, codigo_licitacion: e.target.value }))}
              className={inputClass + (licitacionCargada ? ' opacity-70' : '')}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              placeholder="Descripción del proyecto..."
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-[#1C2B3A] pt-2 border-t border-[rgba(193,127,58,0.08)]">
          <button
            onClick={onClose}
            className="flex-1 border border-[rgba(193,127,58,0.2)] text-[#6A7A8A] hover:text-white py-2.5 text-sm rounded-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || mutation.isPending}
            className="flex-1 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold py-2.5 text-sm rounded-sm transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Creando...' : 'Crear Proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [showNew, setShowNew] = useState(false)
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiRequest('GET', '/projects'),
  })

  const statusColor: Record<string, string> = {
    activo:     'text-[#2ECC71] bg-[rgba(46,204,113,0.1)] border-[rgba(46,204,113,0.25)]',
    pausado:    'text-[#E8A855] bg-[rgba(193,127,58,0.1)] border-[rgba(193,127,58,0.3)]',
    completado: 'text-[#6A7A8A] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Gestión</div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue',sans-serif" }}>Proyectos</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold px-5 py-2.5 text-sm rounded-sm transition-colors"
        >
          <Plus size={16} /> Nuevo Proyecto
        </button>
      </div>

      {isLoading ? (
        <div className="text-[#6A7A8A] font-mono text-sm animate-pulse">Cargando proyectos...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[rgba(193,127,58,0.2)] rounded-sm">
          <FolderOpen size={40} className="text-[#3A4A5A] mx-auto mb-4" />
          <p className="text-[#6A7A8A]">Sin proyectos. Crea el primero.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 text-sm text-[#C17F3A] hover:underline">+ Nuevo proyecto</button>
        </div>
      ) : (
        <div className="grid gap-2">
          {projects.map((p: any) => {
            const budget = parseFloat(p.totalBudget ?? 0)
            const exec   = parseFloat(p.totalExecuted ?? 0)
            const dev    = budget > 0 ? ((exec - budget) / budget * 100) : 0
            return (
              <div key={p.id} className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.1)] p-5 hover:border-[rgba(193,127,58,0.3)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm ${statusColor[p.status] ?? statusColor.activo}`}>
                        {p.status}
                      </span>
                      {p.codigo_licitacion && (
                        <span className="text-[9px] font-mono text-[#C17F3A] bg-[rgba(193,127,58,0.08)] border border-[rgba(193,127,58,0.2)] px-2 py-0.5 rounded-sm">
                          {p.codigo_licitacion}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6A7A8A]">
                      {p.client ?? 'Sin cliente'}{p.location ? ` · ${p.location}` : ''}
                      {p.tipo_obra ? ` · ${p.tipo_obra}` : ''}
                    </div>
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <span className="text-xs font-mono text-[#E8A855]">Presupuesto: UF {budget.toLocaleString('es-CL')}</span>
                      {exec > 0 && (
                        <span className={`text-xs font-mono ${dev > 5 ? 'text-red-400' : 'text-[#6A7A8A]'}`}>
                          Ejecutado: UF {exec.toLocaleString('es-CL')} {dev > 0 ? `(+${dev.toFixed(1)}%)` : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 max-w-[200px] h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C17F3A] rounded-full transition-all" style={{ width: `${p.globalProgress ?? 0}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[#6A7A8A]">{p.globalProgress ?? 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/projects/${p.id}`}>
                      <a className="flex items-center gap-1.5 text-xs text-[#6A7A8A] hover:text-[#E8A855] border border-[rgba(193,127,58,0.15)] hover:border-[rgba(193,127,58,0.4)] px-3 py-2 rounded-sm transition-colors">
                        <FolderOpen size={13} /> Presupuesto
                      </a>
                    </Link>
                    <Link href={`/projects/${p.id}/obra`}>
                      <a className="flex items-center gap-1.5 text-xs text-[#6A7A8A] hover:text-[#E8A855] border border-[rgba(193,127,58,0.15)] hover:border-[rgba(193,127,58,0.4)] px-3 py-2 rounded-sm transition-colors">
                        <HardHat size={13} /> Obra
                      </a>
                    </Link>
                    <Link href={`/projects/${p.id}/bim`}>
                      <a className="flex items-center gap-1.5 text-xs text-[#6A7A8A] hover:text-[#E8A855] border border-[rgba(193,127,58,0.15)] hover:border-[rgba(193,127,58,0.4)] px-3 py-2 rounded-sm transition-colors">
                        <Box size={13} /> BIM
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
