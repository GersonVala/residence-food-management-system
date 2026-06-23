import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { AlimentoPicker, type AlimentoPickerItem } from '@/components/ui/AlimentoPicker'
import {
  BookOpen, Clock, Trash2, Copy, Users, ChevronRight, Search,
  Video, Pencil, ImagePlus, ExternalLink, ChefHat, Plus
} from 'lucide-react'

type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface Ingrediente {
  alimento_id: number
  cantidad_base: number
  cantidad_por_persona: number
  unidad: string
  alimento: { nombre: string; marca: string | null }
}

interface Menu {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
  personas_base: number
  activo: boolean
  descripcion?: string | null
  video_url?: string | null
  imagen_url?: string | null
  ingredientes: Ingrediente[]
  residencia_id: number | null
}

interface AlimentoBasico {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
}

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  FACIL: 'Fácil',
  MEDIO: 'Medio',
  DIFICIL: 'Difícil',
}

const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES'] as const

// ─── MenuCard ────────────────────────────────────────────────────────────────

function MenuCard({
  menu,
  alimentos,
  onDelete,
  onClonar,
  onUpdate,
  onIngredienteAdded,
  onIngredienteRemoved,
  esBiblioteca,
}: {
  menu: Menu
  alimentos: AlimentoBasico[]
  onDelete?: () => void
  onClonar?: () => void
  onUpdate: (updated: Partial<Menu> & { id: number }) => void
  onIngredienteAdded: () => void
  onIngredienteRemoved: () => void
  esBiblioteca: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [personas, setPersonas] = useState(menu.personas_base)

  // Edición inline
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    nombre: menu.nombre,
    dificultad: menu.dificultad,
    tiempo_min: String(menu.tiempo_min),
    personas_base: String(menu.personas_base),
    descripcion: menu.descripcion ?? '',
    video_url: menu.video_url ?? '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Ingredientes en modal edición
  const [editPersonas, setEditPersonas] = useState(menu.personas_base)
  const [editIngForm, setEditIngForm] = useState({ alimento_id: '', nombre: '', marca: '' as string | null, cantidad_base: '', unidad: 'GR' })
  const [editPickerOpen, setEditPickerOpen] = useState(false)
  const [addingEditIng, setAddingEditIng] = useState(false)
  const [savingEditIng, setSavingEditIng] = useState(false)
  const [editIngError, setEditIngError] = useState('')

  // Upload imagen
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  // Agregar ingrediente (card expandida)
  const [addingIng, setAddingIng] = useState(false)
  const [ingForm, setIngForm] = useState({ alimento_id: '', nombre: '', marca: '' as string | null, cantidad_base: '', unidad: 'GR' })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingIng, setSavingIng] = useState(false)
  const [ingError, setIngError] = useState('')

  function calcCantidad(ing: Ingrediente) {
    if (menu.personas_base === 0) return ing.cantidad_base
    return (ing.cantidad_base / menu.personas_base) * personas
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSavingEdit(true)
    setEditError('')
    try {
      await api.patch(`/menus/${menu.id}`, {
        nombre: editForm.nombre.trim(),
        dificultad: editForm.dificultad,
        tiempo_min: Number(editForm.tiempo_min),
        personas_base: Number(editForm.personas_base),
        ...(editForm.descripcion ? { descripcion: editForm.descripcion } : { descripcion: null }),
        ...(editForm.video_url ? { video_url: editForm.video_url } : { video_url: null }),
      })
      onUpdate({
        id: menu.id,
        nombre: editForm.nombre.trim(),
        dificultad: editForm.dificultad,
        tiempo_min: Number(editForm.tiempo_min),
        personas_base: Number(editForm.personas_base),
        descripcion: editForm.descripcion || null,
        video_url: editForm.video_url || null,
      })
      setEditOpen(false)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setEditError(e.mensaje ?? 'Error al guardar')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleUploadImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.upload<{ id: number; imagen_url: string }>(`/menus/${menu.id}/imagen`, fd)
      onUpdate({ ...menu, imagen_url: res.imagen_url })
    } finally {
      setUploadingImg(false)
      if (imgInputRef.current) imgInputRef.current.value = ''
    }
  }

  async function handleAddEditIng() {
    setSavingEditIng(true)
    setEditIngError('')
    try {
      await api.post(`/menus/${menu.id}/ingredientes`, {
        alimento_id: Number(editIngForm.alimento_id),
        cantidad_base: Number(editIngForm.cantidad_base),
        cantidad_por_persona: 0,
        unidad: editIngForm.unidad,
      })
      setEditIngForm({ alimento_id: '', nombre: '', marca: '', cantidad_base: '', unidad: 'GR' })
      setAddingEditIng(false)
      onIngredienteAdded()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setEditIngError(e.mensaje ?? 'Error al agregar ingrediente')
    } finally {
      setSavingEditIng(false)
    }
  }

  async function handleAddIng(e: React.FormEvent) {
    e.preventDefault()
    setSavingIng(true)
    setIngError('')
    try {
      await api.post(`/menus/${menu.id}/ingredientes`, {
        alimento_id: Number(ingForm.alimento_id),
        cantidad_base: Number(ingForm.cantidad_base),
        cantidad_por_persona: 0,
        unidad: ingForm.unidad,
      })
      setIngForm({ alimento_id: '', nombre: '', marca: '', cantidad_base: '', unidad: 'GR' })
      setAddingIng(false)
      onIngredienteAdded()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setIngError(e.mensaje ?? 'Error al agregar ingrediente')
    } finally {
      setSavingIng(false)
    }
  }

  async function handleRemoveIng(alimento_id: number) {
    await api.delete(`/menus/${menu.id}/ingredientes/${alimento_id}`)
    onIngredienteRemoved()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">

      {/* Imagen del menú */}
      <div className="relative h-40 bg-gradient-to-br from-orange-50 to-amber-100 overflow-hidden">
        {menu.imagen_url ? (
          <img
            src={menu.imagen_url}
            alt={menu.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat size={40} className="text-orange-200" />
          </div>
        )}

        {/* Overlay acciones en imagen */}
        {!esBiblioteca && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingImg}
              title="Cambiar imagen"
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-500 hover:text-orange-600 transition-colors"
            >
              {uploadingImg ? (
                <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImagePlus size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setEditForm({ nombre: menu.nombre, dificultad: menu.dificultad, tiempo_min: String(menu.tiempo_min), personas_base: String(menu.personas_base), descripcion: menu.descripcion ?? '', video_url: menu.video_url ?? '' }); setEditOpen(true) }}
              title="Editar menú"
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {esBiblioteca && (
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={onClonar}
              title="Copiar a mis menús"
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors"
            >
              <Copy size={14} />
            </button>
          </div>
        )}

        {/* Badge dificultad sobre imagen */}
        <div className="absolute bottom-2 left-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${DIFICULTAD_COLOR[menu.dificultad]}`}>
            {DIFICULTAD_LABEL[menu.dificultad]}
          </span>
        </div>

        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadImagen}
        />
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{menu.nombre}</h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} /> {menu.tiempo_min} min
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} /> {menu.personas_base} pers.
            </span>
            {menu.video_url && (
              <a
                href={menu.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium ml-auto"
                onClick={e => e.stopPropagation()}
              >
                <Video size={11} /> Ver video <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        {menu.descripcion && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{menu.descripcion}</p>
        )}

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
        >
          <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Ocultar receta' : `Ver receta (${menu.ingredientes.length} ingrediente${menu.ingredientes.length !== 1 ? 's' : ''})`}
        </button>
      </div>

      {/* Receta expandida */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Calculadora */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Calcular para</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setPersonas(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-l border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
              >−</button>
              <input
                type="number"
                min="1"
                value={personas}
                onChange={e => setPersonas(Math.max(1, Number(e.target.value)))}
                className="w-12 h-7 border-t border-b border-gray-300 text-center text-sm bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPersonas(p => p + 1)}
                className="w-7 h-7 rounded-r border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold text-sm"
              >+</button>
            </div>
            <span className="text-xs text-gray-400">personas</span>
            {personas !== menu.personas_base && (
              <button type="button" onClick={() => setPersonas(menu.personas_base)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                resetear
              </button>
            )}
          </div>

          {/* Tabla ingredientes */}
          {menu.ingredientes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin ingredientes cargados.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Ingrediente</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Cant.</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Unidad</th>
                    {!esBiblioteca && <th className="w-8 px-2 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {menu.ingredientes.map(ing => {
                    const cant = calcCantidad(ing)
                    const cambio = personas !== menu.personas_base
                    return (
                      <tr key={ing.alimento_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800 font-medium">
                          {ing.alimento.nombre}
                          {ing.alimento.marca && <span className="text-gray-400 ml-1">({ing.alimento.marca})</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          <span className={cambio ? 'text-purple-700' : 'text-gray-800'}>
                            {Number.isInteger(cant) ? cant : cant.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{ing.unidad}</td>
                        {!esBiblioteca && (
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => handleRemoveIng(ing.alimento_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Agregar ingrediente */}
          {!esBiblioteca && (
            addingIng ? (
              <form onSubmit={handleAddIng} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:border-purple-400 hover:text-purple-600 transition-colors text-sm text-left"
                >
                  <Search size={14} className="text-gray-400 shrink-0" />
                  {ingForm.alimento_id ? (
                    <span className="font-medium text-gray-900 truncate">
                      {ingForm.nombre}{ingForm.marca ? ` — ${ingForm.marca}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">Buscar alimento...</span>
                  )}
                </button>
                {ingForm.alimento_id && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Cantidad para {menu.personas_base} pers.</Label>
                      <Input type="number" step="0.01" min="0" value={ingForm.cantidad_base} onChange={e => setIngForm(f => ({ ...f, cantidad_base: e.target.value }))} required className="h-9 text-sm" autoFocus />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Unidad</Label>
                      <select
                        value={ingForm.unidad}
                        onChange={e => setIngForm(f => ({ ...f, unidad: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {ingError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{ingError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAddingIng(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" className="flex-1" disabled={savingIng || !ingForm.alimento_id || !ingForm.cantidad_base}>
                    {savingIng ? 'Guardando...' : 'Agregar'}
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingIng(true)}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                <Plus size={12} /> Agregar ingrediente
              </button>
            )
          )}

          <AlimentoPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={a => setIngForm(f => ({ ...f, alimento_id: String(a.id), nombre: a.nombre, marca: a.marca, unidad: a.unidad_base }))}
            alimentos={alimentos as AlimentoPickerItem[]}
            excluirIds={menu.ingredientes.map(i => i.alimento_id)}
          />
        </div>
      )}

      {/* Modal editar menú */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar menú">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} required autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Dificultad</Label>
              <select
                value={editForm.dificultad}
                onChange={e => setEditForm(f => ({ ...f, dificultad: e.target.value as Dificultad }))}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="FACIL">Fácil</option>
                <option value="MEDIO">Medio</option>
                <option value="DIFICIL">Difícil</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tiempo (min)</Label>
              <Input type="number" min="1" value={editForm.tiempo_min} onChange={e => setEditForm(f => ({ ...f, tiempo_min: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Pers. base</Label>
              <Input type="number" min="1" value={editForm.personas_base} onChange={e => setEditForm(f => ({ ...f, personas_base: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción <span className="text-xs text-gray-400 font-normal">(opc.)</span></Label>
            <textarea
              value={editForm.descripcion}
              onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Pasos, notas, tips..."
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Video size={13} className="text-gray-400" /> Link al video <span className="text-xs text-gray-400 font-normal">(opc.)</span>
            </Label>
            <Input
              type="url"
              placeholder="https://youtube.com/..."
              value={editForm.video_url}
              onChange={e => setEditForm(f => ({ ...f, video_url: e.target.value }))}
            />
          </div>
          {/* Ingredientes en edición */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Ingredientes</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Para</span>
                <div className="flex items-center">
                  <button type="button" onClick={() => setEditPersonas(p => Math.max(1, p - 1))} className="w-6 h-6 rounded-l border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">−</button>
                  <input
                    type="number" min="1" value={editPersonas}
                    onChange={e => setEditPersonas(Math.max(1, Number(e.target.value)))}
                    className="w-10 h-6 border-t border-b border-gray-300 text-center text-xs bg-white focus:outline-none"
                  />
                  <button type="button" onClick={() => setEditPersonas(p => p + 1)} className="w-6 h-6 rounded-r border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold">+</button>
                </div>
                <span>personas</span>
                {editPersonas !== menu.personas_base && (
                  <button type="button" onClick={() => setEditPersonas(menu.personas_base)} className="text-gray-400 hover:text-gray-600 underline">resetear</button>
                )}
              </div>
            </div>

            {menu.ingredientes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin ingredientes.</p>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-100">
                    {menu.ingredientes.map(ing => {
                      const cant = menu.personas_base === 0 ? ing.cantidad_base : (ing.cantidad_base / menu.personas_base) * editPersonas
                      const escalado = editPersonas !== menu.personas_base
                      return (
                        <tr key={ing.alimento_id} className="hover:bg-gray-100">
                          <td className="px-3 py-2 text-gray-800 font-medium">
                            {ing.alimento.nombre}
                            {ing.alimento.marca && <span className="text-gray-400 ml-1">({ing.alimento.marca})</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            <span className={escalado ? 'text-purple-700' : 'text-gray-700'}>
                              {Number.isInteger(cant) ? cant : cant.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{ing.unidad}</td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => handleRemoveIng(ing.alimento_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {addingEditIng ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setEditPickerOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-purple-400 hover:text-purple-600 transition-colors text-sm text-left"
                >
                  <Search size={14} className="text-gray-400 shrink-0" />
                  {editIngForm.alimento_id ? (
                    <span className="font-medium text-gray-900 truncate">
                      {editIngForm.nombre}{editIngForm.marca ? ` — ${editIngForm.marca}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">Buscar alimento...</span>
                  )}
                </button>
                {editIngForm.alimento_id && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Cantidad para {editForm.personas_base} pers.</Label>
                      <Input type="number" step="0.01" min="0" value={editIngForm.cantidad_base} onChange={e => setEditIngForm(f => ({ ...f, cantidad_base: e.target.value }))} required className="h-9 text-sm" autoFocus />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Unidad</Label>
                      <select
                        value={editIngForm.unidad}
                        onChange={e => setEditIngForm(f => ({ ...f, unidad: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {editIngError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{editIngError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAddingEditIng(false)}>Cancelar</Button>
                  <Button type="button" size="sm" className="flex-1" disabled={savingEditIng || !editIngForm.alimento_id || !editIngForm.cantidad_base} onClick={handleAddEditIng}>
                    {savingEditIng ? 'Guardando...' : 'Agregar'}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingEditIng(true)}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                <Plus size={12} /> Agregar ingrediente
              </button>
            )}

            <AlimentoPicker
              open={editPickerOpen}
              onClose={() => setEditPickerOpen(false)}
              onSelect={a => setEditIngForm(f => ({ ...f, alimento_id: String(a.id), nombre: a.nombre, marca: a.marca, unidad: a.unidad_base }))}
              alimentos={alimentos as AlimentoPickerItem[]}
              excluirIds={menu.ingredientes.map(i => i.alimento_id)}
            />
          </div>

          {editError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Formulario local de ingredientes ────────────────────────────────────────

interface IngredienteLocal {
  alimento_id: number
  nombre: string
  marca: string | null
  cantidad_base: number
  unidad: string
}

const FORM_VACIO = {
  nombre: '', dificultad: 'FACIL' as Dificultad, tiempo_min: '',
  personas_base: '4', descripcion: '', video_url: '',
}
const ING_VACIO = { alimento_id: '', nombre: '', marca: '' as string | null, cantidad_base: '', unidad: 'GR' }

// ─── MenusPage ───────────────────────────────────────────────────────────────

export default function MenusPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [tab, setTab] = useState<'mis' | 'biblioteca'>('mis')
  const [misMenus, setMisMenus] = useState<Menu[]>([])
  const [biblioteca, setBiblioteca] = useState<Menu[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [ingredientesLocales, setIngredientesLocales] = useState<IngredienteLocal[]>([])
  const [ingForm, setIngForm] = useState(ING_VACIO)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function loadMis() {
    if (!residenciaId) return Promise.resolve()
    return api.get<Menu[]>(`/residencias/${residenciaId}/menus`).then(setMisMenus)
  }

  function loadBiblioteca() {
    return api.get<Menu[]>('/menus/biblioteca').then(setBiblioteca)
  }

  useEffect(() => {
    if (!residenciaId) return
    setLoading(true)
    Promise.all([
      loadMis(),
      loadBiblioteca(),
      api.get<AlimentoBasico[]>('/alimentos').then(setAlimentos),
    ]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenciaId])

  function handleMenuUpdate(updated: Partial<Menu> & { id: number }) {
    setMisMenus(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, ingredientes: m.ingredientes } : m))
  }

  function handleAbrirModal() {
    setForm(FORM_VACIO)
    setIngredientesLocales([])
    setIngForm(ING_VACIO)
    setError('')
    setModalOpen(true)
  }

  function handleAgregarIngLocal() {
    if (!ingForm.alimento_id || !ingForm.cantidad_base) return
    if (ingredientesLocales.some(i => i.alimento_id === Number(ingForm.alimento_id))) return
    setIngredientesLocales(prev => [...prev, {
      alimento_id: Number(ingForm.alimento_id),
      nombre: ingForm.nombre,
      marca: ingForm.marca,
      cantidad_base: Number(ingForm.cantidad_base),
      unidad: ingForm.unidad,
    }])
    setIngForm(ING_VACIO)
  }

  function handleQuitarIngLocal(alimento_id: number) {
    setIngredientesLocales(prev => prev.filter(i => i.alimento_id !== alimento_id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setError('')
    try {
      const menu = await api.post<{ id: number }>(`/residencias/${residenciaId}/menus`, {
        nombre: form.nombre,
        dificultad: form.dificultad,
        tiempo_min: Number(form.tiempo_min),
        personas_base: Number(form.personas_base),
        ...(form.descripcion ? { descripcion: form.descripcion } : {}),
        ...(form.video_url ? { video_url: form.video_url } : {}),
      })
      for (const ing of ingredientesLocales) {
        await api.post(`/menus/${menu.id}/ingredientes`, {
          alimento_id: ing.alimento_id,
          cantidad_base: ing.cantidad_base,
          cantidad_por_persona: 0,
          unidad: ing.unidad,
        })
      }
      setModalOpen(false)
      loadMis()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear menú')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este menú?')) return
    try {
      await api.delete(`/menus/${id}`)
      loadMis()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      alert(e.mensaje ?? 'Error al eliminar el menú')
    }
  }

  async function handleClonar(id: number) {
    if (!residenciaId) return
    try {
      await api.post(`/menus/${id}/clonar`, { residencia_id: residenciaId })
      await loadMis()
      setTab('mis')
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      alert(e.mensaje ?? 'Error al copiar el menú')
    }
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Menús</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  const personasBase = Number(form.personas_base) || 4

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menús</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {tab === 'mis'
              ? `${misMenus.length} menú${misMenus.length !== 1 ? 's' : ''} en tu residencia`
              : `${biblioteca.length} menú${biblioteca.length !== 1 ? 's' : ''} en la biblioteca`
            }
          </p>
        </div>
        {tab === 'mis' && (
          <Button onClick={handleAbrirModal} className="gap-2">
            <Plus size={16} /> Nuevo menú
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['mis', 'biblioteca'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'mis' ? 'Mis menús' : 'Biblioteca'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tab === 'mis' ? (
        misMenus.length === 0 ? (
          <EmptyState icon={BookOpen} title="Sin menús" description="Creá el primer menú o copiá uno de la biblioteca." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {misMenus.map(m => (
              <MenuCard
                key={m.id}
                menu={m}
                alimentos={alimentos}
                esBiblioteca={false}
                onDelete={() => handleDelete(m.id)}
                onUpdate={handleMenuUpdate}
                onIngredienteAdded={loadMis}
                onIngredienteRemoved={loadMis}
              />
            ))}
          </div>
        )
      ) : (
        biblioteca.length === 0 ? (
          <EmptyState icon={BookOpen} title="Biblioteca vacía" description="Aún no hay menús compartidos." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {biblioteca.map(m => (
              <MenuCard
                key={m.id}
                menu={m}
                alimentos={alimentos}
                esBiblioteca={true}
                onClonar={() => handleClonar(m.id)}
                onUpdate={() => {}}
                onIngredienteAdded={() => {}}
                onIngredienteRemoved={() => {}}
              />
            ))}
          </div>
        )
      )}

      {/* Modal nuevo menú */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo menú">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mn-nombre">Nombre</Label>
            <Input id="mn-nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mn-dif">Dificultad</Label>
              <select
                id="mn-dif"
                value={form.dificultad}
                onChange={e => setForm(f => ({ ...f, dificultad: e.target.value as Dificultad }))}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="FACIL">Fácil</option>
                <option value="MEDIO">Medio</option>
                <option value="DIFICIL">Difícil</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mn-tiempo">Tiempo (min)</Label>
              <Input id="mn-tiempo" type="number" min="1" value={form.tiempo_min} onChange={e => setForm(f => ({ ...f, tiempo_min: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mn-personas">Pers. base</Label>
              <Input id="mn-personas" type="number" min="1" value={form.personas_base} onChange={e => setForm(f => ({ ...f, personas_base: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mn-desc">Descripción <span className="text-xs text-gray-400 font-normal">(opc.)</span></Label>
            <textarea
              id="mn-desc"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Pasos de la receta, notas, tips..."
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mn-video" className="flex items-center gap-1.5">
              <Video size={13} className="text-gray-400" /> Link al video <span className="text-xs text-gray-400 font-normal">(opc.)</span>
            </Label>
            <Input id="mn-video" type="url" placeholder="https://youtube.com/..." value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} />
          </div>

          {/* Ingredientes */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Ingredientes <span className="ml-1 text-xs font-normal text-gray-400">para {personasBase} personas</span>
            </p>

            {ingredientesLocales.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {ingredientesLocales.map(ing => (
                      <tr key={ing.alimento_id}>
                        <td className="px-3 py-2 text-gray-800 font-medium">
                          {ing.nombre}
                          {ing.marca && <span className="text-gray-400 ml-1 text-xs">({ing.marca})</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-right font-semibold">{ing.cantidad_base}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{ing.unidad}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => handleQuitarIngLocal(ing.alimento_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-purple-400 hover:text-purple-600 transition-colors text-sm text-left"
              >
                <Search size={15} className="text-gray-400 shrink-0" />
                {ingForm.alimento_id ? (
                  <span className="font-medium text-gray-900 truncate">
                    {ingForm.nombre}{ingForm.marca ? ` — ${ingForm.marca}` : ''}
                  </span>
                ) : (
                  <span className="text-gray-400">Buscar alimento...</span>
                )}
              </button>

              {ingForm.alimento_id && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">Cantidad para {form.personas_base || 4} personas</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={ingForm.cantidad_base}
                      onChange={e => setIngForm(f => ({ ...f, cantidad_base: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs text-gray-500">Unidad</Label>
                    <select
                      value={ingForm.unidad}
                      onChange={e => setIngForm(f => ({ ...f, unidad: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <Button type="button" size="sm" className="h-9 shrink-0" onClick={handleAgregarIngLocal} disabled={!ingForm.cantidad_base}>
                    + Agregar
                  </Button>
                </div>
              )}
            </div>

            <AlimentoPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={a => setIngForm(f => ({ ...f, alimento_id: String(a.id), nombre: a.nombre, marca: a.marca, unidad: a.unidad_base }))}
              alimentos={alimentos as AlimentoPickerItem[]}
              excluirIds={ingredientesLocales.map(i => i.alimento_id)}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : `Crear menú${ingredientesLocales.length > 0 ? ` (${ingredientesLocales.length} ing.)` : ''}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
