import { useRef, useState } from 'react'
import Icon from './Icon'

/*
  Paginación para listas y tablas largas.
  - `usePaginacion(lista, porPagina, clave)`: devuelve solo los elementos de la página actual.
    Cuando cambia `clave` (búsqueda, filtro, pestaña) vuelve a la página 1; si la lista se acorta
    (p. ej. se aprobó el último comprobante de la página), la página se ajusta sola.
  - Al cambiar de página, si el inicio de la lista quedó arriba de la pantalla, se desplaza a él
    para que la persona no aparezca a la mitad de la página nueva.
  - `<Paginacion>` no se muestra cuando todo cabe en una página.
*/
export function usePaginacion<T>(lista: T[], porPagina = 20, clave: unknown = '') {
  const [estado, setEstado] = useState<{ pagina: number; clave: unknown }>({ pagina: 1, clave })
  const ancla = useRef<HTMLDivElement>(null)
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const pagina = Math.min(Object.is(estado.clave, clave) ? estado.pagina : 1, paginas)
  const desde = (pagina - 1) * porPagina

  const ir = (p: number) => {
    setEstado({ pagina: Math.min(Math.max(1, p), paginas), clave })
    const el = ancla.current
    // El encabezado es fijo: el "arriba" visible empieza debajo de él
    const tope = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12
    const arriba = el?.getBoundingClientRect().top ?? 0
    if (el && arriba < tope) {
      const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: window.scrollY + arriba - tope, behavior: quieto ? 'auto' : 'smooth' })
    }
  }

  return {
    visibles: lista.slice(desde, desde + porPagina),
    /** Ponlo en el contenedor de la lista: es a donde se regresa al cambiar de página */
    ancla,
    props: { pagina, paginas, desde, hasta: Math.min(desde + porPagina, lista.length), total: lista.length, onIr: ir },
  }
}

/** Números a mostrar: 1 … 4 5 6 … 12 (siempre la primera, la última y las vecinas) */
function numeros(pagina: number, paginas: number): (number | '…')[] {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1)
  const r: (number | '…')[] = [1]
  const ini = Math.max(2, Math.min(pagina - 1, paginas - 4))
  const fin = Math.min(paginas - 1, Math.max(pagina + 1, 5))
  if (ini > 2) r.push('…')
  for (let p = ini; p <= fin; p++) r.push(p)
  if (fin < paginas - 1) r.push('…')
  r.push(paginas)
  return r
}

type Props = { pagina: number; paginas: number; desde: number; hasta: number; total: number; onIr: (p: number) => void; nombre?: string }

export function Paginacion({ pagina, paginas, desde, hasta, total, onIr, nombre = 'resultados' }: Props) {
  if (paginas <= 1) return null
  const flecha = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-texto/75 transition-[background-color,transform] duration-150 hover:bg-texto/[0.06] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-30'
  return (
    <nav aria-label={`Páginas de ${nombre}`} className="mt-3 flex items-center justify-between gap-3 px-1">
      <p className="text-[0.875rem] text-suave cifras" aria-live="polite">
        {desde + 1}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => onIr(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior" className={flecha}>
          <Icon n="atras" size={18} />
        </button>
        {/* En teléfono solo "2 / 5"; en pantallas amplias, los números para saltar */}
        <span className="px-2 text-[0.9375rem] font-medium cifras sm:hidden">{pagina} / {paginas}</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          {numeros(pagina, paginas).map((p, i) => p === '…'
            ? <span key={`e${i}`} aria-hidden="true" className="w-6 text-center text-suave">…</span>
            : (
              <button key={p} type="button" onClick={() => onIr(p)} aria-label={`Página ${p}`} aria-current={p === pagina ? 'page' : undefined}
                className={`h-10 min-w-10 rounded-full px-2 text-[0.9375rem] font-medium cifras transition-colors duration-150
                  ${p === pagina ? 'bg-texto text-panel' : 'text-texto/75 hover:bg-texto/[0.06]'}`}>
                {p}
              </button>
            ))}
        </span>
        <button type="button" onClick={() => onIr(pagina + 1)} disabled={pagina === paginas} aria-label="Página siguiente" className={flecha}>
          <span className="rotate-180"><Icon n="atras" size={18} /></span>
        </button>
      </div>
    </nav>
  )
}
