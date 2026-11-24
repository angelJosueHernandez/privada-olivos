import { useSyncExternalStore } from 'react'

/*
  Estado de la conexión a internet, compartido por toda la app.
  `navigator.onLine === false` es confiable para "sin red"; cuando dice true puede haber red sin
  internet real, por eso además se marca sin conexión cuando una petición falla por red
  (`marcarSinRed`) y se vuelve a "en línea" con el evento `online` o la siguiente petición buena.
*/
let enLinea = typeof navigator === 'undefined' ? true : navigator.onLine
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

function cambiar(valor: boolean) {
  if (enLinea === valor) return
  enLinea = valor
  avisar()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => cambiar(true))
  window.addEventListener('offline', () => cambiar(false))
}

export const conexion = {
  get enLinea() { return enLinea },
  /** Una petición falló por red (no por el servidor) */
  marcarSinRed: () => cambiar(false),
  /** Una petición llegó bien: hay conexión */
  marcarEnLinea: () => cambiar(true),
  suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f) } },
}

export const useEnLinea = () => useSyncExternalStore(conexion.suscribir, () => enLinea, () => true)
