import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2, Users, CalendarDays, Package, BookOpen,
  AlertTriangle, ArrowRight, MapPin, CheckCircle2, CalendarClock
} from 'lucide-react'

interface ResidenciaResumen {
  id: number
  nombre: string
  ciudad: string
  provincia: string
  capacidad_max: number
  activo: boolean
  imagen_url: string | null
  residentes: { id: number; activo: boolean }[]
  voluntarios: unknown[]
}

interface StockItem {
  id: number
  cantidad: number
  stock_minimo: number | null
  fecha_vencimiento: string | null
  alimento: { nombre: string }
}

interface Turno {
  id: number
  tipo: 'FIJO' | 'ROTATIVO'
  dia_semana: number | null
  fecha: string | null
  franja: string
  grupo: { nombre: string }
}

interface Menu {
  id: number
  nombre: string
}

function StatCard({
  title, value, icon: Icon, color, sub,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon size={20} className={color} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const role = decoded?.role ?? ''
  const residenciaId = decoded?.residencia_id ?? null

  const [residencia, setResidencia] = useState<ResidenciaResumen | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'ADMIN_RESIDENCIA' || !residenciaId) {
      setLoading(false)
      return
    }
    const load = async () => {
      const [r, s, t, m] = await Promise.all([
        api.get<ResidenciaResumen>(`/residencias/${residenciaId}`).catch(() => null),
        api.get<StockItem[]>(`/residencias/${residenciaId}/stock`).catch(() => []),
        api.get<Turno[]>(`/residencias/${residenciaId}/turnos`).catch(() => []),
        api.get<Menu[]>(`/residencias/${residenciaId}/menus`).catch(() => []),
      ])
      setResidencia(r)
      setStock(s as StockItem[])
      setTurnos(t as Turno[])
      setMenus(m as Menu[])
      setLoading(false)
    }
    load()
  }, [role, residenciaId])

  // ── ADMIN_GLOBAL: dashboard genérico ────────────────────────
  if (role === 'ADMIN_GLOBAL') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Bienvenido, {decoded?.email}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Residencias', icon: Building2, color: 'text-blue-600' },
            { title: 'Residentes', icon: Users, color: 'text-green-600' },
            { title: 'Turnos activos', icon: CalendarDays, color: 'text-orange-600' },
            { title: 'Alertas de stock', icon: Package, color: 'text-red-600' },
          ].map(({ title, icon: Icon, color }) => (
            <Card key={title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
                <Icon size={20} className={color} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">—</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── ADMIN_RESIDENCIA: loading ────────────────────────────────
  if (loading) {
    return <div className="text-gray-500 text-sm">Cargando...</div>
  }

  if (!residencia) {
    return <div className="text-red-500 text-sm">No se pudo cargar la información de la residencia.</div>
  }

  const residentesActivos = residencia.residentes.filter(r => r.activo).length
  const alertasStock = stock.filter(s => s.stock_minimo !== null && s.cantidad < s.stock_minimo)

  const hoy7 = new Date()
  hoy7.setDate(hoy7.getDate() + 7)
  const proximosAVencer = stock
    .filter(s => s.fecha_vencimiento !== null)
    .map(s => ({ ...s, diasRestantes: Math.ceil((new Date(s.fecha_vencimiento!).getTime() - Date.now()) / 86400000) }))
    .filter(s => s.diasRestantes <= 7)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)
  const diaSemanaHoy = hoy.getDay()
  const turnosHoy = turnos.filter(t =>
    t.tipo === 'FIJO'
      ? t.dia_semana === diaSemanaHoy
      : t.fecha?.slice(0, 10) === hoyStr
  )
  const ocupacion = Math.round((residentesActivos / residencia.capacidad_max) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{residencia.nombre}</h1>
          <p className="text-gray-500 mt-0.5 flex items-center gap-1 text-sm">
            <MapPin size={13} />
            {residencia.ciudad}, {residencia.provincia}
          </p>
        </div>
        <button
          onClick={() => navigate(`/residencias/${residencia.id}`)}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          Ver detalle <ArrowRight size={14} />
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Residentes activos"
          value={residentesActivos}
          icon={Users}
          color="text-green-600"
          sub={`${ocupacion}% de capacidad (${residencia.capacidad_max} lugares)`}
        />
        <StatCard
          title="Turnos hoy"
          value={turnosHoy.length}
          icon={CalendarDays}
          color="text-orange-600"
          sub={turnosHoy.length === 0 ? 'Sin turnos programados' : turnosHoy.map(t => t.grupo.nombre).join(', ')}
        />
        <StatCard
          title="Menús disponibles"
          value={menus.length}
          icon={BookOpen}
          color="text-purple-600"
          sub="recetas cargadas"
        />
        <StatCard
          title="Alertas de stock"
          value={alertasStock.length}
          icon={alertasStock.length > 0 ? AlertTriangle : CheckCircle2}
          color={alertasStock.length > 0 ? 'text-red-500' : 'text-green-500'}
          sub={alertasStock.length === 0 ? 'Todo en orden' : 'ítems bajo mínimo'}
        />
      </div>

      {/* Barra de ocupación */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Building2 size={15} className="text-blue-500" />
            Ocupación de la residencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${ocupacion >= 90 ? 'bg-red-500' : ocupacion >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min(ocupacion, 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 w-12 text-right">{ocupacion}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{residentesActivos} de {residencia.capacidad_max} lugares ocupados</p>
        </CardContent>
      </Card>

      {/* Alertas de stock */}
      {alertasStock.length > 0 && (
        <Card className="border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle size={15} />
              Stock bajo mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {alertasStock.map(s => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.alimento.nombre}</span>
                  <span className="text-red-500 font-medium">
                    {s.cantidad} / mín. {s.stock_minimo}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Próximos a vencer */}
      {proximosAVencer.length > 0 && (
        <Card className="border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <CalendarClock size={15} />
              Próximos a vencer <span className="text-xs font-normal text-orange-400">(próximos 7 días)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {proximosAVencer.map(s => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.alimento.nombre}</span>
                  <span className={`font-medium ${s.diasRestantes <= 0 ? 'text-red-600' : s.diasRestantes <= 3 ? 'text-orange-500' : 'text-yellow-600'}`}>
                    {s.diasRestantes <= 0 ? 'Vencido' : s.diasRestantes === 1 ? 'Vence mañana' : `${s.diasRestantes} días`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
