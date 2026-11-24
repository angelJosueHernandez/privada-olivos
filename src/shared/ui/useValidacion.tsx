import { useState } from 'react'
import Icon from './Icon'

/** Clases para que un campo con aria-invalid se vea en rojo (se suman a las del campo) */
export const CAMPO_INVALIDO = 'aria-[invalid=true]:ring-[1.5px] aria-[invalid=true]:ring-peligro aria-[invalid=true]:bg-peligro/[0.03]'

/*
  Errores por campo. Se muestran al salir del campo (no mientras se escribe la primera vez)
  o cuando se intenta guardar; desde ahí se actualizan en vivo hasta que el campo queda bien.
*/
export function useValidacion<K extends string>(errores: Record<K, string>, prefijo = 'campo') {
  const [tocados, setTocados] = useState<Partial<Record<K, boolean>>>({})
  const [intento, setIntento] = useState(false)
  const error = (k: K) => (tocados[k] || intento ? errores[k] : '')
  return {
    error,
    /** Props para el <input>: aria-invalid, aria-describedby y onBlur */
    props: (k: K) => ({
      'aria-invalid': error(k) ? true : undefined,
      'aria-describedby': error(k) ? `${prefijo}-${k}-error` : undefined,
      onBlur: () => setTocados((t) => (t[k] ? t : { ...t, [k]: true })),
    }),
    /** Al guardar: muestra todos los errores y devuelve el primero ('' si todo está bien) */
    revisar: (): string => { setIntento(true); return (Object.values(errores) as string[]).find(Boolean) ?? '' },
    reiniciar: () => { setTocados({}); setIntento(false) },
    idError: (k: K) => `${prefijo}-${k}-error`,
  }
}

/** Mensaje de error debajo del campo */
export function MensajeCampo({ id, mensaje, oscuro = false }: { id: string; mensaje: string; oscuro?: boolean }) {
  if (!mensaje) return null
  return (
    <p id={id} aria-live="polite" className={`mt-1.5 flex items-start gap-1.5 px-1 text-[0.875rem] font-medium ${oscuro ? 'text-[#FF8A80]' : 'text-peligro'}`}>
      <span className="mt-[1px] shrink-0"><Icon n="alerta" size={15} /></span>{mensaje}
    </p>
  )
}
