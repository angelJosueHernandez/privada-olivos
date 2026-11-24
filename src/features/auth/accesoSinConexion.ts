import type { Rol, Usuario } from './authService'

/*
  Entrar sin internet en un dispositivo de confianza (solo con API; el modo demo ya es local).

  Con internet, la contraseña y el código de la app autenticadora los verifica el servidor. Sin
  internet eso es imposible, y un guardia no puede quedarse fuera de la caseta. Por eso:

  - Al entrar CON internet (contraseña + código correctos), este dispositivo guarda una huella de
    la contraseña: PBKDF2-SHA256, 310 000 iteraciones, con sal aleatoria propia. Nunca la contraseña.
  - SIN internet se entra con la contraseña; el segundo factor es el dispositivo mismo (algo que la
    persona tiene: solo sirve donde ya entró con internet y pasó el código).
  - Vence a los 7 días de la última entrada con internet. 5 intentos fallidos lo borran.
  - No aplica a Administración: sus acciones necesitan el servidor y su cuenta es la más sensible.
  - Al reconectar, el servidor vuelve a validar la sesión; si ya no vale (contraseña cambiada,
    cuenta suspendida), se pide entrar de nuevo con internet antes de enviar lo pendiente.
*/

const CLAVE = 'olv-acceso-sin-conexion'
const ITERACIONES = 310_000
const VIGENCIA_MS = 7 * 86_400_000
const MAX_FALLOS = 5
const ROLES_PERMITIDOS: Rol[] = ['GUARDIA', 'RESIDENTE']

type Registro = { usuario: Usuario; sal: string; verificador: string; vence: number; fallos: number }
type Registros = Record<string, Registro>

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')
async function derivar(password: string, sal: string): Promise<string> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sal), iterations: ITERACIONES }, base, 256))
}
const iguales = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, k) => d | (c.charCodeAt(0) ^ b.charCodeAt(k)), 0) === 0

function leer(): Registros {
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Registros
    return r && typeof r === 'object' ? r : {}
  } catch { return {} }
}
function escribir(r: Registros) {
  try { localStorage.setItem(CLAVE, JSON.stringify(r)) } catch { /* sin almacenamiento: no hay acceso sin conexión */ }
}

/** Preparado al escribir la contraseña; solo se guarda si después el código 2FA es correcto */
export type Preparado = { email: string; sal: string; verificador: string }

export const accesoSinConexion = {
  permitidoPara: (rol: Rol) => ROLES_PERMITIDOS.includes(rol),

  /** Calcula la huella mientras el servidor revisa la contraseña (no se guarda nada todavía) */
  async preparar(email: string, password: string): Promise<Preparado> {
    const sal = hex(crypto.getRandomValues(new Uint8Array(16)))
    return { email, sal, verificador: await derivar(password, sal) }
  },

  /** Tras entrar con internet y código correcto: este dispositivo queda de confianza 7 días */
  guardar(p: Preparado, usuario: Usuario) {
    const r = leer()
    if (!accesoSinConexion.permitidoPara(usuario.rol)) { delete r[p.email]; escribir(r); return }
    r[p.email] = { usuario, sal: p.sal, verificador: p.verificador, vence: Date.now() + VIGENCIA_MS, fallos: 0 }
    escribir(r)
  },

  /**
   * Sin internet: devuelve la cuenta si la contraseña coincide con la huella vigente.
   * Mensajes distintos para que la persona sepa qué hacer (el dispositivo ya es suyo).
   */
  async verificar(email: string, password: string): Promise<Usuario> {
    const r = leer()
    const reg = r[email]
    if (!reg) throw new Error('Sin internet solo puedes entrar en un dispositivo donde ya hayas entrado antes con internet.')
    if (Date.now() > reg.vence) {
      delete r[email]; escribir(r)
      throw new Error('Pasaron más de 7 días desde tu última entrada con internet. Conéctate para entrar.')
    }
    if (iguales(await derivar(password, reg.sal), reg.verificador)) {
      r[email] = { ...reg, fallos: 0 }; escribir(r)
      return reg.usuario
    }
    const fallos = reg.fallos + 1
    if (fallos >= MAX_FALLOS) {
      delete r[email]; escribir(r)
      throw new Error('Demasiados intentos. Por seguridad, este dispositivo ya no permite entrar sin internet: conéctate para entrar.')
    }
    r[email] = { ...reg, fallos }; escribir(r)
    const quedan = MAX_FALLOS - fallos
    throw new Error(`Contraseña incorrecta. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`} sin internet.`)
  },

  /** Hasta cuándo puede entrar sin internet en este dispositivo (para el perfil) */
  vigencia(email?: string): Date | null {
    const reg = email ? leer()[email] : undefined
    return reg && reg.vence > Date.now() ? new Date(reg.vence) : null
  },
  quitar(email?: string) {
    if (!email) return
    const r = leer(); delete r[email]; escribir(r)
  },
}
