import { useCallback, useEffect, useState } from 'react'

/*
  Notificaciones del sistema (las que aparecen en la pantalla bloqueada / barra de notificaciones).

  Cómo funcionan según el dispositivo:
  - Android y computadora (Chrome, Edge, Firefox): basta con dar permiso.
  - iPhone/iPad: Apple solo las permite si la app está instalada en la pantalla de inicio
    (Compartir → "Agregar a inicio", iOS 16.4 o superior). En Safari normal no existen.

  Hoy se muestran mientras la app está abierta o en segundo plano. Para recibirlas con la app
  cerrada hace falta el envío push desde el servidor (ver suscribirPush y SEGURIDAD.md).
*/
export type EstadoAvisos = 'activos' | 'pendiente' | 'bloqueados' | 'instalar' | 'no-soportado'

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const esInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function estadoAvisos(): EstadoAvisos {
  if (!('Notification' in window)) return esIOS() && !esInstalada() ? 'instalar' : 'no-soportado'
  if (Notification.permission === 'granted') return 'activos'
  if (Notification.permission === 'denied') return 'bloqueados'
  return 'pendiente'
}

/** Pide permiso (debe llamarse desde un toque del usuario) */
export async function activarAvisos(): Promise<EstadoAvisos> {
  if (!('Notification' in window)) return estadoAvisos()
  try { await Notification.requestPermission() } catch { /* navegadores viejos */ }
  const estado = estadoAvisos()
  if (estado === 'activos') void suscribirPush()
  return estado
}

/** Muestra una notificación del sistema. Devuelve false si no hay permiso. */
export async function avisoSistema(titulo: string, { cuerpo, etiqueta, url = '/' }: { cuerpo?: string; etiqueta?: string; url?: string } = {}): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const opciones: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: cuerpo, tag: etiqueta, renotify: !!etiqueta, icon: '/icono-192.png', badge: '/icono-192.png',
    data: { url }, vibrate: [60, 40, 60], lang: 'es-MX',
  }
  try {
    // En celulares solo funciona a través del service worker
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) { await reg.showNotification(titulo, opciones); return true }
    new Notification(titulo, opciones)
    return true
  } catch { return false }
}

/**
 * Suscripción push (para recibir avisos con la app CERRADA). Requiere la API y la llave pública VAPID
 * (VITE_VAPID_PUBLIC_KEY). El servidor guarda la suscripción ligada a la sesión y envía los avisos.
 */
export async function suscribirPush(): Promise<void> {
  const llave = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!llave || !import.meta.env.VITE_API_URL || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const existente = await reg.pushManager.getSubscription()
    const sub = existente ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64aBytes(llave) })
    const { api } = await import('../api/cliente')
    await api('/api/push/suscripciones', { metodo: 'POST', cuerpo: sub.toJSON() })
  } catch { /* sin push: quedan las notificaciones con la app abierta */ }
}

function base64aBytes(b64: string): ArrayBuffer {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer
}

/** Estado de los avisos para la interfaz, actualizado al volver a la app */
export function useEstadoAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos>(() => estadoAvisos())
  useEffect(() => {
    const revisar = () => setEstado(estadoAvisos())
    document.addEventListener('visibilitychange', revisar)
    if (estadoAvisos() === 'activos') void suscribirPush()
    return () => document.removeEventListener('visibilitychange', revisar)
  }, [])
  const activar = useCallback(async () => { const e = await activarAvisos(); setEstado(e); return e }, [])
  return { estado, activar }
}
