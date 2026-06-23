import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts'
import { ChefHat, Users, Building2, TrendingUp, UtensilsCrossed, Filter } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────

interface Stats {
  total_cocciones: number
  total_personas_alimentadas: number
  total_residencias: number
  total_residentes: number
}

interface TopMenu {
  menu_id: number
  nombre: string
  dificultad: string | null
  cocciones: number
  personas_total: number
}

interface TopIngrediente {
  alimento_id: number
  nombre: string
  unidad: string
  total: number
}

interface EvolucionItem {
  semana: string
  cocciones: number
  personas: number
}

interface PorResidencia {
  residencia_id: number
  nombre: string
  cocciones: number
  personas: number
}

interface AnalyticsData {
  stats: Stats
  top_menus: TopMenu[]
  top_ingredientes: TopIngrediente[]
  evolucion_semanal: EvolucionItem[]
  por_residencia: PorResidencia[]
}

interface ResidenciaOption {
  id: number
  nombre: string
  ciudad: string
  provincia: string
}

// ── Palette ───────────────────────────────────────────────────

const PURPLE_SHADES = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#6D28D9', '#5B21B6', '#4C1D95', '#3B0764']
const PIE_COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F97316']

// ── Helpers ───────────────────────────────────────────────────

function formatUnidad(valor: number, unidad: string): string {
  const u = unidad.toLowerCase()
  if (u === 'kg') return `${valor.toFixed(1)} kg`
  if (u === 'gr') return valor >= 1000 ? `${(valor / 1000).toFixed(1)} kg` : `${valor.toFixed(0)} g`
  if (u === 'litros') return `${valor.toFixed(1)} L`
  if (u === 'ml') return valor >= 1000 ? `${(valor / 1000).toFixed(1)} L` : `${valor.toFixed(0)} mL`
  return `${valor.toFixed(0)} u`
}

function formatSemana(semana: string): string {
  const d = new Date(semana + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

// ── Sub-components ────────────────────────────────────────────

function KpiCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [residencias, setResidencias] = useState<ResidenciaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroResidencia, setFiltroResidencia] = useState<string>('')
  const [filtroDesde, setFiltroDesde] = useState<string>('')
  const [filtroHasta, setFiltroHasta] = useState<string>('')

  async function fetchData(rid?: string, desde?: string, hasta?: string) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (rid) params.set('residencia_id', rid)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const qs = params.toString()
      const [analytics] = await Promise.all([
        api.get<AnalyticsData>(`/analytics/cocina${qs ? `?${qs}` : ''}`),
      ])
      setData(analytics)
    } catch {
      setError('No se pudieron cargar los datos de analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get<ResidenciaOption[]>('/analytics/residencias').then(setResidencias).catch(() => {})
    fetchData()
  }, [])

  function aplicarFiltros() {
    fetchData(filtroResidencia || undefined, filtroDesde || undefined, filtroHasta || undefined)
  }

  function limpiarFiltros() {
    setFiltroResidencia('')
    setFiltroDesde('')
    setFiltroHasta('')
    fetchData()
  }

  // Formato para el eje Y del ingrediente chart
  const maxIngrediente = useMemo(
    () => (data?.top_ingredientes[0]?.total ?? 0),
    [data]
  )

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics de cocina</h1>
        <p className="text-gray-500 mt-1 text-sm">Visualización de datos de consumo, platos y actividad entre residencias</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <Filter size={16} className="text-purple-500 mb-2.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Residencia</label>
              <select
                value={filtroResidencia}
                onChange={e => setFiltroResidencia(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="">Todas las residencias</option>
                {residencias.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.ciudad}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Desde</label>
              <input
                type="date"
                value={filtroDesde}
                onChange={e => setFiltroDesde(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Hasta</label>
              <input
                type="date"
                value={filtroHasta}
                onChange={e => setFiltroHasta(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <button
              onClick={aplicarFiltros}
              disabled={loading}
              className="h-9 px-4 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              Aplicar
            </button>
            {(filtroResidencia || filtroDesde || filtroHasta) && (
              <button
                onClick={limpiarFiltros}
                className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Cocciones confirmadas"
              value={data.stats.total_cocciones.toLocaleString('es-AR')}
              sub="selecciones en estado CONFIRMADO"
              icon={ChefHat}
              color="bg-purple-600"
            />
            <KpiCard
              title="Personas alimentadas"
              value={data.stats.total_personas_alimentadas.toLocaleString('es-AR')}
              sub="suma de personas por cocción"
              icon={Users}
              color="bg-amber-500"
            />
            <KpiCard
              title="Residencias activas"
              value={data.stats.total_residencias}
              sub="con al menos 1 residente"
              icon={Building2}
              color="bg-emerald-600"
            />
            <KpiCard
              title="Residentes activos"
              value={data.stats.total_residentes}
              sub="en el sistema"
              icon={TrendingUp}
              color="bg-blue-600"
            />
          </div>

          {/* Fila 1: Top menús + Top ingredientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top menús */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <UtensilsCrossed size={15} className="text-purple-500" />
                  Platos más preparados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_menus.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos en el período seleccionado</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={data.top_menus}
                      layout="vertical"
                      margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={120}
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => v.length > 18 ? v.slice(0, 18) + '…' : v}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cocciones" name="Cocciones" radius={[0, 4, 4, 0]}>
                        {data.top_menus.map((_, i) => (
                          <Cell key={i} fill={PURPLE_SHADES[i % PURPLE_SHADES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top ingredientes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <ChefHat size={15} className="text-amber-500" />
                  Ingredientes más consumidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_ingredientes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin datos en el período seleccionado</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={data.top_ingredientes.map(i => ({
                          ...i,
                          label: i.nombre.length > 14 ? i.nombre.slice(0, 14) + '…' : i.nombre,
                        }))}
                        margin={{ left: 8, right: 8, top: 4, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={v => maxIngrediente > 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload as TopIngrediente
                            return (
                              <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                                <p className="font-semibold text-gray-700">{d.nombre}</p>
                                <p className="text-amber-600 font-bold">{formatUnidad(d.total, d.unidad)}</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                          {data.top_ingredientes.map((_, i) => (
                            <Cell key={i} fill={PURPLE_SHADES[i % PURPLE_SHADES.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fila 2: Evolución semanal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-500" />
                Evolución semanal — últimas 12 semanas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.evolucion_semanal.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin cocciones en las últimas 12 semanas</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data.evolucion_semanal.map(e => ({
                      ...e,
                      label: formatSemana(e.semana),
                    }))}
                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="cocciones"
                      name="Cocciones"
                      stroke="#7C3AED"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#7C3AED' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="personas"
                      name="Personas"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#F59E0B' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Fila 3: Por residencia */}
          {!filtroResidencia && data.por_residencia.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 size={15} className="text-blue-500" />
                    Distribución por residencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {data.por_residencia.every(r => r.cocciones === 0) ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin cocciones registradas</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={data.por_residencia.filter(r => r.cocciones > 0)}
                          dataKey="cocciones"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ nombre, percent }) =>
                            `${nombre.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={true}
                        >
                          {data.por_residencia.filter(r => r.cocciones > 0).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, name]}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Tabla de ranking */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 size={15} className="text-blue-500" />
                    Ranking de residencias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.por_residencia
                      .sort((a, b) => b.cocciones - a.cocciones)
                      .map((r, i) => {
                        const maxCoc = data.por_residencia[0]?.cocciones ?? 1
                        const pct = maxCoc > 0 ? (r.cocciones / maxCoc) * 100 : 0
                        return (
                          <div key={r.residencia_id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                                <span className="font-medium text-gray-800">{r.nombre}</span>
                              </span>
                              <span className="text-xs text-gray-500">
                                {r.cocciones} coc. · {r.personas.toLocaleString('es-AR')} pers.
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
