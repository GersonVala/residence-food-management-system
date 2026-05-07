import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Trash2 } from 'lucide-react'

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
}

export default function ResidentesPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

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
    if (!residenciaId) return
    setLoading(true)
    api.get<Residente[]>(`/residencias/${residenciaId}/residentes`)
      .then(setResidentes)
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

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

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este residente?')) return
    await api.delete(`/residentes/${id}`)
    load()
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo residente</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : residentes.length === 0 ? (
        <EmptyState icon={Users} title="Sin residentes" description="Agregá el primer residente a esta residencia." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nombre', 'DNI', 'Universidad', 'Carrera', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residentes.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nombre} {r.apellido}</td>
                  <td className="px-4 py-3 text-gray-600">{r.dni}</td>
                  <td className="px-4 py-3 text-gray-600">{r.universidad}</td>
                  <td className="px-4 py-3 text-gray-600">{r.carrera}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.activo ? 'success' : 'secondary'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  )
}
