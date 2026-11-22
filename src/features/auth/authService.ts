import { api, ErrorApi, hayApi } from '../../shared/api/cliente'
import { INACTIVIDAD_MIN } from './permisos'

export type Rol = 'ADMIN' | 'RESIDENTE' | 'GUARDIA'
export type Usuario = { id: string; nombre: string; rol: Rol; casa?: string; email?: string }

/*
  Servicio de autenticación.
  - Con VITE_API_URL configurada habla con la API .NET (la sesión queda en una cookie HttpOnly).
  - Sin API corre en MODO DEMOSTRACIÓN. El demo NO es seguridad real: todo corre en el navegador.
    Aun así, aquí solo viajan hashes SHA-256, para que las contraseñas no se lean en texto plano
    en el JavaScript con las herramientas de desarrollador.
*/
export const MODO_DEMO = !hayApi

const DEMO: Record<string, Usuario> = {
  '06067b8d70f90d3cbc8bc09757b9816585699477405732ab821d3fb39147fdb3': { id: '1', nombre: 'Alejandro Garza', rol: 'ADMIN', email: 'admin@demo.mx' },
  '422a5ba68a9a9ff0b77c72a99d82da60e324088f07d09ef3ba04f9ec7f0f2451': { id: 'u-res-2', nombre: 'María Treviño', rol: 'RESIDENTE', casa: 'Calle Palma 104', email: 'residente@demo.mx' },
  '72c53fa3cd5ba5cf88b1b73ccc82ba26f4883211115c86e2590b05c8b73ae85e': { id: '3', nombre: 'Luis Herrera', rol: 'GUARDIA', email: 'guardia@demo.mx' },
}
const DEMO_2FA = '220f3d1e7e34b05aa0fdae94fb025f6edb9218a8fef6e1c639eb7003493d3239'

async function sha256(texto: string): Promise<string> {
  const datos = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(datos), (b) => b.toString(16).padStart(2, '0')).join('')
}
const espera = (ms = 400) => new Promise((r) => setTimeout(r, ms))

// Nunca confiar en la forma de lo que llega: se valida antes de usarlo en la app.
const ROLES: Rol[] = ['ADMIN', 'RESIDENTE', 'GUARDIA']
function validarUsuario(u: unknown): Usuario {
  const x = u as Partial<Usuario> | null
  if (!x || typeof x.id !== 'string' || typeof x.nombre !== 'string' || !ROLES.includes(x.rol as Rol)) {
    throw new ErrorApi('Respuesta inesperada del servidor.', 0)
  }
  return {
    id: x.id, nombre: x.nombre.slice(0, 120), rol: x.rol as Rol,
    casa: typeof x.casa === 'string' ? x.casa.slice(0, 120) : undefined,
    email: typeof x.email === 'string' ? x.email.slice(0, 254) : undefined,
  }
}

const CLAVE_SESION = 'olv-sesion'
function borrarSesionDemo() { try { sessionStorage.removeItem(CLAVE_SESION) } catch { /* nada */ } }

export const LIMITES = { email: 254, password: 128 } as const
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authService = {
  async login(emailCrudo: string, password: string): Promise<{ usuario: Usuario; requiere2fa: boolean }> {
    const email = emailCrudo.trim().toLowerCase()
    if (!CORREO.test(email) || email.length > LIMITES.email || password.length > LIMITES.password) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    if (MODO_DEMO) {
      await espera()
      const usuario = DEMO[await sha256(`${email}:${password}`)]
      if (!usuario) throw new Error('Correo o contraseña incorrectos.')
      return { usuario, requiere2fa: true }
    }
    try {
      const r = await api<{ usuario: unknown; requiere2fa: boolean }>('/api/auth/login', { metodo: 'POST', cuerpo: { email, password } })
      return { usuario: validarUsuario(r.usuario), requiere2fa: r.requiere2fa === true }
    } catch (e) {
      // Mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas existen.
      if (e instanceof ErrorApi && (e.estado === 400 || e.estado === 401)) throw new Error('Correo o contraseña incorrectos.')
      throw e
    }
  },

  async verificar2fa(codigo: string): Promise<void> {
    if (!/^\d{6}$/.test(codigo)) throw new Error('El código debe tener 6 dígitos.')
    if (MODO_DEMO) {
      await espera()
      if ((await sha256(`2fa:${codigo}`)) !== DEMO_2FA) throw new Error('El código no es correcto. Revisa tu app de autenticación.')
      return
    }
    try {
      await api('/api/auth/2fa', { metodo: 'POST', cuerpo: { codigo } })
    } catch (e) {
      if (e instanceof ErrorApi && (e.estado === 400 || e.estado === 401)) throw new Error('El código no es correcto. Revisa tu app de autenticación.')
      throw e
    }
  },

  /**
   * Recupera la sesión al recargar la página o al volver con "atrás" (el navegador a veces recarga).
   * - Con API: la cookie HttpOnly la valida el servidor (GET /api/auth/sesion).
   * - Demo: sessionStorage guarda solo el ID (nunca contraseñas ni tokens) y el usuario se toma de la
   *   lista interna, así que editar el almacenamiento no inventa roles. Se borra al cerrar la pestaña
   *   y caduca con el mismo tiempo de inactividad del rol.
   */
  async restaurar(): Promise<{ usuario: Usuario; inicio: Date } | null> {
    if (!MODO_DEMO) {
      try {
        const r = await api<{ usuario: unknown; inicio?: string }>('/api/auth/sesion')
        const inicio = r.inicio ? new Date(r.inicio) : new Date()
        return { usuario: validarUsuario(r.usuario), inicio: isNaN(inicio.getTime()) ? new Date() : inicio }
      } catch { return null }
    }
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null') as { id?: unknown; inicio?: unknown; ultima?: unknown } | null
      if (!s || typeof s.id !== 'string' || typeof s.inicio !== 'number' || typeof s.ultima !== 'number') return null
      const usuario = Object.values(DEMO).find((u) => u.id === s.id)
      if (!usuario || Date.now() - s.ultima > INACTIVIDAD_MIN[usuario.rol] * 60_000) { borrarSesionDemo(); return null }
      return { usuario, inicio: new Date(s.inicio) }
    } catch { return null }
  },
  /** Demo: recuerda la sesión en esta pestaña (solo ID y horas) */
  recordar(usuario: Usuario, inicio: Date) {
    if (!MODO_DEMO) return
    try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ id: usuario.id, inicio: inicio.getTime(), ultima: Date.now() })) } catch { /* sin almacenamiento: solo en memoria */ }
  },
  /** Demo: anota la última actividad para que la sesión recuperada respete la inactividad */
  marcarActividad() {
    if (!MODO_DEMO) return
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null')
      if (s) sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ ...s, ultima: Date.now() }))
    } catch { /* nada */ }
  },

  async logout(): Promise<void> {
    borrarSesionDemo()
    if (MODO_DEMO) return
    try { await api('/api/auth/logout', { metodo: 'POST' }) } catch { /* la sesión local se cierra igual */ }
  },
}
