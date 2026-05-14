import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { ArrowLeft, Trash2, ChevronUp, ChevronDown, Users, UserCog, Package, AlertTriangle, ChevronRight, ExternalLink, BookOpen, CalendarDays, Clock, Search } from 'lucide-react'
import { AlimentoPicker, type AlimentoPickerItem } from '@/components/ui/AlimentoPicker'
import {
  api,
  getResidenciaDetalle,
  uploadImagenPrincipal,
  addFoto,
  deleteFoto,
  reorderFotos,
  type ResidenciaDetalle,
  type ResidenciaFoto,
} from '@/lib/api'

type Tab = 'informacion' | 'residentes' | 'voluntarios' | 'grupos' | 'turnos' | 'menus' | 'stock' | 'galeria'

const TABS: { key: Tab; label: string }[] = [
  { key: 'informacion', label: 'Información' },
  { key: 'residentes', label: 'Residentes' },
  { key: 'voluntarios', label: 'Voluntarios' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'turnos', label: 'Turnos' },
  { key: 'menus', label: 'Menús' },
  { key: 'stock', label: 'Stock' },
  { key: 'galeria', label: 'Galería' },
]

export default function ResidenciaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [residencia, setResidencia] = useState<ResidenciaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('informacion')

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    getResidenciaDetalle(Number(id))
      .then(setResidencia)
      .catch(() => setResidencia(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  if (loading) return <div className="text-gray-500">Cargando...</div>
  if (!residencia) return <div className="text-red-600">Residencia no encontrada.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/residencias')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 data-testid="residencia-nombre" className="text-2xl font-bold text-gray-900">{residencia.nombre}</h1>
          <p className="text-sm text-gray-500">{residencia.ciudad}, {residencia.provincia}</p>
        </div>
        <Badge variant={residencia.activo ? 'success' : 'secondary'} className="ml-auto">
          {residencia.activo ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0" role="tablist">
          {TABS.map(t => {
            const badge =
              t.key === 'residentes' ? residencia.residentes.length :
              t.key === 'voluntarios' ? residencia.voluntarios.length : null
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  tab === t.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                {badge !== null && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    tab === t.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'informacion' && <InfoTab residencia={residencia} onSaved={load} />}
        {tab === 'residentes' && <ResidentesTab residencia={residencia} />}
        {tab === 'voluntarios' && <VoluntariosTab residencia={residencia} />}
        {tab === 'grupos' && <GruposTab residenciaId={residencia.id} />}
        {tab === 'turnos' && <TurnosTab residenciaId={residencia.id} />}
        {tab === 'menus' && <MenusTab residenciaId={residencia.id} />}
        {tab === 'stock' && <StockTab residenciaId={residencia.id} />}
        {tab === 'galeria' && <GaleriaTab residencia={residencia} onChanged={load} />}
      </div>
    </div>
  )
}

// ─── Tab: Información (solo lectura + imagen editable) ────────────────────────

function InfoTab({ residencia, onSaved }: { residencia: ResidenciaDetalle; onSaved: () => void }) {
  async function handleUploadImagen(formData: FormData) {
    await uploadImagenPrincipal(residencia.id, formData)
    onSaved()
  }

  const campo = (label: string, value: string | number) => (
    <div key={label} className="space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {campo('Nombre', residencia.nombre)}
        {campo('Ciudad', residencia.ciudad)}
        {campo('Provincia', residencia.provincia)}
        {campo('Capacidad máxima', residencia.capacidad_max)}
        {campo('Ventana de rollback', `${residencia.rollback_horas} horas`)}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide block">Residentes activos</span>
            <span className="font-semibold text-gray-900 text-lg">{residencia.residentes.length}</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide block">Voluntarios</span>
            <span className="font-semibold text-gray-900 text-lg">{residencia.voluntarios.length}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Imagen principal</p>
        <ImageUpload
          currentUrl={residencia.imagen_url}
          onUpload={handleUploadImagen}
        />
      </div>
    </div>
  )
}

// ─── Tab: Residentes ──────────────────────────────────────────────────────────

function ResidentesTab({ residencia }: { residencia: ResidenciaDetalle }) {
  const navigate = useNavigate()
  const [showHistoricos, setShowHistoricos] = useState(false)

  const tablaResidentes = (lista: ResidenciaDetalle['residentes'], esHistorico = false) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Nombre', 'DNI', 'Universidad', 'Carrera', 'Ingreso', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lista.map(r => (
            <tr
              key={r.id}
              className={`cursor-pointer ${esHistorico ? 'hover:bg-gray-50 opacity-70' : 'hover:bg-gray-50'}`}
              onClick={() => navigate(`/residentes/${r.id}`)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{r.nombre} {r.apellido}</td>
              <td className="px-4 py-3 text-gray-600">{r.dni}</td>
              <td className="px-4 py-3 text-gray-600">{r.universidad ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{r.carrera ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(r.fecha_ingreso).toLocaleDateString('es-AR')}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-purple-500 font-medium">Ver →</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Activos */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">
          Residentes activos
          <span className="ml-2 text-xs font-semibold bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            {residencia.residentes.length}
          </span>
        </p>
        {residencia.residentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-200 rounded-lg">
            <Users size={32} className="text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Sin residentes activos.</p>
          </div>
        ) : tablaResidentes(residencia.residentes)}
      </div>

      {/* Históricos */}
      {residencia.historicos.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHistoricos(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <span className={`transition-transform ${showHistoricos ? 'rotate-90' : ''}`}>▶</span>
            Historial de ex-residentes
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
              {residencia.historicos.length}
            </span>
          </button>

          {showHistoricos && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Residentes que ya no están activos en esta residencia.</p>
              {tablaResidentes(residencia.historicos, true)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Voluntarios (Admin Residencia) ──────────────────────────────────────

function VoluntariosTab({ residencia }: { residencia: ResidenciaDetalle }) {
  if (residencia.voluntarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserCog size={36} className="text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">Esta residencia no tiene voluntarios asignados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{residencia.voluntarios.length} voluntario{residencia.voluntarios.length !== 1 ? 's' : ''} asignado{residencia.voluntarios.length !== 1 ? 's' : ''}</p>
      <ul className="space-y-2">
        {residencia.voluntarios.map(v => {
          const nombre = v.residente
            ? `${v.residente.nombre} ${v.residente.apellido}`
            : v.email
          const iniciales = v.residente
            ? `${v.residente.nombre[0]}${v.residente.apellido[0]}`
            : v.email[0].toUpperCase()

          return (
            <li key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm shrink-0">
                {iniciales}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                <p className="text-xs text-gray-500 truncate">{v.email}</p>
              </div>
              <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                Admin Residencia
              </Badge>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Tab: Grupos ─────────────────────────────────────────────────────────────

interface Grupo { id: number; nombre: string; activo: boolean }

function GruposTab({ residenciaId }: { residenciaId: number }) {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`)
      .then(setGrupos)
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/residencias/${residenciaId}/grupos`, { nombre })
      setModalOpen(false)
      setNombre('')
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear grupo')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Disolver este grupo?')) return
    await api.delete(`/grupos/${id}`)
    load()
  }

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setError(''); setModalOpen(true) }}>Nuevo grupo</Button>
      </div>

      {grupos.length === 0 ? (
        <EmptyState icon={Users} title="Sin grupos" description="Creá el primer grupo de cocina para esta residencia." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(g => (
            <div key={g.id} className="bg-white rounded-lg border border-gray-200 p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{g.nombre}</p>
                  <p className="text-xs text-gray-400">{g.activo ? 'Activo' : 'Disuelto'}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo grupo de cocina">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="gr-nombre">Nombre del grupo</Label>
            <Input id="gr-nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Grupo Lunes" required />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Tab: Turnos ──────────────────────────────────────────────────────────────

interface Turno {
  id: number
  fecha: string
  franja: 'ALMUERZO' | 'CENA'
  activo: boolean
  grupo: { nombre: string }
}

function TurnosTab({ residenciaId }: { residenciaId: number }) {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ grupo_id: '', fecha: '', franja: 'ALMUERZO' as 'ALMUERZO' | 'CENA' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
      api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`),
    ]).then(([t, g]) => { setTurnos(t); setGrupos(g) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/residencias/${residenciaId}/turnos`, {
        grupo_id: Number(form.grupo_id),
        fecha: new Date(form.fecha).toISOString(),
        franja: form.franja,
      })
      setModalOpen(false)
      setForm({ grupo_id: '', fecha: '', franja: 'ALMUERZO' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear turno')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Cancelar este turno?')) return
    await api.delete(`/turnos/${id}`)
    load()
  }

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{turnos.length} turno{turnos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setError(''); setModalOpen(true) }}>Nuevo turno</Button>
      </div>

      {turnos.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin turnos" description="Creá el primer turno de cocina para esta residencia." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Franja', 'Grupo', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {turnos.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{new Date(t.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${t.franja === 'ALMUERZO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t.franja}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.grupo.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.activo ? 'Activo' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo turno de cocina">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="tn-grupo">Grupo</Label>
            <select
              id="tn-grupo"
              value={form.grupo_id}
              onChange={e => setForm(f => ({ ...f, grupo_id: e.target.value }))}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccioná un grupo</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tn-fecha">Fecha</Label>
              <Input id="tn-fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tn-franja">Franja</Label>
              <select
                id="tn-franja"
                value={form.franja}
                onChange={e => setForm(f => ({ ...f, franja: e.target.value as 'ALMUERZO' | 'CENA' }))}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALMUERZO">Almuerzo</option>
                <option value="CENA">Cena</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Tab: Menús ───────────────────────────────────────────────────────────────

type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface Ingrediente {
  alimento_id: number
  cantidad_base: number
  cantidad_por_persona: number
  unidad: string
  alimento: { nombre: string; marca: string | null }
}

interface Menu {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
  personas_base: number
  activo: boolean
  descripcion?: string
  video_url?: string
  ingredientes: Ingrediente[]
}

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

interface MenuCardProps {
  menu: Menu
  alimentos: AlimentoBasico[]
  onDelete: (id: number) => void
  onIngredienteAdded: () => void
  onIngredienteRemoved: () => void
}

function MenuCard({ menu, alimentos, onDelete, onIngredienteAdded, onIngredienteRemoved }: MenuCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [personas, setPersonas] = useState(menu.personas_base)
  const [addingIng, setAddingIng] = useState(false)
  const [ingForm, setIngForm] = useState({ alimento_id: '', nombre: '', marca: '' as string | null, cantidad_base: '', unidad: 'GR' })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingIng, setSavingIng] = useState(false)
  const [ingError, setIngError] = useState('')

  const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES']

  function calcCantidad(ing: Ingrediente) {
    if (menu.personas_base === 0) return ing.cantidad_base
    return (ing.cantidad_base / menu.personas_base) * personas
  }

  async function handleAddIng(e: React.FormEvent) {
    e.preventDefault()
    setSavingIng(true)
    setIngError('')
    try {
      await api.post(`/menus/${menu.id}/ingredientes`, {
        alimento_id: Number(ingForm.alimento_id),
        cantidad_base: Number(ingForm.cantidad_base),
        cantidad_por_persona: 0,
        unidad: ingForm.unidad,
      })
      setIngForm({ alimento_id: '', nombre: '', marca: '', cantidad_base: '', unidad: 'GR' })
      setAddingIng(false)
      onIngredienteAdded()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setIngError(e.mensaje ?? 'Error al agregar ingrediente')
    } finally {
      setSavingIng(false)
    }
  }

  async function handleRemoveIng(alimento_id: number) {
    await api.delete(`/menus/${menu.id}/ingredientes/${alimento_id}`)
    onIngredienteRemoved()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header de la tarjeta */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{menu.nombre}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${DIFICULTAD_COLOR[menu.dificultad]}`}>
                  {menu.dificultad}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <Clock size={11} /> {menu.tiempo_min} min
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <Users size={11} /> base {menu.personas_base} pers.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {menu.video_url && (
              <a href={menu.video_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-0.5 px-2 py-1 rounded hover:bg-purple-50 transition-colors">
                ▶ Video
              </a>
            )}
            <button type="button" onClick={() => onDelete(menu.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {menu.descripcion && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{menu.descripcion}</p>
        )}

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
        >
          <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Ocultar receta' : `Ver receta (${menu.ingredientes.length} ingredientes)`}
        </button>
      </div>

      {/* Panel expandible: receta + calculadora */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
          {/* Calculadora de personas */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
              Calcular para
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPersonas(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
              >−</button>
              <input
                type="number"
                min="1"
                value={personas}
                onChange={e => setPersonas(Math.max(1, Number(e.target.value)))}
                className="w-14 h-7 border border-gray-300 rounded text-center text-sm bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={() => setPersonas(p => p + 1)}
                className="w-7 h-7 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
              >+</button>
            </div>
            <span className="text-xs text-gray-400">personas</span>
            {personas !== menu.personas_base && (
              <button type="button" onClick={() => setPersonas(menu.personas_base)} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
                resetear
              </button>
            )}
          </div>

          {/* Lista de ingredientes */}
          {menu.ingredientes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin ingredientes cargados aún.</p>
          ) : (
            <div className="bg-white rounded border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Ingrediente</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Cantidad</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Unidad</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {menu.ingredientes.map(ing => {
                    const cant = calcCantidad(ing)
                    const cambio = personas !== menu.personas_base
                    return (
                      <tr key={ing.alimento_id}>
                        <td className="px-3 py-2 text-gray-800 font-medium">
                          {ing.alimento.nombre}
                          {ing.alimento.marca && <span className="text-gray-400 ml-1">({ing.alimento.marca})</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          <span className={cambio ? 'text-purple-700' : 'text-gray-800'}>
                            {Number.isInteger(cant) ? cant : cant.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{ing.unidad}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => handleRemoveIng(ing.alimento_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Agregar ingrediente */}
          {addingIng ? (
            <form onSubmit={handleAddIng} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
              {/* Selector con picker */}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:border-purple-400 hover:text-purple-600 transition-colors text-sm text-left"
              >
                <Search size={14} className="text-gray-400 shrink-0" />
                {ingForm.alimento_id ? (
                  <span className="font-medium text-gray-900 truncate">
                    {ingForm.nombre}{ingForm.marca ? ` — ${ingForm.marca}` : ''}
                  </span>
                ) : (
                  <span className="text-gray-400">Buscar alimento...</span>
                )}
              </button>

              {ingForm.alimento_id && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      Cantidad <span className="font-normal">para {menu.personas_base} pers.</span>
                    </Label>
                    <Input type="number" step="0.01" min="0" value={ingForm.cantidad_base} onChange={e => setIngForm(f => ({ ...f, cantidad_base: e.target.value }))} required className="h-9 text-sm" autoFocus />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Unidad</Label>
                    <select
                      value={ingForm.unidad}
                      onChange={e => setIngForm(f => ({ ...f, unidad: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {ingError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{ingError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAddingIng(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="flex-1" disabled={savingIng || !ingForm.alimento_id || !ingForm.cantidad_base}>
                  {savingIng ? 'Guardando...' : 'Agregar'}
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingIng(true)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
            >
              + Agregar ingrediente
            </button>
          )}

          <AlimentoPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={a => setIngForm(f => ({ ...f, alimento_id: String(a.id), nombre: a.nombre, marca: a.marca, unidad: a.unidad_base }))}
            alimentos={alimentos as AlimentoPickerItem[]}
            excluirIds={menu.ingredientes.map(i => i.alimento_id)}
          />
        </div>
      )}
    </div>
  )
}

interface IngredienteLocal {
  alimento_id: number
  nombre: string
  marca: string | null
  cantidad_base: number
  unidad: string
}

const FORM_VACIO = {
  nombre: '', dificultad: 'FACIL' as Dificultad, tiempo_min: '',
  personas_base: '4', descripcion: '', video_url: '',
}

const ING_VACIO = { alimento_id: '', nombre: '', marca: '' as string | null, cantidad_base: '', unidad: 'GR' }

function MenusTab({ residenciaId }: { residenciaId: number }) {
  const [menus, setMenus] = useState<Menu[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [ingredientesLocales, setIngredientesLocales] = useState<IngredienteLocal[]>([])
  const [ingForm, setIngForm] = useState(ING_VACIO)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES']

  function load() {
    setLoading(true)
    Promise.all([
      api.get<Menu[]>(`/residencias/${residenciaId}/menus`),
      api.get<AlimentoBasico[]>('/alimentos'),
    ]).then(([m, a]) => { setMenus(m); setAlimentos(a) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  function handleAbrirModal() {
    setForm(FORM_VACIO)
    setIngredientesLocales([])
    setIngForm(ING_VACIO)
    setError('')
    setModalOpen(true)
  }

  function handleSeleccionarAlimento(a: AlimentoPickerItem) {
    setIngForm(f => ({
      ...f,
      alimento_id: String(a.id),
      nombre: a.nombre,
      marca: a.marca,
      unidad: a.unidad_base,
    }))
  }

  function handleAgregarIngLocal() {
    if (!ingForm.alimento_id || !ingForm.cantidad_base) return
    if (ingredientesLocales.some(i => i.alimento_id === Number(ingForm.alimento_id))) return
    setIngredientesLocales(prev => [...prev, {
      alimento_id: Number(ingForm.alimento_id),
      nombre: ingForm.nombre,
      marca: ingForm.marca,
      cantidad_base: Number(ingForm.cantidad_base),
      unidad: ingForm.unidad,
    }])
    setIngForm(ING_VACIO)
  }

  function handleQuitarIngLocal(alimento_id: number) {
    setIngredientesLocales(prev => prev.filter(i => i.alimento_id !== alimento_id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const menu = await api.post<{ id: number }>(`/residencias/${residenciaId}/menus`, {
        nombre: form.nombre,
        dificultad: form.dificultad,
        tiempo_min: Number(form.tiempo_min),
        personas_base: Number(form.personas_base),
        ...(form.descripcion ? { descripcion: form.descripcion } : {}),
        ...(form.video_url ? { video_url: form.video_url } : {}),
      })
      for (const ing of ingredientesLocales) {
        await api.post(`/menus/${menu.id}/ingredientes`, {
          alimento_id: ing.alimento_id,
          cantidad_base: ing.cantidad_base,
          cantidad_por_persona: 0,
          unidad: ing.unidad,
        })
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear menú')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este menú?')) return
    try {
      await api.delete(`/menus/${id}`)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      alert(e.mensaje ?? 'Error al eliminar el menú')
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>

  const personasBase = Number(form.personas_base) || 4

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{menus.length} menú{menus.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={handleAbrirModal}>Nuevo menú</Button>
      </div>

      {menus.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin menús" description="Creá el primer menú para esta residencia." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menus.map(m => (
            <MenuCard
              key={m.id}
              menu={m}
              alimentos={alimentos}
              onDelete={handleDelete}
              onIngredienteAdded={load}
              onIngredienteRemoved={load}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo menú">
        <form onSubmit={handleCreate} className="space-y-4">

          {/* ── Datos básicos ── */}
          <div className="space-y-1">
            <Label htmlFor="mn-nombre">Nombre</Label>
            <Input id="mn-nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mn-dif">Dificultad</Label>
              <select
                id="mn-dif"
                value={form.dificultad}
                onChange={e => setForm(f => ({ ...f, dificultad: e.target.value as Dificultad }))}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="FACIL">Fácil</option>
                <option value="MEDIO">Medio</option>
                <option value="DIFICIL">Difícil</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mn-tiempo">Tiempo (min)</Label>
              <Input id="mn-tiempo" type="number" min="1" value={form.tiempo_min} onChange={e => setForm(f => ({ ...f, tiempo_min: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mn-personas">Personas base</Label>
              <Input id="mn-personas" type="number" min="1" value={form.personas_base} onChange={e => setForm(f => ({ ...f, personas_base: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mn-desc">Descripción / receta <span className="text-xs text-gray-400">(opc.)</span></Label>
            <textarea
              id="mn-desc"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Pasos de la receta, notas, tips..."
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mn-video">Link al video <span className="text-xs text-gray-400">(opc.)</span></Label>
            <Input id="mn-video" type="url" placeholder="https://youtube.com/..." value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} />
          </div>

          {/* ── Ingredientes ── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Ingredientes
              <span className="ml-1 text-xs font-normal text-gray-400">para {personasBase} personas</span>
            </p>

            {ingredientesLocales.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {ingredientesLocales.map(ing => (
                      <tr key={ing.alimento_id}>
                        <td className="px-3 py-2 text-gray-800 font-medium">
                          {ing.nombre}
                          {ing.marca && <span className="text-gray-400 ml-1 text-xs">({ing.marca})</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-right font-semibold">{ing.cantidad_base}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{ing.unidad}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => handleQuitarIngLocal(ing.alimento_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fila para agregar ingrediente */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
              {/* Selector de alimento */}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-purple-400 hover:text-purple-600 transition-colors text-sm text-left"
              >
                <Search size={15} className="text-gray-400 shrink-0" />
                {ingForm.alimento_id ? (
                  <span className="font-medium text-gray-900 truncate">
                    {ingForm.nombre}{ingForm.marca ? ` — ${ingForm.marca}` : ''}
                  </span>
                ) : (
                  <span className="text-gray-400">Buscar alimento...</span>
                )}
              </button>

              {/* Cantidad + unidad + botón (solo visible si hay alimento seleccionado) */}
              {ingForm.alimento_id && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">Cantidad para {form.personas_base || 4} personas</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={ingForm.cantidad_base}
                      onChange={e => setIngForm(f => ({ ...f, cantidad_base: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs text-gray-500">Unidad</Label>
                    <select
                      value={ingForm.unidad}
                      onChange={e => setIngForm(f => ({ ...f, unidad: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={handleAgregarIngLocal}
                    disabled={!ingForm.cantidad_base}
                  >
                    + Agregar
                  </Button>
                </div>
              )}
            </div>

            <AlimentoPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={handleSeleccionarAlimento}
              alimentos={alimentos as AlimentoPickerItem[]}
              excluirIds={ingredientesLocales.map(i => i.alimento_id)}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : `Crear menú${ingredientesLocales.length > 0 ? ` (${ingredientesLocales.length} ing.)` : ''}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Tab: Stock ───────────────────────────────────────────────────────────────

interface StockItem {
  id: number
  cantidad: number
  unidad: string
  stock_minimo: number | null
  fecha_vencimiento: string | null
  activo: boolean
  alimento: { id: number; nombre: string; marca: string | null }
}

interface AlimentoBasico {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
  imagen_url?: string | null
  categoria: { id: number; nombre: string }
}

interface Movimiento {
  id: number
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  motivo: string | null
  created_at: string
  residente: { nombre: string; apellido: string } | null
  user: { email: string; role: string } | null
}

function estadoStock(s: StockItem) {
  const vencido = s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date()
  const porVencer = s.fecha_vencimiento && !vencido &&
    (new Date(s.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
  const bajoMinimo = s.stock_minimo != null && s.cantidad < s.stock_minimo

  if (vencido) return { label: 'Vencido', color: 'bg-gray-100 text-gray-700' }
  if (porVencer) return { label: 'Por vencer', color: 'bg-orange-100 text-orange-700' }
  if (bajoMinimo) return { label: 'Bajo mínimo', color: 'bg-red-100 text-red-700' }
  return { label: 'OK', color: 'bg-green-100 text-green-700' }
}

function StockRowDetail({ stockId }: { stockId: number }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Movimiento[]>(`/stock/${stockId}/movimientos`)
      .then(setMovimientos)
      .finally(() => setLoading(false))
  }, [stockId])

  const tipoColor = (tipo: string) => {
    if (tipo === 'ENTRADA') return 'bg-green-100 text-green-700'
    if (tipo === 'SALIDA') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <tr>
      <td colSpan={7} className="px-4 pb-4 pt-0 bg-gray-50">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial de movimientos</p>
          </div>
          {loading ? (
            <p className="text-xs text-gray-400 px-4 py-3">Cargando...</p>
          ) : movimientos.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-medium">
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Cantidad</th>
                  <th className="text-left px-4 py-2">Registrado por</th>
                  <th className="text-left px-4 py-2">Fecha y hora</th>
                  <th className="text-left px-4 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movimientos.map(m => {
                  const quien = m.residente
                    ? `${m.residente.nombre} ${m.residente.apellido} (residente)`
                    : m.user
                    ? `${m.user.email} (${m.user.role === 'ADMIN_GLOBAL' ? 'Admin Global' : 'Admin Residencia'})`
                    : 'Sistema'
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className={`font-semibold rounded-full px-2 py-0.5 ${tipoColor(m.tipo)}`}>{m.tipo}</span>
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{m.cantidad}</td>
                      <td className="px-4 py-2 text-gray-600">{quien}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(m.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2 text-gray-400">{m.motivo ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  )
}

function StockTab({ residenciaId }: { residenciaId: number }) {
  const [stock, setStock] = useState<StockItem[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES']

  function load() {
    setLoading(true)
    Promise.all([
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<AlimentoBasico[]>('/alimentos'),
    ]).then(([s, a]) => { setStock(s); setAlimentos(a) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        alimento_id: Number(form.alimento_id),
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
      }
      if (form.fecha_vencimiento) body.fecha_vencimiento = form.fecha_vencimiento
      if (form.stock_minimo) body.stock_minimo = Number(form.stock_minimo)
      await api.post(`/residencias/${residenciaId}/stock`, body)
      setModalOpen(false)
      setForm({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al registrar stock')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{stock.length} producto{stock.length !== 1 ? 's' : ''} en inventario</p>
        <Button size="sm" onClick={() => { setError(''); setModalOpen(true) }}>Registrar entrada</Button>
      </div>

      {stock.length === 0 ? (
        <EmptyState icon={Package} title="Sin stock" description="Registrá el primer ingreso de alimentos para esta residencia." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['', 'Alimento', 'Cantidad', 'Unidad', 'Mínimo', 'Vencimiento', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => {
                const estado = estadoStock(s)
                const isExpanded = expandedId === s.id
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {s.alimento.nombre}
                        {s.alimento.marca && <span className="text-gray-400 font-normal ml-1 text-xs">{s.alimento.marca}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">{s.cantidad}</td>
                      <td className="px-4 py-3 text-gray-500">{s.unidad}</td>
                      <td className="px-4 py-3 text-gray-500">{s.stock_minimo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.fecha_vencimiento ? (
                          <span className="flex items-center gap-1">
                            {estado.label !== 'OK' && estado.label !== 'Bajo mínimo' && <AlertTriangle size={13} className="text-orange-500" />}
                            {new Date(s.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${estado.color}`}>{estado.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/alimentos/${s.alimento.id}`}
                          title="Ver detalle del alimento"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                    {isExpanded && (
                      <StockRowDetail stockId={s.id} />
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar entrada de stock">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="st-alimento">Alimento</Label>
            <select
              id="st-alimento"
              value={form.alimento_id}
              onChange={e => {
                const al = alimentos.find(a => a.id === Number(e.target.value))
                setForm(f => ({ ...f, alimento_id: e.target.value, unidad: al?.unidad_base ?? 'UNIDADES' }))
              }}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccioná un alimento</option>
              {alimentos.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}{a.marca ? ` — ${a.marca}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-cantidad">Cantidad</Label>
              <Input id="st-cantidad" type="number" step="0.01" min="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-unidad">Unidad</Label>
              <select
                id="st-unidad"
                value={form.unidad}
                onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-minimo">Stock mínimo <span className="text-xs text-gray-400">(opc.)</span></Label>
              <Input id="st-minimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-venc">Vencimiento <span className="text-xs text-gray-400">(opc.)</span></Label>
              <Input id="st-venc" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Tab: Galería ─────────────────────────────────────────────────────────────

function GaleriaTab({ residencia, onChanged }: { residencia: ResidenciaDetalle; onChanged: () => void }) {
  const [fotos, setFotos] = useState<ResidenciaFoto[]>(residencia.fotos)
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFotos(residencia.fotos)
  }, [residencia.fotos])

  async function handleAddFoto(formData: FormData) {
    await addFoto(residencia.id, formData)
    onChanged()
  }

  async function handleDelete(fotoId: number) {
    if (!confirm('¿Eliminar esta foto?')) return
    try {
      await deleteFoto(residencia.id, fotoId)
      onChanged()
    } catch {
      setError('Error al eliminar la foto.')
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const newFotos = [...fotos]
    const target = index + direction
    if (target < 0 || target >= newFotos.length) return
    ;[newFotos[index], newFotos[target]] = [newFotos[target], newFotos[index]]
    setFotos(newFotos)
  }

  async function handleSaveOrder() {
    setReordering(true)
    setError('')
    try {
      const items = fotos.map((f, i) => ({ id: f.id, orden: i }))
      await reorderFotos(residencia.id, items)
      onChanged()
    } catch {
      setError('Error al reordenar las fotos.')
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Agregar foto</p>
        <ImageUpload onUpload={handleAddFoto} label="Agregar foto" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      {fotos.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay fotos en la galería.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fotos.map((foto, i) => (
              <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={foto.url} alt={`Foto ${i + 1}`} className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => movePhoto(i, -1)} disabled={i === 0} className="bg-white rounded p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => movePhoto(i, 1)} disabled={i === fotos.length - 1} className="bg-white rounded p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => handleDelete(foto.id)} className="bg-white rounded p-0.5 text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveOrder} disabled={reordering}>
            {reordering ? 'Guardando orden...' : 'Guardar orden'}
          </Button>
        </>
      )}
    </div>
  )
}
