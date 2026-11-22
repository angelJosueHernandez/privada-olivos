import { ReactNode, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import Marca from '../../shared/ui/Marca'
import { LEGAL, LEGAL_PENDIENTE } from './config'

/* Página de lectura para documentos legales: medida cómoda, índice y secciones numeradas por ley. */
export default function DocumentoLegal({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
  const navegar = useNavigate()
  useEffect(() => { document.title = `${titulo} · ${LEGAL.producto}`; window.scrollTo(0, 0) }, [titulo])
  return (
    <div className="min-h-dvh bg-panel">
      <header className="material sticky top-0 z-10 border-b border-texto/[0.08] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-3xl h-14 px-3 flex items-center gap-2">
          <button onClick={() => (history.length > 1 ? navegar(-1) : navegar('/login'))} aria-label="Volver"
            className="h-11 w-11 grid place-items-center rounded-full hover:bg-texto/[0.06]">
            <Icon n="atras" size={22} />
          </button>
          <Marca size={26} />
          <span className="text-[0.9375rem] font-semibold">{LEGAL.producto}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-8 pt-10 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        <h1 className="titulo-grande text-balance">{titulo}</h1>
        <p className="mt-3 text-[1.0625rem] leading-[1.5] text-suave max-w-[62ch] text-pretty">{resumen}</p>
        <p className="mt-4 text-[0.875rem] text-suave">Última actualización: {LEGAL.actualizado}</p>

        {LEGAL_PENDIENTE && (
          <p role="note" className="mt-6 rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.9375rem] text-texto">
            <strong>Borrador:</strong> faltan datos del responsable marcados entre corchetes. Deben completarse y revisarse con un abogado antes de usar la app con residentes reales.
          </p>
        )}

        <div className="legal mt-10">{children}</div>

        <nav aria-label="Otros documentos" className="mt-16 border-t border-separador pt-6 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
          <Link to="/privacidad" className="text-acento font-medium hover:underline underline-offset-4">Aviso de privacidad</Link>
          <Link to="/terminos" className="text-acento font-medium hover:underline underline-offset-4">Términos y condiciones</Link>
          <Link to="/cookies" className="text-acento font-medium hover:underline underline-offset-4">Cookies y almacenamiento</Link>
        </nav>
      </main>
    </div>
  )
}

export function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20">
      <h2 id={`${id}-t`}>{titulo}</h2>
      {children}
    </section>
  )
}
