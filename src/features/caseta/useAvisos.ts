import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { avisoSistema } from '../../shared/avisos/sistema'
import { casetaService } from './casetaService'
import type { Aviso } from './tipos'

const claveLeido = (para: string) => `olv-leido-${para}`
const leerMarca = (para: string) => { try { return Number(localStorage.getItem(claveLeido(para))) || 0 } catch { return 0 } }

/*
  Escucha los avisos de una casa (o de la caseta con 'CASETA').
  Cada aviso NUEVO se muestra dentro de la app (Sonner) y como notificación del sistema si hay permiso.
  Los avisos que ya existían al abrir la app no se vuelven a notificar.
*/
/** alNuevo: false = solo lista (otro componente ya notifica); función = manejo propio; sin valor = toast + sistema */
export function useAvisos(para: string | undefined, url: string, alNuevo?: ((v: Aviso) => void) | false) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [leidoHasta, setLeidoHasta] = useState(() => (para ? leerMarca(para) : 0))
  const conocidos = useRef<Set<string> | null>(null)
  const alNuevoRef = useRef(alNuevo)
  alNuevoRef.current = alNuevo

  const cargar = useCallback(async () => {
    if (!para) return
    let lista: Aviso[]
    try { lista = await casetaService.avisos(para) } catch { return }
    setAvisos(lista)
    if (conocidos.current === null) { conocidos.current = new Set(lista.map((v) => v.id)); return }
    const nuevos = lista.filter((v) => !conocidos.current!.has(v.id)).reverse()
    nuevos.forEach((v) => {
      conocidos.current!.add(v.id)
      if (alNuevoRef.current === false) return
      if (alNuevoRef.current) { alNuevoRef.current(v); return }
      const estilo = v.tipo === 'paquete' ? toast.info : v.tipo === 'salida' ? toast.message : toast.success
      estilo(v.titulo, { description: v.cuerpo, duration: 6000 })
      navigator.vibrate?.([60, 40, 60])
      void avisoSistema(v.titulo, { cuerpo: v.cuerpo, etiqueta: v.id, url })
    })
  }, [para, url])

  useEffect(() => {
    void cargar()
    return casetaService.suscribir(() => void cargar())
  }, [cargar])

  const marcarLeidos = useCallback(() => {
    if (!para) return
    const t = Date.now()
    try { localStorage.setItem(claveLeido(para), String(t)) } catch { /* nada */ }
    setLeidoHasta(t)
  }, [para])

  return { avisos, sinLeer: avisos.filter((v) => v.en.getTime() > leidoHasta).length, marcarLeidos }
}
