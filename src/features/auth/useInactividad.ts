import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { authService } from './authService'

/*
  Cierra la sesión tras N minutos sin actividad (toque, tecla, scroll), con aviso 1 minuto antes.
  Si la pantalla estuvo oculta (celular bloqueado, otra pestaña) más del límite, al volver se cierra.
*/
export function useInactividad(minutos: number, alExpirar: () => void, activo: boolean) {
  const expirar = useRef(alExpirar)
  expirar.current = alExpirar

  useEffect(() => {
    if (!activo) return
    const limite = minutos * 60_000
    let ultimo = Date.now()
    let aviso = 0
    let fin = 0

    const programar = () => {
      clearTimeout(aviso); clearTimeout(fin)
      toast.dismiss('inactividad')
      aviso = window.setTimeout(() => {
        toast.warning('Tu sesión se cerrará en 1 minuto por inactividad', {
          id: 'inactividad', duration: 60_000,
          action: { label: 'Seguir conectado', onClick: () => actividad() },
        })
      }, Math.max(0, limite - 60_000))
      fin = window.setTimeout(() => {
        toast.dismiss('inactividad')
        toast.info('Sesión cerrada por inactividad', { description: 'Inicia sesión de nuevo para continuar.' })
        expirar.current()
      }, limite)
    }
    // Evita reprogramar en cada evento: como máximo una vez cada 5 s
    const actividad = () => { const t = Date.now(); if (t - ultimo > 5_000) { ultimo = t; programar(); authService.marcarActividad() } }
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimo > limite) { toast.info('Sesión cerrada por inactividad'); expirar.current() } else actividad()
    }

    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }))
    document.addEventListener('visibilitychange', alVolver)
    programar()
    return () => {
      clearTimeout(aviso); clearTimeout(fin)
      eventos.forEach((e) => window.removeEventListener(e, actividad))
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [minutos, activo])
}
