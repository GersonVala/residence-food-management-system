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
import StockPage from '@/modules/stock/pages/StockPage'
import MenusPage from '@/modules/menus/pages/MenusPage'
import GruposPage from '@/modules/grupos/pages/GruposPage'
import TurnosPage from '@/modules/turnos/pages/TurnosPage'
import HistorialPage from '@/modules/historial/pages/HistorialPage'
import ResidenteHomePage from '@/modules/residente/pages/ResidenteHomePage'
import ResidenteMenusPage from '@/modules/residente/pages/ResidenteMenusPage'
import ResidenteStockPage from '@/modules/residente/pages/ResidenteStockPage'
import ResidentePerfilPage from '@/modules/residente/pages/ResidentePerfilPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        {/* Admin routes */}
        <Route element={<RequireRole roles={['ADMIN_GLOBAL', 'ADMIN_RESIDENCIA']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<RequireRole roles={['ADMIN_GLOBAL']} />}>
          <Route path="/residencias" element={<ResidenciasPage />} />
          <Route path="/residencias/:id" element={<ResidenciaDetailPage />} />
        </Route>
        <Route element={<RequireRole roles={['ADMIN_GLOBAL', 'ADMIN_RESIDENCIA']} />}>
          <Route path="/residentes" element={<ResidentesPage />} />
          <Route path="/residentes/:id" element={<ResidenteDetailPage />} />
        </Route>
        <Route element={<RequireRole roles={['ADMIN_RESIDENCIA']} />}>
          <Route path="/alimentos" element={<AlimentosPage />} />
          <Route path="/alimentos/:id" element={<AlimentoDetailPage />} />
        </Route>
        <Route element={<RequireRole roles={['ADMIN_RESIDENCIA']} />}>
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/turnos" element={<TurnosPage />} />
          <Route path="/historial" element={<HistorialPage />} />
          <Route path="/menus" element={<MenusPage />} />
          <Route path="/stock" element={<StockPage />} />
        </Route>
        {/* Residente routes */}
        <Route element={<RequireRole roles={['RESIDENTE']} />}>
          <Route path="/mi-residencia" element={<ResidenteHomePage />} />
          <Route path="/mis-menus" element={<ResidenteMenusPage />} />
          <Route path="/mi-stock" element={<ResidenteStockPage />} />
          <Route path="/mi-perfil" element={<ResidentePerfilPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
