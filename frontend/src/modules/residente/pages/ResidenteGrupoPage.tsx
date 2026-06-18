import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ChefHat, Users, BookOpen, Clock, CalendarDays,
  UtensilsCrossed, ChevronLeft, ChevronDown, ChevronUp,
  History, CheckCircle2
} from 'lucide-react'

type Dificultad = 'FACIL' | 'MEDIO' | 'DIFICIL'
type Franja = 'ALMUERZO' | 'CENA'

interface GrupoInfo { grupo_id: number; nombre: string }

interface Integrante { id: number; nombre: string; apellido: string }

interface MenuGrupo {
  id: number
  nombre: string
  dificultad: Dificultad
  tiempo_min: number
  descripcion?: string | null
}

interface Seleccion {
  id: number
  personas: number
  estado: string
  created_at: string
  residente: { id: number; nombre: string; apellido: string }
  menu: { id: number; nombre: string; dificultad: Dificultad; tiempo_min: number }
  ajustes?: { id: number; alimento_id: number; cantidad_calculada: number; cantidad_real: number; unidad: string; alimento: { nombre: string } }[]
}

interface Turno {
  id: number
  tipo: 'FIJO' | 'ROTATIVO'
  franja: Franja
  dia_semana: number | null
  fecha: string | null
  selecciones: Seleccion[]
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const DIFICULTAD_COLOR: Record<Dificultad, string> = {
  FACIL: 'bg-green-100 text-green-700',
  MEDIO: 'bg-orange-100 text-orange-700',
  DIFICIL: 'bg-red-100 text-red-700',
}

function getTurnoFecha(t: Turno): string {
  if (t.tipo === 'FIJO' && t.dia_semana !== null) return `${DIAS[t.dia_semana]} (fijo)`
  if (t.fecha) return new Date(t.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  return '—'
}

function CoccionCard({ sel, turno }: { sel: Seleccion; turno: Turno }) {
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
              <ChefHat size={17} className="text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{sel.menu.nombre}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays size={11} /> {getTurnoFecha(turno)}
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${turno.franja === 'ALMUERZO' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {turno.franja === 'ALMUERZO' ? 'Almuerzo' : 'Cena'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{sel.personas}</p>
              <p className="text-xs text-gray-400">pers.</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-600 font-medium">{sel.residente.nombre} {sel.residente.apellido}</p>
              <p className="text-xs text-gray-400">{new Date(sel.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11} /> {sel.menu.tiempo_min} min de preparación</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFICULTAD_COLOR[sel.menu.dificultad]}`}>
              {sel.menu.dificultad}
            </span>
          </div>
          {sel.ajustes && sel.ajustes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredientes usados</p>
              <div className="space-y-1">
                {sel.ajustes.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{a.alimento.nombre}</span>
                    <span className="font-medium text-gray-800">{a.cantidad_real} {a.unidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResidenteGrupoPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [grupo, setGrupo] = useState<GrupoInfo | null>(null)
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [menus, setMenus] = useState<MenuGrupo[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!residenciaId) return
    api.get<{ id: number; nombre: string; apellido: string }>('/residentes/me')
      .then(me => api.get<GrupoInfo | null>(`/residentes/${me.id}/grupo`))
      .then(g => {
        if (!g) { setLoading(false); return }
        setGrupo(g)
        return Promise.all([
          api.get<Integrante[]>(`/grupos/${g.grupo_id}/integrantes`),
          api.get<MenuGrupo[]>(`/grupos/${g.grupo_id}/menus`),
          api.get<Turno[]>(`/residencias/${residenciaId}/turnos`),
        ]).then(([ints, mgs, ts]) => {
          setIntegrantes(ints)
          setMenus(mgs)
          setTurnos(ts.filter(t => t.selecciones?.some(s => s.estado === 'CONFIRMADO')))
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenciaId])

  const historial: { sel: Seleccion; turno: Turno }[] = turnos
    .flatMap(t => (t.selecciones ?? [])
      .filter(s => s.estado === 'CONFIRMADO')
      .map(s => ({ sel: s, turno: t }))
    )
    .sort((a, b) => {
      const fa = a.turno.fecha ?? ''
      const fb = b.turno.fecha ?? ''
      return fb > fa ? 1 : -1
    })

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!grupo) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/mi-residencia')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft size={16} /> Volver
        </button>
        <EmptyState icon={UtensilsCrossed} title="Sin grupo asignado" description="El administrador de tu residencia te asignará a un grupo de cocina." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/mi-residencia')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ChevronLeft size={16} /> Volver al panel
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
            <ChefHat size={24} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{grupo.nombre}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tu grupo de cocina</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: integrantes + menús */}
        <div className="space-y-5">

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users size={14} className="text-purple-500" /> Integrantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {integrantes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin integrantes.</p>
              ) : (
                <ul className="space-y-2">
                  {integrantes.map(i => (
                    <li key={i.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                        {i.nombre.charAt(0)}{i.apellido.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-800">{i.nombre} {i.apellido}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen size={14} className="text-purple-500" /> Menús asignados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {menus.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin menús asignados.</p>
              ) : (
                <ul className="space-y-3">
                  {menus.map(m => (
                    <li key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{m.nombre}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${DIFICULTAD_COLOR[m.dificultad]}`}>
                          {m.dificultad}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} /> {m.tiempo_min} min
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: historial */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Historial de cocciones</h2>
            {historial.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> {historial.length} cocción{historial.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {historial.length === 0 ? (
            <EmptyState icon={History} title="Sin historial aún" description="Cuando tu grupo confirme una cocción, aparecerá acá." />
          ) : (
            <div className="space-y-2">
              {historial.map(({ sel, turno }) => (
                <CoccionCard key={sel.id} sel={sel} turno={turno} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
