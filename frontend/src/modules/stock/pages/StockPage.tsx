import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, AlertTriangle, ChevronRight, ExternalLink, Layers, Pencil, Check, X } from 'lucide-react'

interface StockItem {
  id: number
  cantidad: number
  unidad: string
  stock_minimo: number | null
  fecha_vencimiento: string | null
  activo: boolean
  alimento: {
    id: number
    nombre: string
    marca: string | null
    unidad_base: string
    contenido_neto: number | null
    unidad_contenido: string | null
  }
}

interface AlimentoBasico {
  id: number
  nombre: string
  marca: string | null
  unidad_base: string
  contenido_neto: number | null
  unidad_contenido: string | null
}

interface Movimiento {
  id: number
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  motivo: string | null
  created_at: string
  residente: { nombre: string; apellido: string } | null
  user: { email: string; role: string } | null
}

const UNIDADES = ['KG', 'GR', 'LITROS', 'ML', 'UNIDADES'] as const

function estadoLote(s: StockItem) {
  const vencido = s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date()
  const porVencer = s.fecha_vencimiento && !vencido &&
    (new Date(s.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7

  if (vencido) return { label: 'Vencido', color: 'bg-gray-100 text-gray-700' }
  if (porVencer) return { label: 'Por vencer', color: 'bg-orange-100 text-orange-700' }
  return { label: 'OK', color: 'bg-green-100 text-green-700' }
}

function estadoAgrupado(lotes: StockItem[]) {
  const total = lotes.reduce((acc, l) => acc + l.cantidad, 0)
  const stockMinimo = lotes.find(l => l.stock_minimo != null)?.stock_minimo ?? null
  const bajoMinimo = stockMinimo != null && total < stockMinimo
  const hayVencido = lotes.some(l => l.fecha_vencimiento && new Date(l.fecha_vencimiento) < new Date())
  const hayPorVencer = !hayVencido && lotes.some(l => {
    if (!l.fecha_vencimiento) return false
    return (new Date(l.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
  })

  if (hayVencido) return { label: 'Vencido', color: 'bg-gray-100 text-gray-700' }
  if (hayPorVencer) return { label: 'Por vencer', color: 'bg-orange-100 text-orange-700' }
  if (bajoMinimo) return { label: 'Bajo mínimo', color: 'bg-red-100 text-red-700' }
  return { label: 'OK', color: 'bg-green-100 text-green-700' }
}

function StockRowDetail({ stockId }: { stockId: number }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Movimiento[]>(`/stock/${stockId}/movimientos`)
      .then(setMovimientos)
      .finally(() => setLoading(false))
  }, [stockId])

  const tipoColor = (tipo: string) => {
    if (tipo === 'ENTRADA') return 'bg-green-100 text-green-700'
    if (tipo === 'SALIDA') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <tr>
      <td colSpan={8} className="px-4 pb-4 pt-0 bg-gray-50">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial de movimientos</p>
          </div>
          {loading ? (
            <p className="text-xs text-gray-400 px-4 py-3">Cargando...</p>
          ) : movimientos.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-medium">
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Cantidad</th>
                  <th className="text-left px-4 py-2">Registrado por</th>
                  <th className="text-left px-4 py-2">Fecha y hora</th>
                  <th className="text-left px-4 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movimientos.map(m => {
                  const quien = m.residente
                    ? `${m.residente.nombre} ${m.residente.apellido} (residente)`
                    : m.user
                    ? `${m.user.email} (${m.user.role === 'ADMIN_GLOBAL' ? 'Admin Global' : 'Admin Residencia'})`
                    : 'Sistema'
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className={`font-semibold rounded-full px-2 py-0.5 ${tipoColor(m.tipo)}`}>{m.tipo}</span>
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-800">{m.cantidad}</td>
                      <td className="px-4 py-2 text-gray-600">{quien}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(m.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2 text-gray-400">{m.motivo ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function StockPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [stock, setStock] = useState<StockItem[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedAlimentoId, setExpandedAlimentoId] = useState<number | null>(null)
  const [expandedStockId, setExpandedStockId] = useState<number | null>(null)
  const [form, setForm] = useState({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' })
  const [tieneVencimiento, setTieneVencimiento] = useState(false)
  const [alimentoSel, setAlimentoSel] = useState<AlimentoBasico | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingMinimoAlimentoId, setEditingMinimoAlimentoId] = useState<number | null>(null)
  const [minimoInput, setMinimoInput] = useState('')
  const [savingMinimo, setSavingMinimo] = useState(false)

  const stockAgrupado = useMemo(() => {
    const mapa = new Map<number, { alimento: StockItem['alimento']; lotes: StockItem[] }>()
    for (const item of stock) {
      if (!mapa.has(item.alimento.id)) {
        mapa.set(item.alimento.id, { alimento: item.alimento, lotes: [] })
      }
      mapa.get(item.alimento.id)!.lotes.push(item)
    }
    return Array.from(mapa.values())
  }, [stock])

  function load() {
    if (!residenciaId) return
    setLoading(true)
    Promise.all([
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<AlimentoBasico[]>('/alimentos'),
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
      if (form.fecha_vencimiento) body.fecha_vencimiento = form.fecha_vencimiento
      if (form.stock_minimo) body.stock_minimo = Number(form.stock_minimo)
      await api.post(`/residencias/${residenciaId}/stock`, body)
      setModalOpen(false)
      setForm({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' })
      setAlimentoSel(null)
      setTieneVencimiento(false)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al registrar stock')
    } finally {
      setSaving(false)
    }
  }

  async function handleGuardarMinimo(alimentoId: number) {
    if (!residenciaId) return
    setSavingMinimo(true)
    try {
      const valor = minimoInput === '' ? null : Number(minimoInput)
      await api.patch(`/residencias/${residenciaId}/stock/alimento/${alimentoId}/minimo`, { stock_minimo: valor })
      setEditingMinimoAlimentoId(null)
      load()
    } finally {
      setSavingMinimo(false)
    }
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
        <Button onClick={() => { setError(''); setForm({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' }); setAlimentoSel(null); setTieneVencimiento(false); setModalOpen(true) }}>Registrar entrada</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : stockAgrupado.length === 0 ? (
        <EmptyState icon={Package} title="Sin stock" description="Registrá el primer ingreso de alimentos." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['', 'Alimento', 'Total', 'Mínimo', 'Lotes', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockAgrupado.map(({ alimento, lotes }) => {
                const isExpanded = expandedAlimentoId === alimento.id
                const totalCantidad = lotes.reduce((acc, l) => acc + l.cantidad, 0)
                const unidad = lotes[0]?.unidad ?? ''
                const estadoResumen = estadoAgrupado(lotes)

                return (
                  <Fragment key={alimento.id}>
                    {/* Fila agrupada por alimento */}
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedAlimentoId(isExpanded ? null : alimento.id)}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {alimento.nombre}
                        {alimento.marca && (
                          <span className="text-gray-400 font-normal ml-1 text-xs">{alimento.marca}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {totalCantidad} {unidad.toLowerCase()}
                        {alimento.unidad_base === 'UNIDADES' && alimento.contenido_neto && (
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            ({totalCantidad * alimento.contenido_neto} {alimento.unidad_contenido})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500" onClick={e => e.stopPropagation()}>
                        {editingMinimoAlimentoId === alimento.id ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={minimoInput}
                              onChange={e => setMinimoInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleGuardarMinimo(alimento.id)
                                if (e.key === 'Escape') setEditingMinimoAlimentoId(null)
                              }}
                              autoFocus
                              className="w-20 rounded border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              onClick={() => handleGuardarMinimo(alimento.id)}
                              disabled={savingMinimo}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingMinimoAlimentoId(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 group">
                            <span>{lotes.find(l => l.stock_minimo != null)?.stock_minimo ?? '—'}</span>
                            <button
                              onClick={() => {
                                const actual = lotes.find(l => l.stock_minimo != null)?.stock_minimo
                                setMinimoInput(actual != null ? String(actual) : '')
                                setEditingMinimoAlimentoId(alimento.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-600 transition-opacity"
                            >
                              <Pencil size={11} />
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {lotes.length > 1 ? (
                          <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                            <Layers size={13} />
                            {lotes.length} lotes
                          </span>
                        ) : '1 lote'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${estadoResumen.color}`}>
                          {estadoResumen.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/alimentos/${alimento.id}`}
                          title="Ver detalle del alimento"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>

                    {/* Lotes individuales expandidos */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-3 pt-0 bg-gray-50">
                          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lotes</p>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 font-medium border-b border-gray-100">
                                  <th className="text-left px-4 py-2">Cantidad</th>
                                  <th className="text-left px-4 py-2">Unidad</th>
                                  <th className="text-left px-4 py-2">Vencimiento</th>
                                  <th className="text-left px-4 py-2">Estado</th>
                                  <th className="px-4 py-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {lotes.map(lote => {
                                  const estado = estadoLote(lote)
                                  const loteExpanded = expandedStockId === lote.id
                                  return (
                                    <Fragment key={lote.id}>
                                      <tr
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setExpandedStockId(loteExpanded ? null : lote.id)}
                                      >
                                        <td className="px-4 py-2 font-semibold text-gray-800">{lote.cantidad}</td>
                                        <td className="px-4 py-2 text-gray-500">{lote.unidad}</td>
                                        <td className="px-4 py-2 text-gray-600">
                                          {lote.fecha_vencimiento ? (
                                            <span className="flex items-center gap-1">
                                              {estado.label === 'Por vencer' && <AlertTriangle size={11} className="text-orange-500" />}
                                              {new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR')}
                                            </span>
                                          ) : <span className="text-gray-300">Sin vencimiento</span>}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className={`font-semibold rounded-full px-2 py-0.5 ${estado.color}`}>
                                            {estado.label}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-400">
                                          <ChevronRight size={12} className={`transition-transform ${loteExpanded ? 'rotate-90' : ''}`} />
                                        </td>
                                      </tr>
                                      {loteExpanded && <StockRowDetail stockId={lote.id} />}
                                    </Fragment>
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setAlimentoSel(null) }} title="Registrar entrada de stock">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="st-alimento">Alimento</Label>
            <select
              id="st-alimento"
              value={form.alimento_id}
              onChange={e => {
                const al = alimentos.find(a => a.id === Number(e.target.value)) ?? null
                setAlimentoSel(al)
                setForm(f => ({ ...f, alimento_id: e.target.value, unidad: al?.unidad_base ?? 'UNIDADES' }))
              }}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccioná un alimento</option>
              {alimentos.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}{a.marca ? ` — ${a.marca}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Info y campos extra para PAQUETES */}
          {alimentoSel?.unidad_base === 'UNIDADES' && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-2 text-sm">
              <p className="font-medium text-blue-700">Alimento por paquetes</p>
              {alimentoSel.contenido_neto ? (
                <p className="text-blue-600 text-xs">
                  Cada paquete contiene <span className="font-semibold">{alimentoSel.contenido_neto} {alimentoSel.unidad_contenido}</span>
                </p>
              ) : (
                <p className="text-blue-500 text-xs">
                  Sin contenido neto registrado. Podés editarlo en el detalle del alimento.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-cantidad">
                {alimentoSel?.unidad_base === 'UNIDADES' ? 'Cantidad de paquetes' : 'Cantidad'}
              </Label>
              <Input id="st-cantidad" type="number" step="0.01" min="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-unidad">Unidad</Label>
              <select
                id="st-unidad"
                value={form.unidad}
                onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                disabled={!!alimentoSel}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-minimo">Stock mínimo <span className="text-xs text-gray-400">(opc.)</span></Label>
            <Input id="st-minimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tieneVencimiento}
                onChange={e => {
                  setTieneVencimiento(e.target.checked)
                  if (!e.target.checked) setForm(f => ({ ...f, fecha_vencimiento: '' }))
                }}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Tiene fecha de vencimiento</span>
            </label>
            {tieneVencimiento && (
              <Input
                id="st-venc"
                type="date"
                value={form.fecha_vencimiento}
                onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                required
              />
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setModalOpen(false); setAlimentoSel(null) }}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
