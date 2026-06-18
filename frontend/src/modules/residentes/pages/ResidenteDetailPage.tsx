import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ArrowLeft, Pencil, Save, X, ShoppingBasket, UtensilsCrossed, Users } from 'lucide-react'

const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa',
  'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
  'Ciudad Autónoma de Buenos Aires',
]

interface GrupoInfo {
  grupo_id: number
  nombre: string
}

interface Integrante {
  id: number
  residente: { id: number; nombre: string; apellido: string }
}

interface ResidenteDetalle {
  id: number
  nombre: string
  apellido: string
  dni: string
  edad: number
  telefono: string | null
  universidad: string
  carrera: string
  ciudad_origen: string
  provincia_origen: string
  fecha_ingreso: string
  fecha_retiro: string | null
  motivo_baja: string | null
  activo: boolean
  residencia: { id: number; nombre: string; ciudad: string; provincia: string }
  user: { email: string; puede_cargar_stock: boolean }
  user_id: number
}

export default function ResidenteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const isAdminGlobal = decoded?.role === 'ADMIN_GLOBAL'

  const [residente, setResidente] = useState<ResidenteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<ResidenteDetalle>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bajaModalOpen, setBajaModalOpen] = useState(false)
  const [motivoOpcion, setMotivoOpcion] = useState('')
  const [motivoOtroTexto, setMotivoOtroTexto] = useState('')
  const [bajaError, setBajaError] = useState('')
  const [bajaLoading, setBajaLoading] = useState(false)
  const [togglingStock, setTogglingStock] = useState(false)
  const [grupo, setGrupo] = useState<GrupoInfo | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<ResidenteDetalle>(`/residentes/${id}`)
      .then(data => {
        setResidente(data)
        setForm(data)
        return api.get<GrupoInfo | null>(`/residentes/${id}/grupo`)
      })
      .then(g => {
        setGrupo(g)
        if (g) {
          return api.get<Integrante[]>(`/grupos/${g.grupo_id}/integrantes`)
        }
        return []
      })
      .then(setIntegrantes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!id || !form) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        edad: Number(form.edad),
        telefono: form.telefono ?? undefined,
        universidad: form.universidad,
        carrera: form.carrera,
        ciudad_origen: form.ciudad_origen,
        fecha_ingreso: form.fecha_ingreso ? new Date(form.fecha_ingreso).toISOString() : undefined,
      }
      const updated = await api.patch<ResidenteDetalle>(`/residentes/${id}`, payload)
      setResidente(updated)
      setForm(updated)
      setEditing(false)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivar() {
    if (!id || !residente) return
    if (!confirm('¿Reactivar este residente?')) return
    try {
      await api.patch(`/residentes/${id}`, { activo: true, fecha_retiro: null, motivo_baja: null })
      const updated = await api.get<ResidenteDetalle>(`/residentes/${id}`)
      setResidente(updated)
      setForm(updated)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al reactivar')
    }
  }

  async function handleDarDeBaja(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const motivo = motivoOpcion === 'Otro' ? motivoOtroTexto.trim() : motivoOpcion
    if (!motivo) return
    setBajaLoading(true)
    setBajaError('')
    try {
      await api.delete(`/residentes/${id}`, { motivo_baja: motivo })
      const updated = await api.get<ResidenteDetalle>(`/residentes/${id}`)
      setResidente(updated)
      setForm(updated)
      setBajaModalOpen(false)
      setMotivoOpcion('')
      setMotivoOtroTexto('')
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setBajaError(e.mensaje ?? 'Error al dar de baja')
    } finally {
      setBajaLoading(false)
    }
  }

  async function handleToggleStock() {
    if (!residente) return
    const nuevo = !residente.user.puede_cargar_stock
    setTogglingStock(true)
    try {
      await api.patch(`/residentes/${residente.id}/permiso-stock`, { puede_cargar_stock: nuevo })
      setResidente(r => r ? { ...r, user: { ...r.user, puede_cargar_stock: nuevo } } : r)
    } catch {
      // silencioso — el estado no cambia
    } finally {
      setTogglingStock(false)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (!residente) return <p className="text-gray-500">Residente no encontrado.</p>

  const field = (label: string, key: keyof ResidenteDetalle, type = 'text') => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500 uppercase tracking-wide">{label}</Label>
      {editing && key !== 'id' && key !== 'activo' && key !== 'residencia' && key !== 'user' ? (
        <Input
          type={type}
          value={(form[key] as string | number) ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <p className="text-sm font-medium text-gray-900">
          {(key === 'fecha_ingreso' || key === 'fecha_retiro')
            ? residente[key]
              ? new Date(residente[key] as string).toLocaleDateString('es-AR')
              : '—'
            : String(residente[key] ?? '—')}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/residentes')}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {residente.nombre} {residente.apellido}
          </h1>
          <p className="text-sm text-gray-500">{residente.user.email}</p>
        </div>
        <Badge variant={residente.activo ? 'success' : 'secondary'}>
          {residente.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {/* Residencia info (solo admin global) */}
      {isAdminGlobal && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-purple-500 uppercase tracking-wide font-semibold">Residencia</span>
          <span className="text-sm font-medium text-purple-900">
            {residente.residencia.nombre} — {residente.residencia.ciudad}, {residente.residencia.provincia}
          </span>
        </div>
      )}

      {/* Card de datos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Datos personales</h2>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} className="mr-1.5" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(residente); setError('') }}>
                <X size={14} className="mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save size={14} className="mr-1.5" /> {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-5">
          {field('Nombre', 'nombre')}
          {field('Apellido', 'apellido')}
          {field('DNI', 'dni')}
          {field('Edad', 'edad', 'number')}
          {field('Teléfono', 'telefono')}
          {field('Ciudad de origen', 'ciudad_origen')}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Provincia de origen</Label>
            {editing ? (
              <select
                value={(form.provincia_origen as string) ?? ''}
                onChange={e => setForm(f => ({ ...f, provincia_origen: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccioná una provincia</option>
                {PROVINCIAS_ARGENTINA.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium text-gray-900">{residente.provincia_origen ?? '—'}</p>
            )}
          </div>
          {field('Universidad', 'universidad')}
          {field('Carrera', 'carrera')}
          {field('Fecha de ingreso', 'fecha_ingreso', 'date')}
          {!residente.activo && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Fecha de retiro</Label>
                <p className="text-sm font-medium text-gray-900">
                  {residente.fecha_retiro
                    ? new Date(residente.fecha_retiro).toLocaleDateString('es-AR')
                    : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Motivo de baja</Label>
                <p className="text-sm font-medium text-gray-900">{residente.motivo_baja ?? '—'}</p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="px-6 pb-4">
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          </div>
        )}
      </div>

      {/* Grupo de cocina — card completa para admin residencia */}
      {!isAdminGlobal && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <UtensilsCrossed size={15} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800">Grupo de cocina</h2>
          </div>
          <div className="px-6 py-5">
            {grupo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{grupo.nombre}</p>
                    <p className="text-xs text-gray-400">{integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {integrantes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Users size={11} /> Compañeros de grupo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {integrantes.map(i => (
                        <span
                          key={i.id}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            i.residente.id === residente.id
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {i.residente.nombre} {i.residente.apellido}
                          {i.residente.id === residente.id && ' (este residente)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No pertenece a ningún grupo de cocina.</p>
            )}
          </div>
        </div>
      )}

      {/* Permisos */}
      {residente.activo && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Permisos</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ShoppingBasket size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cargar stock</p>
                  <p className="text-xs text-gray-400">Permite registrar entradas de alimentos al inventario</p>
                </div>
              </div>
              <button
                onClick={handleToggleStock}
                disabled={togglingStock}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                  residente.user.puede_cargar_stock ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    residente.user.puede_cargar_stock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grupo de cocina — compacto para admin global */}
      {isAdminGlobal && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <UtensilsCrossed size={14} className="text-purple-400 shrink-0" />
          <span className="font-medium text-gray-700">Grupo de cocina:</span>
          {grupo ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-gray-900 font-medium">{grupo.nombre}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}</span>
            </span>
          ) : (
            <span className="text-gray-400 italic">Sin grupo asignado</span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end">
        {residente.activo ? (
          <Button
            variant="outline"
            onClick={() => setBajaModalOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Dar de baja
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReactivar}>
            Reactivar
          </Button>
        )}
      </div>

      {/* Modal dar de baja */}
      <Modal
        open={bajaModalOpen}
        onClose={() => { setBajaModalOpen(false); setMotivoOpcion(''); setMotivoOtroTexto(''); setBajaError('') }}
        title="Dar de baja al residente"
      >
        <form onSubmit={handleDarDeBaja} className="space-y-4">
          <p className="text-sm text-gray-600">
            El residente pasará a estado <span className="font-semibold">Inactivo</span>. Esta acción no elimina sus datos históricos.
          </p>
          <div className="space-y-2">
            <Label>Motivo de baja</Label>
            <div className="flex flex-col gap-2">
              {['Se recibió', 'Abandono voluntario', 'Incumplimiento de normas', 'Otro'].map(opcion => (
                <label key={opcion} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="motivo"
                    value={opcion}
                    checked={motivoOpcion === opcion}
                    onChange={e => setMotivoOpcion(e.target.value)}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">{opcion}</span>
                </label>
              ))}
            </div>
            {motivoOpcion === 'Otro' && (
              <Input
                placeholder="Especificá el motivo..."
                value={motivoOtroTexto}
                onChange={e => setMotivoOtroTexto(e.target.value)}
                className="mt-2"
                autoFocus
              />
            )}
          </div>
          {bajaError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{bajaError}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setBajaModalOpen(false); setMotivoOpcion(''); setMotivoOtroTexto(''); setBajaError('') }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={bajaLoading || !motivoOpcion || (motivoOpcion === 'Otro' && !motivoOtroTexto.trim())}
            >
              {bajaLoading ? 'Procesando...' : 'Confirmar baja'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
