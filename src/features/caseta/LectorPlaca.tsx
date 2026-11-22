import { ChangeEvent, useEffect, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { casetaService, IaNoDisponible } from './casetaService'
import { prepararFoto } from './fotos'
import type { LecturaPlaca } from './tipos'

type Estado =
  | { fase: 'vacio' }
  | { fase: 'leyendo'; url: string }
  | { fase: 'leida'; url: string; lectura: LecturaPlaca }
  | { fase: 'error'; url?: string; mensaje: string; sinIa: boolean }

const CONFIANZA = {
  ALTA: { texto: 'Lectura segura', clase: 'bg-ok/[0.12] text-ok' },
  MEDIA: { texto: 'Revisa la placa', clase: 'bg-alerta/[0.12] text-alerta' },
  BAJA: { texto: 'No se leyó bien', clase: 'bg-peligro/[0.1] text-peligro' },
}

/*
  Foto de la placa + lectura con IA. Al terminar avisa al formulario con la lectura y la foto,
  que se guarda como primera evidencia. Si la IA no está disponible, permite escribir la placa.
*/
export default function LectorPlaca({ placa, onPlaca, onLectura }: {
  placa: string
  onPlaca: (p: string) => void
  onLectura: (lectura: LecturaPlaca, foto: Blob) => void
}) {
  const [estado, setEstado] = useState<Estado>({ fase: 'vacio' })
  const [corrigiendo, setCorrigiendo] = useState(false)

  useEffect(() => () => { if ('url' in estado && estado.url) URL.revokeObjectURL(estado.url) }, [estado])

  const tomar = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setCorrigiendo(false)
    let foto: Blob
    try { foto = await prepararFoto(archivo) } catch (err) {
      setEstado({ fase: 'error', mensaje: err instanceof Error ? err.message : 'No se pudo usar la foto.', sinIa: false })
      return
    }
    const url = URL.createObjectURL(foto)
    setEstado({ fase: 'leyendo', url })
    try {
      const lectura = await casetaService.leerPlaca(foto)
      navigator.vibrate?.(lectura.placa ? 40 : [60, 80, 60])
      setEstado({ fase: 'leida', url, lectura })
      if (lectura.placa) onPlaca(lectura.placa)
      onLectura(lectura, foto)
    } catch (err) {
      setEstado({ fase: 'error', url, mensaje: err instanceof Error ? err.message : 'No se pudo leer la placa.', sinIa: err instanceof IaNoDisponible })
      // La foto se conserva como evidencia aunque la IA no haya podido leerla
      onLectura({ placa: null, estado: null, tipoVehiculo: 'DESCONOCIDO', color: 'OTRO', confianza: 'BAJA' }, foto)
    }
  }

  const botonFoto = (texto: string, principal = false) => (
    <label className={`cursor-pointer select-none transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]
      focus-within:outline focus-within:outline-[3px] focus-within:outline-acento/55
      ${principal
        ? 'flex items-center gap-4 rounded-[20px] bg-acento px-5 py-4 text-acento-texto'
        : 'inline-flex items-center gap-2 h-10 px-4 rounded-full bg-texto/[0.06] text-[0.9375rem] font-medium'}`}>
      <input type="file" accept="image/*" capture="environment" onChange={tomar} className="sr-only" />
      {principal ? (
        <>
          <span className="grid place-items-center h-12 w-12 shrink-0 rounded-[14px] bg-white/15"><Icon n="camara" size={26} /></span>
          <span>
            <span className="block text-[1.0625rem] font-semibold">{texto}</span>
            <span className="block text-[0.875rem] opacity-85">La IA llena la placa, el vehículo y el color</span>
          </span>
        </>
      ) : (<><Icon n="camara" size={18} />{texto}</>)}
    </label>
  )

  const placaVisible = placa || (estado.fase === 'leida' ? estado.lectura.placa ?? '' : '')

  return (
    <div className="space-y-3">
      {estado.fase === 'vacio' && botonFoto('Fotografiar placa', true)}

      {estado.fase !== 'vacio' && 'url' in estado && estado.url && (
        <div className="relative overflow-hidden rounded-[20px] bg-texto aspect-[16/9]">
          <img src={estado.url} alt="Foto de la placa" className="h-full w-full object-cover" />
          {estado.fase === 'leyendo' && (
            <div role="status" className="absolute inset-0 bg-black/35">
              <div aria-hidden="true" className="anim-barrido absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-white/45 to-transparent" />
              <span className="absolute left-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[0.875rem] font-medium text-white backdrop-blur-md">
                <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-2 border-white border-r-transparent animate-[spin_0.7s_linear_infinite]" />
                Leyendo placa…
              </span>
            </div>
          )}
        </div>
      )}

      {estado.fase === 'leida' && (
        <div className="anim-llenar flex flex-wrap items-center gap-3">
          {/* Placa con el aspecto de una placa real */}
          <div className="relative min-w-[200px] rounded-[10px] bg-white px-5 pt-4 pb-2.5 text-center ring-2 ring-texto/80 shadow-tarjeta">
            {estado.lectura.estado && (
              <span className="absolute inset-x-0 top-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-texto/60">{estado.lectura.estado}</span>
            )}
            <span className="block text-[1.75rem] font-bold tracking-[0.08em] text-[#1D1D1F] cifras">{placaVisible || '— — —'}</span>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${CONFIANZA[estado.lectura.confianza].clase}`}>
            {CONFIANZA[estado.lectura.confianza].texto}
          </span>
        </div>
      )}

      {estado.fase === 'error' && (
        <p role="alert" className="flex items-start gap-2 rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.9375rem] text-texto">
          <span className="mt-0.5 shrink-0 text-alerta"><Icon n="alerta" size={18} /></span>
          <span>{estado.mensaje} {estado.sinIa ? 'Escribe la placa abajo.' : ''}</span>
        </p>
      )}

      {(corrigiendo || estado.fase === 'error') && (
        <div className="anim-llenar">
          <label htmlFor="placa-manual" className="block mb-2 text-[0.875rem] text-suave">Placa</label>
          <input id="placa-manual" value={placa} maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onChange={(e) => onPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            placeholder="ABC-123-D"
            className="block w-full max-w-[260px] h-14 rounded-[14px] bg-panel px-4 text-[1.375rem] font-bold tracking-[0.08em] text-texto ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave/60 placeholder:font-medium" />
        </div>
      )}

      {estado.fase !== 'vacio' && estado.fase !== 'leyendo' && (
        <div className="flex flex-wrap gap-2">
          {botonFoto('Tomar otra foto')}
          {estado.fase === 'leida' && !corrigiendo && (
            <button type="button" onClick={() => setCorrigiendo(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-texto/[0.06] text-[0.9375rem] font-medium active:scale-[0.97] transition-transform duration-150">
              <Icon n="teclado" size={18} />Corregir placa
            </button>
          )}
        </div>
      )}
    </div>
  )
}
