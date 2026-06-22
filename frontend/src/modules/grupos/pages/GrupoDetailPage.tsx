import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Users, UserPlus, X, Trash2, Pencil, Check, Plus,
  UtensilsCrossed, Clock, ChefHat, History, BookOpen,
  ArrowLeft, Calendar, Star
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  estado: string
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

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function Avatar({ nombre, apellido, size = 'md' }: { nombre: string; apellido: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center font-semibold text-white shrink-0 shadow-sm`}>
      {nombre[0]}{apellido[0]}
    </div>
  )
}

export default function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const grupoId = Number(id)

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'integrantes' | 'menus' | 'historial'>('integrantes')

  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [loadingIntegrantes, setLoadingIntegrantes] = useState(false)

  const [menusAsignados, setMenusAsignados] = useState<MenuAsignado[]>([])
  const [loadingMenus, setLoadingMenus] = useState(false)

  const [historial, setHistorial] = useState<SeleccionHistorial[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombreEdit, setNombreEdit] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)

  const [disolverOpen, setDisolverOpen] = useState(false)

  const [agregarOpen, setAgregarOpen] = useState(false)
  const [residentes, setResidentes] = useState<ResidenteBasico[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [agregandoId, setAgregandoId] = useState<number | null>(null)
  const [agregarError, setAgregarError] = useState('')

  const [agregarMenuOpen, setAgregarMenuOpen] = useState(false)
  const [todosMenus, setTodosMenus] = useState<MenuBasico[]>([])
  const [busquedaMenu, setBusquedaMenu] = useState('')
  const [agregandoMenuId, setAgregandoMenuId] = useState<number | null>(null)
  const [agregarMenuError, setAgregarMenuError] = useState('')

  useEffect(() => {
    if (!grupoId) return
    api.get<Grupo>(`/grupos/${grupoId}`)
      .then(g => { setGrupo(g); setNombreEdit(g.nombre) })
      .catch(() => navigate('/grupos'))
      .finally(() => setLoading(false))
    loadIntegrantes()
    loadMenusAsignados()
    loadHistorial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId])

  function loadIntegrantes() {
    setLoadingIntegrantes(true)
    api.get<Integrante[]>(`/grupos/${grupoId}/integrantes`)
      .then(setIntegrantes)
      .finally(() => setLoadingIntegrantes(false))
  }

  function loadMenusAsignados() {
    setLoadingMenus(true)
    api.get<MenuAsignado[]>(`/grupos/${grupoId}/menus`)
      .then(setMenusAsignados)
      .finally(() => setLoadingMenus(false))
  }

  function loadHistorial() {
    if (!residenciaId) return
    setLoadingHistorial(true)
    api.get<{ selecciones: SeleccionHistorial[] }>(`/residencias/${residenciaId}/historial`)
      .then(data => setHistorial(data.selecciones.filter(s => s.turno.grupo.id === grupoId)))
      .finally(() => setLoadingHistorial(false))
  }

  async function handleRenombrar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreEdit.trim() || !grupo) return
    setSavingNombre(true)
    try {
      await api.patch(`/grupos/${grupoId}`, { nombre: nombreEdit.trim() })
      setGrupo(g => g ? { ...g, nombre: nombreEdit.trim() } : null)
      setEditandoNombre(false)
    } finally {
      setSavingNombre(false)
    }
  }

  async function confirmarDisolver() {
    await api.delete(`/grupos/${grupoId}`)
    navigate('/grupos')
  }

  async function handleQuitarIntegrante(residenteId: number) {
    await api.delete(`/grupos/${grupoId}/integrantes/${residenteId}`)
    loadIntegrantes()
  }

  async function handleQuitarMenu(menuId: number) {
    await api.delete(`/grupos/${grupoId}/menus/${menuId}`)
    loadMenusAsignados()
  }

  async function abrirAgregar() {
    if (!residenciaId) return
    setBusqueda('')
    setAgregarError('')
    const res = await api.get<ResidenteBasico[]>(`/residencias/${residenciaId}/residentes`)
    setResidentes(res.filter(r => r.activo))
    setAgregarOpen(true)
  }

  async function handleAgregar(residenteId: number) {
    setAgregandoId(residenteId)
    setAgregarError('')
    try {
      await api.post(`/grupos/${grupoId}/integrantes`, { residente_id: residenteId })
      setAgregarOpen(false)
      loadIntegrantes()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setAgregarError(e.mensaje ?? 'Error al agregar integrante')
    } finally {
      setAgregandoId(null)
    }
  }

  async function abrirAgregarMenu() {
    if (!residenciaId) return
    setBusquedaMenu('')
    setAgregarMenuError('')
    const menus = await api.get<MenuBasico[]>(`/residencias/${residenciaId}/menus`)
    setTodosMenus(menus.filter(m => m.activo))
    setAgregarMenuOpen(true)
  }

  async function handleAgregarMenu(menuId: number) {
    setAgregandoMenuId(menuId)
    setAgregarMenuError('')
    try {
      await api.post(`/grupos/${grupoId}/menus`, { menu_id: menuId })
      setAgregarMenuOpen(false)
      loadMenusAsignados()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setAgregarMenuError(e.mensaje ?? 'Error al agregar menú')
    } finally {
      setAgregandoMenuId(null)
    }
  }

  const residentesFiltrados = residentes.filter(r =>
    `${r.nombre} ${r.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  )
  const yaEsIntegrante = (residenteId: number) => integrantes.some(i => i.residente_id === residenteId)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!grupo) return null

  const coccionesConfirmadas = historial.filter(s => s.estado === 'CONFIRMADO')

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/grupos')}
            className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>

          {editandoNombre ? (
            <form onSubmit={handleRenombrar} className="flex items-center gap-2">
              <input
                autoFocus
                value={nombreEdit}
                onChange={e => setNombreEdit(e.target.value)}
                className="text-2xl font-bold border-b-2 border-purple-400 outline-none bg-transparent text-gray-900 py-0.5 min-w-0"
                onKeyDown={e => e.key === 'Escape' && setEditandoNombre(false)}
              />
              <button type="submit" disabled={savingNombre} className="text-green-500 hover:text-green-600">
                <Check size={18} />
              </button>
              <button type="button" onClick={() => setEditandoNombre(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <UtensilsCrossed size={20} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{grupo.nombre}</h1>
                <p className="text-sm text-gray-400">Grupo de cocina</p>
              </div>
              <button
                onClick={() => setEditandoNombre(true)}
                className="text-gray-300 hover:text-purple-500 transition-colors shrink-0 ml-1"
                title="Renombrar"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setDisolverOpen(true)}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors font-medium shrink-0"
        >
          <Trash2 size={14} /> Disolver grupo
        </button>
      </div>

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <Users size={18} className="text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{integrantes.length}</p>
            <p className="text-xs text-gray-400">Integrante{integrantes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <ChefHat size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{menusAsignados.length}</p>
            <p className="text-xs text-gray-400">Menú{menusAsignados.length !== 1 ? 's' : ''} asignado{menusAsignados.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Star size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{coccionesConfirmadas.length}</p>
            <p className="text-xs text-gray-400">Cocción{coccionesConfirmadas.length !== 1 ? 'es' : ''} registrada{coccionesConfirmadas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <div className="flex border-b border-gray-100 px-6">
          {([
            { key: 'integrantes', label: 'Integrantes', icon: Users },
            { key: 'menus', label: 'Menús', icon: ChefHat },
            { key: 'historial', label: 'Historial', icon: History },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 py-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-purple-500 text-purple-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Tab: Integrantes ── */}
          {tab === 'integrantes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {integrantes.length === 0 ? 'Sin integrantes aún' : `${integrantes.length} integrante${integrantes.length !== 1 ? 's' : ''} en el grupo`}
                </p>
                <Button size="sm" className="gap-1.5" onClick={abrirAgregar}>
                  <UserPlus size={14} /> Agregar integrante
                </Button>
              </div>

              {loadingIntegrantes ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : integrantes.length === 0 ? (
                <div className="py-16 text-center">
                  <Users size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400">Sin integrantes aún</p>
                  <p className="text-sm text-gray-300 mt-1">Agregá residentes para que cocinen con este grupo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {integrantes.map(i => (
                    <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar nombre={i.residente.nombre} apellido={i.residente.apellido} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {i.residente.nombre} {i.residente.apellido}
                          </p>
                          <p className="text-xs text-gray-400">
                            Desde {new Date(i.fecha_ingreso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuitarIntegrante(i.residente_id)}
                        className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Quitar del grupo"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Menús ── */}
          {tab === 'menus' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {menusAsignados.length === 0 ? 'Sin menús asignados' : `${menusAsignados.length} menú${menusAsignados.length !== 1 ? 's' : ''} que puede cocinar este grupo`}
                </p>
                <Button size="sm" className="gap-1.5" onClick={abrirAgregarMenu}>
                  <Plus size={14} /> Agregar menú
                </Button>
              </div>

              {loadingMenus ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : menusAsignados.length === 0 ? (
                <div className="py-16 text-center">
                  <ChefHat size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400">Sin menús asignados</p>
                  <p className="text-sm text-gray-300 mt-1">Asigná recetas para que el grupo pueda elegir al cocinar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menusAsignados.map(m => (
                    <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 group transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <BookOpen size={13} className="text-orange-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.menu.nombre}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFICULTAD_COLOR[m.menu.dificultad] ?? 'bg-gray-100 text-gray-600'}`}>
                            {m.menu.dificultad}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} /> {m.menu.tiempo_min} min
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuitarMenu(m.menu_id)}
                        className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                        title="Quitar menú"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Historial ── */}
          {tab === 'historial' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {historial.length === 0 ? 'Sin cocciones registradas aún' : `${historial.length} cocción${historial.length !== 1 ? 'es' : ''} en el historial`}
              </p>

              {loadingHistorial ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : historial.length === 0 ? (
                <div className="py-16 text-center">
                  <History size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400">Sin cocciones registradas</p>
                  <p className="text-sm text-gray-300 mt-1">Aparecerán cuando los integrantes confirmen una cocción</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map(s => {
                    const fecha = s.turno.fecha
                      ? new Date(s.turno.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
                      : s.turno.dia_semana !== null
                        ? `Todos los ${DIAS[s.turno.dia_semana]}`
                        : new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

                    return (
                      <div key={s.id} className="flex items-start justify-between gap-4 px-5 py-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.turno.franja === 'ALMUERZO' ? 'bg-yellow-100' : 'bg-indigo-100'}`}>
                            <span className="text-base">{s.turno.franja === 'ALMUERZO' ? '☀️' : '🌙'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.menu.nombre}</p>
                            <p className="text-xs text-gray-400 mt-0.5 capitalize">{fecha}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Users size={11} /> {s.personas} persona{s.personas !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock size={11} /> {s.menu.tiempo_min} min
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${DIFICULTAD_COLOR[s.menu.dificultad] ?? 'bg-gray-100 text-gray-600'}`}>
                                {s.menu.dificultad}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-gray-600">{s.residente.nombre} {s.residente.apellido}</p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <Calendar size={10} className="text-gray-300" />
                            <p className="text-[11px] text-gray-400">
                              {new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </p>
                          </div>
                          {s.estado === 'CONFIRMADO' && (
                            <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                              Confirmado
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Disolver ── */}
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

      {/* ── Modal: Agregar integrante ── */}
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
              return (
                <li key={r.id} className={`flex items-center justify-between gap-3 py-2.5 ${esIntegrante ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar nombre={r.nombre} apellido={r.apellido} size="sm" />
                    <span className="text-sm text-gray-800 font-medium truncate">{r.nombre} {r.apellido}</span>
                  </div>
                  {esIntegrante ? (
                    <Badge variant="secondary" className="text-xs shrink-0">Ya es integrante</Badge>
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

      {/* ── Modal: Agregar menú ── */}
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
    </div>
  )
}
