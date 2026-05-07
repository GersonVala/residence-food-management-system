import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2, MapPin, Trash2 } from 'lucide-react'

interface Residencia {
  id: number
  nombre: string
  ciudad: string
  provincia: string
  capacidad_max: number
  rollback_horas: number
  activo: boolean
}

export default function ResidenciasPage() {
  const [residencias, setResidencias] = useState<Residencia[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    nombre: '', direccion: '', ciudad: '', provincia: '',
    capacidad_max: '', rollback_horas: '2'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    api.get<Residencia[]>('/residencias')
      .then(setResidencias)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/residencias', {
        ...form,
        capacidad_max: Number(form.capacidad_max),
        rollback_horas: Number(form.rollback_horas),
      })
      setModalOpen(false)
      setForm({ nombre: '', direccion: '', ciudad: '', provincia: '', capacidad_max: '', rollback_horas: '2' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear residencia')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta residencia?')) return
    await api.delete(`/residencias/${id}`)
    load()
  }

  if (loading) return <div className="text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Residencias</h1>
        <Button onClick={() => setModalOpen(true)}>Nueva residencia</Button>
      </div>

      {residencias.length === 0 ? (
        <EmptyState icon={Building2} title="Sin residencias" description="Creá la primera residencia del sistema." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residencias.map(r => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.activo ? 'success' : 'secondary'}>
                      {r.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{r.nombre}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  {r.ciudad}, {r.provincia}
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <div>Capacidad: {r.capacidad_max} residentes</div>
                  <div>Rollback: {r.rollback_horas}h</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva residencia">
        <form onSubmit={handleCreate} className="space-y-3">
          {[
            { id: 'nombre', label: 'Nombre', type: 'text' },
            { id: 'direccion', label: 'Dirección', type: 'text' },
            { id: 'ciudad', label: 'Ciudad', type: 'text' },
            { id: 'provincia', label: 'Provincia', type: 'text' },
            { id: 'capacidad_max', label: 'Capacidad máxima', type: 'number' },
            { id: 'rollback_horas', label: 'Horas de rollback', type: 'number' },
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
