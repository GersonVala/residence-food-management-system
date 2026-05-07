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
import { BookOpen, Clock, Trash2 } from 'lucide-react'

type Dificultad = 'FACIL' | 'MEDIA' | 'DIFICIL'

interface Menu {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
  activo: boolean
  descripcion?: string
}

const dificultadVariant: Record<Dificultad, 'success' | 'warning' | 'destructive'> = {
  FACIL: 'success', MEDIA: 'warning', DIFICIL: 'destructive'
}

export default function MenusPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nombre: '', dificultad: 'FACIL' as Dificultad, tiempo_min: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!residenciaId) return
    setLoading(true)
    api.get<Menu[]>(`/residencias/${residenciaId}/menus`)
      .then(setMenus)
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/residencias/${residenciaId}/menus`, {
        ...form,
        tiempo_min: Number(form.tiempo_min),
      })
      setModalOpen(false)
      setForm({ nombre: '', dificultad: 'FACIL', tiempo_min: '', descripcion: '' })
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
    await api.delete(`/menus/${id}`)
    load()
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Menús</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menús</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo menú</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : menus.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin menús" description="Creá el primer menú para esta residencia." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map(m => (
            <Card key={m.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BookOpen size={20} className="text-orange-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={dificultadVariant[m.dificultad]}>{m.dificultad}</Badge>
                    <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                {m.descripcion && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{m.descripcion}</p>}
                <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
                  <Clock size={14} />
                  {m.tiempo_min} min
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo menú">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dificultad">Dificultad</Label>
            <select
              id="dificultad"
              value={form.dificultad}
              onChange={e => setForm(f => ({ ...f, dificultad: e.target.value as Dificultad }))}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FACIL">Facil</option>
              <option value="MEDIA">Media</option>
              <option value="DIFICIL">Dificil</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiempo">Tiempo (minutos)</Label>
            <Input id="tiempo" type="number" value={form.tiempo_min} onChange={e => setForm(f => ({ ...f, tiempo_min: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="desc">Descripcion (opcional)</Label>
            <Input id="desc" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
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
