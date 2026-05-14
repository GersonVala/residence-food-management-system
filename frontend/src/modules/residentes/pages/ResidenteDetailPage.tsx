import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Save, X } from 'lucide-react'

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
  fecha_ingreso: string
  activo: boolean
  residencia: { id: number; nombre: string; ciudad: string; provincia: string }
  user: { email: string }
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

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<ResidenteDetalle>(`/residentes/${id}`)
      .then(data => {
        setResidente(data)
        setForm(data)
      })
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

  async function handleToggleActivo() {
    if (!id || !residente) return
    if (!confirm(residente.activo ? '¿Dar de baja este residente?' : '¿Reactivar este residente?')) return
    try {
      if (residente.activo) {
        await api.delete(`/residentes/${id}`)
        navigate('/residentes')
      }
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al cambiar estado')
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
          {key === 'fecha_ingreso'
            ? new Date(residente[key] as string).toLocaleDateString('es-AR')
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
          {field('Universidad', 'universidad')}
          {field('Carrera', 'carrera')}
          {field('Fecha de ingreso', 'fecha_ingreso', 'date')}
        </div>

        {error && (
          <div className="px-6 pb-4">
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          </div>
        )}
      </div>

      {/* Acciones destructivas */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleToggleActivo}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          {residente.activo ? 'Dar de baja' : 'Reactivar'}
        </Button>
      </div>
    </div>
  )
}
