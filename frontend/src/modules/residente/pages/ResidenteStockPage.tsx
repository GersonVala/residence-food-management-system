import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, AlertTriangle, Search, Plus, X, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Categoria { id: number; nombre: string }

const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES'] as const
type Unidad = typeof UNIDADES[number]

interface Alimento {
  id: number
  nombre: string
  marca: string | null
  categoria: Categoria
}

interface StockItem {
  id: number
  cantidad: number
  unidad: string
  fecha_vencimiento: string | null
  stock_minimo: number | null
  alimento: Alimento
}

interface ResidenteMe {
  user: { puede_cargar_stock: boolean }
  residencia: { id: number }
}

type Feedback = { tipo: 'ok' | 'error'; msg: string }

function formatCantidad(cantidad: number, unidad: string): string {
  const u = unidad.toLowerCase()
  if (u === 'unidades') return `${cantidad} u.`
  return `${cantidad} ${u}`
}

function isBajo(item: StockItem): boolean {
  return item.stock_minimo !== null && item.cantidad <= item.stock_minimo
}

function isVencido(item: StockItem): boolean {
  if (!item.fecha_vencimiento) return false
  return new Date(item.fecha_vencimiento) < new Date()
}

function isProximoVencer(item: StockItem): boolean {
  if (!item.fecha_vencimiento) return false
  const diff = new Date(item.fecha_vencimiento).getTime() - Date.now()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ResidenteStockPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [stock, setStock] = useState<StockItem[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [puedeCargar, setPuedeCargar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')

  // Formulario de entrada
  const [entradaStockId, setEntradaStockId] = useState<number | null>(null)
  const [entradaCantidad, setEntradaCantidad] = useState('')
  const [entradaMotivo, setEntradaMotivo] = useState('')
  const [savingEntrada, setSavingEntrada] = useState(false)
  const [feedbackEntrada, setFeedbackEntrada] = useState<Feedback | null>(null)

  // Formulario de nuevo alimento
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({ nombre: '', marca: '', unidad_base: 'KG' as Unidad, categoria_id: '' })
  const [savingNuevo, setSavingNuevo] = useState(false)
  const [feedbackNuevo, setFeedbackNuevo] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!residenciaId) return
    Promise.all([
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<ResidenteMe>('/residentes/me'),
    ]).then(([s, me]) => {
      setStock(s)
      setPuedeCargar(me.user.puede_cargar_stock)
      if (me.user.puede_cargar_stock) {
        api.get<Categoria[]>('/categorias').then(setCategorias).catch(() => {})
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [residenciaId])

  function abrirEntrada(stockId: number) {
    setEntradaStockId(stockId)
    setEntradaCantidad('')
    setEntradaMotivo('')
    setFeedbackEntrada(null)
  }

  async function confirmarEntrada(e: React.FormEvent) {
    e.preventDefault()
    if (!entradaStockId || !residenciaId) return
    const cantidad = parseFloat(entradaCantidad)
    if (!cantidad || cantidad <= 0) return
    setSavingEntrada(true)
    setFeedbackEntrada(null)
    try {
      await api.post(`/residencias/${residenciaId}/stock/${entradaStockId}/entrada`, {
        cantidad,
        motivo: entradaMotivo || undefined,
      })
      setFeedbackEntrada({ tipo: 'ok', msg: 'Entrada registrada correctamente.' })
      // Refrescar stock
      const actualizado = await api.get<StockItem[]>(`/residencias/${residenciaId}/stock`)
      setStock(actualizado)
      setEntradaStockId(null)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedbackEntrada({ tipo: 'error', msg: e.mensaje ?? 'Error al registrar la entrada.' })
    } finally {
      setSavingEntrada(false)
    }
  }

  async function crearAlimento(e: React.FormEvent) {
    e.preventDefault()
    setSavingNuevo(true)
    setFeedbackNuevo(null)
    try {
      await api.post('/alimentos', {
        nombre: nuevoForm.nombre.trim(),
        ...(nuevoForm.marca.trim() ? { marca: nuevoForm.marca.trim() } : {}),
        unidad_base: nuevoForm.unidad_base,
        categoria_id: Number(nuevoForm.categoria_id),
      })
      setFeedbackNuevo({ tipo: 'ok', msg: 'Alimento creado correctamente.' })
      setNuevoForm({ nombre: '', marca: '', unidad_base: 'KG', categoria_id: '' })
      setTimeout(() => { setNuevoOpen(false); setFeedbackNuevo(null) }, 1200)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedbackNuevo({ tipo: 'error', msg: e.mensaje ?? 'Error al crear el alimento.' })
    } finally {
      setSavingNuevo(false)
    }
  }

  const categoriasStock = Array.from(new Set(stock.map(s => s.alimento.categoria.nombre))).sort()

  const stockFiltrado = stock.filter(s => {
    const matchBusqueda = s.alimento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (s.alimento.marca ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = !categoriaFiltro || s.alimento.categoria.nombre === categoriaFiltro
    return matchBusqueda && matchCategoria
  })


  const alertas = stock.filter(s => isBajo(s) || isVencido(s) || isProximoVencer(s))

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const itemEntrada = entradaStockId ? stock.find(s => s.id === entradaStockId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock de tu residencia</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stock.length} ítem{stock.length !== 1 ? 's' : ''} en inventario</p>
        </div>
        {puedeCargar ? (
          <Button onClick={() => { setNuevoOpen(true); setFeedbackNuevo(null) }}>
            <Plus size={15} className="mr-1.5" /> Nuevo alimento
          </Button>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Solo lectura</span>
        )}
      </div>

      {/* Modal nuevo alimento */}
      {nuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nuevo alimento</h2>
              <button onClick={() => setNuevoOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={crearAlimento} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Nombre <span className="text-red-400">*</span></Label>
                <Input
                  autoFocus
                  placeholder="Ej: Arroz largo"
                  value={nuevoForm.nombre}
                  onChange={e => setNuevoForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Marca <span className="text-gray-400">(opcional)</span></Label>
                <Input
                  placeholder="Ej: Gallo de Oro"
                  value={nuevoForm.marca}
                  onChange={e => setNuevoForm(f => ({ ...f, marca: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Unidad <span className="text-red-400">*</span></Label>
                <select
                  value={nuevoForm.unidad_base}
                  onChange={e => setNuevoForm(f => ({ ...f, unidad_base: e.target.value as Unidad }))}
                  required
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Categoría <span className="text-red-400">*</span></Label>
                <select
                  value={nuevoForm.categoria_id}
                  onChange={e => setNuevoForm(f => ({ ...f, categoria_id: e.target.value }))}
                  required
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccioná una categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {feedbackNuevo && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedbackNuevo.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {feedbackNuevo.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {feedbackNuevo.msg}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setNuevoOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={savingNuevo}>
                  {savingNuevo ? 'Guardando...' : 'Crear alimento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de entrada */}
      {entradaStockId && itemEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Registrar entrada</h2>
              <button onClick={() => setEntradaStockId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{itemEntrada.alimento.nombre}</span>
              {itemEntrada.alimento.marca && ` · ${itemEntrada.alimento.marca}`}
            </p>
            <form onSubmit={confirmarEntrada} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Cantidad ({itemEntrada.unidad.toLowerCase()})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  value={entradaCantidad}
                  onChange={e => setEntradaCantidad(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Motivo <span className="text-gray-400">(opcional)</span></Label>
                <Input
                  type="text"
                  placeholder="Ej: compra semanal"
                  value={entradaMotivo}
                  onChange={e => setEntradaMotivo(e.target.value)}
                />
              </div>
              {feedbackEntrada && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedbackEntrada.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {feedbackEntrada.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {feedbackEntrada.msg}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEntradaStockId(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={savingEntrada}>
                  {savingEntrada ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle size={15} />
            {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
          </div>
          <ul className="space-y-1">
            {alertas.map(s => (
              <li key={s.id} className="text-xs text-amber-700">
                <span className="font-medium">{s.alimento.nombre}</span>
                {isVencido(s) && ' · vencido'}
                {isProximoVencer(s) && !isVencido(s) && ` · vence ${formatFecha(s.fecha_vencimiento!)}`}
                {isBajo(s) && ` · stock bajo (${formatCantidad(s.cantidad, s.unidad)})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
        >
          <option value="">Todas las categorías</option>
          {categoriasStock.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {stockFiltrado.length === 0 ? (
        <EmptyState icon={Package} title="Sin resultados" description="No hay alimentos que coincidan con la búsqueda." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alimento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Mínimo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Vencimiento</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                {puedeCargar && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stockFiltrado.map(item => {
                const bajo = isBajo(item)
                const vencido = isVencido(item)
                const proximoVencer = isProximoVencer(item)

                return (
                  <tr key={item.id} className={`${vencido ? 'bg-red-50' : bajo ? 'bg-amber-50' : ''} hover:bg-gray-50 transition-colors`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.alimento.nombre}</p>
                      {item.alimento.marca && <p className="text-xs text-gray-400">{item.alimento.marca}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.alimento.categoria.nombre}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCantidad(item.cantidad, item.unidad)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      {item.stock_minimo !== null ? formatCantidad(item.stock_minimo, item.unidad) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {item.fecha_vencimiento ? (
                        <span className={vencido ? 'text-red-600 font-medium' : proximoVencer ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                          {formatFecha(item.fecha_vencimiento)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {vencido ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Vencido
                        </span>
                      ) : bajo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Stock bajo
                        </span>
                      ) : proximoVencer ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Próx. vencer
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">OK</span>
                      )}
                    </td>
                    {puedeCargar && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => abrirEntrada(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Plus size={12} /> Entrada
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
    </div>
  )
}
