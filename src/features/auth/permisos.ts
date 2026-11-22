import type { Rol } from './authService'

/*
  Única fuente de verdad de qué puede ver cada rol en la interfaz.
  Lista blanca: si una ruta no aparece aquí para el rol, no se muestra (se redirige a su inicio).

  Recordatorio: esto protege la NAVEGACIÓN. La protección real de los DATOS está en la API, que
  debe validar el rol de la sesión (cookie HttpOnly) en cada petición. Nada de lo que corre en el
  navegador es confiable por sí solo.
*/
export const PERMISOS: Record<Rol, readonly string[]> = Object.freeze({
  // La primera ruta es el inicio del rol; /perfil es común a todos (solo muestra el perfil propio)
  ADMIN: Object.freeze(['/admin', '/perfil']),
  RESIDENTE: Object.freeze(['/residente', '/perfil']),
  GUARDIA: Object.freeze(['/guardia', '/perfil']),
})

/** Minutos sin actividad antes de cerrar la sesión automáticamente */
export const INACTIVIDAD_MIN: Record<Rol, number> = Object.freeze({ ADMIN: 15, RESIDENTE: 30, GUARDIA: 60 })

export const rutaInicio = (rol: Rol) => PERMISOS[rol][0]

/** Compara solo la ruta (sin query ni hash) contra la lista blanca, incluidas subrutas */
export function puedeVer(rol: Rol, ruta: string): boolean {
  const limpia = ruta.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return PERMISOS[rol].some((r) => limpia === r || limpia.startsWith(`${r}/`))
}
