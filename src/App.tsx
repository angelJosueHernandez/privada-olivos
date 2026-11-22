import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { rutaInicio, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import RequireRole from './features/auth/RequireRole'
import AppShell from './shared/ui/AppShell'
import ResidenteHome from './features/residente/ResidenteHome'
import GuardiaHome from './features/guardia/GuardiaHome'
import AdminHome from './features/admin/AdminHome'
import AdminAnuncios from './features/admin/AdminAnuncios'
import PagosPage from './features/residente/PagosPage'
import AnunciosPage from './features/residente/AnunciosPage'
import PrivacidadPage from './features/legal/PrivacidadPage'
import TerminosPage from './features/legal/TerminosPage'
import CookiesPage from './features/legal/CookiesPage'
import AvisoCookies from './features/legal/AvisoCookies'
import PerfilPage from './features/perfil/PerfilPage'

export default function App() {
  const { user, listo } = useAuth()
  // Mientras se revisa si hay sesión que recuperar no se redirige a nadie al login
  if (!listo) return <div className="min-h-dvh bg-fondo" aria-busy="true" />
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Documentos legales: públicos, sin sesión */}
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route element={<AppShell />}>
          <Route path="/residente" element={<RequireRole rol="RESIDENTE"><ResidenteHome /></RequireRole>} />
          <Route path="/residente/pagos" element={<RequireRole rol="RESIDENTE"><PagosPage /></RequireRole>} />
          <Route path="/residente/anuncios" element={<RequireRole rol="RESIDENTE"><AnunciosPage /></RequireRole>} />
          <Route path="/guardia" element={<RequireRole rol="GUARDIA"><GuardiaHome /></RequireRole>} />
          <Route path="/admin" element={<RequireRole rol="ADMIN"><AdminHome /></RequireRole>} />
          <Route path="/admin/anuncios" element={<RequireRole rol="ADMIN"><AdminAnuncios /></RequireRole>} />
          <Route path="/perfil" element={<RequireRole><PerfilPage /></RequireRole>} />
        </Route>
        <Route path="*" element={<Navigate to={user ? rutaInicio(user.rol) : '/login'} replace />} />
      </Routes>
      <AvisoCookies />
      {/* Notificaciones (Sonner): arriba al centro, lejos del pulgar y del aviso de cookies */}
      <Toaster position="top-center" richColors closeButton duration={3500}
        offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
        toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '16px', fontSize: '0.9375rem' } }} />
    </>
  )
}
