import type { Rol } from '../auth/authService'
import type { Actor } from '../caseta/tipos'

// ---------- Casas ----------
export type Casa = {
  id: string
  calle: string
  numero: string
  /** Desactivada: no aparece en caseta, anuncios ni cobranza (se conserva su historial) */
  activa: boolean
  notas?: string
  creadaEn: Date
}
export type NuevaCasa = Pick<Casa, 'calle' | 'numero' | 'notas'>
/** Nombre con el que se identifica la casa en toda la app ("Calle Palma 104") */
export const nombreCasa = (c: Pick<Casa, 'calle' | 'numero'>) => `Calle ${c.calle} ${c.numero}`

// ---------- Cuentas de usuario ----------
export type EstadoCuenta = 'ACTIVA' | 'SUSPENDIDA'
export type Cuenta = {
  id: string
  nombre: string
  email: string
  telefono?: string
  rol: Rol
  /** Solo residentes */
  casa?: string
  estado: EstadoCuenta
  motivoSuspension?: string
  /** Tiene contraseña definida (si no, todavía no puede entrar) */
  tieneAcceso: boolean
  /** Entró con contraseña temporal: debe crear la suya */
  debeCambiar: boolean
  /** La contraseña temporal deja de servir después de esta fecha */
  temporalVence?: Date
  creadoEn: Date
  ultimoAcceso?: Date
  /** Las sesiones iniciadas antes de esta fecha ya no son válidas */
  sesionesCerradasEn?: Date
  /** Segundo factor: app autenticadora, código fijo de prueba (solo demo) o falta configurarlo */
  dosPasos: 'APP' | 'PRUEBA' | 'SIN_CONFIGURAR'
}
export type DatosCuenta = Pick<Cuenta, 'nombre' | 'email' | 'telefono' | 'rol' | 'casa'>

export const ETIQUETA_ROL: Record<Rol, string> = { ADMIN: 'Administración', RESIDENTE: 'Residente', GUARDIA: 'Guardia' }

// ---------- Bitácora de cambios ----------
export type Cambio = { id: string; en: Date; por: Actor; accion: string; detalle: string }

// ---------- Reglas compartidas ----------
export const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PASSWORD_MIN = 10
export const HORAS_TEMPORAL = 72
/** Valida una contraseña nueva elegida por la persona. Devuelve el error o '' */
export function revisarPassword(nueva: string, email?: string): string {
  if (nueva.length < PASSWORD_MIN) return `Usa al menos ${PASSWORD_MIN} caracteres.`
  if (nueva.length > 128) return 'Es demasiado larga (máximo 128).'
  if (/^(.)\1+$/.test(nueva)) return 'No uses el mismo carácter repetido.'
  if (email && nueva.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'No incluyas tu correo en la contraseña.'
  if (/^(1234567890?|0123456789|password\d*|contrase(n|ñ)a\d*|qwerty\w*)$/i.test(nueva)) return 'Es demasiado común. Elige otra.'
  return ''
}
