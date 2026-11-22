import { useEffect, useRef } from 'react'

/*
  Hace que el botón/gesto "atrás" del celular cierre una ventana (hoja) en lugar de salir de la pantalla.
  Al abrir agrega una entrada al historial (misma URL); "atrás" la consume y cierra la ventana.
  Si se cierra con la X, se quita esa entrada para que el historial quede como estaba.
*/
export function useAtrasCierra(abierto: boolean, cerrar: () => void) {
  const cerrarRef = useRef(cerrar)
  cerrarRef.current = cerrar

  useEffect(() => {
    if (!abierto) return
    window.history.pushState({ ...window.history.state, hoja: true }, '')
    let porAtras = false
    const alAtras = () => { porAtras = true; cerrarRef.current() }
    window.addEventListener('popstate', alAtras)
    return () => {
      window.removeEventListener('popstate', alAtras)
      if (!porAtras && window.history.state?.hoja) window.history.back()
    }
  }, [abierto])
}
