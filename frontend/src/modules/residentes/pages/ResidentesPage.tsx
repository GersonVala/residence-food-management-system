import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Eye } from 'lucide-react'

interface Residente {
  id: number
  nombre: string
  apellido: string
  dni: string
  edad: number
  universidad: string
  carrera: string
  ciudad_origen: string
  activo: boolean
  fecha_ingreso: string
  residencia?: { id: number; nombre: string; ciudad: string }
  user?: { email: string }
}

export default function ResidentesPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const role = decoded?.role ?? ''
  const isAdminGlobal = role === 'ADMIN_GLOBAL'
  const residenciaId = decoded?.residencia_id

  const [residentes, setResidentes] = useState<Residente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    email: '', nombre: '', apellido: '', dni: '', edad: '',
    universidad: '', carrera: '', ciudad_origen: '', fecha_ingreso: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    const endpoint = isAdminGlobal
      ? '/residentes'
      : `/residencias/${residenciaId}/residentes`

    if (!isAdminGlobal && !residenciaId) {
      setLoading(false)
      return
    }

    api.get<Residente[]>(endpoint)
      .then(setResidentes)
      .finally(() => setLoading(false))
  }

  useEffect(load, [isAdminGlobal, residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/residencias/${residenciaId}/residentes`, {
        ...form,
        edad: Number(form.edad),
        fecha_ingreso: new Date(form.fecha_ingreso).toISOString()
      })
      setModalOpen(false)
      setForm({ email: '', nombre: '', apellido: '', dni: '', edad: '', universidad: '', carrera: '', ciudad_origen: '', fecha_ingreso: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear residente')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdminGlobal && !residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  const columns = isAdminGlobal
    ? ['Nombre', 'DNI', 'Residencia', 'Universidad', 'Carrera', 'Estado', '']
    : ['Nombre', 'DNI', 'Universidad', 'Carrera', 'Estado', '']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
          {isAdminGlobal && !loading && (
            <p className="text-sm text-gray-500 mt-0.5">{residentes.length} residentes en total</p>
          )}
        </div>
        {!isAdminGlobal && (
          <Button onClick={() => setModalOpen(true)}>Nuevo residente</Button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : residentes.length === 0 ? (
        <EmptyState icon={Users} title="Sin residentes" description="No hay residentes registrados." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residentes.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nombre} {r.apellido}</td>
                  <td className="px-4 py-3 text-gray-600">{r.dni}</td>
                  {isAdminGlobal && (
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-medium text-gray-800">{r.residencia?.nombre}</span>
                      <span className="block text-xs text-gray-400">{r.residencia?.ciudad}</span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-600">{r.universidad}</td>
                  <td className="px-4 py-3 text-gray-600">{r.carrera}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.activo ? 'success' : 'secondary'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/residentes/${r.id}`)}
                      className="text-gray-400 hover:text-purple-600 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isAdminGlobal && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo residente">
          <form onSubmit={handleCreate} className="space-y-3">
            {[
              { id: 'email', label: 'Email', type: 'email' },
              { id: 'nombre', label: 'Nombre', type: 'text' },
              { id: 'apellido', label: 'Apellido', type: 'text' },
              { id: 'dni', label: 'DNI', type: 'text' },
              { id: 'edad', label: 'Edad', type: 'number' },
              { id: 'universidad', label: 'Universidad', type: 'text' },
              { id: 'carrera', label: 'Carrera', type: 'text' },
              { id: 'ciudad_origen', label: 'Ciudad de origen', type: 'text' },
              { id: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
            ].map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type}
                  value={form[id as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                  required
                />
              </div>
            ))}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
