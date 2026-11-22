import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { INACTIVIDAD_MIN } from '../../features/auth/permisos'
import { useInactividad } from '../../features/auth/useInactividad'
import Icon from './Icon'
import Marca from './Marca'
import { BarraPestanas, PestanasSuperiores, SECCIONES } from './Navegacion'
import AvisosGlobales from '../avisos/AvisosGlobales'

const ETIQUETA = { ADMIN: 'Administración', RESIDENTE: 'Residente', GUARDIA: 'Caseta' }

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export default function AppShell() {
  const { user, logout } = useAuth()
  // Cierre automático por inactividad según el rol
  useInactividad(user ? INACTIVIDAD_MIN[user.rol] : 0, logout, !!user)
  if (!user) return <Navigate to="/login" replace />
  const conPestanas = !!SECCIONES[user.rol]
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
          <PestanasSuperiores rol={user.rol} />
          <div className="flex items-center gap-2">
            <Link to="/perfil" aria-label={`Mi perfil: ${user.nombre}`}
              className="flex items-center gap-2.5 rounded-full pr-1 sm:pr-3 text-[0.875rem] text-suave hover:bg-texto/[0.05] transition-colors">
              <span aria-hidden="true" className="grid place-items-center h-9 w-9 rounded-full bg-acento/15 text-acento text-[0.75rem] font-semibold">
                {iniciales(user.nombre)}
              </span>
              <span className="hidden sm:inline">{user.nombre}</span>
            </Link>
            <button onClick={logout} aria-label="Cerrar sesión"
              className="btn-secundario btn-chico whitespace-nowrap max-sm:w-11 max-sm:h-11 max-sm:px-0">
              <Icon n="salir" size={18} />
              <span className="max-sm:sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      <main className={`flex-1 w-full max-w-5xl mx-auto px-5 pt-8 sm:pt-12 ${conPestanas ? 'pb-10' : 'pb-[calc(env(safe-area-inset-bottom)+2.5rem)]'}`}>
        <Outlet />
      </main>
      <footer className={`w-full max-w-5xl mx-auto px-5 flex ${conPestanas ? 'pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-6' : 'pb-[calc(env(safe-area-inset-bottom)+1.5rem)]'} flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] text-suave`}>
        <Link to="/privacidad" className="hover:text-texto hover:underline underline-offset-4">Aviso de privacidad</Link>
        <Link to="/terminos" className="hover:text-texto hover:underline underline-offset-4">Términos y condiciones</Link>
        <Link to="/cookies" className="hover:text-texto hover:underline underline-offset-4">Cookies</Link>
      </footer>
      <BarraPestanas rol={user.rol} />
      <AvisosGlobales user={user} />
    </div>
  )
}
