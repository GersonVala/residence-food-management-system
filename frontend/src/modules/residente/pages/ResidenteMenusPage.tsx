import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpen, Clock, ChevronDown, ChevronUp, Users, CheckCircle2, AlertTriangle, PackageX, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface Alimento {
  id: number
  nombre: string
  marca: string | null
}

interface Ingrediente {
  id: number
  alimento: Alimento
  cantidad_base: number
  cantidad_por_persona: number
  unidad: string
}

interface Menu {
  id: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  dificultad: Dificultad
  tiempo_min: number
  personas_base: number
  ingredientes: Ingrediente[]
}

interface StockItem {
  id: number
  cantidad: number
  unidad: string
  alimento: { id: number; nombre: string; marca: string | null }
}

interface ResidenteMe {
  user: { puede_cargar_stock: boolean }
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

function formatCantidad(cantidad: number, unidad: string): string {
  const u = unidad.toLowerCase()
  if (u === 'unidades') return `${cantidad} u.`
  return `${cantidad} ${u}`
}

function calcularIngrediente(ing: Ingrediente, cant: number, base: number): number {
  const factor = cant / base
  return Math.round((ing.cantidad_base * factor + ing.cantidad_por_persona * cant) * 100) / 100
}

function calcularMaxPersonas(
  ingredientes: Ingrediente[],
  stockPorAlimento: Map<number, StockItem[]>
): number {
  let max = 999
  for (const ing of ingredientes) {
    if (ing.cantidad_por_persona <= 0) continue
    const lotes = stockPorAlimento.get(ing.alimento.id) ?? []
    const stockTotal = lotes.reduce((acc, l) => acc + l.cantidad, 0)
    const personasConEsteStock = Math.floor((stockTotal - ing.cantidad_base) / ing.cantidad_por_persona)
    if (personasConEsteStock < max) max = Math.max(0, personasConEsteStock)
  }
  return max === 999 ? 200 : max
}

type EstadoIngrediente =
  | { tipo: 'ok'; stockTotal: number; necesario: number; unidad: string }
  | { tipo: 'falta'; stockTotal: number; necesario: number; falta: number; unidad: string; stockIds: number[] }
  | { tipo: 'sin_stock'; necesario: number; unidad: string }

function evaluarIngrediente(
  ing: Ingrediente,
  necesario: number,
  stockPorAlimento: Map<number, StockItem[]>
): EstadoIngrediente {
  const lotes = stockPorAlimento.get(ing.alimento.id)
  if (!lotes || lotes.length === 0) {
    return { tipo: 'sin_stock', necesario, unidad: ing.unidad }
  }
  const stockTotal = lotes.reduce((acc, l) => acc + l.cantidad, 0)
  const stockIds = lotes.map(l => l.id)
  if (stockTotal >= necesario) {
    return { tipo: 'ok', stockTotal, necesario, unidad: ing.unidad }
  }
  return { tipo: 'falta', stockTotal, necesario, falta: Math.round((necesario - stockTotal) * 100) / 100, unidad: ing.unidad, stockIds }
}

export default function ResidenteMenusPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [menus, setMenus] = useState<Menu[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [puedeCargar, setPuedeCargar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [personas, setPersonas] = useState<Record<number, number>>({})
  const [filtro, setFiltro] = useState<Dificultad | ''>('')

  // Modal entrada
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [entradaAlimento, setEntradaAlimento] = useState<Alimento | null>(null)
  const [entradaStockId, setEntradaStockId] = useState<number | null>(null)
  const [entradaCantidad, setEntradaCantidad] = useState('')
  const [entradaMotivo, setEntradaMotivo] = useState('')
  const [savingEntrada, setSavingEntrada] = useState(false)
  const [feedbackEntrada, setFeedbackEntrada] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  function loadStock() {
    if (!residenciaId) return
    api.get<StockItem[]>(`/residencias/${residenciaId}/stock`).then(setStock).catch(() => {})
  }

  useEffect(() => {
    if (!residenciaId) return
    Promise.all([
      api.get<Menu[]>(`/residencias/${residenciaId}/menus`),
      api.get<StockItem[]>(`/residencias/${residenciaId}/stock`),
      api.get<ResidenteMe>('/residentes/me'),
    ]).then(([m, s, me]) => {
      setMenus(m)
      setStock(s)
      setPuedeCargar(me.user.puede_cargar_stock)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [residenciaId])

  const stockPorAlimento = useMemo(() => {
    const mapa = new Map<number, StockItem[]>()
    for (const item of stock) {
      if (!mapa.has(item.alimento.id)) mapa.set(item.alimento.id, [])
      mapa.get(item.alimento.id)!.push(item)
    }
    return mapa
  }, [stock])

  function getPersonas(menuId: number, base: number) {
    return personas[menuId] ?? base
  }

  function abrirEntrada(alimento: Alimento, stockIds: number[]) {
    setEntradaAlimento(alimento)
    setEntradaStockId(stockIds[0] ?? null)
    setEntradaCantidad('')
    setEntradaMotivo('')
    setFeedbackEntrada(null)
    setEntradaOpen(true)
  }

  function abrirEntradaSinStock(alimento: Alimento) {
    setEntradaAlimento(alimento)
    setEntradaStockId(null)
    setEntradaCantidad('')
    setEntradaMotivo('')
    setFeedbackEntrada(null)
    setEntradaOpen(true)
  }

  async function ejecutarEntrada(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId || !entradaStockId) return
    const cantidad = parseFloat(entradaCantidad)
    if (!cantidad || cantidad <= 0) return
    setSavingEntrada(true)
    setFeedbackEntrada(null)
    try {
      await api.post(`/residencias/${residenciaId}/stock/${entradaStockId}/entrada`, {
        cantidad,
        motivo: entradaMotivo || undefined,
      })
      setFeedbackEntrada({ tipo: 'ok', msg: 'Entrada registrada.' })
      loadStock()
      setTimeout(() => { setEntradaOpen(false); setFeedbackEntrada(null) }, 1000)
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedbackEntrada({ tipo: 'error', msg: e.mensaje ?? 'Error al registrar.' })
    } finally {
      setSavingEntrada(false)
    }
  }

  const menusVisibles = filtro ? menus.filter(m => m.dificultad === filtro) : menus

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menús disponibles</h1>
          <p className="text-sm text-gray-400 mt-0.5">{menus.length} receta{menus.length !== 1 ? 's' : ''} en tu residencia</p>
        </div>
        <div className="flex gap-2">
          {(['', 'FACIL', 'MEDIO', 'DIFICIL'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFiltro(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === d ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d === '' ? 'Todos' : DIFICULTAD_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Modal entrada */}
      {entradaOpen && entradaAlimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Registrar entrada</h2>
              <button onClick={() => setEntradaOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 font-medium">{entradaAlimento.nombre}{entradaAlimento.marca && ` · ${entradaAlimento.marca}`}</p>
            {!entradaStockId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                Este alimento no tiene stock registrado en tu residencia. Pedile al administrador que lo registre primero.
              </div>
            ) : (
              <form onSubmit={ejecutarEntrada} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Cantidad que agregás</Label>
                  <Input type="number" step="0.01" min="0.01" placeholder="0" value={entradaCantidad} onChange={e => setEntradaCantidad(e.target.value)} required autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Motivo <span className="text-gray-400">(opcional)</span></Label>
                  <Input type="text" placeholder="Ej: compra para el menú" value={entradaMotivo} onChange={e => setEntradaMotivo(e.target.value)} />
                </div>
                {feedbackEntrada && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedbackEntrada.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {feedbackEntrada.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {feedbackEntrada.msg}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEntradaOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1" disabled={savingEntrada}>{savingEntrada ? 'Guardando...' : 'Registrar'}</Button>
                </div>
              </form>
            )}
            {!entradaStockId && (
              <Button variant="outline" className="w-full" onClick={() => setEntradaOpen(false)}>Cerrar</Button>
            )}
          </div>
        </div>
      )}

      {menusVisibles.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin menús" description="No hay menús disponibles en tu residencia todavía." />
      ) : (
        <div className="space-y-3">
          {menusVisibles.map(menu => {
            const abierto = expanded === menu.id
            const maxPersonas = calcularMaxPersonas(menu.ingredientes, stockPorAlimento)
            const cant = Math.min(getPersonas(menu.id, menu.personas_base), maxPersonas || 1)

            const evaluaciones = menu.ingredientes.map(ing => ({
              ing,
              necesario: calcularIngrediente(ing, cant, menu.personas_base),
              estado: evaluarIngrediente(ing, calcularIngrediente(ing, cant, menu.personas_base), stockPorAlimento),
            }))

            const puedeCocinarse = evaluaciones.every(e => e.estado.tipo === 'ok')
            const faltan = evaluaciones.filter(e => e.estado.tipo === 'falta' || e.estado.tipo === 'sin_stock')

            return (
              <div key={menu.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button className="w-full text-left" onClick={() => setExpanded(abierto ? null : menu.id)}>
                  <div className="flex items-center gap-4 p-4">
                    {menu.imagen_url ? (
                      <img src={menu.imagen_url} alt={menu.nombre} className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                        <BookOpen size={22} className="text-purple-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{menu.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFICULTAD_COLOR[menu.dificultad]}`}>
                          {DIFICULTAD_LABEL[menu.dificultad]}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {menu.tiempo_min} min
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users size={11} /> base {menu.personas_base}
                        </span>
                      </div>
                    </div>
                    {menu.ingredientes.length > 0 && (
                      puedeCocinarse ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Alcanza
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          <AlertTriangle size={12} /> Faltan {faltan.length}
                        </span>
                      )
                    )}
                    {abierto ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {menu.descripcion && <p className="text-sm text-gray-600">{menu.descripcion}</p>}

                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-xs font-medium text-gray-600">Calcular para:</label>
                      <input
                        type="number"
                        min={1}
                        max={maxPersonas || 1}
                        value={cant}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const v = Math.min(Number(e.target.value), maxPersonas || 1)
                          setPersonas(prev => ({ ...prev, [menu.id]: v }))
                        }}
                        className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <span className="text-xs text-gray-500">personas</span>
                      {menu.ingredientes.length > 0 && maxPersonas < 200 && (
                        <span className="text-xs text-orange-500 font-medium">
                          (máx. {maxPersonas} por stock)
                        </span>
                      )}
                    </div>

                    {menu.ingredientes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredientes</p>
                        <div className="space-y-1.5">
                          {evaluaciones.map(({ ing, necesario, estado }) => (
                            <div
                              key={ing.id}
                              className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                                estado.tipo === 'ok'
                                  ? 'bg-white border-gray-100'
                                  : estado.tipo === 'falta'
                                  ? 'bg-red-50 border-red-100'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {estado.tipo === 'ok' && <CheckCircle2 size={13} className="text-green-500 shrink-0" />}
                                {estado.tipo === 'falta' && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                                {estado.tipo === 'sin_stock' && <PackageX size={13} className="text-gray-400 shrink-0" />}
                                <span className="text-sm text-gray-700 truncate">
                                  {ing.alimento.nombre}
                                  {ing.alimento.marca && <span className="text-gray-400 text-xs"> · {ing.alimento.marca}</span>}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">{formatCantidad(necesario, ing.unidad)}</p>
                                  {estado.tipo === 'ok' && (
                                    <p className="text-xs text-gray-400">en stock: {formatCantidad(estado.stockTotal, ing.unidad)}</p>
                                  )}
                                  {estado.tipo === 'falta' && (
                                    <p className="text-xs text-red-500 font-medium">falta {formatCantidad(estado.falta, ing.unidad)}</p>
                                  )}
                                  {estado.tipo === 'sin_stock' && (
                                    <p className="text-xs text-gray-400">sin stock</p>
                                  )}
                                </div>
                                {puedeCargar && (estado.tipo === 'falta' || estado.tipo === 'sin_stock') && (
                                  <button
                                    onClick={() =>
                                      estado.tipo === 'falta'
                                        ? abrirEntrada(ing.alimento, estado.stockIds)
                                        : abrirEntradaSinStock(ing.alimento)
                                    }
                                    className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors"
                                  >
                                    <Plus size={11} /> Agregar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
