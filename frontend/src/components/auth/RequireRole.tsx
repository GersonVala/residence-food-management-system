import { Navigate, Outlet } from 'react-router-dom'
import { getToken, decodeToken } from '@/modules/auth/auth.utils'

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
    return <Navigate to={redirectTo ?? '/dashboard'} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
