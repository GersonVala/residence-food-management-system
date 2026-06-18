import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Plus, UtensilsCrossed, ArrowRight } from 'lucide-react'

interface Grupo {
  id: number
  nombre: string
  activo: boolean
  _count?: { integrantes: number }
}

export default function GruposPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)

  const [crearOpen, setCrearOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [crearError, setCrearError] = useState('')

  function loadGrupos() {
    if (!residenciaId) return
    setLoading(true)
    api.get<Grupo[]>(`/residencias/${residenciaId}/grupos`)
      .then(setGrupos)
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadGrupos, [residenciaId])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setCrearError('')
    try {
      await api.post(`/residencias/${residenciaId}/grupos`, { nombre })
      setCrearOpen(false)
      setNombre('')
      loadGrupos()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setCrearError(e.mensaje ?? 'Error al crear grupo')
    } finally {
      setSaving(false)
    }
  }

  if (!residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Cocina</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {grupos.length === 0 ? 'Sin grupos' : `${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} activos`}
          </p>
        </div>
        <Button onClick={() => setCrearOpen(true)} className="gap-2">
          <Plus size={16} /> Nuevo grupo
        </Button>
      </div>

      {/* Grid de tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <EmptyState icon={Users} title="Sin grupos" description="Creá el primer grupo de cocina para asignar turnos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grupos.map(g => {
            const count = g._count?.integrantes ?? 0
            return (
              <button
                key={g.id}
                onClick={() => navigate(`/grupos/${g.id}`)}
                className="text-left rounded-xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none border-gray-200 hover:border-purple-300 group"
              >
                {/* Icono + badge integrantes */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-purple-100 transition-colors">
                    <UtensilsCrossed size={20} className="text-gray-500 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                    {count} {count === 1 ? 'integrante' : 'integrantes'}
                  </span>
                </div>

                {/* Nombre */}
                <h3 className="font-semibold text-gray-900 text-base leading-tight mb-3">{g.nombre}</h3>

                {/* Avatares o "Ver grupo" */}
                <div className="flex items-center justify-between">
                  {count === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin integrantes aún</p>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(count, 4))].map((_, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-300 to-indigo-400 border-2 border-white -ml-1 first:ml-0"
                          style={{ zIndex: 4 - i }}
                        />
                      ))}
                      {count > 4 && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white -ml-1 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-gray-500">+{count - 4}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-500 transition-colors shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal: Crear grupo */}
      <Modal open={crearOpen} onClose={() => { setCrearOpen(false); setNombre('') }} title="Nuevo grupo de cocina">
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Grupo Martes"
              required
              autoFocus
            />
          </div>
          {crearError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{crearError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setCrearOpen(false); setNombre('') }}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear grupo'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
