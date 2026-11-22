import Icon, { IconName } from '../../shared/ui/Icon'
import type { EstadoPase, Pase, Validacion } from './tipos'

const ESTADOS: Record<EstadoPase, { titulo: string; texto: string; icono: IconName; tono: 'ok' | 'alerta' | 'peligro' }> = {
  VALIDO: { titulo: 'Acceso permitido', texto: 'El pase es válido. Verifica los datos antes de dejar pasar.', icono: 'check', tono: 'ok' },
  VENCIDO: { titulo: 'Pase vencido', texto: 'La visita está fuera de la fecha u horario del pase.', icono: 'reloj', tono: 'alerta' },
  FUERA_DE_HORARIO: { titulo: 'Fuera de horario', texto: 'El pase existe, pero no es válido a esta hora.', icono: 'reloj', tono: 'alerta' },
  USADO: { titulo: 'Pase ya utilizado', texto: 'Este pase de un solo uso ya se registró.', icono: 'alerta', tono: 'peligro' },
  REVOCADO: { titulo: 'Pase cancelado', texto: 'El residente canceló este pase.', icono: 'cerrar', tono: 'peligro' },
  NO_EXISTE: { titulo: 'Código no reconocido', texto: 'Este código no pertenece a ningún pase de la privada.', icono: 'cerrar', tono: 'peligro' },
}
const FONDO = { ok: 'bg-ok/[0.09]', alerta: 'bg-alerta/[0.09]', peligro: 'bg-peligro/[0.07]' }
const ICONO = { ok: 'bg-ok text-white', alerta: 'bg-alerta text-white', peligro: 'bg-peligro text-white' }
const TEXTO = { ok: 'text-ok', alerta: 'text-alerta', peligro: 'text-peligro' }

/** Verificaciones que el guardia confirma antes de registrar la entrada */
export function verificacionesDe(p: Pase): { id: string; texto: string }[] {
  return [
    { id: 'persona', texto: `La persona es ${p.visitante}` },
    { id: 'personas', texto: p.personas === 1 ? 'Entra 1 persona' : `Entran ${p.personas} personas` },
    ...(p.placas ? [{ id: 'placas', texto: `Las placas son ${p.placas}` }] : []),
  ]
}

const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

function Dato({ icono, etiqueta, valor }: { icono: IconName; etiqueta: string; valor: string }) {
  return (
    <div className="rounded-[16px] bg-fondo px-4 py-3">
      <p className="flex items-center gap-1.5 text-[0.8125rem] text-suave"><Icon n={icono} size={15} />{etiqueta}</p>
      <p className="mt-1 text-[1rem] font-semibold leading-tight cifras">{valor}</p>
    </div>
  )
}

export default function ResultadoPase({ validacion, verificado, onVerificar }: {
  validacion: Validacion
  verificado: Record<string, boolean>
  onVerificar: (id: string) => void
}) {
  const e = ESTADOS[validacion.estado]
  const p = validacion.pase
  const valido = validacion.estado === 'VALIDO'

  return (
    <div className={`${p ? '' : 'min-h-[55svh] flex flex-col justify-center'}`}>
      {/* Encabezado de estado */}
      <div role="status" aria-live="assertive" className={`anim-entrar rounded-[24px] ${FONDO[e.tono]} px-5 py-6 flex flex-col items-center text-center`}>
        <span className={`anim-pop grid place-items-center h-[72px] w-[72px] rounded-full ${ICONO[e.tono]} shadow-[0_10px_24px_-12px_rgb(0_0_0/0.35)] ${valido ? 'anim-trazo' : ''}`}>
          <Icon n={e.icono} size={38} stroke={2.6} />
        </span>
        <h3 className={`mt-4 text-[1.75rem] font-bold tracking-[-0.02em] ${TEXTO[e.tono]}`}>{e.titulo}</h3>
        <p className="mt-1 max-w-[36ch] text-[1rem] leading-[1.4] text-texto/80 text-balance">{validacion.detalle ?? e.texto}</p>
        {p && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-[0.8125rem] font-semibold text-texto/80 shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
            <Icon n={p.tipo === 'UNICO' ? 'qr' : 'reloj'} size={14} />
            {p.tipo === 'UNICO' ? 'Pase de un solo uso' : 'Pase recurrente'}
          </span>
        )}
      </div>

      {p && (
        <>
          {/* Visitante */}
          <section aria-label="Visitante" style={{ animationDelay: '60ms' }} className="anim-entrar mt-4 rounded-[24px] bg-panel shadow-tarjeta p-5">
            <div className="flex items-center gap-4">
              <span className="grid place-items-center h-14 w-14 shrink-0 rounded-full bg-acento/[0.12] text-acento text-[1.125rem] font-bold">{iniciales(p.visitante)}</span>
              <div className="min-w-0">
                <p className="text-[1.375rem] font-bold tracking-[-0.015em] leading-tight">{p.visitante}</p>
                <p className="text-[0.9375rem] text-suave">{p.motivo ? `${p.motivo} · ` : ''}Invita {p.residente}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Dato icono="inicio" etiqueta="Va a" valor={p.casa} />
              <Dato icono="reloj" etiqueta="Vigencia" valor={p.vigencia} />
              <Dato icono="visita" etiqueta="Personas" valor={String(p.personas)} />
              <Dato icono="auto" etiqueta="Placas" valor={p.placas ?? 'Sin vehículo'} />
            </div>
            {/* Trazabilidad: quién creó el pase y cuándo */}
            <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-fondo px-4 py-3">
              <span className="grid place-items-center h-9 w-9 shrink-0 rounded-full bg-panel text-texto/70"><Icon n="usuario" size={18} /></span>
              <p className="min-w-0 text-[0.875rem] leading-snug">
                Pase <strong className="font-semibold cifras">{p.folio}</strong> creado por <strong className="font-semibold">{p.creadoPor.nombre}</strong>
                <span className="block text-suave">{p.creadoPor.casa ?? 'Residente'} · {p.creadoEn.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>
          </section>

          {/* Verificación antes de dejar pasar */}
          {valido && (
            <section aria-labelledby="verificar" style={{ animationDelay: '120ms' }} className="anim-entrar mt-4">
              <h4 id="verificar" className="px-1 mb-2 text-[0.9375rem] font-semibold">Antes de dejar pasar, confirma:</h4>
              <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
                {verificacionesDe(p).map((v) => {
                  const ok = !!verificado[v.id]
                  return (
                    <li key={v.id}>
                      <button type="button" aria-pressed={ok} onClick={() => onVerificar(v.id)}
                        className="w-full flex items-center gap-3.5 px-4 min-h-[56px] text-left active:bg-texto/[0.04] transition-colors">
                        <span className={`grid place-items-center h-7 w-7 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150
                          ${ok ? 'bg-ok text-white' : 'ring-[1.5px] ring-inset ring-borde'}`}>
                          {ok && <span className="anim-pop anim-trazo grid place-items-center"><Icon n="check" size={16} stroke={3} /></span>}
                        </span>
                        <span className={`text-[1rem] ${ok ? 'font-medium' : ''}`}>{v.texto}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
