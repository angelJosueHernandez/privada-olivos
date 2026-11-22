import { ChangeEvent, ReactNode, useState } from 'react'
import { toast } from 'sonner'
import Icon, { IconName } from '../../shared/ui/Icon'
import { prepararFoto } from './fotos'
import { NuevoAcceso } from './tipos'

export type FotoEvidencia = { blob: Blob; url: string; slot: string }
export type Guia = { id: string; titulo: string; ayuda: string; icono: IconName; obligatoria: boolean }

/* Qué debe fotografiar el guardia en cada tipo de registro (nunca rostros ni identificaciones completas) */
export const GUIAS: Record<NuevoAcceso['tipo'], Guia[]> = {
  PAQUETERIA: [
    { id: 'paquete', titulo: 'Paquetes', ayuda: 'Que se vean todos los paquetes que entran.', icono: 'paquete', obligatoria: true },
    { id: 'guia', titulo: 'Guía o etiqueta', ayuda: 'De cerca, que se lea el número de guía.', icono: 'lista', obligatoria: true },
    { id: 'gafete', titulo: 'Gafete del repartidor', ayuda: 'Solo el gafete o el uniforme con el logo, sin el rostro.', icono: 'usuario', obligatoria: false },
  ],
  COMIDA: [
    { id: 'pedido', titulo: 'Pedido o bolsa', ayuda: 'Con el sello o el nombre del cliente visible.', icono: 'comida', obligatoria: true },
    { id: 'app', titulo: 'Gafete o pedido en la app', ayuda: 'La pantalla del pedido del repartidor o su gafete.', icono: 'usuario', obligatoria: false },
  ],
  SERVICIO: [
    { id: 'credencial', titulo: 'Credencial de la empresa', ayuda: 'El gafete o credencial con el nombre de la empresa.', icono: 'usuario', obligatoria: true },
    { id: 'orden', titulo: 'Orden de servicio', ayuda: 'Folio o documento del trabajo, si lo trae.', icono: 'lista', obligatoria: false },
    { id: 'material', titulo: 'Herramienta o material', ayuda: 'Lo que trae al entrar, para revisarlo a la salida.', icono: 'herramienta', obligatoria: false },
  ],
  VISITA_SIN_QR: [
    { id: 'vehiculo', titulo: 'Vehículo completo', ayuda: 'De frente o de lado, sin personas.', icono: 'auto', obligatoria: false },
  ],
}

/** Apartado de una sola foto: número, título, instrucciones y una vista previa grande */
export function ApartadoFoto({ numero, total, titulo, ayuda, icono, obligatoria, foto, onTomar, onQuitar, children }: {
  numero: number; total: number; titulo: string; ayuda: string; icono: IconName; obligatoria: boolean
  foto?: FotoEvidencia
  onTomar?: (e: ChangeEvent<HTMLInputElement>) => void
  onQuitar?: () => void
  /** Contenido propio (p. ej. el lector de placas con IA) en lugar del botón estándar */
  children?: ReactNode
}) {
  return (
    <section aria-label={`Foto ${numero} de ${total}: ${titulo}`} className="anim-entrar rounded-[24px] bg-panel shadow-tarjeta overflow-hidden"
      style={{ animationDelay: `${Math.min(numero * 50, 250)}ms` }}>
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        <span className={`grid place-items-center h-8 w-8 shrink-0 rounded-full text-[0.875rem] font-bold cifras transition-colors duration-200
          ${foto ? 'bg-ok text-white' : 'bg-texto/[0.07] text-texto/70'}`}>
          {foto ? <span className="anim-pop anim-trazo grid place-items-center"><Icon n="check" size={16} stroke={3} /></span> : numero}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="flex flex-wrap items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.01em]">
            {titulo}
            {obligatoria
              ? <span className="rounded-full bg-acento/[0.1] px-2 py-0.5 text-[0.6875rem] font-semibold text-acento">Obligatoria</span>
              : <span className="rounded-full bg-texto/[0.06] px-2 py-0.5 text-[0.6875rem] font-semibold text-texto/60">Opcional</span>}
          </h4>
          <p className="mt-0.5 text-[0.875rem] leading-[1.4] text-suave text-pretty">{ayuda}</p>
        </div>
      </header>

      <div className="px-5 pb-5">
        {children ?? (foto ? (
          <div className="relative overflow-hidden rounded-[18px] bg-texto aspect-[4/3]">
            <img src={foto.url} alt={titulo} className="anim-llenar h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 p-3 bg-gradient-to-t from-black/50 to-transparent">
              <label className="cursor-pointer inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/90 text-[#1D1D1F] text-[0.875rem] font-semibold backdrop-blur-md active:scale-[0.97] transition-transform focus-within:outline focus-within:outline-[3px] focus-within:outline-white">
                <input type="file" accept="image/*" capture="environment" onChange={onTomar} className="sr-only" />
                <Icon n="camara" size={16} />Volver a tomar
              </label>
              <button type="button" onClick={onQuitar} aria-label={`Quitar foto: ${titulo}`}
                className="grid place-items-center h-10 w-10 rounded-full bg-white/90 text-[#1D1D1F] backdrop-blur-md active:scale-95 transition-transform">
                <Icon n="basura" size={17} />
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center gap-3 rounded-[18px] aspect-[4/3] border-2 border-dashed border-borde bg-fondo text-center
            transition-[transform,border-color] duration-150 ease-[var(--ease-out)] active:scale-[0.98] hover:border-acento/50
            focus-within:outline focus-within:outline-[3px] focus-within:outline-acento/55">
            <input type="file" accept="image/*" capture="environment" onChange={onTomar} className="sr-only" />
            <span className="grid place-items-center h-14 w-14 rounded-[18px] bg-panel text-texto/60 shadow-tarjeta"><Icon n={icono} size={28} /></span>
            <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-acento text-acento-texto text-[0.9375rem] font-semibold">
              <Icon n="camara" size={18} />Tomar foto
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

/** Las fotos guiadas de un tipo de registro, cada una en su propio apartado */
export default function FotosGuiadas({ tipo, fotos, onCambio, numeroInicial = 1, total }: {
  tipo: NuevoAcceso['tipo']
  fotos: FotoEvidencia[]
  onCambio: (f: FotoEvidencia[]) => void
  numeroInicial?: number
  total: number
}) {
  const [procesando, setProcesando] = useState<string | null>(null)

  const tomar = (slot: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setProcesando(slot)
    try {
      const blob = await prepararFoto(archivo)
      const previa = fotos.find((f) => f.slot === slot)
      if (previa) URL.revokeObjectURL(previa.url)
      onCambio([...fotos.filter((f) => f.slot !== slot), { blob, url: URL.createObjectURL(blob), slot }])
      navigator.vibrate?.(30)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo usar la foto.')
    } finally { setProcesando(null) }
  }
  const quitar = (slot: string) => {
    const f = fotos.find((x) => x.slot === slot)
    if (f) URL.revokeObjectURL(f.url)
    onCambio(fotos.filter((x) => x.slot !== slot))
  }

  return (
    <div className="space-y-4">
      {GUIAS[tipo].map((g, i) => (
        <div key={`${tipo}-${g.id}`} className={procesando === g.id ? 'opacity-60 pointer-events-none' : ''}>
          <ApartadoFoto numero={numeroInicial + i} total={total} titulo={g.titulo} ayuda={g.ayuda} icono={g.icono}
            obligatoria={g.obligatoria} foto={fotos.find((f) => f.slot === g.id)} onTomar={tomar(g.id)} onQuitar={() => quitar(g.id)} />
        </div>
      ))}
    </div>
  )
}
