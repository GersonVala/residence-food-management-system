import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Package } from 'lucide-react'

interface Categoria { id: number; nombre: string }
interface Alimento { id: number; nombre: string; unidad_base: string; categoria: { nombre: string } }

export default function AlimentosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalCat, setModalCat] = useState(false)
  const [modalAl, setModalAl] = useState(false)
  const [catNombre, setCatNombre] = useState('')
  const [alForm, setAlForm] = useState({ nombre: '', unidad_base: 'KG', categoria_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      api.get<Categoria[]>('/categorias'),
      api.get<Alimento[]>('/alimentos'),
    ]).then(([c, a]) => { setCategorias(c); setAlimentos(a) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreateCat(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/categorias', { nombre: catNombre })
      setModalCat(false)
      setCatNombre('')
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear categoría')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAl(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/alimentos', {
        nombre: alForm.nombre,
        unidad_base: alForm.unidad_base,
        categoria_id: Number(alForm.categoria_id),
      })
      setModalAl(false)
      setAlForm({ nombre: '', unidad_base: 'KG', categoria_id: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear alimento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Alimentos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModalCat(true)}>Nueva categoría</Button>
            <Button onClick={() => setModalAl(true)}>Nuevo alimento</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : alimentos.length === 0 ? (
          <EmptyState icon={Package} title="Sin alimentos" description="Creá una categoría y luego un alimento." />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Nombre', 'Unidad base', 'Categoría'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alimentos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{a.unidad_base}</td>
                    <td className="px-4 py-3 text-gray-600">{a.categoria.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalCat} onClose={() => setModalCat(false)} title="Nueva categoría">
        <form onSubmit={handleCreateCat} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cat-nombre">Nombre</Label>
            <Input id="cat-nombre" value={catNombre} onChange={e => setCatNombre(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalCat(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalAl} onClose={() => setModalAl(false)} title="Nuevo alimento">
        <form onSubmit={handleCreateAl} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="al-nombre">Nombre</Label>
            <Input id="al-nombre" value={alForm.nombre} onChange={e => setAlForm(f => ({ ...f, nombre: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="al-unidad">Unidad base</Label>
            <select
              id="al-unidad"
              value={alForm.unidad_base}
              onChange={e => setAlForm(f => ({ ...f, unidad_base: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['KG', 'GR', 'LT', 'ML', 'UNIDAD', 'PAQUETE'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="al-cat">Categoría</Label>
            <select
              id="al-cat"
              value={alForm.categoria_id}
              onChange={e => setAlForm(f => ({ ...f, categoria_id: e.target.value }))}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalAl(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
