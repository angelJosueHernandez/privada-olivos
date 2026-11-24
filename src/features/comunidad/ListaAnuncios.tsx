import { useEffect, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Paginacion, usePaginacion } from '../../shared/ui/Paginacion'
import { Anuncio, anuncioVigente, CATEGORIAS, MAX_PERSONAS, Respuesta, ValorRespuesta } from './tipos'

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
export default function ListaAnuncios({ anuncios, vistoHasta = Infinity, onBorrar, onEditar, onResponder, onVerRespuestas, clave }: {
  anuncios: Anuncio[]
  /** Al cambiar (p. ej. el filtro) se vuelve a la primera página */
  clave?: string
  /** Anuncios publicados después de esta marca se muestran como "Nuevo" */
  vistoHasta?: number
  onBorrar?: (a: Anuncio) => void
  /** Administración: muestra a quién va dirigido, vigencia y botón de editar */
  onEditar?: (a: Anuncio) => void
  /** Residente: confirma de enterado o su asistencia */
  onResponder?: (a: Anuncio, valor: ValorRespuesta, personas?: number) => Promise<void>
  /** Administración: abre la lista de respuestas por casa */
  onVerRespuestas?: (a: Anuncio) => void
}) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const pag = usePaginacion(anuncios, 10, clave)
  return (
    <>
    <div ref={pag.ancla} />
    <ul className="space-y-3">
      {pag.visibles.map((a, i) => {
        const cat = CATEGORIAS.find((c) => c.valor === a.categoria) ?? CATEGORIAS[0]
        const largo = a.cuerpo.length > 160
        const expandido = abierto === a.id || !largo
        const nuevo = a.publicadoEn.getTime() > vistoHasta
        return (
          <li key={a.id} className={`anim-entrar rounded-[22px] bg-panel shadow-tarjeta p-5 ${a.importante ? 'ring-[1.5px] ring-inset ring-acento/40' : ''} ${anuncioVigente(a) ? '' : 'opacity-60'}`}
            style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
            <div className="flex flex-wrap items-center gap-2">
              {a.importante && <span className="inline-flex items-center gap-1 rounded-full bg-acento px-2.5 py-0.5 text-[0.75rem] font-semibold text-acento-texto"><Icon n="megafono" size={13} />Importante</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${cat.clase}`}>{cat.etiqueta}</span>
              {nuevo && <span className="rounded-full bg-peligro px-2 py-0.5 text-[0.75rem] font-semibold text-white">Nuevo</span>}
              {onEditar && (
                <>
                  <span className="rounded-full bg-fondo px-2.5 py-0.5 text-[0.75rem] font-semibold text-texto/75">{a.calle ? `Calle ${a.calle}` : 'Todas las casas'}</span>
                  {!anuncioVigente(a) ? <span className="rounded-full bg-texto/[0.08] px-2.5 py-0.5 text-[0.75rem] font-semibold text-texto/60">Ya no se muestra</span>
                    : a.vence ? <span className="rounded-full bg-fondo px-2.5 py-0.5 text-[0.75rem] font-semibold text-texto/75">Hasta {a.vence.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span> : null}
                </>
              )}
              <span className="ml-auto text-[0.8125rem] text-suave">{cuando(a.publicadoEn)}</span>
            </div>
            <h3 className="mt-3 text-[1.1875rem] font-semibold tracking-[-0.01em] leading-snug">{a.titulo}</h3>
            <p className={`mt-1.5 whitespace-pre-line text-[1rem] leading-[1.5] text-texto/85 text-pretty ${expandido ? '' : 'line-clamp-3'}`}>{a.cuerpo}</p>
            {a.pideRespuesta && onResponder && anuncioVigente(a) && <ResponderAnuncio anuncio={a} onResponder={onResponder} />}
            {a.pideRespuesta && onVerRespuestas && <ResumenRespuestas anuncio={a} onVer={() => onVerRespuestas(a)} />}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[0.8125rem] text-suave">Publicó {a.publicadoPor.nombre}</span>
              <div className="flex items-center gap-1">
                {largo && (
                  <button type="button" onClick={() => setAbierto(expandido ? null : a.id)} className="min-h-11 px-2 text-[0.9375rem] font-medium text-acento">
                    {expandido ? 'Ver menos' : 'Leer más'}
                  </button>
                )}
                {onEditar && (
                  <button type="button" onClick={() => onEditar(a)} aria-label={`Editar anuncio: ${a.titulo}`}
                    className="grid place-items-center h-11 w-11 rounded-full text-acento hover:bg-acento/[0.08] active:scale-95 transition-transform">
                    <Icon n="editar" size={18} />
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
    <Paginacion {...pag.props} nombre="anuncios" />
    </>
  )
}

const horaCorta = (d: Date) => cuando(d).replace(/^Hoy, /, 'hoy a las ')

/** Totales de respuestas de un anuncio (administración) */
export function contarRespuestas(a: Anuncio) {
  const rs = a.respuestas ?? []
  const asisten = rs.filter((r) => r.valor === 'ASISTE')
  return {
    enterados: rs.filter((r) => r.valor === 'ENTERADO').length,
    asisten: asisten.length,
    personas: asisten.reduce((s, r) => s + (r.personas ?? 1), 0),
    noAsisten: rs.filter((r) => r.valor === 'NO_ASISTE').length,
    faltan: Math.max(0, (a.casasDestino ?? 0) - rs.length),
    total: a.casasDestino ?? 0,
  }
}

/* Residente: botón de enterado, o Sí/No + número de personas para eventos */
function ResponderAnuncio({ anuncio: a, onResponder }: { anuncio: Anuncio; onResponder: NonNullable<Parameters<typeof ListaAnuncios>[0]['onResponder']> }) {
  // Respuesta local optimista: se ve al instante y se corrige si el servidor falla
  const [mia, setMia] = useState<Pick<Respuesta, 'valor' | 'personas' | 'en'> | undefined>(a.miRespuesta)
  const [enviando, setEnviando] = useState(false)
  useEffect(() => { setMia(a.miRespuesta) }, [a.miRespuesta])

  const responder = async (valor: ValorRespuesta, personas?: number) => {
    const antes = mia
    setMia({ valor, personas, en: new Date() }); setEnviando(true)
    try { await onResponder(a, valor, personas) } catch { setMia(antes) } finally { setEnviando(false) }
  }

  if (a.pideRespuesta === 'ENTERADO') {
    return (
      <div className="mt-4 border-t border-separador pt-4">
        {mia ? (
          <p className="anim-llenar flex items-start gap-2.5 text-[0.9375rem]">
            <span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-ok text-white"><Icon n="check" size={14} stroke={2.6} /></span>
            <span className="pt-0.5"><span className="font-semibold text-ok">Marcaste enterado</span> <span className="text-suave">· {horaCorta(mia.en)}</span></span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 basis-48 text-[0.9375rem] text-texto/80">La administración pide que confirmes que lo leíste.</p>
            <button type="button" disabled={enviando} onClick={() => responder('ENTERADO')} className="btn-primario btn-chico shrink-0">
              <Icon n="check" size={17} stroke={2.4} />Enterado
            </button>
          </div>
        )}
      </div>
    )
  }

  const asiste = mia?.valor === 'ASISTE'
  const personas = mia?.personas ?? 1
  const opcion = (activa: boolean, color: string) =>
    `flex flex-1 items-center justify-center gap-1.5 h-11 rounded-[12px] text-[0.9375rem] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:opacity-60
     ${activa ? color : 'bg-fondo text-texto/80'}`
  return (
    <div className="mt-4 border-t border-separador pt-4">
      <p id={`asistir-${a.id}`} className="mb-2.5 text-[0.9375rem] font-semibold">¿Vas a asistir?</p>
      <div role="group" aria-labelledby={`asistir-${a.id}`} className="flex gap-2">
        <button type="button" aria-pressed={asiste} disabled={enviando && !asiste} onClick={() => !asiste && responder('ASISTE', personas)}
          className={opcion(asiste, 'bg-ok text-white shadow-[0_1px_3px_rgb(0_0_0/0.15)]')}>
          {asiste && <Icon n="check" size={16} stroke={2.6} />}Sí asistiré
        </button>
        <button type="button" aria-pressed={mia?.valor === 'NO_ASISTE'} disabled={enviando && mia?.valor !== 'NO_ASISTE'} onClick={() => mia?.valor !== 'NO_ASISTE' && responder('NO_ASISTE')}
          className={opcion(mia?.valor === 'NO_ASISTE', 'bg-texto text-panel')}>No podré</button>
      </div>
      {asiste && (
        <div className="anim-llenar mt-3 flex items-center justify-between gap-3 rounded-[14px] bg-fondo px-4 py-2">
          <span id={`personas-${a.id}`} className="text-[0.9375rem]">Personas de tu casa</span>
          <div role="group" aria-labelledby={`personas-${a.id}`} className="flex items-center gap-1">
            <button type="button" aria-label="Una persona menos" disabled={personas <= 1} onClick={() => responder('ASISTE', personas - 1)}
              className="grid place-items-center h-11 w-11 rounded-full text-[1.375rem] font-medium text-acento disabled:text-texto/25 active:scale-90 transition-transform">−</button>
            <output aria-live="polite" className="w-8 text-center text-[1.125rem] font-semibold cifras">{personas}</output>
            <button type="button" aria-label="Una persona más" disabled={personas >= MAX_PERSONAS} onClick={() => responder('ASISTE', personas + 1)}
              className="grid place-items-center h-11 w-11 rounded-full text-[1.375rem] font-medium text-acento disabled:text-texto/25 active:scale-90 transition-transform">+</button>
          </div>
        </div>
      )}
      <p className="mt-2.5 text-[0.8125rem] text-suave">{mia ? `Respondiste ${horaCorta(mia.en).replace(/\.$/, '')}. Puedes cambiarlo mientras el anuncio esté visible.` : 'Tu respuesta le ayuda a la administración a organizarse.'}</p>
    </div>
  )
}

/* Administración: resumen de respuestas con barra de avance */
function ResumenRespuestas({ anuncio: a, onVer }: { anuncio: Anuncio; onVer: () => void }) {
  const t = contarRespuestas(a)
  const respondieron = t.total - t.faltan
  const pct = t.total ? Math.round((respondieron / t.total) * 100) : 0
  return (
    <div className="mt-4 border-t border-separador pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[0.9375rem] font-semibold cifras">
          {a.pideRespuesta === 'ENTERADO'
            ? <>{t.enterados} de {t.total} casas enteradas</>
            : <>{t.asisten} {t.asisten === 1 ? 'casa asiste' : 'casas asisten'} · {t.personas} {t.personas === 1 ? 'persona' : 'personas'}</>}
        </p>
        <button type="button" onClick={onVer} className="min-h-11 -my-2 text-[0.9375rem] font-medium text-acento">Ver casas</button>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-texto/[0.08]" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Casas que respondieron">
        <div className="h-full rounded-full bg-acento" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[0.8125rem] text-suave cifras">
        {a.pideRespuesta === 'ASISTENCIA' && <>{t.noAsisten} no {t.noAsisten === 1 ? 'asistirá' : 'asistirán'} · </>}
        {t.faltan ? `${t.faltan} sin responder` : 'Todas las casas respondieron'}
      </p>
    </div>
  )
}
