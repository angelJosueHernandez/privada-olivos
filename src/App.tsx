import { Navigate, Route, Routes } from 'react-router-dom'
import { rutaInicio, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import RequireRole from './features/auth/RequireRole'
import AppShell from './shared/ui/AppShell'
import ResidenteHome from './features/residente/ResidenteHome'
import GuardiaHome from './features/guardia/GuardiaHome'
import AdminHome from './features/admin/AdminHome'

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/residente" element={<RequireRole rol="RESIDENTE"><ResidenteHome /></RequireRole>} />
        <Route path="/guardia" element={<RequireRole rol="GUARDIA"><GuardiaHome /></RequireRole>} />
        <Route path="/admin" element={<RequireRole rol="ADMIN"><AdminHome /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? rutaInicio(user.rol) : '/login'} replace />} />
    </Routes>
  )
}
