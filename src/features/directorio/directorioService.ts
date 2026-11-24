import { api, hayApi } from '../../shared/api/cliente'
import type { Rol } from '../auth/authService'
import { generarSecreto, uriOtp, verificarTotp } from '../auth/totp'
import type { Actor } from '../caseta/tipos'
import {
  CORREO, ETIQUETA_ROL, HORAS_TEMPORAL, nombreCasa, revisarPassword,
  type Cambio, type Casa, type Cuenta, type DatosCuenta, type NuevaCasa,
} from './tipos'

/*
  Directorio de la privada: casas, cuentas de usuario y bitácora de cambios.

  Con API (producción) TODO esto lo decide el servidor: solo ADMIN puede llamar /api/admin/*, las
  contraseñas se guardan con Argon2id/bcrypt, suspender o cerrar sesiones invalida las sesiones en el
  servidor al instante y la bitácora no se puede editar. Ver SEGURIDAD.md §7d.

  Sin API: modo demostración guardado en este navegador. Las contraseñas solo se guardan como hash
  SHA-256 (nunca en texto), pero recuerda que el demo no es seguridad real.
*/

/** Datos internos que nunca salen del servicio */
type Secretos = {
  hash?: string
  /** Secreto TOTP activo (en producción: cifrado en el servidor) */
  totp?: string
  /** Secreto en proceso de configuración, aún sin confirmar con un código */
  totpPendiente?: string
  /** Último periodo usado: impide reutilizar el mismo código */
  totpUltimo?: number
  /** Solo demo: acepta el código fijo de prueba mientras no configure una app */
  codigoDemo?: boolean
}
type CuentaGuardada = Omit<Cuenta, 'dosPasos'> & Secretos
const DEMO_2FA = '220f3d1e7e34b05aa0fdae94fb025f6edb9218a8fef6e1c639eb7003493d3239'
type EstadoDemo = { casas: Casa[]; cuentas: CuentaGuardada[]; cambios: Cambio[] }
const CLAVE = 'olv-directorio-v2'

async function sha256(texto: string): Promise<string> {
  const datos = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(datos), (b) => b.toString(16).padStart(2, '0')).join('')
}
/** El hash depende del ID (no del correo) para poder cambiar el correo sin perder la contraseña */
const hashDe = (id: string, password: string) => sha256(`olv:${id}:${password}`)

/** Contraseña temporal legible (sin 0/O ni 1/l/I) con 12 caracteres aleatorios */
function generarTemporal(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const r = crypto.getRandomValues(new Uint32Array(12))
  const c = Array.from(r, (n) => abc[n % abc.length]).join('')
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`
}

const hace = (dias: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() - dias); d.setHours(h, 0, 0, 0); return d }
const sistema: Actor = { id: '1', nombre: 'Alejandro Garza', rol: 'ADMIN' }

function semilla(): EstadoDemo {
  const inicio = hace(400)
  const casas: Casa[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ calle: 'Palma', numero: String(101 + i) })),
    ...Array.from({ length: 12 }, (_, i) => ({ calle: 'Encino', numero: String(201 + i) })),
    ...Array.from({ length: 6 }, (_, i) => ({ calle: 'Olmo', numero: String(301 + i) })),
  ].map((c) => ({ ...c, id: `casa-${c.calle.toLowerCase()}-${c.numero}`, activa: true, creadaEn: inicio }))

  const base = { estado: 'ACTIVA' as const, debeCambiar: false, creadoEn: inicio, codigoDemo: true }
  const cuentas: CuentaGuardada[] = [
    // Cuentas de prueba (las mismas contraseñas de siempre; aquí solo vive su hash)
    { ...base, id: '1', nombre: 'Alejandro Garza', email: 'admin@demo.mx', telefono: '8112345678', rol: 'ADMIN', tieneAcceso: true, ultimoAcceso: hace(0, 9), hash: '54d8f5b739c1a85b05c79b7ea1a2819729f0cddc4d798a07e3dbf7e3b0c50168' },
    { ...base, id: 'u-res-2', nombre: 'María Treviño', email: 'residente@demo.mx', telefono: '8187654321', rol: 'RESIDENTE', casa: 'Calle Palma 104', tieneAcceso: true, ultimoAcceso: hace(1, 20), hash: '3b26247b7c3b0ecf51168738ee9777454f41352ede3539fd31416c40c932c00f' },
    { ...base, id: '3', nombre: 'Luis Herrera', email: 'guardia@demo.mx', telefono: '8111122233', rol: 'GUARDIA', tieneAcceso: true, ultimoAcceso: hace(0, 7), hash: '97f75137c5ca6cf24142d22ab1badcabff242f7c1a13a0c3c32e27c50cd3fba3' },
    // Otras personas del directorio (sin contraseña conocida: para probar "Generar contraseña")
    { ...base, id: 'u-res-7', nombre: 'Jorge Salinas', email: 'jorge.salinas@ejemplo.mx', telefono: '8123456789', rol: 'RESIDENTE', casa: 'Calle Encino 212', tieneAcceso: true, ultimoAcceso: hace(2, 21) },
    { ...base, id: 'u-res-9', nombre: 'Laura Rocha', email: 'laura.rocha@ejemplo.mx', rol: 'RESIDENTE', casa: 'Calle Olmo 303', tieneAcceso: true, ultimoAcceso: hace(1, 16) },
    { ...base, id: 'u-res-10', nombre: 'Daniel Rocha', email: 'daniel.rocha@ejemplo.mx', rol: 'RESIDENTE', casa: 'Calle Olmo 303', tieneAcceso: false, creadoEn: hace(3) },
    { ...base, id: 'u-res-11', nombre: 'Patricia Leal', email: 'paty.leal@ejemplo.mx', telefono: '8134567890', rol: 'RESIDENTE', casa: 'Calle Palma 101', tieneAcceso: true, ultimoAcceso: hace(5, 11) },
    { ...base, id: 'u-res-12', nombre: 'Ricardo Benavides', email: 'r.benavides@ejemplo.mx', rol: 'RESIDENTE', casa: 'Calle Encino 205', tieneAcceso: true, estado: 'SUSPENDIDA', motivoSuspension: 'Ya no vive en la privada', ultimoAcceso: hace(40, 12) },
    { ...base, id: 'u-gua-2', nombre: 'Pedro Ramírez', email: 'pedro.ramirez@ejemplo.mx', telefono: '8145678901', rol: 'GUARDIA', tieneAcceso: true, ultimoAcceso: hace(1, 19) },
  ]
  const cambios: Cambio[] = [
    { id: 'k1', en: hace(3, 12), por: sistema, accion: 'Cuenta creada', detalle: 'Daniel Rocha · Residente · Calle Olmo 303' },
    { id: 'k2', en: hace(9, 17), por: sistema, accion: 'Cuenta suspendida', detalle: 'Ricardo Benavides · Ya no vive en la privada' },
  ]
  return { casas, cuentas, cambios }
}

const fechas = <T extends object>(o: T, campos: string[]): T => {
  const r: Record<string, unknown> = { ...(o as Record<string, unknown>) }
  campos.forEach((c) => { if (typeof r[c] === 'string') r[c] = new Date(r[c] as string) })
  return r as T
}
const revivirCuenta = <T extends Omit<Cuenta, 'dosPasos'>>(c: T) => fechas(c, ['temporalVence', 'creadoEn', 'ultimoAcceso', 'sesionesCerradasEn'])
const revivirCasa = (c: Casa) => fechas(c, ['creadaEn'])
const revivirCambio = (c: Cambio) => fechas(c, ['en'])

function leer(): EstadoDemo {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as EstadoDemo | null
    if (s && Array.isArray(s.casas) && Array.isArray(s.cuentas) && Array.isArray(s.cambios)) {
      return { casas: s.casas.map(revivirCasa), cuentas: s.cuentas.map(revivirCuenta), cambios: s.cambios.map(revivirCambio) }
    }
  } catch { /* se reinicia */ }
  return semilla()
}
let demo: EstadoDemo = hayApi ? { casas: [], cuentas: [], cambios: [] } : leer()
const oyentes = new Set<() => void>()
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(demo)) } catch { /* sin almacenamiento: solo en memoria */ }
  oyentes.forEach((f) => f())
}
if (!hayApi && typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { demo = leer(); oyentes.forEach((f) => f()) } })
}

const espera = (ms = 300) => new Promise((r) => setTimeout(r, ms))
/** Lo que sale del servicio nunca lleva el hash */
const publica = ({ hash: _h, totp, totpPendiente: _p, totpUltimo: _u, codigoDemo, ...c }: CuentaGuardada): Cuenta =>
  ({ ...c, dosPasos: totp ? 'APP' : codigoDemo ? 'PRUEBA' : 'SIN_CONFIGURAR' })
const anotar = (por: Actor, accion: string, detalle: string) => {
  demo.cambios = [{ id: crypto.randomUUID(), en: new Date(), por, accion, detalle }, ...demo.cambios].slice(0, 300)
}
const buscar = (id: string) => {
  const c = demo.cuentas.find((x) => x.id === id)
  if (!c) throw new Error('Esta cuenta ya no existe.')
  return c
}
const actualizar = (id: string, cambios: Partial<CuentaGuardada>) => { demo.cuentas = demo.cuentas.map((c) => (c.id === id ? { ...c, ...cambios } : c)) }
const adminsActivos = () => demo.cuentas.filter((c) => c.rol === 'ADMIN' && c.estado === 'ACTIVA')
const limpiarTel = (t?: string) => (t ? t.replace(/\D/g, '').slice(-10) : '') || undefined

/** Valida y normaliza los datos de una cuenta (en el demo; con API lo repite el servidor) */
function validarCuenta(d: DatosCuenta, id?: string): DatosCuenta {
  const nombre = d.nombre.trim().replace(/\s+/g, ' ')
  const email = d.email.trim().toLowerCase()
  const telefono = limpiarTel(d.telefono)
  if (nombre.length < 3 || nombre.length > 80) throw new Error('Escribe el nombre completo.')
  if (!CORREO.test(email) || email.length > 254) throw new Error('El correo no es válido.')
  if (telefono && telefono.length !== 10) throw new Error('El teléfono debe tener 10 dígitos.')
  if (!(['ADMIN', 'RESIDENTE', 'GUARDIA'] as Rol[]).includes(d.rol)) throw new Error('Elige un rol.')
  if (d.rol === 'RESIDENTE' && !directorioService.casasActivas().includes(d.casa ?? '')) throw new Error('Elige la casa del residente.')
  if (demo.cuentas.some((c) => c.email === email && c.id !== id)) throw new Error('Ya hay una cuenta con ese correo.')
  return { nombre, email, telefono, rol: d.rol, casa: d.rol === 'RESIDENTE' ? d.casa : undefined }
}

export const directorioService = {
  suscribir(f: () => void): () => void {
    if (hayApi) { const t = setInterval(f, 60_000); return () => clearInterval(t) }
    oyentes.add(f)
    return () => { oyentes.delete(f) }
  },

  // ---------- Casas (lectura síncrona para caseta, anuncios y cobranza) ----------
  /** Nombres de las casas activas, en orden */
  casasActivas(): string[] {
    return demo.casas.filter((c) => c.activa).map(nombreCasa)
  },
  /** Calles con al menos una casa activa, en el orden en que se dieron de alta */
  calles(): string[] {
    return [...new Set(demo.casas.filter((c) => c.activa).map((c) => c.calle))]
  },
  /** Desde cuándo existe la casa (para no cobrarle meses anteriores) */
  casaCreadaEn(nombre: string): Date | undefined {
    return demo.casas.find((c) => nombreCasa(c) === nombre)?.creadaEn
  },

  // ---------- Autenticación (solo modo demostración; con API lo hace el servidor) ----------
  /** Verifica correo y contraseña. Devuelve la cuenta o un error con mensaje para la persona. */
  async verificar(email: string, password: string): Promise<Cuenta> {
    const c = demo.cuentas.find((x) => x.email === email)
    const hash = await hashDe(c?.id ?? 'nadie', password) // se calcula siempre: mismo tiempo exista o no
    if (!c || !c.hash || c.hash !== hash) throw new Error('Correo o contraseña incorrectos.')
    if (c.estado === 'SUSPENDIDA') throw new Error('Tu cuenta está suspendida. Comunícate con la administración.')
    if (c.debeCambiar && c.temporalVence && c.temporalVence.getTime() < Date.now()) throw new Error('Tu contraseña temporal venció. Pide una nueva a la administración.')
    return publica(c)
  },
  /** ¿Sigue valiendo una sesión iniciada en `inicio`? Devuelve la cuenta al día o null */
  sesionVigente(id: string, inicio: Date): Cuenta | null {
    const c = demo.cuentas.find((x) => x.id === id)
    if (!c || c.estado !== 'ACTIVA' || !c.tieneAcceso) return null
    if (c.sesionesCerradasEn && c.sesionesCerradasEn.getTime() > inicio.getTime()) return null
    return publica(c)
  },
  /** ¿Debe configurar su app autenticadora antes de entrar? */
  necesitaConfigurar2fa(id: string): boolean {
    const c = demo.cuentas.find((x) => x.id === id)
    return !!c && !c.totp && !c.codigoDemo
  },
  /** Segundo paso del login: código de la app autenticadora (o el de prueba en cuentas demo) */
  async verificarSegundoFactor(id: string, codigo: string): Promise<void> {
    const c = buscar(id)
    if (c.totp) {
      const usado = await verificarTotp(c.totp, codigo, c.totpUltimo)
      if (usado === null) throw new Error('El código no es correcto o ya se usó. Espera al siguiente en tu app.')
      actualizar(id, { totpUltimo: usado }); guardar()
      return
    }
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`2fa:${codigo}`))), (b) => b.toString(16).padStart(2, '0')).join('')
    if (!c.codigoDemo || h !== DEMO_2FA) throw new Error('El código no es correcto. Revisa tu app de autenticación.')
  },
  /** Genera un secreto nuevo (pendiente hasta confirmarlo con un código) */
  iniciar2fa(id: string): { secreto: string; uri: string } {
    const c = buscar(id)
    const secreto = generarSecreto()
    actualizar(id, { totpPendiente: secreto }); guardar()
    return { secreto, uri: uriOtp(secreto, c.email) }
  },
  /** Confirma el secreto pendiente con el primer código de la app; desde ahí ya no vale el de prueba */
  async activar2fa(id: string, codigo: string): Promise<void> {
    const c = buscar(id)
    if (!c.totpPendiente) throw new Error('Vuelve a escanear el código QR.')
    const usado = await verificarTotp(c.totpPendiente, codigo)
    if (usado === null) throw new Error('El código no coincide. Revisa que la hora de tu celular sea automática y escribe el código actual.')
    actualizar(id, { totp: c.totpPendiente, totpPendiente: undefined, totpUltimo: usado, codigoDemo: false })
    anotar({ id: c.id, nombre: c.nombre, rol: c.rol, casa: c.casa }, c.totp ? 'App autenticadora cambiada' : 'Verificación en dos pasos activada', c.nombre)
    guardar()
  },

  registrarAcceso(id: string) {
    if (hayApi) return
    actualizar(id, { ultimoAcceso: new Date() }); guardar()
  },
  /**
   * La persona cambia su propia contraseña. Después de una temporal no se pide la actual (ya la
   * acaba de usar); en cualquier otro caso sí, para que nadie la cambie con el celular desbloqueado.
   */
  async cambiarPassword(id: string, nueva: string, actual?: string): Promise<void> {
    if (hayApi) return api<void>('/api/auth/password', { metodo: 'POST', cuerpo: { actual, nueva } })
    await espera()
    const c = buscar(id)
    if (!c.debeCambiar && (!actual || (await hashDe(id, actual)) !== c.hash)) throw new Error('Tu contraseña actual no es correcta.')
    const error = revisarPassword(nueva, c.email)
    if (error) throw new Error(error)
    const hash = await hashDe(id, nueva)
    if (hash === c.hash) throw new Error('Elige una contraseña distinta a la temporal.')
    actualizar(id, { hash, debeCambiar: false, temporalVence: undefined, tieneAcceso: true })
    anotar({ id: c.id, nombre: c.nombre, rol: c.rol, casa: c.casa }, 'Contraseña cambiada', `${c.nombre} cambió su contraseña`)
    guardar()
  },

  // ---------- Administración: lectura ----------
  async cuentas(): Promise<Cuenta[]> {
    if (hayApi) return (await api<Cuenta[]>('/api/admin/usuarios')).map(revivirCuenta)
    await espera(120)
    return demo.cuentas.map(publica).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },
  async casas(): Promise<Casa[]> {
    if (hayApi) return (await api<Casa[]>('/api/admin/casas')).map(revivirCasa)
    await espera(120)
    return [...demo.casas]
  },
  async cambios(): Promise<Cambio[]> {
    if (hayApi) return (await api<Cambio[]>('/api/admin/bitacora')).map(revivirCambio)
    await espera(120)
    return [...demo.cambios]
  },

  // ---------- Administración: cuentas ----------
  /** Crea la cuenta y devuelve una contraseña temporal que se muestra UNA sola vez */
  async crearCuenta(datos: DatosCuenta, actor: Actor): Promise<{ cuenta: Cuenta; temporal: string }> {
    if (hayApi) {
      const r = await api<{ cuenta: Cuenta; temporal: string }>('/api/admin/usuarios', { metodo: 'POST', cuerpo: datos })
      return { cuenta: revivirCuenta(r.cuenta), temporal: r.temporal }
    }
    await espera()
    const d = validarCuenta(datos)
    const id = crypto.randomUUID()
    const temporal = generarTemporal()
    const c: CuentaGuardada = {
      ...d, id, estado: 'ACTIVA', tieneAcceso: true, debeCambiar: true, creadoEn: new Date(),
      temporalVence: new Date(Date.now() + HORAS_TEMPORAL * 3600_000), hash: await hashDe(id, temporal),
    }
    demo.cuentas = [...demo.cuentas, c]
    anotar(actor, 'Cuenta creada', `${c.nombre} · ${ETIQUETA_ROL[c.rol]}${c.casa ? ` · ${c.casa}` : ''}`)
    guardar()
    return { cuenta: publica(c), temporal }
  },
  async editarCuenta(id: string, datos: DatosCuenta, actor: Actor): Promise<Cuenta> {
    if (hayApi) return revivirCuenta(await api<Cuenta>(`/api/admin/usuarios/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos }))
    await espera()
    const antes = buscar(id)
    const d = validarCuenta(datos, id)
    if (id === actor.id && d.rol !== antes.rol) throw new Error('No puedes cambiar tu propio rol.')
    if (antes.rol === 'ADMIN' && d.rol !== 'ADMIN' && adminsActivos().length <= 1) throw new Error('Debe quedar al menos una cuenta de administración.')
    // Cambiar rol, casa o correo cierra sus sesiones: los permisos viejos no deben seguir abiertos
    const delicado = d.rol !== antes.rol || d.casa !== antes.casa || d.email !== antes.email
    actualizar(id, { ...d, sesionesCerradasEn: delicado && id !== actor.id ? new Date() : antes.sesionesCerradasEn })
    const que = [d.nombre !== antes.nombre && 'nombre', d.email !== antes.email && 'correo', d.telefono !== antes.telefono && 'teléfono',
      d.rol !== antes.rol && `rol a ${ETIQUETA_ROL[d.rol]}`, d.casa !== antes.casa && (d.casa ? `casa a ${d.casa}` : 'casa')].filter(Boolean).join(', ')
    anotar(actor, 'Datos actualizados', `${d.nombre}${que ? ` · ${que}` : ''}`)
    guardar()
    return publica(buscar(id))
  },
  /** Nueva contraseña temporal; la anterior deja de servir y se cierran sus sesiones */
  async restablecerPassword(id: string, actor: Actor): Promise<string> {
    if (hayApi) return (await api<{ temporal: string }>(`/api/admin/usuarios/${encodeURIComponent(id)}/restablecer`, { metodo: 'POST' })).temporal
    await espera()
    const c = buscar(id)
    if (id === actor.id) throw new Error('Para cambiar tu propia contraseña usa tu perfil.')
    const temporal = generarTemporal()
    actualizar(id, { hash: await hashDe(id, temporal), tieneAcceso: true, debeCambiar: true, temporalVence: new Date(Date.now() + HORAS_TEMPORAL * 3600_000), sesionesCerradasEn: new Date() })
    anotar(actor, c.tieneAcceso ? 'Contraseña restablecida' : 'Acceso generado', c.nombre)
    guardar()
    return temporal
  },
  /** Perdió o cambió de celular: borra su app autenticadora; al entrar configurará una nueva */
  async restablecer2fa(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/usuarios/${encodeURIComponent(id)}/restablecer-2fa`, { metodo: 'POST' })
    await espera()
    const c = buscar(id)
    if (id === actor.id) throw new Error('Para cambiar tu propia app autenticadora usa tu perfil.')
    actualizar(id, { totp: undefined, totpPendiente: undefined, totpUltimo: undefined, codigoDemo: false, sesionesCerradasEn: new Date() })
    anotar(actor, 'Verificación en dos pasos restablecida', c.nombre)
    guardar()
  },
  /** Saca a la persona de todos sus dispositivos (por ejemplo si perdió el celular) */
  async cerrarSesiones(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/usuarios/${encodeURIComponent(id)}/cerrar-sesiones`, { metodo: 'POST' })
    await espera()
    const c = buscar(id)
    if (id === actor.id) throw new Error('Para cerrar tu propia sesión usa "Cerrar sesión" en tu perfil.')
    actualizar(id, { sesionesCerradasEn: new Date() })
    anotar(actor, 'Sesiones cerradas', c.nombre)
    guardar()
  },
  async suspender(id: string, motivo: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/usuarios/${encodeURIComponent(id)}/suspender`, { metodo: 'POST', cuerpo: { motivo } })
    await espera()
    const c = buscar(id)
    if (id === actor.id) throw new Error('No puedes suspender tu propia cuenta.')
    if (c.rol === 'ADMIN' && adminsActivos().length <= 1) throw new Error('Debe quedar al menos una cuenta de administración.')
    const m = motivo.trim().slice(0, 120) || undefined
    actualizar(id, { estado: 'SUSPENDIDA', motivoSuspension: m, sesionesCerradasEn: new Date() })
    anotar(actor, 'Cuenta suspendida', `${c.nombre}${m ? ` · ${m}` : ''}`)
    guardar()
  },
  async reactivar(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/usuarios/${encodeURIComponent(id)}/reactivar`, { metodo: 'POST' })
    await espera()
    const c = buscar(id)
    if (c.rol === 'RESIDENTE' && !directorioService.casasActivas().includes(c.casa ?? '')) throw new Error('Su casa está desactivada. Asígnale otra casa antes de reactivarla.')
    actualizar(id, { estado: 'ACTIVA', motivoSuspension: undefined })
    anotar(actor, 'Cuenta reactivada', c.nombre)
    guardar()
  },
  async eliminarCuenta(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/usuarios/${encodeURIComponent(id)}`, { metodo: 'DELETE' })
    await espera()
    const c = buscar(id)
    if (id === actor.id) throw new Error('No puedes eliminar tu propia cuenta.')
    if (c.rol === 'ADMIN' && c.estado === 'ACTIVA' && adminsActivos().length <= 1) throw new Error('Debe quedar al menos una cuenta de administración.')
    demo.cuentas = demo.cuentas.filter((x) => x.id !== id)
    anotar(actor, 'Cuenta eliminada', `${c.nombre} · ${c.email}`)
    guardar()
  },

  // ---------- Administración: casas ----------
  async crearCasa(datos: NuevaCasa, actor: Actor): Promise<Casa> {
    if (hayApi) return revivirCasa(await api<Casa>('/api/admin/casas', { metodo: 'POST', cuerpo: datos }))
    await espera()
    const calle = datos.calle.trim().replace(/^calle\s+/i, '').replace(/\s+/g, ' ')
    const numero = datos.numero.trim().toUpperCase()
    if (!/^[\p{L}][\p{L} .'-]{1,29}$/u.test(calle)) throw new Error('Escribe el nombre de la calle (solo letras).')
    if (!/^[0-9]{1,5}[A-Z]?$/.test(numero)) throw new Error('El número debe ser como 104 o 12B.')
    const nombre = nombreCasa({ calle, numero })
    const existente = demo.casas.find((c) => nombreCasa(c).toLowerCase() === nombre.toLowerCase())
    if (existente) throw new Error(existente.activa ? 'Esa casa ya existe.' : 'Esa casa existe pero está desactivada. Reactívala desde su detalle.')
    const casa: Casa = { id: crypto.randomUUID(), calle: calle.charAt(0).toUpperCase() + calle.slice(1), numero, activa: true, notas: datos.notas?.trim().slice(0, 200) || undefined, creadaEn: new Date() }
    demo.casas = [...demo.casas, casa]
    anotar(actor, 'Casa dada de alta', nombreCasa(casa))
    guardar()
    return casa
  },
  async editarCasa(id: string, datos: { notas?: string; activa: boolean }, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/casas/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos })
    await espera()
    const casa = demo.casas.find((c) => c.id === id)
    if (!casa) throw new Error('Esta casa ya no existe.')
    const nombre = nombreCasa(casa)
    if (!datos.activa && casa.activa && demo.cuentas.some((c) => c.casa === nombre && c.estado === 'ACTIVA')) {
      throw new Error('Tiene residentes activos. Suspéndelos o cámbialos de casa primero.')
    }
    demo.casas = demo.casas.map((c) => (c.id === id ? { ...c, activa: datos.activa, notas: datos.notas?.trim().slice(0, 200) || undefined } : c))
    if (datos.activa !== casa.activa) anotar(actor, datos.activa ? 'Casa reactivada' : 'Casa desactivada', nombre)
    else if ((datos.notas ?? '') !== (casa.notas ?? '')) anotar(actor, 'Notas de casa', nombre)
    guardar()
  },
}
