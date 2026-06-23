import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/ui/empty-state'
import { History, ChevronDown, ChevronUp, CheckCircle2, Clock, RotateCcw, Hourglass } from 'lucide-react'

type EstadoSeleccion = 'PENDIENTE' | 'CONFIRMADO' | 'REVERTIDO'
type Franja = 'ALMUERZO' | 'CENA'
type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface Ajuste {
  id: number
  alimento: { id: number; nombre: string }
  cantidad_calculada: number
  cantidad_real: number
  unidad: string
}

interface Seleccion {
  id: number
  personas: number
  nota: string | null
  estado: EstadoSeleccion
  created_at: string
  rollback_deadline: string
  menu: {
    id: number
    nombre: string
    dificultad: Dificultad
    tiempo_min: number
    imagen_url: string | null
  }
  turno: {
    id: number
    tipo: string
    fecha: string | null
    dia_semana: number | null
    franja: Franja
    grupo: { id: number; nombre: string }
  }
  ajustes: Ajuste[]
}

const ESTADO_CONFIG: Record<EstadoSeleccion, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  CONFIRMADO: { label: 'Confirmado', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700', icon: Hourglass },
  REVERTIDO: { label: 'Revertido', className: 'bg-gray-100 text-gray-500', icon: RotateCcw },
}

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  FACIL: 'Fácil',
  MEDIO: 'Medio',
  DIFICIL: 'Difícil',
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatFecha(seleccion: Seleccion['turno']): string {
  if (seleccion.tipo === 'ROTATIVO' && seleccion.fecha) {
    return new Date(seleccion.fecha).toLocaleDateString('es-AR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }
  if (seleccion.tipo === 'FIJO' && seleccion.dia_semana != null) {
    return `Todos los ${DIAS[seleccion.dia_semana]}`
  }
  return '—'
}

function formatCantidad(cantidad: number, unidad: string): string {
  return `${cantidad} ${unidad.toLowerCase() === 'unidades' ? 'u.' : unidad.toLowerCase()}`
}

export default function ResidenteHistorialPage() {
  const [selecciones, setSelecciones] = useState<Seleccion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoSeleccion | ''>('')

  useEffect(() => {
    api.get<Seleccion[]>('/me/selecciones')
      .then(setSelecciones)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visibles = filtroEstado
    ? selecciones.filter(s => s.estado === filtroEstado)
    : selecciones

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi historial de cocina</h1>
          <p className="text-sm text-gray-400 mt-0.5">{selecciones.length} cocción{selecciones.length !== 1 ? 'es' : ''} registrada{selecciones.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {(['', 'CONFIRMADO', 'PENDIENTE', 'REVERTIDO'] as const).map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroEstado === estado
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {estado === '' ? 'Todas' : ESTADO_CONFIG[estado].label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin cocciones"
          description={filtroEstado ? 'No hay cocciones con ese estado.' : 'Todavía no registraste ninguna cocción.'}
        />
      ) : (
        <div className="space-y-3">
          {visibles.map(sel => {
            const abierto = expanded === sel.id
            const { label, className, icon: IconEstado } = ESTADO_CONFIG[sel.estado]
            const tieneAjustes = sel.ajustes.length > 0
            const ajustesModificados = sel.ajustes.filter(
              a => Math.abs(a.cantidad_real - a.cantidad_calculada) > 0.001
            )

            return (
              <div
                key={sel.id}
                className={`bg-white border rounded-xl overflow-hidden ${sel.estado === 'REVERTIDO' ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}
              >
                <button className="w-full text-left" onClick={() => setExpanded(abierto ? null : sel.id)}>
                  <div className="flex items-center gap-4 p-4">
                    {sel.menu.imagen_url ? (
                      <img
                        src={sel.menu.imagen_url}
                        alt={sel.menu.nombre}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                        <History size={22} className="text-purple-300" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{sel.menu.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFecha(sel.turno)} · {sel.turno.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'} · {sel.turno.grupo.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFICULTAD_COLOR[sel.menu.dificultad]}`}>
                          {DIFICULTAD_LABEL[sel.menu.dificultad]}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {sel.menu.tiempo_min} min
                        </span>
                        <span className="text-xs text-gray-400">{sel.personas} persona{sel.personas !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${className}`}>
                        <IconEstado size={11} />
                        {label}
                      </span>
                      {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {sel.nota && (
                      <p className="text-sm text-gray-600 italic">"{sel.nota}"</p>
                    )}

                    {tieneAjustes ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Ingredientes utilizados
                          {ajustesModificados.length > 0 && (
                            <span className="ml-2 text-orange-500 normal-case font-normal">
                              · {ajustesModificados.length} con cambio{ajustesModificados.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        <div className="space-y-1.5">
                          {sel.ajustes.map(ajuste => {
                            const modificado = Math.abs(ajuste.cantidad_real - ajuste.cantidad_calculada) > 0.001
                            const esExtra = ajuste.cantidad_calculada === 0

                            return (
                              <div
                                key={ajuste.id}
                                className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                                  esExtra
                                    ? 'bg-blue-50 border-blue-100'
                                    : modificado
                                    ? 'bg-orange-50 border-orange-100'
                                    : 'bg-white border-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm text-gray-700 truncate">{ajuste.alimento.nombre}</span>
                                  {esExtra && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-medium">extra</span>
                                  )}
                                </div>

                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatCantidad(ajuste.cantidad_real, ajuste.unidad)}
                                  </p>
                                  {modificado && !esExtra && (
                                    <p className="text-xs text-gray-400">
                                      receta: {formatCantidad(ajuste.cantidad_calculada, ajuste.unidad)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Sin ingredientes registrados.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
