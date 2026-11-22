import { ReactNode } from 'react'

/*
  Botones de opción (chips) para capturar datos estándar sin escribir.
  Se usan botones con aria-pressed: grandes (44 px), fáciles de tocar con guantes y con respuesta al presionar.
*/
const base = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full text-[0.9375rem] font-medium select-none ' +
  'transition-[transform,background-color,color,box-shadow] duration-150 ease-[var(--ease-out)] active:scale-[0.96]'
const apagado = 'bg-panel text-texto ring-1 ring-inset ring-borde hover:ring-texto/30'
const encendido = 'bg-acento text-acento-texto ring-1 ring-inset ring-acento shadow-[0_2px_8px_-2px_rgb(var(--acento)/0.45)]'

type Opcion<T extends string> = { valor: T; etiqueta: ReactNode; extra?: ReactNode }

export function Opciones<T extends string>({ etiqueta, opciones, valor, onCambio, cuadricula, opcional = true }: {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T | null | undefined
  /** Recibe null cuando se quita la opción elegida (solo si es opcional) */
  onCambio: (v: T | null) => void
  /** true: tocar otra vez la opción elegida la quita */
  opcional?: boolean
  /** Clases de cuadrícula opcionales; por defecto los chips fluyen en renglones */
  cuadricula?: string
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cuadricula ?? 'flex flex-wrap gap-2'}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor}
          onClick={() => onCambio(opcional && valor === o.valor ? null : o.valor)}
          title={opcional && valor === o.valor ? 'Toca de nuevo para quitar' : undefined}
          className={`${base} ${valor === o.valor ? encendido : apagado}`}>
          {o.extra}{o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function OpcionesMultiples({ etiqueta, opciones, valores, onCambio }: {
  etiqueta: string
  opciones: string[]
  valores: string[]
  onCambio: (v: string[]) => void
}) {
  const alternar = (o: string) => onCambio(valores.includes(o) ? valores.filter((v) => v !== o) : [...valores, o])
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activo = valores.includes(o)
        return (
          <button key={o} type="button" aria-pressed={activo} onClick={() => alternar(o)}
            className={`${base} ${activo ? 'bg-acento/[0.1] text-acento ring-[1.5px] ring-inset ring-acento' : apagado}`}>
            {activo && (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
            {o}
          </button>
        )
      })}
    </div>
  )
}
