import { Navigate, Outlet } from 'react-router-dom'
import { getToken, decodeToken } from '@/modules/auth/auth.utils'
import { rutaInicio } from '@/modules/auth/auth.rutas'

interface RequireRoleProps {
  roles: string[]
  redirectTo?: string
  children?: React.ReactNode
}

export function RequireRole({ roles, redirectTo, children }: RequireRoleProps) {
  const token = getToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const payload = decodeToken(token)

  if (!payload) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(payload.role)) {
    return <Navigate to={redirectTo ?? rutaInicio(payload.role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
