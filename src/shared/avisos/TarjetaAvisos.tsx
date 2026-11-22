import { useState } from 'react'
import { toast } from 'sonner'
import Icon from '../ui/Icon'
import { avisoSistema, useEstadoAvisos } from './sistema'
import { useInstalar } from './instalar'

const OCULTA = 'olv-avisos-ahora-no'
const leerOculta = () => { try { return sessionStorage.getItem(OCULTA) === '1' } catch { return false } }

/* Invita a activar las notificaciones del sistema. En iPhone explica cómo instalar la app primero. */
export default function TarjetaAvisos({ texto }: { texto: string }) {
  const { estado, activar } = useEstadoAvisos()
  const [oculta, setOculta] = useState(leerOculta)
  const [pidiendo, setPidiendo] = useState(false)
  const { modo, instalar } = useInstalar()

  if (oculta || estado === 'activos' || estado === 'no-soportado') return null

  const ahoraNo = () => { try { sessionStorage.setItem(OCULTA, '1') } catch { /* nada */ } setOculta(true) }
  const alActivar = async () => {
    setPidiendo(true)
    const e = await activar()
    setPidiendo(false)
    if (e === 'activos') {
      toast.success('Notificaciones activadas')
      void avisoSistema('Notificaciones activadas', { cuerpo: 'Así te avisaremos de lo que pase en la caseta.', etiqueta: 'prueba' })
    } else if (e === 'bloqueados') toast.error('Las notificaciones están bloqueadas', { description: 'Actívalas en los ajustes del navegador.' })
  }

  return (
    <section aria-labelledby="t-avisos" className="anim-entrar rounded-[22px] bg-panel shadow-tarjeta p-5">
      <div className="flex items-start gap-4">
        <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-acento/[0.12] text-acento"><Icon n="avisos" size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="t-avisos" className="text-[1.0625rem] font-semibold tracking-[-0.01em]">
            {estado === 'bloqueados' ? 'Las notificaciones están bloqueadas' : 'Activa las notificaciones'}
          </h2>
          <p className="mt-0.5 text-[0.9375rem] leading-[1.4] text-suave text-pretty">
            {estado === 'bloqueados'
              ? 'Para recibir avisos, permite las notificaciones de este sitio en los ajustes del navegador y vuelve a abrir la app.'
              : texto}
          </p>
        </div>
      </div>

      {estado === 'instalar' && (
        <ol className="mt-4 space-y-2.5 rounded-[16px] bg-fondo p-4 text-[0.9375rem]">
          <li className="flex items-center gap-3"><Paso n={1} />Toca <span className="inline-flex items-center gap-1 font-semibold"><Icon n="compartir" size={17} />Compartir</span> en Safari</li>
          <li className="flex items-center gap-3"><Paso n={2} />Elige <strong className="font-semibold">“Agregar a inicio”</strong></li>
          <li className="flex items-center gap-3"><Paso n={3} />Abre la app desde el ícono y activa los avisos</li>
        </ol>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        {estado === 'pendiente' && (
          <button type="button" onClick={alActivar} disabled={pidiendo} className="btn-primario btn-chico">
            <Icon n="avisos" size={17} />{pidiendo ? 'Activando…' : 'Activar'}
          </button>
        )}
        {/* Android y computadora: instalarla deja la app con su ícono, a pantalla completa */}
        {modo === 'boton' && (
          <button type="button" onClick={() => void instalar()} className="btn-secundario btn-chico"><Icon n="descargar" size={17} />Instalar app</button>
        )}
        <button type="button" onClick={ahoraNo} className="btn-secundario btn-chico">Ahora no</button>
      </div>
    </section>
  )
}

const Paso = ({ n }: { n: number }) => (
  <span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-acento text-acento-texto text-[0.75rem] font-bold cifras">{n}</span>
)
