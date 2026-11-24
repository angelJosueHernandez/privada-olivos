import { api, ErrorApi, hayApi } from '../../shared/api/cliente'
import { directorioService } from '../directorio/directorioService'
import type { Cuenta } from '../directorio/tipos'
import { INACTIVIDAD_MIN } from './permisos'

export type Rol = 'ADMIN' | 'RESIDENTE' | 'GUARDIA'
export type Usuario = {
  id: string; nombre: string; rol: Rol; casa?: string; email?: string
  /** Entró con una contraseña temporal: antes de usar la app debe crear la suya */
  debeCambiar?: boolean
  /** Cómo protege su segundo paso: app autenticadora o código de prueba (demo) */
  dosPasos?: 'APP' | 'PRUEBA' | 'SIN_CONFIGURAR'
}

/*
  Servicio de autenticación.
  - Con VITE_API_URL configurada habla con la API .NET (la sesión queda en una cookie HttpOnly).
  - Sin API corre en MODO DEMOSTRACIÓN. El demo NO es seguridad real: todo corre en el navegador.
    Aun así, las cuentas (en el directorio) solo guardan hashes SHA-256, para que las contraseñas
    no se lean en texto plano con las herramientas de desarrollador.
*/
export const MODO_DEMO = !hayApi

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
    debeCambiar: x.debeCambiar === true,
    dosPasos: x.dosPasos === 'APP' || x.dosPasos === 'PRUEBA' ? x.dosPasos : 'SIN_CONFIGURAR',
  }
}
const deCuenta = (c: Cuenta): Usuario => ({ id: c.id, nombre: c.nombre, rol: c.rol, casa: c.casa, email: c.email, debeCambiar: c.debeCambiar, dosPasos: c.dosPasos })

const CLAVE_SESION = 'olv-sesion'
function borrarSesionDemo() { try { sessionStorage.removeItem(CLAVE_SESION) } catch { /* nada */ } }

export const LIMITES = { email: 254, password: 128 } as const
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authService = {
  /**
   * Primer paso. `configurar2fa`: la cuenta aún no tiene app autenticadora y debe configurarla
   * (escanear el QR) antes de entrar.
   */
  async login(emailCrudo: string, password: string): Promise<{ usuario: Usuario; requiere2fa: boolean; configurar2fa: boolean }> {
    const email = emailCrudo.trim().toLowerCase()
    if (!CORREO.test(email) || email.length > LIMITES.email || password.length > LIMITES.password) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    if (MODO_DEMO) {
      await espera()
      const cuenta = await directorioService.verificar(email, password)
      return { usuario: deCuenta(cuenta), requiere2fa: true, configurar2fa: directorioService.necesitaConfigurar2fa(cuenta.id) }
    }
    try {
      const r = await api<{ usuario: unknown; requiere2fa: boolean; configurar2fa?: boolean }>('/api/auth/login', { metodo: 'POST', cuerpo: { email, password } })
      return { usuario: validarUsuario(r.usuario), requiere2fa: r.requiere2fa === true, configurar2fa: r.configurar2fa === true }
    } catch (e) {
      // Mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas existen.
      if (e instanceof ErrorApi && (e.estado === 400 || e.estado === 401)) throw new Error('Correo o contraseña incorrectos.')
      throw e
    }
  },

  async verificar2fa(codigo: string, usuario: Usuario): Promise<void> {
    if (!/^\d{6}$/.test(codigo)) throw new Error('El código debe tener 6 dígitos.')
    if (MODO_DEMO) {
      await espera()
      return directorioService.verificarSegundoFactor(usuario.id, codigo)
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
      // La cuenta se toma del directorio: si la suspendieron o le cerraron las sesiones, no se recupera
      const cuenta = directorioService.sesionVigente(s.id, new Date(s.inicio))
      if (!cuenta || Date.now() - s.ultima > INACTIVIDAD_MIN[cuenta.rol] * 60_000) { borrarSesionDemo(); return null }
      return { usuario: deCuenta(cuenta), inicio: new Date(s.inicio) }
    } catch { return null }
  },
  /** Demo: recuerda la sesión en esta pestaña (solo ID y horas) */
  recordar(usuario: Usuario, inicio: Date) {
    if (!MODO_DEMO) return
    try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ id: usuario.id, inicio: inicio.getTime(), ultima: Date.now() })) } catch { /* sin almacenamiento: solo en memoria */ }
    directorioService.registrarAcceso(usuario.id)
  },
  /**
   * ¿La administración sigue permitiendo esta sesión? (cuenta activa y sesiones no cerradas)
   * Con API se pregunta al servidor; en demo, al directorio de este navegador.
   */
  async sesionVigente(usuario: Usuario, inicio: Date): Promise<boolean> {
    if (!MODO_DEMO) {
      try { await api('/api/auth/sesion'); return true }
      catch (e) { return !(e instanceof ErrorApi && (e.estado === 401 || e.estado === 403)) } // sin red: no se saca a nadie
    }
    return directorioService.sesionVigente(usuario.id, inicio) !== null
  },
  /** La persona crea su propia contraseña (obligatorio después de una temporal) */
  async crearPassword(usuario: Usuario, nueva: string, actual?: string): Promise<void> {
    if (nueva.length > LIMITES.password || (actual?.length ?? 0) > LIMITES.password) throw new Error('Es demasiado larga (máximo 128).')
    await directorioService.cambiarPassword(usuario.id, nueva, actual)
  },
  /** Demo: anota la última actividad para que la sesión recuperada respete la inactividad */
  marcarActividad() {
    if (!MODO_DEMO) return
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? 'null')
      if (s) sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ ...s, ultima: Date.now() }))
    } catch { /* nada */ }
  },

  /**
   * Configurar la app autenticadora: el servidor genera el secreto y lo guarda pendiente.
   * Se devuelve el enlace otpauth:// para el QR (y el secreto para escribirlo a mano).
   */
  async iniciar2fa(usuario: Usuario): Promise<{ secreto: string; uri: string }> {
    if (!MODO_DEMO) {
      const r = await api<{ secreto: unknown; uri: unknown }>('/api/auth/2fa/configurar', { metodo: 'POST' })
      if (typeof r.secreto !== 'string' || typeof r.uri !== 'string' || !r.uri.startsWith('otpauth://totp/')) throw new ErrorApi('Respuesta inesperada del servidor.', 0)
      return { secreto: r.secreto, uri: r.uri }
    }
    return directorioService.iniciar2fa(usuario.id)
  },
  /** Confirma la configuración con el primer código que muestra la app */
  async activar2fa(usuario: Usuario, codigo: string): Promise<void> {
    if (!/^\d{6}$/.test(codigo)) throw new Error('El código debe tener 6 dígitos.')
    if (!MODO_DEMO) {
      try { await api('/api/auth/2fa/activar', { metodo: 'POST', cuerpo: { codigo } }); return }
      catch (e) {
        if (e instanceof ErrorApi && (e.estado === 400 || e.estado === 401)) throw new Error('El código no coincide. Escribe el código actual de tu app.')
        throw e
      }
    }
    await espera()
    await directorioService.activar2fa(usuario.id, codigo)
  },

  async logout(): Promise<void> {
    borrarSesionDemo()
    if (MODO_DEMO) return
    try { await api('/api/auth/logout', { metodo: 'POST' }) } catch { /* la sesión local se cierra igual */ }
  },
}
