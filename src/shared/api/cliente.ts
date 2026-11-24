/*
  Cliente HTTP único para hablar con la API.

  Reglas de seguridad que aplica a TODAS las peticiones:
  - La sesión viaja en una cookie HttpOnly + Secure + SameSite que pone la API.
    JavaScript nunca ve ni guarda el token (no localStorage), así un XSS no puede robarlo.
  - En peticiones que cambian datos manda el token anti-CSRF (cookie XSRF-TOKEN -> encabezado X-XSRF-TOKEN).
  - Solo rutas relativas a la API configurada: evita mandar la cookie a otro dominio.
  - No sigue redirecciones, tiene tiempo límite y nunca muestra al usuario el error interno del servidor.

  IMPORTANTE: nada de esto reemplaza la seguridad del backend. Todo lo que corre en el navegador
  se puede leer y modificar; la API debe validar sesión, permisos y datos en CADA petición.
  Nunca pongas secretos en variables VITE_*: Vite las incrusta en el JavaScript público.
*/

import { almacen } from '../red/almacen'
import { cola, deCuerpo, aPartes, type Cuerpo, type Parche, type Pendiente } from '../red/cola'
import { conexion } from '../red/conexion'

const BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** true cuando hay una API configurada; si no, la app corre en modo demostración. */
export const hayApi = BASE !== ''

if (import.meta.env.PROD && hayApi && !BASE.startsWith('https://')) {
  // Sin HTTPS cualquiera en la red podría leer o alterar las peticiones.
  throw new Error('VITE_API_URL debe usar https:// en producción.')
}

const TIEMPO_LIMITE_MS = 15_000

export class ErrorApi extends Error {
  constructor(mensaje: string, readonly estado: number) {
    super(mensaje)
    this.name = 'ErrorApi'
  }
}
/** La petición no llegó al servidor (sin internet, tiempo agotado): se puede reintentar más tarde */
export class ErrorRed extends ErrorApi {
  constructor() { super('Sin conexión. Revisa tu internet e intenta de nuevo.', 0); this.name = 'ErrorRed' }
}

// Mensajes genéricos: no se reenvían textos del servidor (pueden filtrar detalles internos).
const MENSAJES: Record<number, string> = {
  400: 'Revisa los datos e intenta de nuevo.',
  401: 'Tu sesión no es válida. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  409: 'Hubo un conflicto con los datos. Recarga e intenta de nuevo.',
  413: 'El archivo es demasiado grande.',
  429: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
}
const mensajePara = (estado: number) =>
  MENSAJES[estado] ?? (estado >= 500 ? 'El servidor tuvo un problema. Intenta más tarde.' : 'Algo salió mal. Intenta de nuevo.')

function leerCookie(nombre: string): string | null {
  const par = document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`))
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type Opciones = { metodo?: Metodo; cuerpo?: unknown; idempotencia?: string }

/** Última copia de cada consulta: hasta 7 días, para seguir viendo datos sin internet */
const VIGENCIA_COPIA_MS = 7 * 86_400_000
type Copia = { clave: string; usuario: string; datos: unknown; guardado: number }

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const metodo = opciones.metodo ?? 'GET'
  const copiable = metodo === 'GET' && !ruta.startsWith('/api/auth/')
  try {
    const datos = await peticion<T>(ruta, opciones)
    if (copiable) void almacen.poner<Copia>('copia', { clave: ruta, usuario: cola.usuario, datos, guardado: Date.now() }).catch(() => {})
    return datos
  } catch (e) {
    // Sin red: se responde con la última copia (solo de la misma persona y no muy vieja)
    if (e instanceof ErrorRed && copiable) {
      const c = await almacen.leer<Copia>('copia', ruta).catch(() => undefined)
      if (c && c.usuario === cola.usuario && Date.now() - c.guardado < VIGENCIA_COPIA_MS) return c.datos as T
    }
    throw e
  }
}

/**
 * Para cambios que pueden esperar a que vuelva la conexión (registrar una entrada, subir un
 * comprobante, responder un anuncio...). Si no hay red, se guarda en la cola, se devuelve el
 * resultado `optimista` para que la pantalla lo muestre ya, y se envía solo al reconectar.
 */
export async function apiSinConexion<T>(ruta: string, opciones: Opciones & { metodo: Exclude<Metodo, 'GET'> }, extra: {
  descripcion: string
  optimista: () => T
  local?: Pendiente['local']
  parche?: Parche
  parches?: Parche[]
}): Promise<T> {
  const idempotencia = opciones.idempotencia ?? crypto.randomUUID()
  const encolar = async () => {
    const cuerpo: Cuerpo = opciones.cuerpo === undefined ? { tipo: 'nada' }
      : opciones.cuerpo instanceof FormData ? { tipo: 'form', partes: aPartes(opciones.cuerpo) } : { tipo: 'json', valor: opciones.cuerpo }
    await cola.agregar({ ruta, metodo: opciones.metodo, cuerpo, idempotencia, descripcion: extra.descripcion, local: extra.local,
      parches: [...(extra.parche ? [extra.parche] : []), ...(extra.parches ?? [])] })
    return extra.optimista()
  }
  // Si ya hay cambios esperando, este va detrás de ellos para respetar el orden
  if (!conexion.enLinea || cola.pendientes > 0) return encolar()
  try { return await api<T>(ruta, { ...opciones, idempotencia }) }
  catch (e) { if (e instanceof ErrorRed) return encolar(); throw e }
}

async function peticion<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  if (!hayApi) throw new ErrorApi('La API no está configurada.', 0)
  // Solo rutas propias de la API ("/api/..."): bloquea URLs absolutas y "//otro-dominio".
  if (!/^\/api\/[\w\-/.]*(\?[\w\-=&%.]*)?$/.test(ruta) || ruta.includes('..')) {
    throw new ErrorApi('Ruta de API no permitida.', 0)
  }

  const metodo = opciones.metodo ?? 'GET'
  const encabezados: Record<string, string> = { Accept: 'application/json' }
  const esArchivo = opciones.cuerpo instanceof FormData
  // Con FormData (fotos) el navegador pone el Content-Type multipart con su boundary
  if (opciones.cuerpo !== undefined && !esArchivo) encabezados['Content-Type'] = 'application/json'
  if (metodo !== 'GET') {
    // La API debe rechazar toda petición que cambie datos sin este token (ASP.NET Core Antiforgery).
    const csrf = leerCookie('XSRF-TOKEN')
    if (csrf) encabezados['X-XSRF-TOKEN'] = csrf
    // Misma clave en cada reintento: el servidor no duplica un cambio que ya recibió
    if (opciones.idempotencia) encabezados['Idempotency-Key'] = opciones.idempotencia
  }

  const ac = new AbortController()
  const reloj = setTimeout(() => ac.abort(), TIEMPO_LIMITE_MS)
  try {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: encabezados,
      body: opciones.cuerpo === undefined ? undefined : esArchivo ? (opciones.cuerpo as FormData) : JSON.stringify(opciones.cuerpo),
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: ac.signal,
    })
    conexion.marcarEnLinea()
    if (!r.ok) throw new ErrorApi(mensajePara(r.status), r.status)
    if (r.status === 204) return undefined as T
    if (!(r.headers.get('content-type') ?? '').includes('application/json')) {
      throw new ErrorApi('Respuesta inesperada del servidor.', r.status)
    }
    return (await r.json()) as T
  } catch (e) {
    if (e instanceof ErrorApi) throw e
    conexion.marcarSinRed()
    throw new ErrorRed()
  } finally {
    clearTimeout(reloj)
  }
}

// ---------------------------------------------------------------- Sincronización

export type ResultadoSync = { enviados: number; rechazados: string[]; quedan: number }
const alSincronizar = new Set<(r: ResultadoSync) => void>()
export const suscribirSincronizacion = (f: (r: ResultadoSync) => void) => { alSincronizar.add(f); return () => { alSincronizar.delete(f) } }

let sincronizando = false
/**
 * Envía la cola en orden. Se detiene al primer fallo de red o del servidor (5xx, 429, 401: se
 * reintenta después). Si el servidor rechaza un cambio por sus datos (400, 403, 404, 409...), se
 * quita de la cola y se avisa a la persona qué no se pudo guardar.
 */
export async function sincronizar(): Promise<void> {
  if (!hayApi || sincronizando || !cola.usuario) return
  sincronizando = true
  const r: ResultadoSync = { enviados: 0, rechazados: [], quedan: 0 }
  try {
    for (const p of await cola.lista()) {
      try {
        await peticion(p.ruta, { metodo: p.metodo, cuerpo: deCuerpo(p.cuerpo), idempotencia: p.idempotencia })
        await cola.quitar(p.id); r.enviados++
      } catch (e) {
        const estado = e instanceof ErrorApi ? e.estado : 0
        if (estado === 0 || estado === 401 || estado === 408 || estado === 429 || estado >= 500) { await cola.reintento(p); break }
        await cola.quitar(p.id); r.rechazados.push(p.descripcion)
      }
    }
  } finally {
    sincronizando = false
    r.quedan = cola.pendientes
    if (r.enviados || r.rechazados.length) alSincronizar.forEach((f) => f(r))
  }
}

/** Al cerrar sesión: se borra la copia de datos (los cambios pendientes se quedan, son de esa persona) */
export const borrarCopiaLocal = () => almacen.vaciar('copia').catch(() => {})

if (hayApi && typeof window !== 'undefined') {
  // Al volver la conexión, al volver a la app y cada 30 s mientras haya pendientes
  window.addEventListener('online', () => void sincronizar())
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void sincronizar() })
  setInterval(() => { if (cola.pendientes > 0 && conexion.enLinea) void sincronizar() }, 30_000)
}
