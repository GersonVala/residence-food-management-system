import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/modules/auth/pages/LoginPage'
import ChangePasswordPage from '@/modules/auth/pages/ChangePasswordPage'
import DashboardPage from '@/modules/dashboard/pages/DashboardPage'
import ResidenciasPage from '@/modules/residencias/pages/ResidenciasPage'
import ResidentesPage from '@/modules/residentes/pages/ResidentesPage'
import GruposPage from '@/modules/grupos/pages/GruposPage'
import TurnosPage from '@/modules/turnos/pages/TurnosPage'
import MenusPage from '@/modules/menus/pages/MenusPage'
import StockPage from '@/modules/stock/pages/StockPage'
import AlimentosPage from '@/modules/stock/pages/AlimentosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/residencias" element={<ResidenciasPage />} />
        <Route path="/residentes" element={<ResidentesPage />} />
        <Route path="/grupos" element={<GruposPage />} />
        <Route path="/turnos" element={<TurnosPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/alimentos" element={<AlimentosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
