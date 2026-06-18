import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Lock, Phone, CheckCircle2, AlertCircle } from 'lucide-react'

interface ResidenteMe {
  id: number
  nombre: string
  apellido: string
  dni: string
  edad: number
  telefono: string | null
  universidad: string
  carrera: string
  ciudad_origen: string
  provincia_origen: string
  fecha_ingreso: string
  residencia: { id: number; nombre: string; ciudad: string; provincia: string }
  user: { email: string }
}

type Feedback = { tipo: 'ok' | 'error'; msg: string }

export default function ResidentePerfilPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const residenciaId = (decoded as unknown as { residencia_id?: number })?.residencia_id

  const [residente, setResidente] = useState<ResidenteMe | null>(null)
  const [loading, setLoading] = useState(true)

  // Teléfono
  const [telefono, setTelefono] = useState('')
  const [savingTel, setSavingTel] = useState(false)
  const [feedbackTel, setFeedbackTel] = useState<Feedback | null>(null)

  // Contraseña
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [feedbackPass, setFeedbackPass] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!residenciaId) return
    api.get<ResidenteMe>('/residentes/me')
      .then(r => {
        setResidente(r)
        setTelefono(r.telefono ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [residenciaId])

  async function guardarTelefono(e: React.FormEvent) {
    e.preventDefault()
    setSavingTel(true)
    setFeedbackTel(null)
    try {
      await api.patch('/residentes/me', { telefono })
      setFeedbackTel({ tipo: 'ok', msg: 'Teléfono actualizado.' })
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedbackTel({ tipo: 'error', msg: e.mensaje ?? 'Error al actualizar el teléfono.' })
    } finally {
      setSavingTel(false)
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackPass(null)
    if (passNueva !== passConfirm) {
      setFeedbackPass({ tipo: 'error', msg: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    if (passNueva.length < 6) {
      setFeedbackPass({ tipo: 'error', msg: 'La contraseña nueva debe tener al menos 6 caracteres.' })
      return
    }
    setSavingPass(true)
    try {
      await api.post('/auth/change-password', { password_actual: passActual, password_nuevo: passNueva })
      setFeedbackPass({ tipo: 'ok', msg: 'Contraseña actualizada correctamente.' })
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedbackPass({ tipo: 'error', msg: e.mensaje ?? 'Error al cambiar la contraseña.' })
    } finally {
      setSavingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!residente) return null

  const fechaIngreso = new Date(residente.fecha_ingreso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">{residente.residencia.nombre} · {residente.residencia.ciudad}</p>
      </div>

      {/* Datos personales (solo lectura) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={14} className="text-purple-500" /> Datos personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Nombre y apellido</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.nombre} {residente.apellido}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">DNI</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.dni}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Email</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Edad</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.edad} años</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Universidad</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.universidad}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Carrera</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.carrera}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Ciudad de origen</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{residente.ciudad_origen}, {residente.provincia_origen}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Fecha de ingreso</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{fechaIngreso}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Teléfono (editable) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Phone size={14} className="text-purple-500" /> Teléfono de contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarTelefono} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefono" className="text-xs text-gray-600">Número de teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="+54 11 1234-5678"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
              />
            </div>
            {feedbackTel && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedbackTel.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {feedbackTel.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {feedbackTel.msg}
              </div>
            )}
            <Button type="submit" disabled={savingTel} size="sm">
              {savingTel ? 'Guardando...' : 'Guardar teléfono'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Contraseña */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Lock size={14} className="text-purple-500" /> Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={cambiarPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pass-actual" className="text-xs text-gray-600">Contraseña actual</Label>
              <Input
                id="pass-actual"
                type="password"
                value={passActual}
                onChange={e => setPassActual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-nueva" className="text-xs text-gray-600">Nueva contraseña</Label>
              <Input
                id="pass-nueva"
                type="password"
                value={passNueva}
                onChange={e => setPassNueva(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-confirm" className="text-xs text-gray-600">Confirmar nueva contraseña</Label>
              <Input
                id="pass-confirm"
                type="password"
                value={passConfirm}
                onChange={e => setPassConfirm(e.target.value)}
                required
              />
            </div>
            {feedbackPass && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedbackPass.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {feedbackPass.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {feedbackPass.msg}
              </div>
            )}
            <Button type="submit" disabled={savingPass} size="sm">
              {savingPass ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
