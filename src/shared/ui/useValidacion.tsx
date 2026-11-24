import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/** Clases para que un campo con aria-invalid se vea en rojo (se suman a las del campo) */
export const CAMPO_INVALIDO = 'aria-[invalid=true]:ring-[1.5px] aria-[invalid=true]:ring-peligro aria-[invalid=true]:bg-peligro/[0.03]'

const suave = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior

/**
 * Lleva a la vista un elemento (dentro de la hoja o de la página) y, si es un campo, lo enfoca.
 * Así un error nunca queda escondido abajo del scroll.
 */
export function mostrarElemento(el: Element | null, enfocar = true) {
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: suave() })
  if (enfocar && el instanceof HTMLElement && el.matches('input, textarea, select, button')) el.focus({ preventScroll: true })
}

/*
  Errores por campo:
  - Se muestran al salir del campo o al intentar guardar; desde ahí se actualizan en vivo.
  - Al guardar con errores, la vista se mueve al PRIMER campo con problema y lo enfoca.
  - `fallo(campo, mensaje)`: errores que regresa el servicio ("ya hay una cuenta con ese correo")
    se muestran en el campo correcto y se borran en cuanto la persona lo edita.
*/
export function useValidacion<K extends string>(errores: Record<K, string>, prefijo = 'campo') {
  const [tocados, setTocados] = useState<Partial<Record<K, boolean>>>({})
  const [intento, setIntento] = useState(false)
  const [externos, setExternos] = useState<Partial<Record<K, string>>>({})
  const idCampo = (k: K) => `${prefijo}-${k}`
  const idError = (k: K) => `${prefijo}-${k}-error`
  const error = (k: K) => externos[k] || (tocados[k] || intento ? errores[k] : '')

  const irA = (k: K) => requestAnimationFrame(() => {
    mostrarElemento(document.querySelector(`[data-campo="${idCampo(k)}"]`) ?? document.getElementById(idError(k)))
  })

  return {
    error,
    idError,
    /** Props para el <input>: aria-invalid, aria-describedby, onBlur y limpieza del error externo */
    props: (k: K) => ({
      'data-campo': idCampo(k),
      'aria-invalid': error(k) ? true : undefined,
      'aria-describedby': error(k) ? idError(k) : undefined,
      onBlur: () => setTocados((t) => (t[k] ? t : { ...t, [k]: true })),
      onInput: () => setExternos((e) => (e[k] ? { ...e, [k]: undefined } : e)),
    }),
    /** Al guardar: muestra todos los errores, lleva la vista al primero y lo devuelve ('' si todo está bien) */
    revisar(): string {
      setIntento(true)
      const primero = (Object.keys(errores) as K[]).find((k) => externos[k] || errores[k])
      if (primero) irA(primero)
      return primero ? (externos[primero] || errores[primero]) : ''
    },
    /** Error que regresó el servicio para un campo: se muestra ahí y la vista se mueve a él */
    fallo(k: K, mensaje: string) { setExternos((e) => ({ ...e, [k]: mensaje })); irA(k) },
    /** Para campos sin <input> propio (selector de casa): se limpia el error externo a mano */
    limpiar(k: K) { setExternos((e) => (e[k] ? { ...e, [k]: undefined } : e)) },
    reiniciar: () => { setTocados({}); setIntento(false); setExternos({}) },
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

/**
 * Error general del formulario (no ligado a un campo). Al aparecer o cambiar se desplaza solo
 * hasta quedar a la vista, y se sacude para que se note aunque ya estuviera visible.
 */
export function ErrorFormulario({ mensaje }: { mensaje: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (mensaje) mostrarElemento(ref.current, false) }, [mensaje])
  if (!mensaje) return null
  return (
    <p ref={ref} role="alert" className="anim-sacudir flex items-start gap-2 rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] font-medium text-peligro scroll-my-24">
      <span className="mt-0.5 shrink-0"><Icon n="alerta" size={18} /></span>{mensaje}
    </p>
  )
}
