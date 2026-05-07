import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, AlertTriangle } from 'lucide-react'

interface Alimento { id: number; nombre: string; unidad_base: string }
interface Stock {
  id: number
  cantidad: number
  unidad: string
  fecha_vencimiento?: string
  activo: boolean
  alimento: { nombre: string; unidad_base: string }
}

export default function StockPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [stock, setStock] = useState<Stock[]>([])
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ alimento_id: '', cantidad: '', unidad: '', fecha_vencimiento: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!residenciaId) return
    setLoading(true)
    Promise.all([
      api.get<Stock[]>(`/residencias/${residenciaId}/stock`),
      api.get<Alimento[]>('/alimentos'),
    ]).then(([s, a]) => { setStock(s); setAlimentos(a) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [residenciaId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        alimento_id: Number(form.alimento_id),
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
      }
      if (form.fecha_vencimiento) body.fecha_vencimiento = new Date(form.fecha_vencimiento).toISOString()
      await api.post(`/residencias/${residenciaId}/stock`, body)
      setModalOpen(false)
      setForm({ alimento_id: '', cantidad: '', unidad: '', fecha_vencimiento: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al registrar stock')
    } finally {
      setSaving(false)
    }
  }

  function isExpiringSoon(fecha?: string) {
    if (!fecha) return false
    const days = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days <= 7
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <Button onClick={() => setModalOpen(true)}>Registrar entrada</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : stock.length === 0 ? (
        <EmptyState icon={Package} title="Sin stock" description="Registra el primer ingreso de alimentos." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Alimento', 'Cantidad', 'Unidad', 'Vencimiento', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.alimento.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.cantidad}</td>
                  <td className="px-4 py-3 text-gray-600">{s.unidad}</td>
                  <td className="px-4 py-3">
                    {s.fecha_vencimiento ? (
                      <span className={`flex items-center gap-1 ${isExpiringSoon(s.fecha_vencimiento) ? 'text-red-600' : 'text-gray-600'}`}>
                        {isExpiringSoon(s.fecha_vencimiento) && <AlertTriangle size={14} />}
                        {new Date(s.fecha_vencimiento).toLocaleDateString('es-AR')}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.activo ? 'success' : 'secondary'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar entrada de stock">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="alimento">Alimento</Label>
            <select
              id="alimento"
              value={form.alimento_id}
              onChange={e => {
                const alimento = alimentos.find(a => a.id === Number(e.target.value))
                setForm(f => ({ ...f, alimento_id: e.target.value, unidad: alimento?.unidad_base ?? '' }))
              }}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un alimento</option>
              {alimentos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input id="cantidad" type="number" step="0.01" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unidad">Unidad</Label>
            <Input id="unidad" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vencimiento">Fecha de vencimiento (opcional)</Label>
            <Input id="vencimiento" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
