import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import Hoja from '../../shared/ui/Hoja'
import Icon, { IconName } from '../../shared/ui/Icon'

/*
  Centro de notificaciones del turno: cada evento se muestra como aviso emergente (Sonner) y queda
  guardado en la campana para revisarlo después. Con la API, aquí llegarán también los avisos del servidor.
*/
export type TipoEvento = 'entrada' | 'salida' | 'paquete' | 'entrega' | 'alerta' | 'error'
export type Evento = { id: string; tipo: TipoEvento; titulo: string; detalle?: string; hora: Date; leido: boolean }

const ESTILO: Record<TipoEvento, { icono: IconName; clase: string }> = {
  entrada: { icono: 'entrada', clase: 'bg-ok/[0.12] text-ok' },
  salida: { icono: 'salir', clase: 'bg-texto/[0.06] text-texto/70' },
  paquete: { icono: 'paquete', clase: 'bg-alerta/[0.12] text-alerta' },
  entrega: { icono: 'check', clase: 'bg-ok/[0.12] text-ok' },
  alerta: { icono: 'reloj', clase: 'bg-peligro/[0.1] text-peligro' },
  error: { icono: 'alerta', clase: 'bg-peligro/[0.1] text-peligro' },
}

export function useNotificaciones() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const notificar = useCallback((tipo: TipoEvento, titulo: string, detalle?: string) => {
    setEventos((e) => [{ id: crypto.randomUUID(), tipo, titulo, detalle, hora: new Date(), leido: false }, ...e].slice(0, 100))
    const opciones = { description: detalle }
    if (tipo === 'error') toast.error(titulo, opciones)
    else if (tipo === 'alerta') toast.warning(titulo, { ...opciones, duration: 6000 })
    else if (tipo === 'paquete') toast.info(titulo, opciones)
    else toast.success(titulo, opciones)
  }, [])
  const marcarLeidas = useCallback(() => setEventos((e) => e.map((x) => ({ ...x, leido: true }))), [])
  return { eventos, sinLeer: eventos.filter((e) => !e.leido).length, notificar, marcarLeidas }
}

export function BotonCampana({ sinLeer, onAbrir }: { sinLeer: number; onAbrir: () => void }) {
  return (
    <button onClick={onAbrir} aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
      className="relative grid place-items-center h-12 w-12 rounded-full bg-panel shadow-tarjeta transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94]">
      <Icon n="avisos" size={22} />
      {sinLeer > 0 && (
        <span key={sinLeer} className="anim-pop absolute -right-0.5 -top-0.5 grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-peligro text-white text-[0.75rem] font-bold cifras ring-2 ring-fondo">
          {sinLeer > 99 ? '99+' : sinLeer}
        </span>
      )}
    </button>
  )
}

const hora = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function PanelNotificaciones({ eventos, onCerrar }: { eventos: Evento[]; onCerrar: () => void }) {
  return (
    <Hoja titulo="Notificaciones del turno" onCerrar={onCerrar}>
      {eventos.length === 0 ? (
        <div className="anim-entrar flex min-h-[50svh] flex-col items-center justify-center text-center">
          <span className="grid place-items-center h-16 w-16 rounded-[20px] bg-texto/[0.06] text-texto/60"><Icon n="avisos" size={30} /></span>
          <p className="mt-5 text-[1.125rem] font-semibold">Sin notificaciones</p>
          <p className="mt-1 max-w-[32ch] text-[0.9375rem] text-suave">Aquí verás las entradas, salidas, paquetes y alertas de tu turno.</p>
        </div>
      ) : (
        <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
          {eventos.map((e, i) => (
            <li key={e.id} style={{ animationDelay: `${Math.min(i * 30, 180)}ms` }} className="anim-entrar flex items-start gap-3.5 px-4 py-3.5">
              <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-[12px] ${ESTILO[e.tipo].clase}`}>
                <Icon n={ESTILO[e.tipo].icono} size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold leading-snug">{e.titulo}</p>
                {e.detalle && <p className="text-[0.875rem] text-suave leading-snug">{e.detalle}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                <span className="text-[0.8125rem] text-suave cifras">{hora(e.hora)}</span>
                {!e.leido && <span aria-label="Sin leer" className="h-2.5 w-2.5 rounded-full bg-acento" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Hoja>
  )
}
