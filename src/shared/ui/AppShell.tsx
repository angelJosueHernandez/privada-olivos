import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import Icon from './Icon'
import Marca from './Marca'

const ETIQUETA = { ADMIN: 'Administración', RESIDENTE: 'Residente', GUARDIA: 'Caseta' }

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export default function AppShell() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="material sticky top-0 z-20 border-b border-texto/[0.08] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-5xl h-14 px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Marca size={30} />
            <div className="min-w-0 leading-tight">
              <p className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Los Olivos</p>
              <p className="text-[0.75rem] text-suave truncate">
                {ETIQUETA[user.rol]}{user.casa ? ` · ${user.casa}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2.5 pr-2 text-[0.875rem] text-suave">
              <span aria-hidden="true" className="grid place-items-center h-8 w-8 rounded-full bg-acento/15 text-acento text-[0.75rem] font-semibold">
                {iniciales(user.nombre)}
              </span>
              {user.nombre}
            </span>
            <button onClick={logout} aria-label="Cerrar sesión"
              className="btn-secundario btn-chico whitespace-nowrap max-sm:w-11 max-sm:h-11 max-sm:px-0">
              <Icon n="salir" size={18} />
              <span className="max-sm:sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 pt-8 sm:pt-12 pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
        <Outlet />
      </main>
    </div>
  )
}
