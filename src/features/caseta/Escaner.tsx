import { FormEvent, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../../shared/ui/Icon'

type EstadoCamara = 'iniciando' | 'activa' | 'sin-permiso' | 'sin-camara' | 'error'

// Lector nativo de códigos (Chrome/Android, Safari reciente). Tipos mínimos porque TypeScript no los incluye.
type Detector = { detect: (fuente: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type ClaseDetector = { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> }

async function crearDetectorNativo(): Promise<Detector | null> {
  const Clase = (window as unknown as { BarcodeDetector?: ClaseDetector }).BarcodeDetector
  if (!Clase) return null
  try {
    const formatos = (await Clase.getSupportedFormats?.()) ?? ['qr_code']
    return formatos.includes('qr_code') ? new Clase({ formats: ['qr_code'] }) : null
  } catch { return null }
}

/*
  Lector de QR con la cámara trasera, optimizado para leer rápido:
  - Usa el lector nativo del sistema cuando existe (más rápido y tolerante a reflejos de pantalla).
  - Si no, usa jsQR solo sobre el ÁREA DEL MARCO, a buena resolución: así el código ocupa más
    píxeles, se ignoran otros códigos alrededor y cada lectura es más rápida.
  - Lee ~10 veces por segundo con requestAnimationFrame, enfoque continuo y cámara Full HD.
  Si no hay cámara o permiso, queda la opción de escribir el código.
*/
export default function Escaner({ onLeido }: { onLeido: (contenido: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const pista = useRef<MediaStreamTrack | null>(null)
  const leido = useRef(onLeido)
  leido.current = onLeido
  const [estado, setEstado] = useState<EstadoCamara>('iniciando')
  const [linterna, setLinterna] = useState<boolean | null>(null) // null = no disponible
  const [manual, setManual] = useState('')
  const [leidoOk, setLeidoOk] = useState(false)

  useEffect(() => {
    let flujo: MediaStream | null = null
    let activo = true
    let cuadro = 0
    let ultimo = 0
    let ocupado = false
    let intentos = 0
    let detector: Detector | null = null
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const exito = (texto: string) => {
      activo = false
      navigator.vibrate?.(60) // confirmación táctil en el mismo instante de la lectura
      setLeidoOk(true) // el marco se pone verde y aparece la palomita
      window.setTimeout(() => leido.current(texto), 380)
    }

    // Recorta el centro (el área del marco) y lo escala a un tamaño cómodo para decodificar
    const leerConJsQR = (v: HTMLVideoElement, completo: boolean) => {
      const lado = completo ? Math.min(v.videoWidth, v.videoHeight) : Math.min(v.videoWidth, v.videoHeight) * 0.75
      const sx = (v.videoWidth - lado) / 2
      const sy = (v.videoHeight - lado) / 2
      const destino = Math.min(720, Math.round(lado))
      canvas.width = destino
      canvas.height = destino
      ctx.drawImage(v, sx, sy, lado, lado, 0, 0, destino, destino)
      const datos = ctx.getImageData(0, 0, destino, destino)
      // Cada cierto número de cuadros también prueba colores invertidos (códigos claros sobre fondo oscuro)
      return jsQR(datos.data, destino, destino, { inversionAttempts: intentos % 6 === 5 ? 'onlyInvert' : 'dontInvert' })?.data
    }

    const ciclo = async (t: number) => {
      if (!activo) return
      cuadro = requestAnimationFrame(ciclo)
      const v = video.current
      if (ocupado || !v || v.readyState < 2 || !v.videoWidth || t - ultimo < 90) return
      ultimo = t
      ocupado = true
      intentos++
      try {
        let texto: string | undefined
        if (detector) {
          const codigos = await detector.detect(v)
          texto = codigos[0]?.rawValue
        } else {
          texto = leerConJsQR(v, intentos % 4 === 0) // 1 de cada 4 cuadros revisa la imagen completa
        }
        if (texto && activo) exito(texto)
      } catch { /* cuadro ilegible: se intenta con el siguiente */ }
      finally { ocupado = false }
    }

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('sin-camara'); return }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (!activo) { flujo.getTracks().forEach((t) => t.stop()); return }
        const v = video.current!
        v.srcObject = flujo
        await v.play()
        pista.current = flujo.getVideoTracks()[0] ?? null
        const capacidades = pista.current?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }) | undefined
        if (capacidades?.torch) setLinterna(false)
        // Enfoque continuo: evita que la cámara se quede desenfocada al acercar el código
        if (capacidades?.focusMode?.includes('continuous')) {
          pista.current?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
        }
        detector = await crearDetectorNativo()
        setEstado('activa')
        cuadro = requestAnimationFrame(ciclo)
      } catch (e) {
        const nombre = (e as DOMException)?.name
        setEstado(nombre === 'NotAllowedError' || nombre === 'SecurityError' ? 'sin-permiso'
          : nombre === 'NotFoundError' || nombre === 'OverconstrainedError' ? 'sin-camara' : 'error')
      }
    })()

    return () => {
      activo = false
      cancelAnimationFrame(cuadro)
      flujo?.getTracks().forEach((t) => t.stop())
      pista.current = null
    }
  }, [])

  const alternarLinterna = async () => {
    if (linterna === null || !pista.current) return
    try {
      await pista.current.applyConstraints({ advanced: [{ torch: !linterna } as MediaTrackConstraintSet] })
      setLinterna(!linterna)
    } catch { setLinterna(null) }
  }

  const enviarManual = (e: FormEvent) => {
    e.preventDefault()
    const v = manual.trim()
    if (v) leido.current(v)
  }

  const aviso = {
    'sin-permiso': 'Permite el uso de la cámara para este sitio en la configuración del navegador y vuelve a abrir el lector.',
    'sin-camara': 'Este dispositivo no tiene cámara disponible. Escribe el código del pase.',
    error: 'No se pudo abrir la cámara. Escribe el código del pase o intenta de nuevo.',
  } as const

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[420px] aspect-square overflow-hidden rounded-[28px] bg-white/[0.06]">
        <video ref={video} playsInline muted aria-label="Vista de la cámara"
          className={`absolute inset-0 h-full w-full object-cover ${estado === 'activa' ? '' : 'invisible'}`} />

        {/* Marco de lectura: oscurece alrededor y marca las esquinas */}
        {estado === 'activa' && (
          <div aria-hidden="true" className="absolute inset-[12.5%] rounded-[22px] shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]">
            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-[22px]', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-[22px]',
              'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[22px]', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-[22px]']
              .map((c) => <span key={c} className={`absolute h-10 w-10 transition-[border-color,transform] duration-200 ease-out ${leidoOk ? 'border-[rgb(var(--ok))] scale-[0.92]' : 'border-white'} ${c}`} />)}
            {leidoOk && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="anim-pop anim-trazo grid place-items-center h-20 w-20 rounded-full bg-ok text-white shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)]">
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              </span>
            )}
          </div>
        )}

        {estado === 'iniciando' && (
          <div className="absolute inset-0 grid place-items-center text-white/70 text-[0.9375rem]">Abriendo la cámara…</div>
        )}
        {(estado === 'sin-permiso' || estado === 'sin-camara' || estado === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid place-items-center h-14 w-14 rounded-2xl bg-white/10"><Icon n="camara" size={28} /></span>
            <p className="text-[0.9375rem] leading-[1.45] text-white/85">{aviso[estado]}</p>
          </div>
        )}

        {linterna !== null && (
          <button type="button" onClick={alternarLinterna} aria-pressed={linterna}
            aria-label={linterna ? 'Apagar linterna' : 'Encender linterna'}
            className={`absolute bottom-4 right-4 h-12 w-12 grid place-items-center rounded-full backdrop-blur-md
              ${linterna ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
            <Icon n="linterna" size={22} />
          </button>
        )}
      </div>

      {estado === 'activa' && (
        <p aria-live="polite" className="mt-5 text-[1.0625rem] font-medium text-white text-center">{leidoOk ? 'Código leído' : 'Apunta al código QR del visitante'}</p>
      )}

      <form onSubmit={enviarManual} className="mt-8 w-full max-w-[420px]">
        <label htmlFor="codigo-manual" className="block text-[0.875rem] text-white/70 mb-2">
          ¿No se puede leer? Escribe el código del pase
        </label>
        <div className="flex gap-2">
          <input id="codigo-manual" value={manual} maxLength={40} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onChange={(e) => setManual(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            placeholder="OLV-0000-XX"
            className="flex-1 min-w-0 h-12 rounded-[14px] bg-white/10 px-4 text-[1.0625rem] font-medium tracking-[0.04em] text-white
              placeholder:text-white/40 outline-none focus:ring-[1.5px] focus:ring-white/70" />
          <button className="h-12 px-5 rounded-full bg-white text-black text-[1rem] font-semibold active:scale-[0.97] transition-transform duration-150 disabled:opacity-40"
            disabled={!manual.trim()}>
            Validar
          </button>
        </div>
      </form>
    </div>
  )
}
