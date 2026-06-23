import { useState, useEffect, useMemo, Fragment } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, AlertTriangle, Search, Plus, X, ChevronRight, Layers, History } from 'lucide-react'
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
  unidad_base: string
  contenido_neto: number | null
  unidad_contenido: string | null
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

interface Movimiento {
  id: number
  cantidad: number
  motivo: string | null
  created_at: string
  stock: {
    unidad: string
    alimento: { id: number; nombre: string; marca: string | null; unidad_base: string }
  }
}


function formatCantidad(cantidad: number, unidad: string): string {
  const u = unidad.toLowerCase()
  if (u === 'unidades') return `${cantidad} u.`
  return `${cantidad} ${u}`
}

function estadoLote(item: StockItem) {
  const vencido = item.fecha_vencimiento && new Date(item.fecha_vencimiento) < new Date()
  const porVencer = item.fecha_vencimiento && !vencido &&
    (new Date(item.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
  return { vencido: !!vencido, porVencer: !!porVencer }
}

function estadoAgrupado(lotes: StockItem[]) {
  const total = lotes.reduce((acc, l) => acc + l.cantidad, 0)
  const stockMinimo = lotes.find(l => l.stock_minimo != null)?.stock_minimo ?? null
  const bajo = stockMinimo != null && total < stockMinimo
  const hayVencido = lotes.some(l => estadoLote(l).vencido)
  const hayPorVencer = !hayVencido && lotes.some(l => estadoLote(l).porVencer)
  return { total, bajo, hayVencido, hayPorVencer }
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ResidenteStockPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [stock, setStock] = useState<StockItem[]>([])
  const [puedeCargar, setPuedeCargar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const [expandedAlimentoId, setExpandedAlimentoId] = useState<number | null>(null)
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)

  // Modal de carga (nuevo lote)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ alimento_id: '', cantidad: '', unidad: 'UNIDADES' as Unidad, fecha_vencimiento: '', stock_minimo: '' })
  const [tieneVencimiento, setTieneVencimiento] = useState(false)
  const [alimentoSel, setAlimentoSel] = useState<Alimento | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!residenciaId) return
    Promise.all([
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<ResidenteMe>('/residentes/me'),
    ]).then(([s, me]) => {
      setStock(s)
      setPuedeCargar(me.user.puede_cargar_stock)
      if (me.user.puede_cargar_stock) {
        api.get<Alimento[]>('/alimentos').then(setAlimentos).catch(() => {})
        setLoadingMovimientos(true)
        api.get<Movimiento[]>('/me/movimientos')
          .then(setMovimientos)
          .catch(() => {})
          .finally(() => setLoadingMovimientos(false))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [residenciaId])

  function recargar() {
    if (!residenciaId) return
    api.get<StockItem[]>(`/residencias/${residenciaId}/stock`).then(setStock).catch(() => {})
    api.get<Movimiento[]>('/me/movimientos').then(setMovimientos).catch(() => {})
  }

  const stockAgrupado = useMemo(() => {
    const mapa = new Map<number, { alimento: Alimento; lotes: StockItem[] }>()
    for (const item of stock) {
      if (!mapa.has(item.alimento.id)) {
        mapa.set(item.alimento.id, { alimento: item.alimento, lotes: [] })
      }
      mapa.get(item.alimento.id)!.lotes.push(item)
    }
    return Array.from(mapa.values())
  }, [stock])

  const categoriasStock = useMemo(
    () => Array.from(new Set(stock.map(s => s.alimento.categoria.nombre))).sort(),
    [stock]
  )

  const agrupadoFiltrado = useMemo(() => {
    return stockAgrupado.filter(({ alimento }) => {
      const matchBusqueda = alimento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (alimento.marca ?? '').toLowerCase().includes(busqueda.toLowerCase())
      const matchCategoria = !categoriaFiltro || alimento.categoria.nombre === categoriaFiltro
      return matchBusqueda && matchCategoria
    })
  }, [stockAgrupado, busqueda, categoriaFiltro])

  const alertas = useMemo(() => stockAgrupado.filter(({ lotes }) => {
    const { bajo, hayVencido, hayPorVencer } = estadoAgrupado(lotes)
    return bajo || hayVencido || hayPorVencer
  }), [stockAgrupado])

  function abrirModal(alimentoId?: number) {
    const al = alimentoId ? alimentos.find(a => a.id === alimentoId) ?? null : null
    setAlimentoSel(al)
    setForm({
      alimento_id: al ? String(al.id) : '',
      cantidad: '',
      unidad: (al?.unidad_base as Unidad) ?? 'UNIDADES',
      fecha_vencimiento: '',
      stock_minimo: '',
    })
    setTieneVencimiento(false)
    setError('')
    setModalOpen(true)
  }

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
      if (form.fecha_vencimiento) body.fecha_vencimiento = form.fecha_vencimiento
      if (form.stock_minimo) body.stock_minimo = Number(form.stock_minimo)
      await api.post(`/residencias/${residenciaId}/stock`, body)
      setModalOpen(false)
      recargar()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al registrar el stock.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock de tu residencia</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stockAgrupado.length} alimento{stockAgrupado.length !== 1 ? 's' : ''} en inventario</p>
        </div>
        {puedeCargar ? (
          <Button onClick={() => abrirModal()}>
            <Plus size={15} className="mr-1.5" /> Registrar entrada
          </Button>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Solo lectura</span>
        )}
      </div>

      {/* Modal de registro de stock */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Registrar entrada de stock</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Alimento <span className="text-red-400">*</span></Label>
                <select
                  value={form.alimento_id}
                  onChange={e => {
                    const al = alimentos.find(a => a.id === Number(e.target.value)) ?? null
                    setAlimentoSel(al)
                    setForm(f => ({ ...f, alimento_id: e.target.value, unidad: (al?.unidad_base as Unidad) ?? 'UNIDADES' }))
                  }}
                  required
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccioná un alimento</option>
                  {alimentos.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}{a.marca ? ` — ${a.marca}` : ''}</option>
                  ))}
                </select>
              </div>

              {alimentoSel?.unidad_base === 'UNIDADES' && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-1 text-sm">
                  <p className="font-medium text-blue-700">Alimento por paquetes</p>
                  {alimentoSel.contenido_neto ? (
                    <p className="text-blue-600 text-xs">Cada paquete contiene <span className="font-semibold">{alimentoSel.contenido_neto} {alimentoSel.unidad_contenido}</span></p>
                  ) : (
                    <p className="text-blue-500 text-xs">Sin contenido neto registrado.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    {alimentoSel?.unidad_base === 'UNIDADES' ? 'Cantidad de paquetes' : 'Cantidad'} <span className="text-red-400">*</span>
                  </Label>
                  <Input type="number" step="0.01" min="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Unidad</Label>
                  <select
                    value={form.unidad}
                    onChange={e => setForm(f => ({ ...f, unidad: e.target.value as Unidad }))}
                    disabled={!!alimentoSel}
                    className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Stock mínimo <span className="text-gray-400">(opcional)</span></Label>
                <Input type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={tieneVencimiento}
                    onChange={e => {
                      setTieneVencimiento(e.target.checked)
                      if (!e.target.checked) setForm(f => ({ ...f, fecha_vencimiento: '' }))
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Tiene fecha de vencimiento
                </label>
                {tieneVencimiento && (
                  <Input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} required />
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle size={15} />
            {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
          </div>
          <ul className="space-y-1">
            {alertas.map(({ alimento, lotes }) => {
              const { total, bajo, hayVencido, hayPorVencer } = estadoAgrupado(lotes)
              const unidad = lotes[0]?.unidad ?? ''
              const vencidoLote = lotes.find(l => estadoLote(l).vencido)
              const porVencerLote = lotes.find(l => estadoLote(l).porVencer)
              return (
                <li key={alimento.id} className="text-xs text-amber-700">
                  <span className="font-medium">{alimento.nombre}</span>
                  {hayVencido && vencidoLote && ` · lote vence ${formatFecha(vencidoLote.fecha_vencimiento!)}`}
                  {hayPorVencer && porVencerLote && ` · vence ${formatFecha(porVencerLote.fecha_vencimiento!)}`}
                  {bajo && ` · stock bajo (${formatCantidad(total, unidad)})`}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Filtros */}
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
          {categoriasStock.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Historial de mis cargas */}
      {puedeCargar && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <History size={15} className="text-purple-500" />
            Mis cargas de stock
          </h2>
          {loadingMovimientos ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : movimientos.length === 0 ? (
            <EmptyState icon={History} title="Sin cargas" description="Todavía no registraste ninguna entrada de stock." />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alimento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Motivo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.stock.alimento.nombre}</p>
                        {m.stock.alimento.marca && <p className="text-xs text-gray-400">{m.stock.alimento.marca}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        +{formatCantidad(m.cantidad, m.stock.unidad)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {m.motivo ?? <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <br />
                        <span>{new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabla agrupada */}
      {agrupadoFiltrado.length === 0 ? (
        <EmptyState icon={Package} title="Sin resultados" description="No hay alimentos que coincidan con la búsqueda." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-6" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alimento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Lotes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agrupadoFiltrado.map(({ alimento, lotes }) => {
                const isExpanded = expandedAlimentoId === alimento.id
                const { total, bajo, hayVencido, hayPorVencer } = estadoAgrupado(lotes)
                const unidad = lotes[0]?.unidad ?? ''

                return (
                  <Fragment key={alimento.id}>
                    {/* Fila agrupada */}
                    <tr
                      className={`cursor-pointer transition-colors ${hayVencido ? 'bg-red-50 hover:bg-red-100' : bajo ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                      onClick={() => setExpandedAlimentoId(isExpanded ? null : alimento.id)}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{alimento.nombre}</p>
                        {alimento.marca && <p className="text-xs text-gray-400">{alimento.marca}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{alimento.categoria.nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCantidad(total, unidad)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                        {lotes.length > 1 ? (
                          <span className="inline-flex items-center gap-1 text-purple-600 font-medium text-xs">
                            <Layers size={12} /> {lotes.length} lotes
                          </span>
                        ) : '1 lote'}
                      </td>
                      <td className="px-4 py-3">
                        {hayVencido ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Vencido
                          </span>
                        ) : hayPorVencer ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Próx. vencer
                          </span>
                        ) : bajo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Stock bajo
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">OK</span>
                        )}
                      </td>
                    </tr>

                    {/* Lotes expandidos */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-3 pt-0 bg-gray-50">
                          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lotes</p>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 font-medium border-b border-gray-100">
                                  <th className="text-left px-4 py-2">Cantidad</th>
                                  <th className="text-left px-4 py-2">Vencimiento</th>
                                  <th className="text-left px-4 py-2">Estado</th>
                                  {puedeCargar && <th className="px-4 py-2" />}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {lotes.map(lote => {
                                  const { vencido, porVencer } = estadoLote(lote)
                                  return (
                                    <tr key={lote.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 font-semibold text-gray-800">
                                        {formatCantidad(lote.cantidad, lote.unidad)}
                                      </td>
                                      <td className="px-4 py-2 text-gray-500">
                                        {lote.fecha_vencimiento ? (
                                          <span className={vencido ? 'text-red-600 font-medium' : porVencer ? 'text-amber-600 font-medium' : ''}>
                                            {formatFecha(lote.fecha_vencimiento)}
                                          </span>
                                        ) : <span className="text-gray-300">Sin vencimiento</span>}
                                      </td>
                                      <td className="px-4 py-2">
                                        {vencido ? (
                                          <span className="font-medium text-red-700">Vencido</span>
                                        ) : porVencer ? (
                                          <span className="font-medium text-amber-600">Por vencer</span>
                                        ) : (
                                          <span className="text-green-600">OK</span>
                                        )}
                                      </td>
                                      {puedeCargar && (
                                        <td className="px-4 py-2 text-right">
                                          <button
                                            onClick={() => abrirModal(lote.alimento.id)}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
                                          >
                                            <Plus size={11} /> Entrada
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
