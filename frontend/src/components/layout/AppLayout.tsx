import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '@/modules/auth/auth.utils'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const location = useLocation()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-brand-purple-soft">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div
          key={location.pathname}
          className="mx-auto max-w-7xl p-6 md:p-8 animate-fade-in"
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
