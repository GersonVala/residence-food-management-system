import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ChefHat, Users, CalendarDays, UtensilsCrossed, Clock,
  CheckCircle2, BookOpen, AlertCircle, PartyPopper, ChevronRight
} from 'lucide-react'

type Franja = 'ALMUERZO' | 'CENA'
type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface ResidenteMe {
  id: number
  nombre: string
  apellido: string
  residencia: { id: number; nombre: string; ciudad: string; provincia: string }
}

interface GrupoInfo {
  grupo_id: number
  nombre: string
}

interface Integrante {
  id: number
  nombre: string
  apellido: string
}

interface MenuGrupo {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
}

interface Turno {
  id: number
  tipo: 'FIJO' | 'ROTATIVO'
  franja: Franja
  dia_semana: number | null
  fecha: string | null
  activo: boolean
  grupo: { id: number; nombre: string }
  selecciones: Seleccion[]
}

interface Menu {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
  imagen_url: string | null
}

interface Seleccion {
  id: number
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'REVERTIDO'
  personas: number
  menu: Menu
  residente: { id: number }
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

function getTurnoLabel(t: Turno): string {
  if (t.tipo === 'FIJO' && t.dia_semana !== null) return `${DIAS[t.dia_semana]} (fijo)`
  if (t.fecha) return new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
  return '—'
}

function isTurnoHoy(t: Turno): boolean {
  const hoy = new Date()
  if (t.tipo === 'FIJO') return t.dia_semana === hoy.getDay()
  if (t.fecha) return t.fecha.slice(0, 10) === hoy.toISOString().slice(0, 10)
  return false
}

export default function ResidenteHomePage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [residente, setResidente] = useState<ResidenteMe | null>(null)
  const [grupo, setGrupo] = useState<GrupoInfo | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [menusGrupo, setMenusGrupo] = useState<MenuGrupo[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [selMenuId, setSelMenuId] = useState<number | null>(null)
  const [selPersonas, setSelPersonas] = useState(4)
  const [selTurnoId, setSelTurnoId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!residenciaId) return
    Promise.all([
      api.get<ResidenteMe>('/residentes/me'),
      api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
      api.get<Menu[]>(`/residencias/${residenciaId}/menus`),
    ]).then(([me, ts, ms]) => {
      setResidente(me)
      setTurnos(ts)
      setMenus(ms)
      return api.get<GrupoInfo | null>(`/residentes/${me.id}/grupo`)
    }).then(g => {
      setGrupo(g)
      if (g) {
        return Promise.all([
          api.get<Integrante[]>(`/grupos/${g.grupo_id}/integrantes`),
          api.get<MenuGrupo[]>(`/grupos/${g.grupo_id}/menus`),
        ]).then(([ints, mgs]) => {
          setIntegrantes(ints)
          setMenusGrupo(mgs)
        })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [residenciaId])

  const misTurnos = grupo
    ? turnos.filter(t => t.grupo.id === grupo.grupo_id)
    : []

  const turnosHoy = misTurnos.filter(isTurnoHoy)
  const turnosProximos = misTurnos.filter(t => !isTurnoHoy(t) && t.tipo === 'ROTATIVO' && t.fecha)
    .sort((a, b) => (a.fecha! > b.fecha! ? 1 : -1))
    .slice(0, 3)

  async function termineDecocinar(seleccion_id: number) {
    setConfirmando(seleccion_id)
    setFeedback(null)
    try {
      await api.patch(`/selecciones/${seleccion_id}/confirmar`)
      setFeedback({ tipo: 'ok', msg: '¡Listo! La cocción quedó registrada y se descontó el stock.' })
      const ts = await api.get<Turno[]>(`/residencias/${residenciaId}/turnos`)
      setTurnos(ts)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedback({ tipo: 'error', msg: e.mensaje ?? 'Error al confirmar la cocción.' })
    } finally {
      setConfirmando(null)
    }
  }

  async function confirmarSeleccion(turno_id: number) {
    if (!residente || !selMenuId) return
    setSaving(true)
    setFeedback(null)
    try {
      await api.post(`/turnos/${turno_id}/selecciones`, {
        residente_id: residente.id,
        menu_id: selMenuId,
        personas: selPersonas,
      })
      setFeedback({ tipo: 'ok', msg: 'Selección registrada correctamente.' })
      setSelTurnoId(null)
      setSelMenuId(null)
      // Reload turnos
      const ts = await api.get<Turno[]>(`/residencias/${residenciaId}/turnos`)
      setTurnos(ts)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedback({ tipo: 'error', msg: e.mensaje ?? 'Error al registrar la selección' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!residente) {
    return (
      <EmptyState icon={AlertCircle} title="Perfil no encontrado" description="No se encontró tu perfil de residente." />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {residente.nombre}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{residente.residencia.nombre} · {residente.residencia.ciudad}</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${feedback.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {feedback.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mi grupo */}
          <Card
            className={grupo ? 'cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all' : ''}
            onClick={grupo ? () => navigate('/mi-grupo') : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-purple-500" /> Mi grupo de cocina
                {grupo && <ChevronRight size={14} className="ml-auto text-gray-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grupo ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <ChefHat size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{grupo.nombre}</p>
                      <p className="text-xs text-gray-400">{misTurnos.length} turno{misTurnos.length !== 1 ? 's' : ''} asignado{misTurnos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {integrantes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Users size={12} /> Integrantes
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {integrantes.map(i => (
                          <span key={i.id} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                            {i.nombre} {i.apellido}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {menusGrupo.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <BookOpen size={12} /> Menús asignados
                      </p>
                      <div className="space-y-1.5">
                        {menusGrupo.slice(0, 3).map(m => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-800">{m.nombre}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFICULTAD_COLOR[m.dificultad]}`}>{m.dificultad}</span>
                              <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10} /> {m.tiempo_min} min</span>
                            </div>
                          </div>
                        ))}
                        {menusGrupo.length > 3 && (
                          <p className="text-xs text-purple-500 font-medium pt-0.5">+{menusGrupo.length - 3} más · Ver todo →</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">No estás asignado a ningún grupo de cocina aún.</p>
              )}
            </CardContent>
          </Card>

          {/* Turnos de hoy */}
          {turnosHoy.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                Hoy te toca cocinar
              </h2>
              {turnosHoy.map(t => {
                const miaSel = (t.selecciones ?? []).find(s => s.residente.id === residente.id)
                const abierto = selTurnoId === t.id

                return (
                  <div key={t.id} className="bg-white border border-orange-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <CalendarDays size={18} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{grupo?.nombre}</p>
                        <p className="text-xs text-gray-500">{getTurnoLabel(t)} · <span className={`font-medium ${t.franja === 'ALMUERZO' ? 'text-yellow-600' : 'text-indigo-600'}`}>{t.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}</span></p>
                      </div>
                      {miaSel?.estado === 'CONFIRMADO' ? (
                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={13} /> Cocinado
                        </div>
                      ) : miaSel?.estado === 'PENDIENTE' ? (
                        <button
                          onClick={() => termineDecocinar(miaSel.id)}
                          disabled={confirmando === miaSel.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {confirmando === miaSel.id ? 'Guardando...' : '✓ Ya terminé'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelTurnoId(abierto ? null : t.id); setSelMenuId(null) }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          Elegir menú
                        </button>
                      )}
                    </div>

                    {miaSel && miaSel.estado !== 'REVERTIDO' && (
                      <div className={`border-t px-4 py-3 text-xs text-gray-600 ${miaSel.estado === 'CONFIRMADO' ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{miaSel.menu.nombre}</span>
                            {' · '}{miaSel.personas} personas
                            {' · '}<span className={`font-semibold px-1.5 py-0.5 rounded-full ${DIFICULTAD_COLOR[miaSel.menu.dificultad]}`}>{miaSel.menu.dificultad}</span>
                          </div>
                          {miaSel.estado === 'CONFIRMADO' && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <PartyPopper size={12} /> Stock descontado
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {abierto && (
                      <div className="border-t border-orange-100 bg-gray-50 p-4 space-y-3">
                        <p className="text-xs font-medium text-gray-600">Seleccioná el menú que vas a preparar:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {menus.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelMenuId(m.id)}
                              className={`text-left p-3 rounded-lg border text-sm transition-all ${selMenuId === m.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <p className="font-medium text-gray-900 truncate">{m.nombre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFICULTAD_COLOR[m.dificultad]}`}>{m.dificultad}</span>
                                <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10} /> {m.tiempo_min} min</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-600">Personas:</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={selPersonas}
                            onChange={e => setSelPersonas(Number(e.target.value))}
                            className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmarSeleccion(t.id)}
                            disabled={!selMenuId || saving}
                            className="flex-1 h-9 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors font-medium"
                          >
                            {saving ? 'Guardando...' : 'Confirmar selección'}
                          </button>
                          <button
                            onClick={() => setSelTurnoId(null)}
                            className="h-9 px-4 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Próximos turnos */}
          {turnosProximos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Próximos turnos</h2>
              {turnosProximos.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={15} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getTurnoLabel(t)}</p>
                    <p className="text-xs text-gray-400">{t.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}</p>
                  </div>
                  {(t.selecciones ?? []).find(s => s.residente.id === residente.id) ? (
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                  ) : (
                    <span className="text-xs text-orange-500 font-medium">Pendiente</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Si no hay grupo */}
          {!grupo && (
            <EmptyState icon={UtensilsCrossed} title="Sin grupo asignado" description="El administrador de tu residencia te asignará a un grupo de cocina." />
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Mis datos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users size={14} className="text-gray-400" /> Mi perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Nombre</p>
                <p className="font-medium text-gray-900">{residente.nombre} {residente.apellido}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Residencia</p>
                <p className="font-medium text-gray-900">{residente.residencia.nombre}</p>
                <p className="text-xs text-gray-500">{residente.residencia.ciudad}, {residente.residencia.provincia}</p>
              </div>
            </CardContent>
          </Card>

          {/* Menús disponibles */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen size={14} className="text-gray-400" /> Menús disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {menus.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin menús disponibles.</p>
              ) : (
                <ul className="space-y-1.5">
                  {menus.slice(0, 5).map(m => (
                    <li key={m.id} className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${DIFICULTAD_COLOR[m.dificultad]}`}>{m.dificultad.charAt(0)}</span>
                      <span className="text-sm text-gray-700 truncate">{m.nombre}</span>
                    </li>
                  ))}
                  {menus.length > 5 && (
                    <li className="text-xs text-gray-400 italic pt-1">+{menus.length - 5} más</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Resumen de turnos FIJO */}
          {grupo && misTurnos.filter(t => t.tipo === 'FIJO').length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarDays size={14} className="text-gray-400" /> Turnos fijos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {misTurnos.filter(t => t.tipo === 'FIJO').map(t => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{t.dia_semana !== null ? DIAS_SHORT[t.dia_semana] : '—'}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${t.franja === 'ALMUERZO' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {t.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
