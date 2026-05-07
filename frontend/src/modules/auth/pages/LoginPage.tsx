import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { setToken, isAuthenticated } from '@/modules/auth/auth.utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      type LoginResponse = { token: string; primer_login: boolean; usuario: { id: number; email: string; role: string; residencia_id: number | null } }
      const { token, primer_login } = await api.post<LoginResponse>('/auth/login', { email, password })
      setToken(token)
      if (primer_login) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT — brand panel */}
      <div
        className="relative flex-1 flex items-center justify-center p-10 md:p-16 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #6B3FA0 0%, #52308A 60%, #3F2470 100%)',
        }}
      >
        {/* Decorative gold ring */}
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full border-[6px] opacity-30"
          style={{ borderColor: '#F5A623' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full border-[2px] opacity-10"
          style={{ borderColor: '#F5A623' }}
        />

        <div className="relative z-10 max-w-md text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center mb-8">
            <div
              className="rounded-full p-1"
              style={{
                background:
                  'linear-gradient(135deg, #F5A623 0%, #FEF3DC 100%)',
              }}
            >
              <img
                src="/fundacionsilogo.png"
                alt="Fundación Si"
                className="w-32 h-32 rounded-full bg-white object-contain p-2"
              />
            </div>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Fundación Si
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Acompañamos a estudiantes en sus residencias universitarias.
          </p>
          <div
            aria-hidden
            className="mx-auto mt-8 h-1 w-16 rounded-full"
            style={{ backgroundColor: '#F5A623' }}
          />
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 md:p-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 text-center md:text-left">
            <h2 className="font-serif text-2xl font-bold text-brand-purple mb-1">
              Bienvenido
            </h2>
            <p className="text-sm text-gray-500">Ingresá con tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full text-white font-semibold py-2.5 transition-colors"
              style={{ backgroundColor: '#6B3FA0' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-8 text-xs text-gray-400 text-center">
            Sistema interno · Fundación Si
          </p>
        </div>
      </div>
    </div>
  )
}
