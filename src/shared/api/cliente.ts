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

export async function api<T>(ruta: string, opciones: { metodo?: Metodo; cuerpo?: unknown } = {}): Promise<T> {
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
    if (!r.ok) throw new ErrorApi(mensajePara(r.status), r.status)
    if (r.status === 204) return undefined as T
    if (!(r.headers.get('content-type') ?? '').includes('application/json')) {
      throw new ErrorApi('Respuesta inesperada del servidor.', r.status)
    }
    return (await r.json()) as T
  } catch (e) {
    if (e instanceof ErrorApi) throw e
    throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.', 0)
  } finally {
    clearTimeout(reloj)
  }
}
