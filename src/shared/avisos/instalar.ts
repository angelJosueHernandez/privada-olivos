import { useEffect, useState } from 'react'
import { esInstalada, esIOS } from './sistema'

/*
  Instalar la app en la pantalla de inicio.
  - Android y computadora (Chrome, Edge, Samsung Internet): el navegador dispara "beforeinstallprompt";
    se guarda y se muestra nuestro botón "Instalar app", que abre el diálogo nativo.
  - iPhone: no existe ese evento; se explica Compartir → "Agregar a inicio".
*/
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let pendiente: EventoInstalar | null = null
const oyentes = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // se muestra nuestro botón en lugar de la barra automática
    pendiente = e as EventoInstalar
    oyentes.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => { pendiente = null; oyentes.forEach((f) => f()) })
}

export type ModoInstalar = 'instalada' | 'boton' | 'ios' | 'no-disponible'

export function useInstalar() {
  const calcular = (): ModoInstalar => (esInstalada() ? 'instalada' : pendiente ? 'boton' : esIOS() ? 'ios' : 'no-disponible')
  const [modo, setModo] = useState<ModoInstalar>(calcular)
  useEffect(() => {
    const f = () => setModo(calcular())
    oyentes.add(f)
    return () => { oyentes.delete(f) }
  }, [])
  const instalar = async () => {
    if (!pendiente) return false
    await pendiente.prompt()
    const { outcome } = await pendiente.userChoice
    pendiente = null
    setModo(calcular())
    return outcome === 'accepted'
  }
  return { modo, instalar }
}
