import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ChefHat, Users, CalendarDays, UtensilsCrossed, Clock,
  CheckCircle2, BookOpen, AlertCircle, PartyPopper, AlertTriangle, PackageX,
  Plus, X, Play, FileText, Search
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

interface Ingrediente {
  id: number
  cantidad_base: number
  cantidad_por_persona: number
  unidad: string
  alimento: { id: number; nombre: string; marca: string | null }
}

interface Menu {
  id: number
  nombre: string
  descripcion: string | null
  dificultad: Dificultad
  tiempo_min: number
  imagen_url: string | null
  video_url: string | null
  personas_base: number
  ingredientes: Ingrediente[]
}

interface StockItem {
  id: number
  cantidad: number
  unidad: string
  alimento: { id: number }
}

interface AlimentoBasico {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
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
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [residente, setResidente] = useState<ResidenteMe | null>(null)
  const [grupo, setGrupo] = useState<GrupoInfo | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [menusGrupo, setMenusGrupo] = useState<MenuGrupo[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [selMenuId, setSelMenuId] = useState<number | null>(null)
  const [selPersonas, setSelPersonas] = useState(4)
  const [selTurnoId, setSelTurnoId] = useState<number | null>(null)
  const [selNota, setSelNota] = useState('')
  const [ajustesIngredientes, setAjustesIngredientes] = useState<Record<number, string>>({})
  const [extrasIngredientes, setExtrasIngredientes] = useState<{ alimento_id: number; nombre: string; marca: string | null; cantidad: string; unidad: string }[]>([])
  const [busquedaExtra, setBusquedaExtra] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)
  const [avisandoFaltante, setAvisandoFaltante] = useState(false)
  const [avisandoModificada, setAvisandoModificada] = useState(false)

  useEffect(() => {
    if (!residenciaId) return
    Promise.all([
      api.get<ResidenteMe>('/residentes/me'),
      api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
      api.get<Menu[]>(`/residencias/${residenciaId}/menus`),
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<AlimentoBasico[]>('/alimentos'),
    ]).then(([me, ts, ms, st, als]) => {
      setResidente(me)
      setTurnos(ts)
      setMenus(ms)
      setStock(st)
      setAlimentos(als)
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

  async function termineDecocinar(seleccion_id: number, ajustes?: { alimento_id: number; cantidad: number }[]) {
    setConfirmando(seleccion_id)
    setFeedback(null)
    try {
      await api.patch(`/selecciones/${seleccion_id}/confirmar`, ajustes?.length ? { ajustes } : {})
      setFeedback({ tipo: 'ok', msg: '¡Listo! La cocción quedó registrada y se descontó el stock.' })
      const [ts, st] = await Promise.all([
        api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
        api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      ])
      setTurnos(ts)
      setStock(st)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedback({ tipo: 'error', msg: e.mensaje ?? 'Error al confirmar la cocción.' })
    } finally {
      setConfirmando(null)
    }
  }

  async function confirmarSeleccion(turno_id: number) {
    if (!residente || !selMenuId) return

    const menuSel = menus.find(m => m.id === selMenuId)

    // Verificar si la receta fue modificada (ajustes o extras)
    const hayAjustes = Object.keys(ajustesIngredientes).length > 0
    const hayExtras = extrasIngredientes.length > 0
    const recetaModificada = hayAjustes || hayExtras

    if (menuSel) {
      const hayFaltante = menuSel.ingredientes.some(ing => {
        const ajuste = ajustesIngredientes[ing.alimento.id]
        const cantidad = ajuste !== undefined ? Number(ajuste) : calcularNecesario(ing, selPersonas, menuSel.personas_base)
        const enStock = stockPorAlimento.get(ing.alimento.id) ?? 0
        return cantidad > enStock
      })
      // Primero avisar sobre faltantes, luego sobre modificación
      if (hayFaltante && !avisandoFaltante) {
        setAvisandoFaltante(true)
        return
      }
    }
    setAvisandoFaltante(false)

    if (recetaModificada && !avisandoModificada) {
      setAvisandoModificada(true)
      return
    }
    setAvisandoModificada(false)

    setSaving(true)
    setFeedback(null)
    try {
      const body: Record<string, unknown> = {
        residente_id: residente.id,
        menu_id: selMenuId,
        personas: selPersonas,
      }
      if (selNota.trim()) body.nota = selNota.trim()

      await api.post(`/turnos/${turno_id}/selecciones`, body)
      setFeedback({ tipo: 'ok', msg: 'Selección registrada. Cuando termines de cocinar, marcá "Ya terminé".' })
      setSelTurnoId(null)
      setSelMenuId(null)
      setSelNota('')
      setAjustesIngredientes({})
      setExtrasIngredientes([])
      setBusquedaExtra('')
      const ts = await api.get<Turno[]>(`/residencias/${residenciaId}/turnos`)
      setTurnos(ts)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedback({ tipo: 'error', msg: e.mensaje ?? 'Error al registrar la selección' })
    } finally {
      setSaving(false)
    }
  }

  const stockPorAlimento = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const s of stock) {
      mapa.set(s.alimento.id, (mapa.get(s.alimento.id) ?? 0) + s.cantidad)
    }
    return mapa
  }, [stock])

  function calcularNecesario(ing: Ingrediente, personas: number, base: number): number {
    return Math.round((ing.cantidad_base * (personas / base) + ing.cantidad_por_persona * personas) * 100) / 100
  }

  function formatCantidad(cantidad: number, unidad: string): string {
    return unidad.toLowerCase() === 'unidades' ? `${cantidad} u.` : `${cantidad} ${unidad.toLowerCase()}`
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-purple-500" /> Mi grupo de cocina
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
                        {menusGrupo.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-800">{m.nombre}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFICULTAD_COLOR[m.dificultad]}`}>{m.dificultad}</span>
                              <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10} /> {m.tiempo_min} min</span>
                            </div>
                          </div>
                        ))}
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
                          onClick={() => {
                            const ajustesBase = Object.entries(ajustesIngredientes)
                              .map(([id, v]) => ({ alimento_id: Number(id), cantidad: Number(v) }))
                              .filter(a => !isNaN(a.cantidad) && a.cantidad >= 0)
                            const ajustesExtra = extrasIngredientes
                              .map(e => ({ alimento_id: e.alimento_id, cantidad: Number(e.cantidad) }))
                              .filter(a => !isNaN(a.cantidad) && a.cantidad > 0)
                            const todos = [...ajustesBase, ...ajustesExtra]
                            termineDecocinar(miaSel.id, todos.length ? todos : undefined)
                          }}
                          disabled={confirmando === miaSel.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {confirmando === miaSel.id ? 'Guardando...' : '✓ Ya terminé'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelTurnoId(abierto ? null : t.id)
                            setSelMenuId(null)
                            setSelNota('')
                            setAjustesIngredientes({})
                            setExtrasIngredientes([])
                            setBusquedaExtra('')
                            setAvisandoFaltante(false)
                            setAvisandoModificada(false)
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          Elegir menú
                        </button>
                      )}
                    </div>

                    {/* Vista de receta — aparece cuando ya eligió el menú (PENDIENTE o CONFIRMADO) */}
                    {miaSel && miaSel.estado !== 'REVERTIDO' && (
                      <div className={`border-t ${miaSel.estado === 'CONFIRMADO' ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'}`}>
                        {/* Encabezado compacto siempre visible */}
                        <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-600">
                          <div>
                            <span className="font-medium text-gray-900">{miaSel.menu.nombre}</span>
                            {' · '}{miaSel.personas} personas
                            {' · '}<span className={`font-semibold px-1.5 py-0.5 rounded-full ${DIFICULTAD_COLOR[miaSel.menu.dificultad]}`}>{miaSel.menu.dificultad}</span>
                          </div>
                          {miaSel.estado === 'CONFIRMADO' && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <PartyPopper size={12} /> Stock descontado
                            </span>
                          )}
                        </div>

                        {/* Receta completa — solo en PENDIENTE (la pantalla de cocina) */}
                        {miaSel.estado === 'PENDIENTE' && (() => {
                          const menuData = menus.find(m => m.id === miaSel.menu.id)
                          return (
                            <div className="px-4 pb-4 space-y-4">
                              {/* Descripción */}
                              {menuData?.descripcion && (
                                <div className="flex items-start gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2.5 border border-orange-100">
                                  <FileText size={12} className="text-orange-400 shrink-0 mt-0.5" />
                                  <p>{menuData.descripcion}</p>
                                </div>
                              )}

                              {/* Video */}
                              {menuData?.video_url && (
                                <a
                                  href={menuData.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg px-3 py-2.5 text-xs text-red-700 font-medium transition-colors"
                                >
                                  <Play size={13} className="text-red-500 shrink-0" />
                                  Ver video de la receta
                                </a>
                              )}

                              {/* Ingredientes */}
                              {menuData && menuData.ingredientes.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Tus ingredientes para {miaSel.personas} personas
                                  </p>
                                  {menuData.ingredientes.map(ing => {
                                    const necesario = calcularNecesario(ing, miaSel.personas, menuData.personas_base)
                                    const enStock = stockPorAlimento.get(ing.alimento.id) ?? null
                                    const real = enStock !== null ? Math.min(enStock, necesario) : 0
                                    return (
                                      <div key={ing.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-white border border-gray-100 text-xs">
                                        <span className="text-gray-700">
                                          {ing.alimento.nombre}
                                          {ing.alimento.marca && <span className="text-gray-400"> · {ing.alimento.marca}</span>}
                                        </span>
                                        <div className="text-right">
                                          <span className="font-semibold text-gray-900">{formatCantidad(real, ing.unidad)}</span>
                                          {real < necesario && (
                                            <span className="ml-1 text-red-400">(de {formatCantidad(necesario, ing.unidad)})</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {abierto && (() => {
                      const menuSel = selMenuId ? menus.find(m => m.id === selMenuId) : null
                      return (
                        <div className="border-t border-orange-100 bg-gray-50 p-4 space-y-4">
                          <p className="text-xs font-medium text-gray-600">Seleccioná el menú que vas a preparar:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {menus.map(m => (
                              <button
                                key={m.id}
                                onClick={() => {
                                setSelMenuId(m.id)
                                setAjustesIngredientes({})
                                setExtrasIngredientes([])
                                setBusquedaExtra('')
                                setAvisandoFaltante(false)
                                setAvisandoModificada(false)
                              }}
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

                          {/* Ingredientes del menú seleccionado */}
                          {menuSel && menuSel.ingredientes.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Ingredientes para {selPersonas} personas
                                <span className="normal-case font-normal text-gray-400 ml-1">(podés ajustar cantidades)</span>
                              </p>
                              <div className="space-y-1.5">
                                {menuSel.ingredientes.map(ing => {
                                  const necesario = calcularNecesario(ing, selPersonas, menuSel.personas_base)
                                  const ajusteVal = ajustesIngredientes[ing.alimento.id]
                                  const cantidadFinal = ajusteVal !== undefined ? Number(ajusteVal) : necesario
                                  const enStock = stockPorAlimento.get(ing.alimento.id) ?? null
                                  const alcanza = enStock != null && cantidadFinal <= enStock
                                  const falta = enStock != null && !alcanza
                                  return (
                                    <div
                                      key={ing.id}
                                      className={`rounded-lg px-3 py-2 border text-xs ${
                                        alcanza ? 'bg-white border-gray-100' : falta ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {alcanza && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                          {falta && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                                          {enStock === null && <PackageX size={12} className="text-gray-400 shrink-0" />}
                                          <span className="text-gray-700 truncate">
                                            {ing.alimento.nombre}
                                            {ing.alimento.marca && <span className="text-gray-400"> · {ing.alimento.marca}</span>}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            value={ajusteVal ?? necesario}
                                            onChange={e => setAjustesIngredientes(prev => ({
                                              ...prev,
                                              [ing.alimento.id]: e.target.value,
                                            }))}
                                            className="w-16 h-6 text-xs border border-gray-300 rounded px-1.5 text-right focus:outline-none focus:ring-1 focus:ring-purple-400"
                                          />
                                          <span className="text-gray-400 text-xs">{ing.unidad.toLowerCase()}</span>
                                        </div>
                                      </div>
                                      <div className="mt-0.5 text-right">
                                        {alcanza && <span className="text-gray-400">stock: {formatCantidad(enStock!, ing.unidad)}</span>}
                                        {falta && <span className="text-red-500 font-medium">falta {formatCantidad(Math.round((cantidadFinal - enStock!) * 100) / 100, ing.unidad)} · se descontarán {formatCantidad(enStock!, ing.unidad)}</span>}
                                        {enStock === null && <span className="text-gray-400">sin stock · no se descontará nada</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Ingredientes extra */}
                          {menuSel && (() => {
                            const idsDeLaReceta = new Set(menuSel.ingredientes.map(i => i.alimento.id))
                            const alimentosFiltrados = busquedaExtra.trim().length >= 2
                              ? alimentos.filter(a =>
                                  !idsDeLaReceta.has(a.id) &&
                                  !extrasIngredientes.find(e => e.alimento_id === a.id) &&
                                  (a.nombre.toLowerCase().includes(busquedaExtra.toLowerCase()) ||
                                   (a.marca ?? '').toLowerCase().includes(busquedaExtra.toLowerCase()))
                                ).slice(0, 6)
                              : []
                            return (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Ingredientes extra
                                  <span className="normal-case font-normal text-gray-400 ml-1">(no están en la receta original)</span>
                                </p>
                                {extrasIngredientes.map((ex, i) => {
                                  const enStock = stockPorAlimento.get(ex.alimento_id) ?? null
                                  const cantNum = Number(ex.cantidad)
                                  const alcanza = enStock != null && cantNum <= enStock
                                  return (
                                    <div key={ex.alimento_id} className={`rounded-lg px-3 py-2 border text-xs flex items-center gap-2 ${alcanza ? 'bg-white border-gray-100' : enStock === null ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'}`}>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-700 font-medium">{ex.nombre}</span>
                                        {ex.marca && <span className="text-gray-400"> · {ex.marca}</span>}
                                        {enStock === null && <span className="ml-2 text-gray-400">(sin stock)</span>}
                                        {enStock !== null && !alcanza && <span className="ml-2 text-red-500">falta {formatCantidad(Math.round((cantNum - enStock) * 100) / 100, ex.unidad)}</span>}
                                      </div>
                                      <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={ex.cantidad}
                                        onChange={e => setExtrasIngredientes(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                                        className="w-14 h-6 text-xs border border-gray-300 rounded px-1.5 text-right focus:outline-none focus:ring-1 focus:ring-purple-400"
                                      />
                                      <span className="text-gray-400 text-xs shrink-0">{ex.unidad.toLowerCase()}</span>
                                      <button onClick={() => setExtrasIngredientes(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                                        <X size={13} />
                                      </button>
                                    </div>
                                  )
                                })}
                                <div className="relative">
                                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    value={busquedaExtra}
                                    onChange={e => setBusquedaExtra(e.target.value)}
                                    placeholder="Buscar alimento para agregar…"
                                    className="w-full h-8 text-xs border border-dashed border-gray-300 rounded-lg pl-7 pr-3 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                                  />
                                </div>
                                {alimentosFiltrados.length > 0 && (
                                  <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                                    {alimentosFiltrados.map(a => (
                                      <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => {
                                          setExtrasIngredientes(prev => [...prev, {
                                            alimento_id: a.id,
                                            nombre: a.nombre,
                                            marca: a.marca,
                                            cantidad: '1',
                                            unidad: a.unidad_base,
                                          }])
                                          setBusquedaExtra('')
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-purple-50 transition-colors"
                                      >
                                        <Plus size={11} className="text-purple-400 shrink-0" />
                                        <span className="text-gray-700">{a.nombre}</span>
                                        {a.marca && <span className="text-gray-400">{a.marca}</span>}
                                        <span className="ml-auto text-gray-400">{a.unidad_base.toLowerCase()}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* Nota */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Nota (opcional)</label>
                            <textarea
                              value={selNota}
                              onChange={e => setSelNota(e.target.value)}
                              placeholder="Ej: usamos menos sal, agregamos queso…"
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>

                          {/* Avisos */}
                          {avisandoFaltante && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">Faltan ingredientes</p>
                                <p>El stock no alcanza para todos. Los que falten se descontarán parcialmente. ¿Igual continuás?</p>
                              </div>
                            </div>
                          )}
                          {avisandoModificada && !avisandoFaltante && (
                            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800">
                              <AlertTriangle size={13} className="text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">Receta modificada</p>
                                <p>Cambiaste cantidades o agregaste ingredientes extra. Esto se va a registrar así. ¿Confirmás?</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmarSeleccion(t.id)}
                              disabled={!selMenuId || saving}
                              className={`flex-1 h-9 text-white text-sm rounded-lg disabled:opacity-40 transition-colors font-medium ${
                                avisandoFaltante ? 'bg-amber-500 hover:bg-amber-600'
                                : avisandoModificada ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-purple-600 hover:bg-purple-700'
                              }`}
                            >
                              {saving ? 'Guardando...' : avisandoFaltante ? 'Continuar igual' : avisandoModificada ? 'Confirmar con cambios' : 'Confirmar selección'}
                            </button>
                            <button
                              onClick={() => { setSelTurnoId(null); setAvisandoFaltante(false); setAvisandoModificada(false) }}
                              className="h-9 px-4 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )
                    })()}
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
