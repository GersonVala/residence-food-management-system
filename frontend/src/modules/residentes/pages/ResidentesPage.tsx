import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Eye, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'

const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa',
  'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
  'Ciudad Autónoma de Buenos Aires',
]

const PAGE_SIZE = 10

interface Residente {
  id: number
  nombre: string
  apellido: string
  dni: string
  edad: number
  universidad: string
  carrera: string
  ciudad_origen: string
  activo: boolean
  fecha_ingreso: string
  residencia?: { id: number; nombre: string; ciudad: string }
  user?: { email: string }
}

export default function ResidentesPage() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const role = decoded?.role ?? ''
  const isAdminGlobal = role === 'ADMIN_GLOBAL'
  const residenciaId = decoded?.residencia_id

  const [residentes, setResidentes] = useState<Residente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    email: '', nombre: '', apellido: '', dni: '', edad: '',
    telefono: '', universidad: '', carrera: '',
    ciudad_origen: '', provincia_origen: '', fecha_ingreso: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroResidencia, setFiltroResidencia] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [pagina, setPagina] = useState(1)

  function load() {
    setLoading(true)
    const endpoint = isAdminGlobal
      ? '/residentes'
      : `/residencias/${residenciaId}/residentes`

    if (!isAdminGlobal && !residenciaId) { setLoading(false); return }

    api.get<Residente[]>(endpoint)
      .then(setResidentes)
      .finally(() => setLoading(false))
  }

  useEffect(load, [isAdminGlobal, residenciaId])

  // Opciones únicas para selects
  const residenciasOpciones = useMemo(() =>
    Array.from(new Map(
      residentes
        .filter(r => r.residencia)
        .map(r => [r.residencia!.id, r.residencia!.nombre])
    ).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [residentes]
  )

  const carrerasOpciones = useMemo(() =>
    Array.from(new Set(residentes.map(r => r.carrera))).sort(),
    [residentes]
  )

  // Filtrado
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return residentes.filter(r => {
      const matchBusqueda = !q || [r.nombre, r.apellido, r.dni, r.user?.email ?? ''].some(v => v.toLowerCase().includes(q))
      const matchResidencia = !filtroResidencia || String(r.residencia?.id) === filtroResidencia
      const matchCarrera = !filtroCarrera || r.carrera === filtroCarrera
      const matchEstado = filtroEstado === 'todos' || (filtroEstado === 'activo' ? r.activo : !r.activo)
      return matchBusqueda && matchResidencia && matchCarrera && matchEstado
    })
  }, [residentes, busqueda, filtroResidencia, filtroCarrera, filtroEstado])

  // Reset página cuando cambian los filtros
  useEffect(() => { setPagina(1) }, [busqueda, filtroResidencia, filtroCarrera, filtroEstado])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const hayFiltrosActivos = busqueda || filtroResidencia || filtroCarrera || filtroEstado !== 'todos'

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroResidencia('')
    setFiltroCarrera('')
    setFiltroEstado('todos')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!residenciaId) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/residencias/${residenciaId}/residentes`, {
        ...form,
        edad: Number(form.edad),
        fecha_ingreso: new Date(form.fecha_ingreso).toISOString()
      })
      setModalOpen(false)
      setForm({ email: '', nombre: '', apellido: '', dni: '', edad: '', telefono: '', universidad: '', carrera: '', ciudad_origen: '', provincia_origen: '', fecha_ingreso: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al crear residente')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdminGlobal && !residenciaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
      <p className="text-gray-500">Tu cuenta no tiene una residencia asignada.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residentes</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {filtrados.length} de {residentes.length} residente{residentes.length !== 1 ? 's' : ''}
              {hayFiltrosActivos && ' (filtrado)'}
            </p>
          )}
        </div>
        {!isAdminGlobal && (
          <Button onClick={() => setModalOpen(true)}>Nuevo residente</Button>
        )}
      </div>

      {/* Buscador y filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, DNI o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {isAdminGlobal && (
            <select
              value={filtroResidencia}
              onChange={e => setFiltroResidencia(e.target.value)}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="">Todas las residencias</option>
              {residenciasOpciones.map(([id, nombre]) => (
                <option key={id} value={String(id)}>{nombre}</option>
              ))}
            </select>
          )}

          <select
            value={filtroCarrera}
            onChange={e => setFiltroCarrera(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          >
            <option value="">Todas las carreras</option>
            {carrerasOpciones.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['todos', 'activo', 'inactivo'] as const).map(estado => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  filtroEstado === estado
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {estado === 'todos' ? 'Todos' : estado === 'activo' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description={hayFiltrosActivos ? 'Probá ajustando los filtros.' : 'No hay residentes registrados.'} />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">DNI</th>
                  {isAdminGlobal && <th className="text-left px-4 py-3 font-medium text-gray-600">Residencia</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Universidad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Carrera</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginados.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/residentes/${r.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nombre} {r.apellido}</td>
                    <td className="px-4 py-3 text-gray-600">{r.dni}</td>
                    {isAdminGlobal && (
                      <td className="px-4 py-3 text-gray-600">
                        <span className="font-medium text-gray-800">{r.residencia?.nombre}</span>
                        <span className="block text-xs text-gray-400">{r.residencia?.ciudad}</span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{r.universidad}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{r.carrera}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.activo ? 'success' : 'secondary'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/residentes/${r.id}`)}
                        className="text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Página {pagina} de {totalPaginas} · {filtrados.length} resultados
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((item, i) =>
                    item === '...'
                      ? <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                      : <button
                          key={item}
                          onClick={() => setPagina(item as number)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            pagina === item
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {item}
                        </button>
                  )
                }
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal crear residente */}
      {!isAdminGlobal && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo residente">
          <form onSubmit={handleCreate} className="space-y-3">
            {[
              { id: 'nombre', label: 'Nombre', type: 'text' },
              { id: 'apellido', label: 'Apellido', type: 'text' },
              { id: 'email', label: 'Email', type: 'email' },
              { id: 'dni', label: 'DNI', type: 'text' },
              { id: 'edad', label: 'Edad', type: 'number' },
              { id: 'telefono', label: 'Teléfono', type: 'text' },
              { id: 'universidad', label: 'Universidad', type: 'text' },
              { id: 'carrera', label: 'Carrera', type: 'text' },
              { id: 'ciudad_origen', label: 'Ciudad de origen', type: 'text' },
              { id: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
            ].map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type}
                  value={form[id as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="provincia_origen">Provincia de origen</Label>
              <select
                id="provincia_origen"
                value={form.provincia_origen}
                onChange={e => setForm(f => ({ ...f, provincia_origen: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccioná una provincia</option>
                {PROVINCIAS_ARGENTINA.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
