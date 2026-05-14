import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlimentoPickerItem {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
  imagen_url?: string | null
  categoria: { id: number; nombre: string }
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (alimento: AlimentoPickerItem) => void
  alimentos: AlimentoPickerItem[]
  excluirIds?: number[]
}

export function AlimentoPicker({ open, onClose, onSelect, alimentos, excluirIds = [] }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setBusqueda('')
      setCategoriaActiva('Todos')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const disponibles = alimentos.filter(a => !excluirIds.includes(a.id))

  const categorias = ['Todos', ...Array.from(new Set(disponibles.map(a => a.categoria.nombre))).sort()]

  const filtrados = disponibles.filter(a => {
    const matchCat = categoriaActiva === 'Todos' || a.categoria.nombre === categoriaActiva
    const q = busqueda.toLowerCase()
    const matchBusqueda = !q ||
      a.nombre.toLowerCase().includes(q) ||
      (a.marca ?? '').toLowerCase().includes(q) ||
      a.categoria.nombre.toLowerCase().includes(q)
    return matchCat && matchBusqueda
  })

  function handleSelect(a: AlimentoPickerItem) {
    onSelect(a)
    onClose()
  }

  const content = (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ height: '80vh', zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Seleccioná un alimento</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, marca o categoría..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Filtros por categoría */}
        <div className="px-5 py-2 shrink-0 flex gap-2" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {categorias.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaActiva(cat)}
              className={cn(
                'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap',
                categoriaActiva === cat
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grilla de alimentos — scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-1">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package size={36} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No hay alimentos que coincidan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtrados.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className="group text-left rounded-xl border border-gray-200 bg-white hover:border-purple-400 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="w-full bg-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 96 }}>
                    {a.imagen_url ? (
                      <img
                        src={a.imagen_url}
                        alt={a.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <Package size={28} className="text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{a.nombre}</p>
                    {a.marca && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.marca}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-purple-600 font-medium bg-purple-50 rounded-full px-2 py-0.5 truncate max-w-[80px]">
                        {a.categoria.nombre}
                      </span>
                      <span className="text-xs text-gray-400">{a.unidad_base}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-gray-400">
            {filtrados.length} alimento{filtrados.length !== 1 ? 's' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
          </p>
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )

  return open ? createPortal(content, document.body) : null
}
