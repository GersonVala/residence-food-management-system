import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Trash2 } from 'lucide-react'

interface Grupo {
  id: number
  nombre: string
  activo: boolean
  _count?: { integrantes: number }
}

export default function GruposPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!residenciaId) return
    setLoading(true)
    api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`)
      .then(setGrupos)
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
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

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo grupo</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : grupos.length === 0 ? (
        <EmptyState icon={Users} title="Sin grupos" description="Creá el primer grupo de cocina." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map(g => (
            <Card key={g.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={g.activo ? 'success' : 'secondary'}>{g.activo ? 'Activo' : 'Disuelto'}</Badge>
                    <button onClick={() => handleDelete(g.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{g.nombre}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo grupo">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Grupo Lunes"
              required
            />
          </div>
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
