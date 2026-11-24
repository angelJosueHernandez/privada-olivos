import { useEffect, useState } from 'react'
import { directorioService } from '../directorio/directorioService'

const numeros = (calle: string) => directorioService.casasActivas().filter((c) => c.startsWith(`Calle ${calle} `)).map((c) => c.slice(`Calle ${calle} `.length))

/* Casa destino en dos toques: calle y número. Sin escribir, sin errores de dedo. */
export default function SelectorCasa({ valor, onCambio }: { valor: string; onCambio: (casa: string) => void }) {
  // Calles y casas vienen del directorio (la administración las da de alta)
  const CALLES = directorioService.calles()
  const [calle, setCalle] = useState(() => CALLES.find((c) => valor.startsWith(`Calle ${c} `)) ?? CALLES[0])

  // Si la casa cambia desde fuera (p. ej. al reconocer una placa), se muestra su calle
  useEffect(() => {
    const c = CALLES.find((x) => valor.startsWith(`Calle ${x} `))
    if (c) setCalle(c)
  }, [valor])

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Calle" className="flex gap-1 overflow-x-auto rounded-[14px] bg-texto/[0.06] p-1 [scrollbar-width:none]">
        {CALLES.map((c) => (
          <button key={c} type="button" aria-pressed={calle === c} onClick={() => setCalle(c)}
            className={`h-11 flex-1 shrink-0 whitespace-nowrap px-3 rounded-[11px] text-[0.9375rem] font-medium transition-[background-color,box-shadow,color] duration-150
              ${calle === c ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>
            {c}
          </button>
        ))}
      </div>
      <div key={calle} role="group" aria-label={`Número en calle ${calle}`} className="anim-entrar grid grid-cols-5 sm:grid-cols-6 gap-2">
        {numeros(calle).map((n) => {
          const casa = `Calle ${calle} ${n}`
          const activo = valor === casa
          return (
            <button key={n} type="button" aria-pressed={activo} aria-label={casa} onClick={() => onCambio(casa)}
              className={`h-12 rounded-[12px] text-[1rem] font-semibold cifras transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.95]
                ${activo ? 'bg-acento text-acento-texto shadow-[0_2px_8px_-2px_rgb(var(--acento)/0.45)]' : 'bg-panel ring-1 ring-inset ring-borde'}`}>
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
