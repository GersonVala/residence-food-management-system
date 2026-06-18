import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ChefHat, Users, Package, Clock, CalendarDays,
  UtensilsCrossed, ChevronDown, ChevronUp, History
} from 'lucide-react'

type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado'
type Franja = 'ALMUERZO' | 'CENA'
type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'

interface Ajuste {
  id: number
  alimento_id: number
  cantidad_calculada: number
  cantidad_real: number
  unidad: string
  alimento: { id: number; nombre: string }
}

interface Seleccion {
  id: number
  personas: number
  estado: string
  created_at: string
  menu: { id: number; nombre: string; dificultad: Dificultad; tiempo_min: number }
  residente: { id: number; nombre: string; apellido: string }
  turno: {
    id: number
    tipo: 'FIJO' | 'ROTATIVO'
    dia_semana: number | null
    fecha: string | null
    franja: Franja
    grupo: { id: number; nombre: string }
  }
  ajustes: Ajuste[]
}

interface Resumen {
  total_cocciones: number
  total_personas: number
  recursos: { nombre: string; cantidad: number; unidad: string }[]
}

interface HistorialData {
  selecciones: Seleccion[]
  resumen: Resumen
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

function fechaTurno(s: Seleccion): string {
  if (s.turno.tipo === 'FIJO' && s.turno.dia_semana !== null) {
    return `${DIAS[s.turno.dia_semana]} (fijo)`
  }
  if (s.turno.fecha) {
    return new Date(s.turno.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return '—'
}

function getRango(periodo: Periodo, desde: string, hasta: string): { desde: string; hasta: string } {
  const hoy = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  if (periodo === 'hoy') return { desde: fmt(hoy), hasta: fmt(hoy) }
  if (periodo === 'semana') {
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
    return { desde: fmt(lunes), hasta: fmt(hoy) }
  }
  if (periodo === 'mes') {
    return { desde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`, hasta: fmt(hoy) }
  }
  return { desde, hasta }
}

function CoccionCard({ seleccion }: { seleccion: Seleccion }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <ChefHat size={18} className="text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{seleccion.menu.nombre}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <UtensilsCrossed size={11} /> {seleccion.turno.grupo.nombre}
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays size={11} /> {fechaTurno(seleccion)}
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${seleccion.turno.franja === 'ALMUERZO' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {seleccion.turno.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{seleccion.personas}</p>
              <p className="text-xs text-gray-400">pers.</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">{seleccion.residente.nombre} {seleccion.residente.apellido}</p>
              <p className="text-xs text-gray-400">{new Date(seleccion.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11} /> {seleccion.menu.tiempo_min} min de preparación</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFICULTAD_COLOR[seleccion.menu.dificultad]}`}>
              {seleccion.menu.dificultad}
            </span>
            <span className="flex items-center gap-1"><Users size={11} /> Cocinó: {seleccion.residente.nombre} {seleccion.residente.apellido}</span>
          </div>

          {seleccion.ajustes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin ajustes de ingredientes registrados.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Ingrediente</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Calculado</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Real</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Unidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {seleccion.ajustes.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800 font-medium">{a.alimento.nombre}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{a.cantidad_calculada % 1 === 0 ? a.cantidad_calculada : a.cantidad_calculada.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{a.cantidad_real % 1 === 0 ? a.cantidad_real : a.cantidad_real.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-500">{a.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistorialPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [data, setData] = useState<HistorialData | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(() => {
    if (!residenciaId) return
    const rango = getRango(periodo, desde, hasta)
    if (periodo === 'personalizado' && (!rango.desde || !rango.hasta)) return
    setLoading(true)
    api
      .get<HistorialData>(`/residencias/${residenciaId}/historial?desde=${rango.desde}&hasta=${rango.hasta}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [residenciaId, periodo, desde, hasta])

  useEffect(() => {
    if (periodo !== 'personalizado') cargar()
  }, [periodo, cargar])

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Historial de Cocina</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  const { selecciones = [], resumen } = data ?? {}

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Cocina</h1>
        <p className="text-sm text-gray-400 mt-0.5">Registro de lo que se cocinó, ingredientes usados y personas servidas</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['hoy', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodo === p
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Personalizado'}
          </button>
        ))}

        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={cargar}
              disabled={!desde || !hasta}
              className="h-9 px-4 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              Buscar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !data || selecciones.length === 0 ? (
        <EmptyState icon={History} title="Sin cocciones registradas" description="No hay cocciones confirmadas en el período seleccionado." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Lista de cocciones */}
          <div className="xl:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {selecciones.length} cocción{selecciones.length !== 1 ? 'es' : ''}
            </h2>
            {selecciones.map(s => <CoccionCard key={s.id} seleccion={s} />)}
          </div>

          {/* Panel de resumen */}
          <div className="space-y-4 xl:sticky xl:top-6 self-start">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <ChefHat size={13} className="text-orange-500" /> Cocciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-2xl font-bold text-gray-900">{resumen!.total_cocciones}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Users size={13} className="text-purple-500" /> Personas
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-2xl font-bold text-gray-900">{resumen!.total_personas}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recursos usados */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  Recursos usados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {resumen!.recursos.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin ajustes registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {resumen!.recursos.map(r => (
                      <li key={r.nombre} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 truncate">{r.nombre}</span>
                        <span className="text-sm font-semibold text-gray-900 shrink-0 tabular-nums">
                          {r.cantidad % 1 === 0 ? r.cantidad : r.cantidad.toFixed(2)} <span className="font-normal text-gray-400 text-xs">{r.unidad}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </div>
  )
}
