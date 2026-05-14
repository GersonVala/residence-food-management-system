import { getToken } from '@/modules/auth/auth.utils'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isBodyless = options.method === 'DELETE' || options.method === 'GET' || !options.method
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(!isBodyless ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, ...body }
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // No Content-Type: browser sets it with the multipart boundary
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, ...body }
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
}

// ─── Residencia detail helpers ────────────────────────────────────────────────

export interface ResidenciaFoto {
  id: number
  url: string
  orden: number
}

export interface ResidenteBasico {
  id: number
  nombre: string
  apellido: string
  dni: string
  universidad: string | null
  carrera: string | null
  activo: boolean
  fecha_ingreso: string
}

export interface VoluntarioBasico {
  id: number
  email: string
  role: string
  active: boolean
  residente: { nombre: string; apellido: string } | null
}

export interface ResidenciaDetalle {
  id: number
  nombre: string
  ciudad: string
  provincia: string
  capacidad_max: number
  rollback_horas: number
  activo: boolean
  imagen_url: string | null
  fotos: ResidenciaFoto[]
  residentes: ResidenteBasico[]
  historicos: ResidenteBasico[]
  voluntarios: VoluntarioBasico[]
}

export function getResidenciaDetalle(id: number) {
  return api.get<ResidenciaDetalle>(`/residencias/${id}`)
}

export function uploadImagenPrincipal(id: number, formData: FormData) {
  return api.upload<{ id: number; imagen_url: string }>(`/residencias/${id}/imagen`, formData)
}

export function addFoto(id: number, formData: FormData) {
  return api.upload<ResidenciaFoto>(`/residencias/${id}/fotos`, formData)
}

export function deleteFoto(residenciaId: number, fotoId: number) {
  return api.delete<void>(`/residencias/${residenciaId}/fotos/${fotoId}`)
}

export function reorderFotos(residenciaId: number, items: { id: number; orden: number }[]) {
  return api.patch<ResidenciaFoto[]>(`/residencias/${residenciaId}/fotos/reorder`, { items })
}
