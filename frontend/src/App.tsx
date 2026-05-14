import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireRole } from '@/components/auth/RequireRole'
import LoginPage from '@/modules/auth/pages/LoginPage'
import ChangePasswordPage from '@/modules/auth/pages/ChangePasswordPage'
import DashboardPage from '@/modules/dashboard/pages/DashboardPage'
import ResidenciasPage from '@/modules/residencias/pages/ResidenciasPage'
import ResidenciaDetailPage from '@/modules/residencias/pages/ResidenciaDetailPage'
import ResidentesPage from '@/modules/residentes/pages/ResidentesPage'
import ResidenteDetailPage from '@/modules/residentes/pages/ResidenteDetailPage'
import AlimentosPage from '@/modules/stock/pages/AlimentosPage'
import AlimentoDetailPage from '@/modules/stock/pages/AlimentoDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route element={<RequireRole roles={['ADMIN_GLOBAL']} />}>
          <Route path="/residencias" element={<ResidenciasPage />} />
          <Route path="/residencias/:id" element={<ResidenciaDetailPage />} />
        </Route>
        <Route path="/residentes" element={<ResidentesPage />} />
        <Route path="/residentes/:id" element={<ResidenteDetailPage />} />
        <Route path="/alimentos" element={<AlimentosPage />} />
        <Route path="/alimentos/:id" element={<AlimentoDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
