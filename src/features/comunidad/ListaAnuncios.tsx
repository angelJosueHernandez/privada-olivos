import { useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Anuncio, CATEGORIAS } from './tipos'

const VISTO = 'olv-anuncios-visto'
/** Última vez que el usuario abrió los anuncios (para marcar los nuevos) */
export const leerVisto = () => { try { return Number(localStorage.getItem(VISTO)) || 0 } catch { return 0 } }
export const marcarVisto = () => { try { localStorage.setItem(VISTO, String(Date.now())) } catch { /* nada */ } }

const cuando = (d: Date) => {
  // Días de calendario (no horas): algo de ayer a las 18:00 es "Ayer" aunque no hayan pasado 24 h
  const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dias = Math.round((inicio(new Date()) - inicio(d)) / 86_400_000)
  if (dias < 1) return `Hoy, ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  if (dias < 2) return 'Ayer'
  if (dias < 7) return `Hace ${dias} días`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

/* Lista de anuncios. Los importantes van arriba y resaltados; los largos se pueden expandir. */
export default function ListaAnuncios({ anuncios, vistoHasta = Infinity, onBorrar }: {
  anuncios: Anuncio[]
  /** Anuncios publicados después de esta marca se muestran como "Nuevo" */
  vistoHasta?: number
  onBorrar?: (a: Anuncio) => void
}) {
  const [abierto, setAbierto] = useState<string | null>(null)
  return (
    <ul className="space-y-3">
      {anuncios.map((a, i) => {
        const cat = CATEGORIAS.find((c) => c.valor === a.categoria) ?? CATEGORIAS[0]
        const largo = a.cuerpo.length > 160
        const expandido = abierto === a.id || !largo
        const nuevo = a.publicadoEn.getTime() > vistoHasta
        return (
          <li key={a.id} className={`anim-entrar rounded-[22px] bg-panel shadow-tarjeta p-5 ${a.importante ? 'ring-[1.5px] ring-inset ring-acento/40' : ''}`}
            style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
            <div className="flex flex-wrap items-center gap-2">
              {a.importante && <span className="inline-flex items-center gap-1 rounded-full bg-acento px-2.5 py-0.5 text-[0.75rem] font-semibold text-acento-texto"><Icon n="megafono" size={13} />Importante</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${cat.clase}`}>{cat.etiqueta}</span>
              {nuevo && <span className="rounded-full bg-peligro px-2 py-0.5 text-[0.75rem] font-semibold text-white">Nuevo</span>}
              <span className="ml-auto text-[0.8125rem] text-suave">{cuando(a.publicadoEn)}</span>
            </div>
            <h3 className="mt-3 text-[1.1875rem] font-semibold tracking-[-0.01em] leading-snug">{a.titulo}</h3>
            <p className={`mt-1.5 whitespace-pre-line text-[1rem] leading-[1.5] text-texto/85 text-pretty ${expandido ? '' : 'line-clamp-3'}`}>{a.cuerpo}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[0.8125rem] text-suave">Publicó {a.publicadoPor.nombre}</span>
              <div className="flex items-center gap-1">
                {largo && (
                  <button type="button" onClick={() => setAbierto(expandido ? null : a.id)} className="min-h-11 px-2 text-[0.9375rem] font-medium text-acento">
                    {expandido ? 'Ver menos' : 'Leer más'}
                  </button>
                )}
                {onBorrar && (
                  <button type="button" onClick={() => onBorrar(a)} aria-label={`Borrar anuncio: ${a.titulo}`}
                    className="grid place-items-center h-11 w-11 rounded-full text-peligro hover:bg-peligro/[0.08] active:scale-95 transition-transform">
                    <Icon n="basura" size={18} />
                  </button>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
