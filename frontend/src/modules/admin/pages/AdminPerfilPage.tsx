import { useState } from 'react'
import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

type Feedback = { tipo: 'ok' | 'error'; msg: string }

export default function AdminPerfilPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const email = (decoded as unknown as { email?: string })?.email ?? ''
  const role = (decoded as unknown as { role?: string })?.role ?? ''

  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    if (passNueva !== passConfirm) {
      setFeedback({ tipo: 'error', msg: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    if (passNueva.length < 6) {
      setFeedback({ tipo: 'error', msg: 'La contraseña nueva debe tener al menos 6 caracteres.' })
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { password_actual: passActual, password_nuevo: passNueva })
      setFeedback({ tipo: 'ok', msg: 'Contraseña actualizada correctamente.' })
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setFeedback({ tipo: 'error', msg: e.mensaje ?? 'Error al cambiar la contraseña.' })
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = role === 'ADMIN_GLOBAL' ? 'Admin Global' : 'Admin Residencia'

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={14} className="text-purple-500" /> Datos de la cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Email</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Rol</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{roleLabel}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

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
            {feedback && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${feedback.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {feedback.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {feedback.msg}
              </div>
            )}
            <Button type="submit" disabled={saving} size="sm">
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
