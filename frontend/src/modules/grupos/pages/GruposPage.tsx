import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Users, UserPlus, X, Trash2, Pencil, Check, Plus,
  UtensilsCrossed, Clock, ChefHat, History, BookOpen
} from 'lucide-react'

interface Integrante {
  id: number
  residente_id: number
  fecha_ingreso: string
  residente: { id: number; nombre: string; apellido: string }
}

interface Grupo {
  id: number
  nombre: string
  activo: boolean
  _count?: { integrantes: number }
}

interface MenuAsignado {
  id: number
  menu_id: number
  menu: { id: number; nombre: string; dificultad: string; tiempo_min: number; activo: boolean }
}

interface MenuBasico {
  id: number
  nombre: string
  dificultad: string
  tiempo_min: number
  activo: boolean
}

interface ResidenteBasico {
  id: number
  nombre: string
  apellido: string
  activo: boolean
}

interface SeleccionHistorial {
  id: number
  personas: number
  created_at: string
  menu: { id: number; nombre: string; dificultad: string; tiempo_min: number }
  residente: { id: number; nombre: string; apellido: string }
  turno: {
    id: number
    tipo: string
    dia_semana: number | null
    fecha: string | null
    franja: 'ALMUERZO' | 'CENA'
    grupo: { id: number; nombre: string }
  }
}

const DIFICULTAD_COLOR: Record<string, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIA: 'bg-yellow-100 text-yellow-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

function Avatar({ nombre, apellido, size = 'md' }: { nombre: string; apellido: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center font-semibold text-white shrink-0 shadow-sm`}>
      {nombre[0]}{apellido[0]}
    </div>
  )
}

export default function GruposPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id
  const location = useLocation()
  const grupoIdDesdeNav = (location.state as { grupoId?: number } | null)?.grupoId ?? null

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)

  const [crearOpen, setCrearOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [crearError, setCrearError] = useState('')

  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null)
  const [panelTab, setPanelTab] = useState<'integrantes' | 'menus' | 'historial'>('integrantes')

  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [loadingIntegrantes, setLoadingIntegrantes] = useState(false)

  const [menusAsignados, setMenusAsignados] = useState<MenuAsignado[]>([])
  const [loadingMenus, setLoadingMenus] = useState(false)

  const [agregarMenuOpen, setAgregarMenuOpen] = useState(false)
  const [todosMenus, setTodosMenus] = useState<MenuBasico[]>([])
  const [busquedaMenu, setBusquedaMenu] = useState('')
  const [agregandoMenuId, setAgregandoMenuId] = useState<number | null>(null)
  const [agregarMenuError, setAgregarMenuError] = useState('')

  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)

  const [disolverOpen, setDisolverOpen] = useState(false)
  const [disolviendoId, setDisolviendoId] = useState<number | null>(null)

  const [historial, setHistorial] = useState<SeleccionHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const [agregarOpen, setAgregarOpen] = useState(false)
  const [residentes, setResidentes] = useState<ResidenteBasico[]>([])
  const [residentesEnOtroGrupo, setResidentesEnOtroGrupo] = useState<Set<number>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [agregandoId, setAgregandoId] = useState<number | null>(null)
  const [agregarError, setAgregarError] = useState('')

  function loadGrupos() {
    if (!residenciaId) return
    setLoading(true)
    api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`)
      .then(g => {
        setGrupos(g)
        if (grupoIdDesdeNav) {
          const target = g.find(x => x.id === grupoIdDesdeNav)
          if (target) abrirGrupo(target)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadGrupos, [residenciaId])

  function loadIntegrantes(grupoId: number) {
    setLoadingIntegrantes(true)
    api.get<Integrante[]>(`/grupos/${grupoId}/integrantes`)
      .then(setIntegrantes)
      .finally(() => setLoadingIntegrantes(false))
  }

  function loadMenusAsignados(grupoId: number) {
    setLoadingMenus(true)
    api.get<MenuAsignado[]>(`/grupos/${grupoId}/menus`)
      .then(setMenusAsignados)
      .finally(() => setLoadingMenus(false))
  }

  function loadHistorial(grupoId: number) {
    if (!residenciaId) return
    setLoadingHistorial(true)
    api.get<{ selecciones: SeleccionHistorial[] }>(`/residencias/${residenciaId}/historial`)
      .then(data => {
        setHistorial(data.selecciones.filter(s => s.turno.grupo.id === grupoId))
      })
      .finally(() => setLoadingHistorial(false))
  }

  function abrirGrupo(grupo: Grupo) {
    setGrupoSeleccionado(grupo)
    setPanelTab('integrantes')
    setEditandoNombre(false)
    loadIntegrantes(grupo.id)
    loadMenusAsignados(grupo.id)
    loadHistorial(grupo.id)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setCrearError('')
    try {
      await api.post(`/residencias/${residenciaId}/grupos`, { nombre })
      setCrearOpen(false)
      setNombre('')
      loadGrupos()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setCrearError(e.mensaje ?? 'Error al crear grupo')
    } finally {
      setSaving(false)
    }
  }

  async function handleRenombrar(e: React.FormEvent) {
    e.preventDefault()
    if (!grupoSeleccionado || !nombreEdit.trim()) return
    setSavingNombre(true)
    try {
      await api.patch(`/grupos/${grupoSeleccionado.id}`, { nombre: nombreEdit.trim() })
      setGrupoSeleccionado(g => g ? { ...g, nombre: nombreEdit.trim() } : null)
      setEditandoNombre(false)
      loadGrupos()
    } finally {
      setSavingNombre(false)
    }
  }

  async function confirmarDisolver() {
    if (!disolviendoId) return
    await api.delete(`/grupos/${disolviendoId}`)
    if (grupoSeleccionado?.id === disolviendoId) setGrupoSeleccionado(null)
    setDisolverOpen(false)
    setDisolviendoId(null)
    loadGrupos()
  }

  async function handleQuitarIntegrante(residenteId: number) {
    if (!grupoSeleccionado) return
    await api.delete(`/grupos/${grupoSeleccionado.id}/integrantes/${residenteId}`)
    loadIntegrantes(grupoSeleccionado.id)
    loadGrupos()
  }

  async function handleQuitarMenu(menuId: number) {
    if (!grupoSeleccionado) return
    await api.delete(`/grupos/${grupoSeleccionado.id}/menus/${menuId}`)
    loadMenusAsignados(grupoSeleccionado.id)
  }

  async function abrirAgregarMenu() {
    if (!residenciaId || !grupoSeleccionado) return
    setBusquedaMenu('')
    setAgregarMenuError('')
    const menus = await api.get<MenuBasico[]>(`/residencias/${residenciaId}/menus`)
    setTodosMenus(menus.filter(m => m.activo))
    setAgregarMenuOpen(true)
  }

  async function handleAgregarMenu(menuId: number) {
    if (!grupoSeleccionado) return
    setAgregandoMenuId(menuId)
    setAgregarMenuError('')
    try {
      await api.post(`/grupos/${grupoSeleccionado.id}/menus`, { menu_id: menuId })
      setAgregarMenuOpen(false)
      loadMenusAsignados(grupoSeleccionado.id)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setAgregarMenuError(e.mensaje ?? 'Error al agregar menú')
    } finally {
      setAgregandoMenuId(null)
    }
  }

  async function abrirAgregar() {
    if (!residenciaId || !grupoSeleccionado) return
    setBusqueda('')
    setAgregarError('')

    const [res, integrantesPorGrupo] = await Promise.all([
      api.get<ResidenteBasico[]>(`/residencias/${residenciaId}/residentes`),
      Promise.all(
        grupos
          .filter(g => g.id !== grupoSeleccionado.id)
          .map(g => api.get<Integrante[]>(`/grupos/${g.id}/integrantes`))
      ),
    ])

    const enOtroGrupo = new Set<number>()
    integrantesPorGrupo.flat().forEach(i => enOtroGrupo.add(i.residente_id))

    setResidentes(res.filter(r => r.activo))
    setResidentesEnOtroGrupo(enOtroGrupo)
    setAgregarOpen(true)
  }

  async function handleAgregar(residenteId: number) {
    if (!grupoSeleccionado) return
    setAgregandoId(residenteId)
    setAgregarError('')
    try {
      await api.post(`/grupos/${grupoSeleccionado.id}/integrantes`, { residente_id: residenteId })
      setAgregarOpen(false)
      loadIntegrantes(grupoSeleccionado.id)
      loadGrupos()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setAgregarError(e.mensaje ?? 'Error al agregar integrante')
    } finally {
      setAgregandoId(null)
    }
  }

  const residentesFiltrados = residentes.filter(r =>
    `${r.nombre} ${r.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  const yaEsIntegrante = (residenteId: number) =>
    integrantes.some(i => i.residente_id === residenteId)

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="flex gap-6 h-full min-h-0">

      {/* ─── Columna principal ─── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {grupos.length === 0 ? 'Sin grupos' : `${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} activos`}
            </p>
          </div>
          <Button onClick={() => setCrearOpen(true)} className="gap-2">
            <Plus size={16} /> Nuevo grupo
          </Button>
        </div>

        {/* Grid de tarjetas */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState icon={Users} title="Sin grupos" description="Creá el primer grupo de cocina para asignar turnos." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {grupos.map(g => {
              const count = g._count?.integrantes ?? 0
              const isSelected = grupoSeleccionado?.id === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => abrirGrupo(g)}
                  className={`text-left rounded-xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none ${
                    isSelected
                      ? 'border-purple-400 ring-2 ring-purple-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Icono + nombre */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <UtensilsCrossed size={20} className={isSelected ? 'text-purple-600' : 'text-gray-500'} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                      {count} {count === 1 ? 'integrante' : 'integrantes'}
                    </span>
                  </div>

                  {/* Nombre */}
                  <h3 className="font-semibold text-gray-900 text-base leading-tight mb-3">{g.nombre}</h3>

                  {/* Avatares */}
                  {count === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin integrantes aún</p>
                  ) : (
                    <div className="flex items-center gap-1">
                      {/* placeholder avatars — solo conteo visual */}
                      {[...Array(Math.min(count, 4))].map((_, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-300 to-indigo-400 border-2 border-white -ml-1 first:ml-0"
                          style={{ zIndex: 4 - i }}
                        />
                      ))}
                      {count > 4 && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white -ml-1 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-gray-500">+{count - 4}</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Panel lateral ─── */}
      {grupoSeleccionado && (
        <aside className="w-80 shrink-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm self-start sticky top-6 overflow-hidden">

          {/* Header del panel */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">

              {editandoNombre ? (
                <form onSubmit={handleRenombrar} className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    value={nombreEdit}
                    onChange={e => setNombreEdit(e.target.value)}
                    className="flex-1 text-base font-semibold border-b-2 border-purple-400 outline-none bg-transparent text-gray-900 py-0.5 min-w-0"
                    onKeyDown={e => e.key === 'Escape' && setEditandoNombre(false)}
                  />
                  <button type="submit" disabled={savingNombre} className="text-green-500 hover:text-green-600 shrink-0">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setEditandoNombre(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 text-base truncate">{grupoSeleccionado.nombre}</h2>
                  <button
                    onClick={() => { setNombreEdit(grupoSeleccionado.nombre); setEditandoNombre(true) }}
                    className="text-gray-300 hover:text-purple-500 transition-colors shrink-0"
                    title="Renombrar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}

              {!editandoNombre && (
                <button
                  onClick={() => { setGrupoSeleccionado(null); setEditandoNombre(false) }}
                  className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Stats rápidas */}
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users size={12} />
                <span>{grupoSeleccionado._count?.integrantes ?? integrantes.length} integrante{(grupoSeleccionado._count?.integrantes ?? integrantes.length) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ChefHat size={12} />
                <span>{menusAsignados.length} menú{menusAsignados.length !== 1 ? 's' : ''}</span>
              </div>
              {historial.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <History size={12} />
                  <span>{historial.length} cocción{historial.length !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5">
            {([
              { key: 'integrantes', label: 'Integrantes' },
              { key: 'menus', label: 'Menús' },
              { key: 'historial', label: 'Historial' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPanelTab(key)}
                className={`py-3 mr-4 text-sm font-medium border-b-2 transition-colors ${
                  panelTab === key
                    ? 'border-purple-500 text-purple-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">

            {panelTab === 'integrantes' && (
              <>
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={abrirAgregar}>
                  <UserPlus size={14} /> Agregar integrante
                </Button>

                {loadingIntegrantes ? (
                  <div className="space-y-2 pt-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : integrantes.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin integrantes aún</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {integrantes.map(i => (
                      <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 group transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar nombre={i.residente.nombre} apellido={i.residente.apellido} size="sm" />
                          <span className="text-sm text-gray-800 font-medium truncate">
                            {i.residente.nombre} {i.residente.apellido}
                          </span>
                        </div>
                        <button
                          onClick={() => handleQuitarIntegrante(i.residente_id)}
                          className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          title="Quitar del grupo"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {panelTab === 'historial' && (
              <>
                {loadingHistorial ? (
                  <div className="space-y-2 pt-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : historial.length === 0 ? (
                  <div className="py-8 text-center">
                    <History size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin cocciones registradas</p>
                    <p className="text-xs text-gray-300 mt-1">Aparecerán cuando el grupo confirme un menú</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {historial.map(s => {
                      const fecha = s.turno.fecha
                        ? new Date(s.turno.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : `Registro ${new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
                      return (
                        <li key={s.id} className="rounded-lg border border-gray-100 px-3 py-3 space-y-1.5 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <BookOpen size={12} className="text-purple-400 shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-gray-800 truncate">{s.menu.nombre}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              s.turno.franja === 'ALMUERZO' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {s.turno.franja === 'ALMUERZO' ? '☀️' : '🌙'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users size={10} />
                              {s.personas} persona{s.personas !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {fecha}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Registrado por {s.residente.nombre} {s.residente.apellido}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}

            {panelTab === 'menus' && (
              <>
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={abrirAgregarMenu}>
                  <Plus size={14} /> Agregar menú
                </Button>

                {loadingMenus ? (
                  <div className="space-y-2 pt-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : menusAsignados.length === 0 ? (
                  <div className="py-8 text-center">
                    <ChefHat size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin menús asignados</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {menusAsignados.map(m => (
                      <li key={m.id} className="flex items-start justify-between gap-2 px-3 py-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 group transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{m.menu.nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DIFICULTAD_COLOR[m.menu.dificultad] ?? 'bg-gray-100 text-gray-600'}`}>
                              {m.menu.dificultad}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock size={10} /> {m.menu.tiempo_min} min
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuitarMenu(m.menu_id)}
                          className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                          title="Quitar menú"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Footer del panel */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => { setDisolviendoId(grupoSeleccionado.id); setDisolverOpen(true) }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
            >
              <Trash2 size={12} /> Disolver grupo
            </button>
          </div>
        </aside>
      )}

      {/* ─── Modal: Confirmar disolución ─── */}
      <Modal open={disolverOpen} onClose={() => setDisolverOpen(false)} title="Disolver grupo">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <Trash2 size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              El grupo quedará inactivo. Los datos históricos de turnos e integrantes se conservan.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDisolverOpen(false)}>Cancelar</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmarDisolver}>
              Disolver
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Crear grupo ─── */}
      <Modal open={crearOpen} onClose={() => { setCrearOpen(false); setNombre('') }} title="Nuevo grupo de cocina">
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Grupo Martes"
              required
              autoFocus
            />
          </div>
          {crearError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{crearError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setCrearOpen(false); setNombre('') }}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear grupo'}</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal: Agregar menú ─── */}
      <Modal open={agregarMenuOpen} onClose={() => setAgregarMenuOpen(false)} title="Agregar menú al grupo">
        <div className="space-y-3">
          <Input
            placeholder="Buscar menú..."
            value={busquedaMenu}
            onChange={e => setBusquedaMenu(e.target.value)}
            autoFocus
          />
          {agregarMenuError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{agregarMenuError}</p>}
          <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto -mx-1 px-1">
            {todosMenus.filter(m => m.nombre.toLowerCase().includes(busquedaMenu.toLowerCase())).length === 0 ? (
              <li className="py-6 text-center text-sm text-gray-400">Sin resultados</li>
            ) : todosMenus
              .filter(m => m.nombre.toLowerCase().includes(busquedaMenu.toLowerCase()))
              .map(m => {
                const yaAsignado = menusAsignados.some(a => a.menu_id === m.id)
                return (
                  <li key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{m.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DIFICULTAD_COLOR[m.dificultad] ?? 'bg-gray-100 text-gray-600'}`}>
                          {m.dificultad}
                        </span>
                        <span className="text-[11px] text-gray-400">{m.tiempo_min} min</span>
                      </div>
                    </div>
                    {yaAsignado ? (
                      <Badge variant="secondary" className="text-xs shrink-0">Ya asignado</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAgregarMenu(m.id)}
                        disabled={agregandoMenuId === m.id}
                        className="shrink-0"
                      >
                        {agregandoMenuId === m.id ? '...' : 'Agregar'}
                      </Button>
                    )}
                  </li>
                )
              })
            }
          </ul>
        </div>
      </Modal>

      {/* ─── Modal: Agregar integrante ─── */}
      <Modal open={agregarOpen} onClose={() => setAgregarOpen(false)} title="Agregar integrante">
        <div className="space-y-3">
          <Input
            placeholder="Buscar residente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
          />
          {agregarError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{agregarError}</p>}
          <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto -mx-1 px-1">
            {residentesFiltrados.length === 0 ? (
              <li className="py-6 text-center text-sm text-gray-400">Sin resultados</li>
            ) : residentesFiltrados.map(r => {
              const esIntegrante = yaEsIntegrante(r.id)
              const enOtroGrupo = residentesEnOtroGrupo.has(r.id)
              const deshabilitado = esIntegrante || enOtroGrupo
              return (
                <li key={r.id} className={`flex items-center justify-between gap-3 py-2.5 ${deshabilitado ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar nombre={r.nombre} apellido={r.apellido} size="sm" />
                    <span className="text-sm text-gray-800 font-medium truncate">{r.nombre} {r.apellido}</span>
                  </div>
                  {esIntegrante ? (
                    <Badge variant="secondary" className="text-xs shrink-0">Ya es integrante</Badge>
                  ) : enOtroGrupo ? (
                    <Badge variant="secondary" className="text-xs shrink-0">En otro grupo</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAgregar(r.id)}
                      disabled={agregandoId === r.id}
                      className="shrink-0"
                    >
                      {agregandoId === r.id ? '...' : 'Agregar'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </Modal>
    </div>
  )
}
