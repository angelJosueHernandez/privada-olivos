import Icon, { IconName } from '../../shared/ui/Icon'
import type { EstadoPase, Validacion } from './tipos'

const ESTADOS: Record<EstadoPase, { titulo: string; texto: string; icono: IconName; tono: 'ok' | 'alerta' | 'peligro' }> = {
  VALIDO: { titulo: 'Acceso permitido', texto: 'El pase es válido. Confirma la identidad y registra la entrada.', icono: 'check', tono: 'ok' },
  VENCIDO: { titulo: 'Pase vencido', texto: 'La visita está fuera de la fecha u horario del pase.', icono: 'reloj', tono: 'alerta' },
  FUERA_DE_HORARIO: { titulo: 'Fuera de horario', texto: 'El pase existe, pero no es válido a esta hora.', icono: 'reloj', tono: 'alerta' },
  USADO: { titulo: 'Pase ya utilizado', texto: 'Este pase de un solo uso ya se registró.', icono: 'alerta', tono: 'peligro' },
  REVOCADO: { titulo: 'Pase cancelado', texto: 'El residente canceló este pase.', icono: 'cerrar', tono: 'peligro' },
  NO_EXISTE: { titulo: 'Código no reconocido', texto: 'Este código no pertenece a ningún pase de la privada.', icono: 'cerrar', tono: 'peligro' },
}

const TONOS = {
  ok: 'bg-ok/[0.1] text-ok',
  alerta: 'bg-alerta/[0.1] text-alerta',
  peligro: 'bg-peligro/[0.08] text-peligro',
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-[0.9375rem] text-suave shrink-0">{etiqueta}</dt>
      <dd className="text-[1rem] font-medium text-right">{valor}</dd>
    </div>
  )
}

export default function ResultadoPase({ validacion }: { validacion: Validacion }) {
  const e = ESTADOS[validacion.estado]
  const p = validacion.pase
  return (
    <div className={`anim-entrar ${p ? '' : 'min-h-[55svh] flex flex-col justify-center'}`}>
      <div role="status" aria-live="assertive" className="flex flex-col items-center text-center pt-2">
        <span className={`anim-pop grid place-items-center h-20 w-20 rounded-full ${TONOS[e.tono]} ${validacion.estado === 'VALIDO' ? 'anim-trazo' : ''}`}>
          <Icon n={e.icono} size={40} stroke={2.2} />
        </span>
        <h3 className="mt-5 text-[1.75rem] font-bold tracking-[-0.02em]">{e.titulo}</h3>
        <p className="mt-2 max-w-[36ch] text-[1.0625rem] leading-[1.4] text-suave text-balance">{validacion.detalle ?? e.texto}</p>
      </div>

      {p && (
        <section aria-label="Datos del pase" className="mt-8 rounded-[20px] bg-panel shadow-tarjeta px-5">
          <div className="flex items-center gap-4 py-4 border-b border-separador">
            <span className="grid place-items-center h-12 w-12 shrink-0 rounded-full bg-fondo text-texto/75">
              <Icon n="visita" size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-[1.25rem] font-semibold tracking-[-0.015em] truncate">{p.visitante}</p>
              {p.motivo && <p className="text-[0.9375rem] text-suave">{p.motivo}</p>}
            </div>
          </div>
          <dl className="divide-y divide-separador">
            <Fila etiqueta="Va a" valor={p.casa} />
            <Fila etiqueta="Invita" valor={p.residente} />
            <Fila etiqueta="Vigencia" valor={p.vigencia} />
            <Fila etiqueta="Tipo" valor={p.tipo === 'UNICO' ? 'Un solo uso' : 'Recurrente'} />
            <Fila etiqueta="Personas" valor={String(p.personas)} />
            {p.placas && <Fila etiqueta="Placas" valor={p.placas} />}
          </dl>
        </section>
      )}
    </div>
  )
}
