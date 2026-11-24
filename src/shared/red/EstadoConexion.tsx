import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { hayApi, suscribirSincronizacion } from '../api/cliente'
import Icon from '../ui/Icon'
import { usePendientes } from './cola'
import { useEnLinea } from './conexion'

const cambios = (n: number) => `${n} ${n === 1 ? 'cambio' : 'cambios'}`

/*
  Barra bajo el encabezado mientras no hay internet: dice que se puede seguir trabajando y cuántos
  cambios esperan para enviarse. Al volver la conexión avisa, y al terminar de sincronizar dice
  cuántos se enviaron y cuáles no se pudieron guardar (con el motivo para rehacerlos).
*/
export default function EstadoConexion() {
  const enLinea = useEnLinea()
  const pendientes = usePendientes()
  const antes = useRef(enLinea)

  useEffect(() => {
    if (antes.current === enLinea) return
    antes.current = enLinea
    if (enLinea) toast.success('Conexión restablecida', { description: pendientes ? `Enviando ${cambios(pendientes)} hechos sin internet…` : 'Todo está al día.' })
  }, [enLinea, pendientes])

  useEffect(() => suscribirSincronizacion((r) => {
    if (r.enviados) toast.success(`${cambios(r.enviados)} ${r.enviados === 1 ? 'enviado' : 'enviados'}`, { description: 'Lo que hiciste sin internet ya está guardado.' })
    if (r.rechazados.length) {
      toast.error('Algunos cambios no se guardaron', {
        description: `${r.rechazados.join(' · ')}. Los datos cambiaron mientras no había conexión: revísalos y hazlos de nuevo.`, duration: 15000,
      })
    }
  }), [])

  if (enLinea && !pendientes) return null
  return (
    <div role="status" aria-live="polite"
      className={`anim-llenar border-b px-5 py-2.5 text-[0.875rem] ${enLinea ? 'border-acento/15 bg-acento/[0.07] text-texto' : 'border-alerta/20 bg-alerta/[0.1] text-texto'}`}>
      <div className="mx-auto flex max-w-5xl items-center gap-2.5">
        <span className={`shrink-0 ${enLinea ? 'text-acento' : 'text-alerta'}`}>
          {enLinea ? <span className="block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-[spin_0.8s_linear_infinite]" aria-hidden="true" /> : <Icon n="sinRed" size={18} />}
        </span>
        <p className="min-w-0">
          {enLinea
            ? <><span className="font-semibold">Enviando {cambios(pendientes)}</span> hechos sin internet…</>
            : <><span className="font-semibold">Sin internet.</span> {hayApi
              ? <>Puedes seguir trabajando; {pendientes ? <span className="font-semibold">{cambios(pendientes)} por enviar</span> : 'lo que hagas'} se {pendientes ? 'enviarán' : 'enviará'} al volver la conexión.</>
              : 'Puedes seguir trabajando: todo se guarda en este dispositivo.'}</>}
        </p>
      </div>
    </div>
  )
}
