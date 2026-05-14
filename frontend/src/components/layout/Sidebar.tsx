import { NavLink, useNavigate } from 'react-router-dom'
import { removeToken, decodeToken, getToken } from '@/modules/auth/auth.utils'
import { cn } from '@/lib/utils'
import {
  Home, Building2, Users, Package, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/residencias', icon: Building2, label: 'Residencias', roles: ['ADMIN_GLOBAL'] },
  { to: '/residentes', icon: Users, label: 'Residentes' },
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
    <aside
      className="w-64 flex flex-col h-full text-white"
      style={{
        background: 'linear-gradient(180deg, #6B3FA0 0%, #52308A 100%)',
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div
            className="rounded-full p-0.5"
            style={{
              background:
                'linear-gradient(135deg, #F5A623 0%, #FEF3DC 100%)',
            }}
          >
            <img
              src="/fundacionsilogo.png"
              alt="Fundación Si"
              className="w-10 h-10 rounded-full bg-white p-0.5 object-contain"
            />
          </div>
          <div>
            <h1 className="font-serif text-base font-bold text-white leading-tight">
              Fundación Si
            </h1>
            <p className="text-xs text-white/60">Residencias</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                'transition-all duration-200 ease-out',
                'border-l-4',
                isActive
                  ? 'border-[#F5A623] bg-white/20 text-white'
                  : 'border-transparent text-white/75 hover:translate-x-0.5 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/15">
        <div className="text-xs text-white/70 mb-3 px-2">
          <div className="font-semibold text-white truncate">
            {decoded?.email ?? ''}
          </div>
          <div className="text-white/55">{role}</div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
