import { MouseEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { Rol } from '../../features/auth/authService'
import Icon, { IconName } from './Icon'

type Destino = { ruta: string; etiqueta: string; icono: IconName }

/* Secciones de cada rol. Deben existir en PERMISOS (la lista blanca de rutas). */
export const SECCIONES: Partial<Record<Rol, Destino[]>> = {
  RESIDENTE: [
    { ruta: '/residente', etiqueta: 'Inicio', icono: 'inicio' },
    { ruta: '/residente/pagos', etiqueta: 'Pagos', icono: 'pagos' },
    { ruta: '/residente/anuncios', etiqueta: 'Anuncios', icono: 'megafono' },
  ],
  ADMIN: [
    { ruta: '/admin', etiqueta: 'Resumen', icono: 'inicio' },
    { ruta: '/admin/accesos', etiqueta: 'Accesos', icono: 'entrada' },
    { ruta: '/admin/pagos', etiqueta: 'Pagos', icono: 'pagos' },
    { ruta: '/admin/anuncios', etiqueta: 'Anuncios', icono: 'megafono' },
  ],
}

/*
  Historial como en las apps nativas (botón "atrás" de Android y gesto de iPhone):
  - De Inicio a otra pestaña se agrega al historial → "atrás" regresa a Inicio.
  - Entre pestañas secundarias se reemplaza → el historial no crece.
  - Volver a Inicio desde otra pestaña retrocede en lugar de apilar otro Inicio.
*/
function useNavegarPestana(secciones: Destino[] | undefined) {
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const inicio = secciones?.[0]?.ruta
  return (s: Destino) => (e: MouseEvent) => {
    if (!inicio || s.ruta === pathname) { e.preventDefault(); return }
    e.preventDefault()
    if (s.ruta === inicio) {
      if ((window.history.state?.idx ?? 0) > 0) navegar(-1)
      else navegar(inicio, { replace: true })
      return
    }
    navegar(s.ruta, { replace: pathname !== inicio })
  }
}

/** Barra de pestañas: abajo en celular (al alcance del pulgar), arriba en tableta y computadora */
export function BarraPestanas({ rol }: { rol: Rol }) {
  const secciones = SECCIONES[rol]
  const ir = useNavegarPestana(secciones)
  if (!secciones) return null
  return (
    <nav aria-label="Secciones" className="material fixed inset-x-0 bottom-0 z-30 border-t border-texto/[0.08] pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {secciones.map((s) => (
          <li key={s.ruta} className="flex-1">
            <NavLink to={s.ruta} end onClick={ir(s)}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[0.6875rem] font-medium transition-colors duration-150
                ${isActive ? 'text-acento' : 'text-texto/65'}`}>
              <Icon n={s.icono} size={24} stroke={1.9} />
              {s.etiqueta}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function PestanasSuperiores({ rol }: { rol: Rol }) {
  const secciones = SECCIONES[rol]
  const ir = useNavegarPestana(secciones)
  if (!secciones) return null
  return (
    <nav aria-label="Secciones" className="hidden lg:flex items-center gap-1 rounded-full bg-texto/[0.06] p-1">
      {secciones.map((s) => (
        <NavLink key={s.ruta} to={s.ruta} end onClick={ir(s)}
          className={({ isActive }) => `inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-150
            ${isActive ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70 hover:text-texto'}`}>
          <Icon n={s.icono} size={17} />{s.etiqueta}
        </NavLink>
      ))}
    </nav>
  )
}
