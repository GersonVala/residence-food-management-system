import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Pencil, Save, X, ImagePlus } from 'lucide-react'

const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES', 'PAQUETES'] as const

interface Categoria { id: number; nombre: string }

interface Alimento {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
  contenido_neto: number | null
  unidad_contenido: string | null
  imagen_url: string | null
  categoria_id: number
  categoria: { nombre: string }
  calorias: number | null
  proteinas: number | null
  carbohidratos: number | null
  grasas: number | null
  ia_verificado: boolean
}

export default function AlimentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [alimento, setAlimento] = useState<Alimento | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get<Alimento>(`/alimentos/${id}`),
      api.get<Categoria[]>('/categorias'),
    ]).then(([a, c]) => {
      setAlimento(a)
      setCategorias(c)
      resetForm(a)
    }).finally(() => setLoading(false))
  }, [id])

  function resetForm(a: Alimento) {
    setForm({
      nombre: a.nombre,
      marca: a.marca ?? '',
      unidad_base: a.unidad_base,
      contenido_neto: a.contenido_neto != null ? String(a.contenido_neto) : '',
      unidad_contenido: a.unidad_contenido ?? 'GR',
      categoria_id: String(a.categoria_id),
      calorias: a.calorias != null ? String(a.calorias) : '',
      proteinas: a.proteinas != null ? String(a.proteinas) : '',
      carbohidratos: a.carbohidratos != null ? String(a.carbohidratos) : '',
      grasas: a.grasas != null ? String(a.grasas) : '',
    })
  }

  function cancelEdit() {
    if (alimento) resetForm(alimento)
    setEditing(false)
    setImagenFile(null)
    setImagenPreview(null)
    setError('')
  }

  function handleImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!id || !alimento) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        unidad_base: form.unidad_base,
        categoria_id: Number(form.categoria_id),
      }
      if (form.marca) payload.marca = form.marca
      if (form.unidad_base === 'PAQUETES' && form.contenido_neto) {
        payload.contenido_neto = Number(form.contenido_neto)
        payload.unidad_contenido = form.unidad_contenido
      }
      if (form.calorias) payload.calorias = Number(form.calorias)
      if (form.proteinas) payload.proteinas = Number(form.proteinas)
      if (form.carbohidratos) payload.carbohidratos = Number(form.carbohidratos)
      if (form.grasas) payload.grasas = Number(form.grasas)

      const updated = await api.patch<Alimento>(`/alimentos/${id}`, payload)

      if (imagenFile) {
        const token = getToken()
        const fd = new FormData()
        fd.append('file', imagenFile)
        await fetch(`/api/alimentos/${id}/imagen`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        const refreshed = await api.get<Alimento>(`/alimentos/${id}`)
        setAlimento(refreshed)
        resetForm(refreshed)
      } else {
        setAlimento(updated)
        resetForm(updated)
      }

      setEditing(false)
      setImagenFile(null)
      setImagenPreview(null)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>
  if (!alimento) return <p className="text-gray-500">Alimento no encontrado.</p>

  const imagenSrc = imagenPreview ?? alimento.imagen_url

  const campo = (label: string, key: string, type = 'text') => (
    <div className="space-y-1" key={key}>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      {editing ? (
        <Input
          type={type}
          min={type === 'number' ? '0' : undefined}
          step={type === 'number' ? 'any' : undefined}
          value={form[key] ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <p className="text-sm font-medium text-gray-900">
          {alimento[key as keyof Alimento] != null ? String(alimento[key as keyof Alimento]) : '—'}
        </p>
      )}
    </div>
  )

  const campoSelect = (label: string, key: string, options: readonly string[]) => (
    <div className="space-y-1" key={key}>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      {editing ? (
        <select
          value={form[key] ?? ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <p className="text-sm font-medium text-gray-900">{String(alimento[key as keyof Alimento] ?? '—')}</p>
      )}
    </div>
  )

  const campoCategoria = () => (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Categoría</p>
      {editing ? (
        <select
          value={form.categoria_id}
          onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      ) : (
        <p className="text-sm font-medium text-gray-900">{alimento.categoria.nombre}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/alimentos')} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{alimento.nombre}</h1>
          {alimento.marca && <p className="text-sm text-gray-500">{alimento.marca}</p>}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} className="mr-1.5" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              <X size={14} className="mr-1.5" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1.5" /> {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      {/* Imagen */}
      <div className="flex items-start gap-6">
        <div className="shrink-0">
          {imagenSrc ? (
            <img src={imagenSrc} alt={alimento.nombre} className="w-32 h-32 rounded-xl object-cover border border-gray-200 shadow-sm" />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center px-2">
              Sin imagen
            </div>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 transition-colors"
              >
                <ImagePlus size={13} /> Cambiar imagen
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagenChange} />
            </>
          )}
        </div>

        {/* Datos básicos */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-2 gap-x-6 gap-y-4">
          {campo('Nombre', 'nombre')}
          {campo('Marca', 'marca')}
          {campoSelect('Unidad base', 'unidad_base', UNIDADES)}
          {campoCategoria()}
          {(form.unidad_base === 'PAQUETES' || alimento.unidad_base === 'PAQUETES') && (
            <>
              {campo('Contenido neto', 'contenido_neto', 'number')}
              {editing
                ? campoSelect('Unidad contenido', 'unidad_contenido', UNIDADES.filter(u => u !== 'PAQUETES'))
                : (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unidad contenido</p>
                    <p className="text-sm font-medium text-gray-900">{alimento.unidad_contenido ?? '—'}</p>
                  </div>
                )
              }
            </>
          )}
        </div>
      </div>

      {/* Valores nutricionales */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Valores nutricionales</h2>
          <span className="text-xs text-gray-400">cada 100g / 100ml</span>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {campo('Calorías (kcal)', 'calorias', 'number')}
          {campo('Proteínas (g)', 'proteinas', 'number')}
          {campo('Carbohidratos (g)', 'carbohidratos', 'number')}
          {campo('Grasas (g)', 'grasas', 'number')}
        </div>
        {alimento.ia_verificado && (
          <div className="px-5 pb-4">
            <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">Verificado por IA</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
    </div>
  )
}
