import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2, MapPin, Trash2, Pencil, ExternalLink } from 'lucide-react'

interface Residencia {
  id: number
  nombre: string
  ciudad: string
  provincia: string
  capacidad_max: number
  rollback_horas: number
  activo: boolean
  imagen_url?: string | null
  _count?: { residentes: number }
}

type CreateForm = {
  nombre: string
  direccion: string
  ciudad: string
  provincia: string
  capacidad_max: string
  rollback_horas: string
  imagen_url: string
}

type EditForm = CreateForm & { id: number }

const EMPTY_FORM: CreateForm = {
  nombre: '', direccion: '', ciudad: '', provincia: '',
  capacidad_max: '', rollback_horas: '2', imagen_url: ''
}

const CREATE_FIELDS = [
  { id: 'nombre', label: 'Nombre', type: 'text' },
  { id: 'direccion', label: 'Dirección', type: 'text' },
  { id: 'ciudad', label: 'Ciudad', type: 'text' },
  { id: 'provincia', label: 'Provincia', type: 'text' },
  { id: 'capacidad_max', label: 'Capacidad máxima', type: 'number' },
  { id: 'rollback_horas', label: 'Horas de rollback', type: 'number' },
  { id: 'imagen_url', label: 'URL de imagen (opcional)', type: 'text' },
] as const

export default function ResidenciasPage() {
  const navigate = useNavigate()
  const [residencias, setResidencias] = useState<Residencia[]>([])
  const [loading, setLoading] = useState(true)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function load() {
    setLoading(true)
    api.get<Residencia[]>('/residencias')
      .then(setResidencias)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateSaving(true)
    setCreateError('')
    try {
      await api.post('/residencias', {
        ...createForm,
        capacidad_max: Number(createForm.capacidad_max),
        rollback_horas: Number(createForm.rollback_horas),
        imagen_url: createForm.imagen_url || undefined,
      })
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setCreateError(e.mensaje ?? 'Error al crear residencia')
    } finally {
      setCreateSaving(false)
    }
  }

  function openEdit(r: Residencia) {
    setEditForm({
      id: r.id,
      nombre: r.nombre,
      direccion: '',
      ciudad: r.ciudad,
      provincia: r.provincia,
      capacidad_max: String(r.capacidad_max),
      rollback_horas: String(r.rollback_horas),
      imagen_url: r.imagen_url ?? '',
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm) return
    setEditSaving(true)
    setEditError('')
    try {
      await api.patch(`/residencias/${editForm.id}`, {
        nombre: editForm.nombre,
        ciudad: editForm.ciudad,
        provincia: editForm.provincia,
        capacidad_max: Number(editForm.capacidad_max),
        rollback_horas: Number(editForm.rollback_horas),
        imagen_url: editForm.imagen_url || undefined,
      })
      setEditOpen(false)
      setEditForm(null)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setEditError(e.mensaje ?? 'Error al editar residencia')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta residencia?')) return
    await api.delete(`/residencias/${id}`)
    load()
  }

  if (loading) return <div className="text-gray-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Residencias</h1>
        <Button onClick={() => setCreateOpen(true)}>Nueva residencia</Button>
      </div>

      {residencias.length === 0 ? (
        <EmptyState icon={Building2} title="Sin residencias" description="Creá la primera residencia del sistema." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residencias.map(r => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.activo ? 'success' : 'secondary'}>
                      {r.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <button
                      onClick={() => openEdit(r)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      aria-label="Editar residencia"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Eliminar residencia"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{r.nombre}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  {r.ciudad}, {r.provincia}
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <div>
                    Residentes: <span className="font-semibold text-gray-800">{r._count?.residentes ?? 0}</span>
                    <span className="text-gray-400"> / {r.capacidad_max}</span>
                  </div>
                  <div>Rollback: {r.rollback_horas}h</div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/residencias/${r.id}`)}
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva residencia">
        <form onSubmit={handleCreate} className="space-y-3">
          {CREATE_FIELDS.map(({ id, label, type }) => (
            <div key={id} className="space-y-1">
              <Label htmlFor={`create-${id}`}>{label}</Label>
              <Input
                id={`create-${id}`}
                type={type}
                value={createForm[id]}
                onChange={e => setCreateForm(f => ({ ...f, [id]: e.target.value }))}
                required={id !== 'imagen_url'}
              />
            </div>
          ))}
          {createError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{createError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={createSaving}>{createSaving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      {editForm && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar residencia">
          <form onSubmit={handleEdit} className="space-y-3">
            {CREATE_FIELDS.map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <Label htmlFor={`edit-${id}`}>{label}</Label>
                <Input
                  id={`edit-${id}`}
                  type={type}
                  value={editForm[id]}
                  onChange={e => setEditForm(f => f ? { ...f, [id]: e.target.value } : f)}
                  required={id !== 'imagen_url' && id !== 'direccion'}
                />
              </div>
            ))}
            {editError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{editError}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={editSaving}>{editSaving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
