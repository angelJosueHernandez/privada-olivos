import { ChangeEvent, useState } from 'react'
import { toast } from 'sonner'
import Icon, { IconName } from '../../shared/ui/Icon'
import { prepararFoto } from './fotos'
import { NuevoAcceso, tienePlaca, Vehiculo } from './tipos'

export type FotoEvidencia = { blob: Blob; url: string; slot: string }

type Guia = { id: string; titulo: string; ayuda: string; icono: IconName; recomendada: boolean }

const PLACA: Guia = { id: 'placa', titulo: 'Placa del vehículo', ayuda: 'Se llena sola con "Fotografiar placa". Que se lean todos los caracteres.', icono: 'auto', recomendada: true }

/* Qué debe fotografiar el guardia en cada tipo de registro (nunca rostros ni identificaciones completas) */
const GUIAS: Record<NuevoAcceso['tipo'], Guia[]> = {
  PAQUETERIA: [
    { id: 'paquete', titulo: 'Paquetes', ayuda: 'Que se vean todos los paquetes que entran.', icono: 'paquete', recomendada: true },
    { id: 'guia', titulo: 'Guía o etiqueta', ayuda: 'De cerca, que se lea el número de guía.', icono: 'lista', recomendada: true },
    { id: 'gafete', titulo: 'Gafete del repartidor', ayuda: 'Solo el gafete o uniforme con el logo, sin el rostro.', icono: 'usuario', recomendada: false },
  ],
  COMIDA: [
    { id: 'pedido', titulo: 'Pedido o bolsa', ayuda: 'Con el sello o el nombre del cliente visible.', icono: 'comida', recomendada: true },
    { id: 'app', titulo: 'Gafete o pedido en la app', ayuda: 'La pantalla del pedido del repartidor o su gafete.', icono: 'usuario', recomendada: false },
  ],
  SERVICIO: [
    { id: 'credencial', titulo: 'Credencial de la empresa', ayuda: 'El gafete o credencial con el nombre de la empresa.', icono: 'usuario', recomendada: true },
    { id: 'orden', titulo: 'Orden de servicio', ayuda: 'Folio o documento del trabajo, si lo trae.', icono: 'lista', recomendada: false },
    { id: 'material', titulo: 'Herramienta o material', ayuda: 'Lo que trae al entrar, para revisarlo a la salida.', icono: 'herramienta', recomendada: false },
  ],
  VISITA_SIN_QR: [
    { id: 'vehiculo', titulo: 'Vehículo completo', ayuda: 'De frente o de lado, sin personas.', icono: 'auto', recomendada: false },
  ],
}
const MAX_EXTRA = 2

export default function FotosGuiadas({ tipo, vehiculo, fotos, onCambio }: {
  tipo: NuevoAcceso['tipo']
  vehiculo?: Vehiculo
  fotos: FotoEvidencia[]
  onCambio: (f: FotoEvidencia[]) => void
}) {
  const [procesando, setProcesando] = useState<string | null>(null)
  const guias = [...(tienePlaca(vehiculo) ? [PLACA] : []), ...GUIAS[tipo]]
  const extras = fotos.filter((f) => f.slot.startsWith('extra-'))
  const recomendadas = guias.filter((g) => g.recomendada)
  const hechas = recomendadas.filter((g) => fotos.some((f) => f.slot === g.id)).length

  const tomar = (slot: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setProcesando(slot)
    try {
      const blob = await prepararFoto(archivo)
      const nueva = { blob, url: URL.createObjectURL(blob), slot }
      const previa = fotos.find((f) => f.slot === slot)
      if (previa) URL.revokeObjectURL(previa.url)
      onCambio([...fotos.filter((f) => f.slot !== slot), nueva])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo usar la foto.')
    } finally { setProcesando(null) }
  }
  const quitar = (slot: string) => {
    const f = fotos.find((x) => x.slot === slot)
    if (f) URL.revokeObjectURL(f.url)
    onCambio(fotos.filter((x) => x.slot !== slot))
  }

  const entradaFoto = (slot: string, contenido: JSX.Element, clase: string) => (
    <label className={`cursor-pointer select-none transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]
      focus-within:outline focus-within:outline-[3px] focus-within:outline-acento/55 ${clase} ${procesando === slot ? 'opacity-60 pointer-events-none' : ''}`}>
      <input type="file" accept="image/*" capture="environment" onChange={tomar(slot)} className="sr-only" />
      {contenido}
    </label>
  )

  return (
    <div>
      {recomendadas.length > 0 && (
        <div className="mb-3 flex items-center gap-3" aria-live="polite">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-texto/[0.08]">
            <div className="h-full rounded-full bg-acento transition-[width] duration-300 ease-[var(--ease-out)]"
              style={{ width: `${(hechas / recomendadas.length) * 100}%` }} />
          </div>
          <span className="text-[0.8125rem] font-medium text-suave cifras">{hechas} de {recomendadas.length} recomendadas</span>
        </div>
      )}

      <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
        {guias.map((g) => {
          const f = fotos.find((x) => x.slot === g.id)
          const esPlacaSinFoto = g.id === 'placa' && !f
          return (
            <li key={g.id} className="flex items-center gap-4 px-4 py-3.5">
              {f ? (
                <img src={f.url} alt={g.titulo} className="anim-llenar h-16 w-16 shrink-0 rounded-[14px] object-cover ring-1 ring-inset ring-black/10" />
              ) : (
                <span className="grid place-items-center h-16 w-16 shrink-0 rounded-[14px] bg-fondo text-texto/55 border border-dashed border-borde">
                  <Icon n={g.icono} size={26} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold">
                  {g.titulo}
                  {f ? (
                    <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ok"><Icon n="check" size={13} stroke={3} />Lista</span>
                  ) : g.recomendada ? (
                    <span className="rounded-full bg-acento/[0.1] px-2 py-0.5 text-[0.6875rem] font-semibold text-acento">Recomendada</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[0.8125rem] leading-[1.4] text-suave text-pretty">{g.ayuda}</p>
              </div>
              {f ? (
                <div className="flex shrink-0 gap-1.5">
                  {entradaFoto(g.id, (
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-texto/[0.06] text-texto/70">
                      <Icon n="camara" size={17} /><span className="sr-only">Volver a tomar: {g.titulo}</span>
                    </span>
                  ), 'shrink-0')}
                  <button type="button" onClick={() => quitar(g.id)} aria-label={`Quitar foto: ${g.titulo}`}
                    className="grid place-items-center h-10 w-10 rounded-full bg-texto/[0.06] text-texto/70 active:scale-95 transition-transform">
                    <Icon n="basura" size={17} />
                  </button>
                </div>
              ) : esPlacaSinFoto ? null : (
                entradaFoto(g.id, (
                  <span className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-acento text-acento-texto text-[0.875rem] font-semibold">
                    <Icon n="camara" size={17} />{procesando === g.id ? '…' : 'Tomar'}
                  </span>
                ), 'shrink-0')
              )}
            </li>
          )
        })}

        {/* Fotos adicionales libres */}
        {extras.map((f, i) => (
          <li key={f.slot} className="flex items-center gap-4 px-4 py-3.5">
            <img src={f.url} alt={`Foto adicional ${i + 1}`} className="anim-llenar h-16 w-16 shrink-0 rounded-[14px] object-cover ring-1 ring-inset ring-black/10" />
            <p className="flex-1 text-[0.9375rem] font-semibold">Foto adicional {i + 1}</p>
            <button type="button" onClick={() => quitar(f.slot)} aria-label={`Quitar foto adicional ${i + 1}`}
              className="grid place-items-center h-10 w-10 rounded-full bg-texto/[0.06] text-texto/70 active:scale-95 transition-transform">
              <Icon n="basura" size={17} />
            </button>
          </li>
        ))}
        {extras.length < MAX_EXTRA && (
          <li className="px-4 py-3">
            {entradaFoto(`extra-${Date.now()}`, (
              <span className="inline-flex items-center gap-2 min-h-11 text-[0.9375rem] font-medium text-acento">
                <Icon n="mas" size={18} stroke={2.2} />Agregar otra foto
              </span>
            ), 'inline-block')}
          </li>
        )}
      </ul>

      <p className="mt-3 text-[0.8125rem] leading-[1.45] text-suave">
        Nunca fotografíes rostros ni identificaciones completas. Las fotos se reducen, se les quita la ubicación
        y se borran a los 90 días. Indica a la persona que el aviso de privacidad está en caseta.
      </p>
    </div>
  )
}
