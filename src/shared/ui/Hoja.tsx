import { ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

/*
  Hoja a pantalla completa (estilo iOS) para tareas enfocadas: escanear, ver un resultado, registrar.
  Entra desde abajo; se cierra con el botón o con Escape; bloquea el scroll del fondo y lleva el foco al título.
*/
export default function Hoja({ titulo, onCerrar, oscura = false, children, pie }: {
  titulo: string
  onCerrar: () => void
  oscura?: boolean
  children: ReactNode
  pie?: ReactNode
}) {
  const id = useId()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    tituloRef.current?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar.current() }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflow
      anterior?.focus?.()
    }
  }, [])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby={id}
      className={`anim-hoja fixed inset-0 z-50 flex flex-col ${oscura ? 'bg-black text-white' : 'bg-fondo text-texto'}`}>
      <header className={`shrink-0 pt-[env(safe-area-inset-top)] ${oscura ? '' : 'material border-b border-texto/[0.08]'}`}>
        <div className="mx-auto w-full max-w-3xl h-14 px-3 flex items-center gap-2">
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className={`h-11 w-11 grid place-items-center rounded-full ${oscura ? 'bg-white/10 hover:bg-white/15' : 'hover:bg-texto/[0.06]'}`}>
            <Icon n="cerrar" size={20} />
          </button>
          <h2 id={id} ref={tituloRef} tabIndex={-1} className="text-[1.0625rem] font-semibold tracking-[-0.01em] outline-none">{titulo}</h2>
        </div>
      </header>
      <div data-hoja-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">{children}</div>
      </div>
      {pie && (
        <footer className={`shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 ${oscura ? '' : 'material border-t border-texto/[0.08]'}`}>
          <div className="mx-auto w-full max-w-xl px-5">{pie}</div>
        </footer>
      )}
    </div>,
    document.body,
  )
}
