import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpen, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react'

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

export default function ResidenteMenusPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [personas, setPersonas] = useState<Record<number, number>>({})
  const [filtro, setFiltro] = useState<Dificultad | ''>('')

  useEffect(() => {
    if (!residenciaId) return
    api.get<Menu[]>(`/residencias/${residenciaId}/menus`)
      .then(setMenus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [residenciaId])

  function getPersonas(menuId: number, base: number) {
    return personas[menuId] ?? base
  }

  function calcularIngrediente(ing: Ingrediente, cant: number, base: number): number {
    const factor = cant / base
    return Math.round((ing.cantidad_base * factor + ing.cantidad_por_persona * cant) * 100) / 100
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
                filtro === d
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d === '' ? 'Todos' : DIFICULTAD_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      {menusVisibles.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin menús" description="No hay menús disponibles en tu residencia todavía." />
      ) : (
        <div className="space-y-3">
          {menusVisibles.map(menu => {
            const abierto = expanded === menu.id
            const cant = getPersonas(menu.id, menu.personas_base)

            return (
              <div key={menu.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(abierto ? null : menu.id)}
                >
                  <div className="flex items-center gap-4 p-4">
                    {menu.imagen_url ? (
                      <img
                        src={menu.imagen_url}
                        alt={menu.nombre}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100"
                      />
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
                    {abierto ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                    {menu.descripcion && (
                      <p className="text-sm text-gray-600">{menu.descripcion}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600">Calcular para:</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={cant}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setPersonas(prev => ({ ...prev, [menu.id]: Number(e.target.value) }))}
                        className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <span className="text-xs text-gray-500">personas</span>
                    </div>

                    {menu.ingredientes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredientes</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {menu.ingredientes.map(ing => (
                            <div key={ing.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="text-sm text-gray-700 truncate">
                                {ing.alimento.nombre}
                                {ing.alimento.marca && <span className="text-gray-400 text-xs"> · {ing.alimento.marca}</span>}
                              </span>
                              <span className="text-sm font-medium text-gray-900 shrink-0 ml-2">
                                {formatCantidad(calcularIngrediente(ing, cant, menu.personas_base), ing.unidad)}
                              </span>
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
