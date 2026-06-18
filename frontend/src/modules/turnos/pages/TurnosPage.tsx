import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { ChevronLeft, ChevronRight, Users, CalendarDays, UtensilsCrossed, Clock, ExternalLink, BookOpen, History } from 'lucide-react'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const GRUPO_COLORS = [
  { bg: 'bg-violet-100', border: 'border-violet-200', text: 'text-violet-800', dot: 'bg-violet-400', header: 'bg-violet-50', badge: 'bg-violet-500' },
  { bg: 'bg-sky-100', border: 'border-sky-200', text: 'text-sky-800', dot: 'bg-sky-400', header: 'bg-sky-50', badge: 'bg-sky-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-400', header: 'bg-emerald-50', badge: 'bg-emerald-500' },
  { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-400', header: 'bg-amber-50', badge: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-rose-200', text: 'text-rose-800', dot: 'bg-rose-400', header: 'bg-rose-50', badge: 'bg-rose-500' },
  { bg: 'bg-teal-100', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-400', header: 'bg-teal-50', badge: 'bg-teal-500' },
]

interface Grupo { id: number; nombre: string }
interface GrupoConIntegrantes extends Grupo {
  integrantes: { id: number; residente: { id: number; nombre: string; apellido: string } }[]
  menus: { menu_id: number; menu: { nombre: string; dificultad: string; tiempo_min: number } }[]
}
interface Turno {
  id: number
  tipo: 'FIJO' | 'ROTATIVO'
  dia_semana: number | null
  fecha: string | null
  franja: 'ALMUERZO' | 'CENA'
  activo: boolean
  grupo: { id: number; nombre: string }
}
interface Seleccion {
  id: number
  personas: number
  created_at: string
  menu: { nombre: string }
  residente: { nombre: string; apellido: string }
  turno: {
    id: number
    franja: 'ALMUERZO' | 'CENA'
    fecha: string | null
    dia_semana: number | null
    tipo: string
    grupo: { id: number; nombre: string }
  }
}

function getLunes(ref: Date): Date {
  const d = new Date(ref)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatFecha(d: Date) {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function formatFechaLarga(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function iniciales(nombre: string, apellido: string) {
  return `${nombre[0]}${apellido[0]}`.toUpperCase()
}

// ─── Tooltip de chip ────────────────────────────────────────────────
interface ChipTooltipProps {
  turno: Turno
  dia: Date
  grupo: GrupoConIntegrantes
  selecciones: Seleccion[]
  color: typeof GRUPO_COLORS[0]
}

function ChipTooltip({ turno, dia, grupo, selecciones, color }: ChipTooltipProps) {
  const pasado = dia < new Date(new Date().setHours(0, 0, 0, 0))

  // Cocciones de este grupo, esta franja, este día
  const cocciones = pasado ? selecciones.filter(s => {
    if (s.turno.grupo.id !== turno.grupo.id) return false
    if (s.turno.franja !== turno.franja) return false
    if (turno.tipo === 'ROTATIVO' && turno.fecha) {
      return s.turno.fecha ? isSameDay(new Date(s.turno.fecha), dia) : false
    }
    // FIJO: coincide si el día de semana es el mismo (aproximación por dia visible)
    return s.turno.dia_semana === dia.getDay()
  }) : []

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className={`px-3 py-2.5 ${color.badge} flex items-center gap-2`}>
          <UtensilsCrossed size={12} className="text-white/80 shrink-0" />
          <span className="font-bold truncate">{grupo.nombre}</span>
          <span className="ml-auto text-white/70 shrink-0">
            {turno.franja === 'ALMUERZO' ? '☀️' : '🌙'}
          </span>
        </div>

        <div className="px-3 py-2.5 space-y-3">
          {/* Integrantes */}
          {grupo.integrantes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Users size={9} /> {grupo.integrantes.length} integrante{grupo.integrantes.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1">
                {grupo.integrantes.map(i => (
                  <span key={i.id} className="bg-white/10 rounded-full px-1.5 py-0.5 text-[10px] text-white/80">
                    {iniciales(i.residente.nombre, i.residente.apellido)} {i.residente.apellido}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Menús asignados */}
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <BookOpen size={9} /> Menús del grupo
            </p>
            {grupo.menus.length === 0 ? (
              <p className="text-white/40 italic text-[10px]">Sin menús asignados</p>
            ) : (
              <ul className="space-y-1">
                {grupo.menus.map(m => (
                  <li key={m.menu_id} className="flex items-center justify-between gap-2">
                    <span className="text-white/80 truncate">{m.menu.nombre}</span>
                    <span className="text-white/40 shrink-0">{m.menu.tiempo_min}min</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Historial — solo si el día ya pasó */}
          {pasado && (
            <div className="border-t border-white/10 pt-2.5">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <History size={9} /> Lo que cocinaron
              </p>
              {cocciones.length === 0 ? (
                <p className="text-white/40 italic text-[10px]">Sin registros de cocción</p>
              ) : (
                <ul className="space-y-1.5">
                  {cocciones.map(c => (
                    <li key={c.id} className="bg-white/5 rounded-lg px-2 py-1.5">
                      <p className="text-white/90 font-medium truncate">{c.menu.nombre}</p>
                      <p className="text-white/40 text-[10px] mt-0.5">
                        {c.personas} persona{c.personas !== 1 ? 's' : ''} · {c.residente.apellido}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

// ─── Página principal ───────────────────────────────────────────────
export default function TurnosPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [grupos, setGrupos] = useState<GrupoConIntegrantes[]>([])
  const [selecciones, setSelecciones] = useState<Seleccion[]>([])
  const [loading, setLoading] = useState(true)
  const [semana, setSemana] = useState(() => getLunes(new Date()))

  const grupoColorMap = useMemo(() => {
    const map = new Map<number, number>()
    grupos.forEach((g, i) => map.set(g.id, i % GRUPO_COLORS.length))
    return map
  }, [grupos])

  function getColor(grupoId: number) {
    return GRUPO_COLORS[grupoColorMap.get(grupoId) ?? 0]
  }

  function load() {
    if (!residenciaId) return
    setLoading(true)
    Promise.all([
      api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
      api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`),
      api.get<{ selecciones: Seleccion[] }>(`/residencias/${residenciaId}/historial`),
    ]).then(async ([t, g, h]) => {
      setTurnos(t)
      setSelecciones(h.selecciones)
      const enriquecidos = await Promise.all(
        g.map(async grupo => {
          const [integrantes, menus] = await Promise.all([
            api.get<GrupoConIntegrantes['integrantes']>(`/grupos/${grupo.id}/integrantes`),
            api.get<GrupoConIntegrantes['menus']>(`/grupos/${grupo.id}/menus`),
          ])
          return { ...grupo, integrantes, menus }
        })
      )
      setGrupos(enriquecidos)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semana, i))

  function turnosEnCelda(dia: Date, franja: 'ALMUERZO' | 'CENA'): Turno[] {
    const diaSemana = dia.getDay()
    return turnos.filter(t => {
      if (t.franja !== franja) return false
      if (t.tipo === 'FIJO') return t.dia_semana === diaSemana
      if (t.tipo === 'ROTATIVO' && t.fecha) return isSameDay(new Date(t.fecha), dia)
      return false
    })
  }

  function turnosSemanaGrupo(grupoId: number): Turno[] {
    return turnos.filter(t => {
      if (t.grupo.id !== grupoId) return false
      if (t.tipo === 'FIJO') return true
      if (t.tipo === 'ROTATIVO' && t.fecha) {
        return diasSemana.some(d => isSameDay(d, new Date(t.fecha!)))
      }
      return false
    })
  }

  function diaLabel(t: Turno): string {
    if (t.tipo === 'FIJO' && t.dia_semana !== null) return DIAS[t.dia_semana]
    if (t.tipo === 'ROTATIVO' && t.fecha) return formatFechaLarga(new Date(t.fecha))
    return '—'
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Turnos de Cocina</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Turnos de Cocina</h1>
        <p className="text-sm text-gray-400 mt-0.5">{grupos.length} grupos · {turnos.length} turnos activos</p>
      </div>

      {/* Navegación de semana */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSemana(d => addDays(d, -7))} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-700 min-w-48 text-center">
          {formatFecha(semana)} — {formatFecha(addDays(semana, 6))}
        </span>
        <button onClick={() => setSemana(d => addDays(d, 7))} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => setSemana(getLunes(new Date()))}
          className="text-xs text-purple-600 hover:text-purple-800 font-semibold ml-1 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
        >
          Hoy
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <>
          {/* Calendario semanal */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{ overflow: 'visible' }}>
            {/* Cabecera de días */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 rounded-t-xl" style={{ overflow: 'hidden' }}>
              <div className="px-3 py-3 text-xs font-medium text-gray-400 border-r border-gray-200" />
              {diasSemana.map((dia, i) => {
                const esHoy = isSameDay(dia, new Date())
                return (
                  <div key={i} className={`px-2 py-3 text-center border-r border-gray-200 last:border-0 ${esHoy ? 'bg-purple-600' : ''}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${esHoy ? 'text-purple-100' : 'text-gray-400'}`}>
                      {DIAS_CORTO[dia.getDay()]}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 leading-none ${esHoy ? 'text-white' : 'text-gray-800'}`}>
                      {dia.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Filas por franja */}
            {(['ALMUERZO', 'CENA'] as const).map((franja, fi) => (
              <div key={franja} className={`grid grid-cols-8 ${fi === 0 ? 'border-b border-gray-200' : ''}`}>
                <div className="px-3 py-4 border-r border-gray-200 flex flex-col items-start justify-center gap-1 bg-gray-50">
                  <span className="text-lg">{franja === 'ALMUERZO' ? '☀️' : '🌙'}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}
                  </span>
                </div>

                {diasSemana.map((dia, i) => {
                  const celdaTurnos = turnosEnCelda(dia, franja)
                  const esHoy = isSameDay(dia, new Date())
                  return (
                    <div key={i} className={`px-1.5 py-2 border-r border-gray-100 last:border-0 min-h-20 space-y-1 ${esHoy ? 'bg-purple-50/50' : ''}`}>
                      {celdaTurnos.map(t => {
                        const color = getColor(t.grupo.id)
                        const grupoData = grupos.find(g => g.id === t.grupo.id)
                        if (!grupoData) return null
                        return (
                          <div key={t.id} className="relative group/chip">
                            {/* Tooltip */}
                            <div className="hidden group-hover/chip:block">
                              <ChipTooltip
                                turno={t}
                                dia={dia}
                                grupo={grupoData}
                                selecciones={selecciones}
                                color={color}
                              />
                            </div>

                            {/* Chip */}
                            <div className={`rounded-lg px-2 py-1.5 text-xs border cursor-default ${color.bg} ${color.border} ${color.text} relative`}>
                              <button
                                onClick={() => navigate('/grupos', { state: { grupoId: t.grupo.id } })}
                                className="font-semibold truncate leading-tight text-left w-full flex items-center gap-1 hover:underline"
                              >
                                {t.grupo.nombre}
                                <ExternalLink size={8} className="opacity-0 group-hover/chip:opacity-50 shrink-0" />
                              </button>
                              {grupoData.integrantes.length > 0 && (
                                <p className="text-[10px] opacity-60 mt-0.5 leading-none">
                                  {grupoData.integrantes.length} integrante{grupoData.integrantes.length !== 1 ? 's' : ''}
                                </p>
                              )}
                              <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1 rounded text-white ${t.tipo === 'FIJO' ? 'bg-blue-400' : 'bg-orange-400'}`}>
                                {t.tipo === 'FIJO' ? 'F' : 'R'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded text-[9px] font-bold bg-blue-400 text-white flex items-center justify-center">F</span>
              Fijo — se repite cada semana
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded text-[9px] font-bold bg-orange-400 text-white flex items-center justify-center">R</span>
              Rotativo — fecha específica
            </span>
          </div>

          {/* Resumen de grupos */}
          {grupos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-purple-500" />
                Grupos de cocina
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {grupos.map(grupo => {
                  const color = getColor(grupo.id)
                  const turnosSemana = turnosSemanaGrupo(grupo.id)
                  return (
                    <div key={grupo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className={`px-4 py-3 ${color.header} border-b border-gray-100 flex items-center gap-3`}>
                        <div className={`w-8 h-8 rounded-lg ${color.badge} flex items-center justify-center shrink-0`}>
                          <UtensilsCrossed size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${color.text} truncate`}>{grupo.nombre}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users size={10} />
                            {grupo.integrantes.length} integrante{grupo.integrantes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/grupos', { state: { grupoId: grupo.id } })}
                          className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md ${color.bg} ${color.text} hover:opacity-80 transition-opacity border ${color.border}`}
                        >
                          <ExternalLink size={10} /> Ver
                        </button>
                      </div>

                      <div className="px-4 py-3 border-b border-gray-100">
                        {grupo.integrantes.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Sin integrantes asignados</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {grupo.integrantes.map(i => (
                              <span key={i.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} font-medium`}>
                                <span className={`w-4 h-4 rounded-full ${color.badge} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}>
                                  {iniciales(i.residente.nombre, i.residente.apellido)}
                                </span>
                                {i.residente.nombre} {i.residente.apellido}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <BookOpen size={10} /> Menús asignados
                        </p>
                        {grupo.menus.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Sin menús</p>
                        ) : (
                          <div className="space-y-1">
                            {grupo.menus.map(m => (
                              <div key={m.menu_id} className="flex items-center justify-between text-xs text-gray-600">
                                <span className="truncate">{m.menu.nombre}</span>
                                <span className="text-gray-400 shrink-0 ml-2">{m.menu.tiempo_min}min</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CalendarDays size={10} /> Turnos esta semana
                        </p>
                        {turnosSemana.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Sin turnos esta semana</p>
                        ) : (
                          <div className="space-y-1">
                            {turnosSemana.map(t => (
                              <div key={t.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Clock size={10} className="text-gray-400 shrink-0" />
                                  <span className="font-medium">{diaLabel(t)}</span>
                                  <span className="text-gray-400">·</span>
                                  <span className="text-gray-500">{t.franja === 'ALMUERZO' ? '☀️ Almuerzo' : '🌙 Cena'}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${t.tipo === 'FIJO' ? 'bg-blue-400' : 'bg-orange-400'}`}>
                                  {t.tipo === 'FIJO' ? 'FIJO' : 'ROT'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
