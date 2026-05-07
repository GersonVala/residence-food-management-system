import { NavLink, useNavigate } from 'react-router-dom'
import { removeToken, decodeToken, getToken } from '@/modules/auth/auth.utils'
import { cn } from '@/lib/utils'
import {
  Home, Building2, Users, CalendarDays, BookOpen, Package, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/residencias', icon: Building2, label: 'Residencias', roles: ['ADMIN_GLOBAL'] },
  { to: '/residentes', icon: Users, label: 'Residentes' },
  { to: '/grupos', icon: Users, label: 'Grupos' },
  { to: '/turnos', icon: CalendarDays, label: 'Turnos' },
  { to: '/menus', icon: BookOpen, label: 'Menús' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/alimentos', icon: Package, label: 'Alimentos' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const token = getToken()
  const decoded = token ? decodeToken(token) : null
  const role = decoded?.role ?? ''

  function logout() {
    removeToken()
    navigate('/login')
  }

  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(role))

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-blue-900">Fundación Si</h1>
        <p className="text-xs text-gray-500 mt-1">Residencias</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-3 px-3">
          <div className="font-medium text-gray-700">{decoded?.email ?? ''}</div>
          <div>{role}</div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
