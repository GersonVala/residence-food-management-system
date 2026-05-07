import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { CalendarDays, Trash2 } from 'lucide-react'

interface Grupo { id: number; nombre: string }
interface Turno {
  id: number
  fecha: string
  franja: 'ALMUERZO' | 'CENA'
  activo: boolean
  grupo: { nombre: string }
}

export default function TurnosPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ grupo_id: '', fecha: '', franja: 'ALMUERZO' as 'ALMUERZO' | 'CENA' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!residenciaId) return
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
    if (!residenciaId) return
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

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Turnos</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Turnos de Cocina</h1>
        <Button onClick={() => setModalOpen(true)}>Nuevo turno</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : turnos.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin turnos" description="Creá el primer turno de cocina." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Franja', 'Grupo', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {turnos.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{new Date(t.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.franja === 'ALMUERZO' ? 'default' : 'warning'}>{t.franja}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.grupo.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.activo ? 'success' : 'secondary'}>{t.activo ? 'Activo' : 'Cancelado'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo turno">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="grupo">Grupo</Label>
            <select
              id="grupo"
              value={form.grupo_id}
              onChange={e => setForm(f => ({ ...f, grupo_id: e.target.value }))}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccioná un grupo</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="franja">Franja</Label>
            <select
              id="franja"
              value={form.franja}
              onChange={e => setForm(f => ({ ...f, franja: e.target.value as 'ALMUERZO' | 'CENA' }))}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALMUERZO">Almuerzo</option>
              <option value="CENA">Cena</option>
            </select>
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
