import { decodeToken, getToken } from '@/modules/auth/auth.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, CalendarDays, Package } from 'lucide-react'

export default function DashboardPage() {
  const token = getToken()
  const decoded = token ? decodeToken(token) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {decoded?.email}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Residencias', icon: Building2, color: 'text-blue-600' },
          { title: 'Residentes', icon: Users, color: 'text-green-600' },
          { title: 'Turnos activos', icon: CalendarDays, color: 'text-orange-600' },
          { title: 'Alertas de stock', icon: Package, color: 'text-red-600' },
        ].map(({ title, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
              <Icon size={20} className={color} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">—</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
