import { Outlet, Navigate } from 'react-router-dom'
import { isAuthenticated } from '@/modules/auth/auth.utils'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
