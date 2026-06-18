import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react'

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

function estadoStock(s: StockItem) {
  const vencido = s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date()
  const porVencer = s.fecha_vencimiento && !vencido &&
    (new Date(s.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
  const bajoMinimo = s.stock_minimo != null && s.cantidad < s.stock_minimo

  if (vencido) return { label: 'Vencido', color: 'bg-gray-100 text-gray-700' }
  if (porVencer) return { label: 'Por vencer', color: 'bg-orange-100 text-orange-700' }
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
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ alimento_id: '', cantidad: '', unidad: 'UNIDADES', fecha_vencimiento: '', stock_minimo: '' })
  const [alimentoSel, setAlimentoSel] = useState<AlimentoBasico | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al registrar stock')
    } finally {
      setSaving(false)
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
        <Button onClick={() => { setError(''); setModalOpen(true) }}>Registrar entrada</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : stock.length === 0 ? (
        <EmptyState icon={Package} title="Sin stock" description="Registrá el primer ingreso de alimentos." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['', 'Alimento', 'Cantidad', 'Unidad', 'Mínimo', 'Vencimiento', 'Estado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => {
                const estado = estadoStock(s)
                const isExpanded = expandedId === s.id
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {s.alimento.nombre}
                        {s.alimento.marca && (
                          <span className="text-gray-400 font-normal ml-1 text-xs">{s.alimento.marca}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-semibold">
                        {s.cantidad}
                        {s.alimento.unidad_base === 'UNIDADES' && s.alimento.contenido_neto && (
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            ({s.cantidad * s.alimento.contenido_neto} {s.alimento.unidad_contenido})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.unidad}</td>
                      <td className="px-4 py-3 text-gray-500">{s.stock_minimo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.fecha_vencimiento ? (
                          <span className="flex items-center gap-1">
                            {estado.label !== 'OK' && estado.label !== 'Bajo mínimo' && (
                              <AlertTriangle size={13} className="text-orange-500" />
                            )}
                            {new Date(s.fecha_vencimiento).toLocaleDateString('es-AR')}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/alimentos/${s.alimento.id}`}
                          title="Ver detalle del alimento"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                    {isExpanded && <StockRowDetail stockId={s.id} />}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-minimo">Stock mínimo <span className="text-xs text-gray-400">(opc.)</span></Label>
              <Input id="st-minimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-venc">Vencimiento <span className="text-xs text-gray-400">(opc.)</span></Label>
              <Input id="st-venc" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
            </div>
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
