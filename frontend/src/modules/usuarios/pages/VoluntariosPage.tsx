import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { UserCog, Copy, Check } from 'lucide-react'

interface Residencia {
  id: number
  nombre: string
  ciudad: string
}

interface UsuarioAdmin {
  id: number
  email: string
  role: 'ADMIN_GLOBAL' | 'ADMIN_RESIDENCIA'
  active: boolean
  residencia_id: number | null
  residencia: { id: number; nombre: string; ciudad: string } | null
  created_at: string
}

export default function VoluntariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [residencias, setResidencias] = useState<Residencia[]>([])
  const [loading, setLoading] = useState(true)

  // Modal crear
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    role: 'ADMIN_RESIDENCIA' as 'ADMIN_GLOBAL' | 'ADMIN_RESIDENCIA',
    residencia_id: '',
  })
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [passwordTemporal, setPasswordTemporal] = useState('')
  const [copied, setCopied] = useState(false)

  // Modal editar
  const [editOpen, setEditOpen] = useState(false)
  const [editUsuario, setEditUsuario] = useState<UsuarioAdmin | null>(null)
  const [editResidenciaId, setEditResidenciaId] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      api.get<UsuarioAdmin[]>('/usuarios'),
      api.get<Residencia[]>('/residencias'),
    ])
      .then(([u, r]) => { setUsuarios(u); setResidencias(r) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateSaving(true)
    setCreateError('')
    try {
      const body: Record<string, unknown> = {
        email: createForm.email,
        role: createForm.role,
      }
      if (createForm.residencia_id) {
        body.residencia_id = Number(createForm.residencia_id)
      }
      const result = await api.post<{ usuario: UsuarioAdmin; password_temporal: string }>('/usuarios', body)
      setPasswordTemporal(result.password_temporal)
      setCreateForm({ email: '', role: 'ADMIN_RESIDENCIA', residencia_id: '' })
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setCreateError(e.mensaje ?? 'Error al crear usuario')
    } finally {
      setCreateSaving(false)
    }
  }

  function openEdit(u: UsuarioAdmin) {
    setEditUsuario(u)
    setEditResidenciaId(u.residencia_id ? String(u.residencia_id) : '')
    setEditError('')
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUsuario) return
    setEditSaving(true)
    setEditError('')
    try {
      await api.patch(`/usuarios/${editUsuario.id}`, {
        residencia_id: editResidenciaId ? Number(editResidenciaId) : null,
      })
      setEditOpen(false)
      load()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setEditError(e.mensaje ?? 'Error al actualizar usuario')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDesactivar(u: UsuarioAdmin) {
    if (!confirm(`¿Desactivar a ${u.email}?`)) return
    await api.patch(`/usuarios/${u.id}`, { active: false })
    load()
  }

  async function handleActivar(u: UsuarioAdmin) {
    await api.patch(`/usuarios/${u.id}`, { active: true })
    load()
  }

  function copyPassword() {
    navigator.clipboard.writeText(passwordTemporal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    setPasswordTemporal('')
    setCreateError('')
    setCreateForm({ email: '', role: 'ADMIN_RESIDENCIA', residencia_id: '' })
  }

  const selectClass = "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voluntarios y Admins</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} administrativo{usuarios.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nuevo usuario</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : usuarios.length === 0 ? (
        <EmptyState icon={UserCog} title="Sin usuarios" description="Creá el primer usuario administrativo." />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Residencia</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'ADMIN_GLOBAL' ? 'default' : 'secondary'}>
                      {u.role === 'ADMIN_GLOBAL' ? 'Admin Global' : 'Voluntario'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.residencia
                      ? <><span className="font-medium text-gray-800">{u.residencia.nombre}</span><span className="block text-xs text-gray-400">{u.residencia.ciudad}</span></>
                      : <span className="text-gray-400 italic">Sin asignar</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.active ? 'success' : 'secondary'}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {u.role === 'ADMIN_RESIDENCIA' && (
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Reasignar
                        </button>
                      )}
                      {u.active
                        ? <button onClick={() => handleDesactivar(u)} className="text-xs text-red-500 hover:underline">Desactivar</button>
                        : <button onClick={() => handleActivar(u)} className="text-xs text-green-600 hover:underline">Activar</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear */}
      <Modal open={createOpen} onClose={closeCreateModal} title="Nuevo usuario administrativo">
        {passwordTemporal ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Usuario creado exitosamente. Compartí esta contraseña temporal — <strong>no se va a mostrar de nuevo</strong>.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
              <code className="flex-1 text-base font-mono text-gray-900">{passwordTemporal}</code>
              <button onClick={copyPassword} className="text-gray-400 hover:text-purple-600 transition-colors">
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <Button className="w-full" onClick={closeCreateModal}>Listo</Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-role">Rol</Label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as typeof f.role, residencia_id: '' }))}
                className={selectClass}
              >
                <option value="ADMIN_RESIDENCIA">Voluntario (Admin Residencia)</option>
                <option value="ADMIN_GLOBAL">Admin Global</option>
              </select>
            </div>
            {createForm.role === 'ADMIN_RESIDENCIA' && (
              <div className="space-y-1">
                <Label htmlFor="create-residencia">Residencia (opcional)</Label>
                <select
                  id="create-residencia"
                  value={createForm.residencia_id}
                  onChange={e => setCreateForm(f => ({ ...f, residencia_id: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">Sin asignar</option>
                  {residencias.filter(r => r).map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} — {r.ciudad}</option>
                  ))}
                </select>
              </div>
            )}
            {createError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{createError}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeCreateModal}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={createSaving}>
                {createSaving ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal reasignar residencia */}
      {editUsuario && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Reasignar residencia — ${editUsuario.email}`}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-residencia">Residencia</Label>
              <select
                id="edit-residencia"
                value={editResidenciaId}
                onChange={e => setEditResidenciaId(e.target.value)}
                className={selectClass}
              >
                <option value="">Sin asignar</option>
                {residencias.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.ciudad}</option>
                ))}
              </select>
            </div>
            {editError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{editError}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={editSaving}>
                {editSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
