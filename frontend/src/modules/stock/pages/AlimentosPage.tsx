import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, ChevronDown, ChevronUp, ImagePlus, X } from 'lucide-react'

interface Categoria { id: number; nombre: string }

interface Alimento {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
  contenido_neto: number | null
  unidad_contenido: string | null
  imagen_url: string | null
  categoria: { nombre: string }
  calorias: number | null
  proteinas: number | null
  carbohidratos: number | null
  grasas: number | null
}

const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES'] as const

const EMPTY_FORM = {
  nombre: '',
  marca: '',
  unidad_base: 'PAQUETES',
  contenido_neto: '',
  unidad_contenido: 'GR',
  categoria_id: '',
  calorias: '',
  proteinas: '',
  carbohidratos: '',
  grasas: '',
}

function SelectUnidad({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
  )
}

export default function AlimentosPage() {
  const navigate = useNavigate()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCat, setModalCat] = useState(false)
  const [catNombre, setCatNombre] = useState('')

  const [modalAl, setModalAl] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [expandNutri, setExpandNutri] = useState(false)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  function clearImagen() {
    setImagenFile(null)
    setImagenPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function closeModal() {
    setModalAl(false)
    setForm({ ...EMPTY_FORM })
    setExpandNutri(false)
    clearImagen()
    setError('')
  }

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
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        unidad_base: form.unidad_base,
        categoria_id: Number(form.categoria_id),
      }
      if (form.marca) payload.marca = form.marca
      if (form.contenido_neto) {
        payload.contenido_neto = Number(form.contenido_neto)
        payload.unidad_contenido = form.unidad_contenido
      }
      if (form.calorias) payload.calorias = Number(form.calorias)
      if (form.proteinas) payload.proteinas = Number(form.proteinas)
      if (form.carbohidratos) payload.carbohidratos = Number(form.carbohidratos)
      if (form.grasas) payload.grasas = Number(form.grasas)

      const alimento = await api.post<Alimento>('/alimentos', payload)

      // Si hay imagen, subirla después de crear
      if (imagenFile) {
        const token = getToken()
        const fd = new FormData()
        fd.append('file', imagenFile)
        await fetch(`/api/alimentos/${alimento.id}/imagen`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
      }

      closeModal()
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear alimento')
    } finally {
      setSaving(false)
    }
  }

  const field = (id: string, label: string, type = 'text', required = false) => (
    <div className="space-y-1" key={id}>
      <Label htmlFor={id}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <Input
        id={id}
        type={type}
        value={form[id as keyof typeof form]}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        required={required}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Alimentos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setError(''); setModalCat(true) }}>Nueva categoría</Button>
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
                  {['', 'Nombre', 'Marca', 'Unidad base', 'Contenido', 'Categoría', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alimentos.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 w-10">
                      {a.imagen_url ? (
                        <img src={a.imagen_url} alt={a.nombre} className="w-9 h-9 rounded object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{a.marca ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.unidad_base}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.contenido_neto ? `${a.contenido_neto} ${a.unidad_contenido}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.categoria.nombre}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/alimentos/${a.id}`)}
                        className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal categoría */}
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

      {/* Modal alimento */}
      <Modal open={modalAl} onClose={closeModal} title="Nuevo alimento">
        <form onSubmit={handleCreateAl} className="space-y-4">

          {/* Datos básicos */}
          {field('nombre', 'Nombre', 'text', true)}
          {field('marca', 'Marca')}

          {/* Unidad base */}
          <div className="space-y-1">
            <Label htmlFor="al-unidad">Unidad base <span className="text-red-500">*</span></Label>
            <SelectUnidad id="al-unidad" value={form.unidad_base} onChange={v => setForm(f => ({ ...f, unidad_base: v }))} />
          </div>

          {/* Contenido neto del envase — solo visible si la unidad base es PAQUETES */}
          {form.unidad_base === 'PAQUETES' && (
          <div className="space-y-1">
            <Label>Contenido del envase <span className="text-xs text-gray-400">(opcional)</span></Label>
            <p className="text-xs text-gray-400">Ej: un paquete de Arroz Juan José tiene 500 GR</p>
            <div className="flex gap-2">
              <Input
                id="contenido_neto"
                type="number"
                min="0"
                step="any"
                placeholder="500"
                value={form.contenido_neto}
                onChange={e => setForm(f => ({ ...f, contenido_neto: e.target.value }))}
                className="flex-1"
              />
              <div className="w-36">
                <select
                  id="unidad_contenido"
                  value={form.unidad_contenido}
                  onChange={e => setForm(f => ({ ...f, unidad_contenido: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {UNIDADES.filter(u => u !== 'PAQUETES').map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Categoría */}
          <div className="space-y-1">
            <Label htmlFor="al-cat">Categoría <span className="text-red-500">*</span></Label>
            <select
              id="al-cat"
              value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen <span className="text-xs text-gray-400">(opcional)</span></Label>
            {imagenPreview ? (
              <div className="relative inline-block">
                <img src={imagenPreview} alt="preview" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={clearImagen}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-gray-300 rounded-full p-0.5 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors w-full justify-center"
              >
                <ImagePlus size={16} />
                Subir imagen
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImagenChange}
            />
          </div>

          {/* Valores nutricionales (colapsable) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandNutri(v => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span>Valores nutricionales <span className="text-xs font-normal text-gray-400">(opcionales)</span></span>
              {expandNutri ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandNutri && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {field('calorias', 'Calorías (kcal)', 'number')}
                {field('proteinas', 'Proteínas (g)', 'number')}
                {field('carbohidratos', 'Carbohidratos (g)', 'number')}
                {field('grasas', 'Grasas (g)', 'number')}
                <p className="col-span-2 text-xs text-gray-400">Valores cada 100g / 100ml</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
