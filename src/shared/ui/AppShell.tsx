import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

const ETIQUETA = { ADMIN: 'Administración', RESIDENTE: 'Residente', GUARDIA: 'Caseta' }

export default function AppShell() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-3 bg-panel border-b border-borde">
        <div>
          <p className="font-bold leading-tight">Los Olivos</p>
          <p className="text-xs text-suave">{ETIQUETA[user.rol]}{user.casa ? ` · ${user.casa}` : ''}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:block text-suave">{user.nombre}</span>
          <button onClick={logout} className="rounded-lg border border-borde px-3 py-1.5 hover:bg-fondo">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto p-5"><Outlet /></main>
    </div>
  )
}
