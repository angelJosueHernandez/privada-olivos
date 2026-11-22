import { FormEvent, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import Icon from '../../shared/ui/Icon'

type EstadoCamara = 'iniciando' | 'activa' | 'sin-permiso' | 'sin-camara' | 'error'

/*
  Lector de QR con la cámara trasera.
  Lee varias veces por segundo sobre un canvas reducido (rápido incluso en celulares modestos) y
  funciona en todos los navegadores modernos, incluido Safari de iPhone, porque no depende del
  BarcodeDetector nativo. Si no hay cámara o no hay permiso, queda la opción de escribir el código.
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
    let temporizador = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const leer = () => {
      const v = video.current
      if (!activo || !v) return
      if (v.readyState >= 2 && v.videoWidth) {
        const escala = Math.min(1, 640 / v.videoWidth)
        canvas.width = Math.round(v.videoWidth * escala)
        canvas.height = Math.round(v.videoHeight * escala)
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const datos = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(datos.data, datos.width, datos.height, { inversionAttempts: 'dontInvert' })
        if (qr?.data) {
          activo = false
          navigator.vibrate?.(60) // confirmación táctil en el mismo instante de la lectura
          setLeidoOk(true) // el marco se pone verde y aparece la palomita
          window.setTimeout(() => leido.current(qr.data), 450)
          return
        }
      }
      temporizador = window.setTimeout(leer, 140)
    }

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('sin-camara'); return }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!activo) { flujo.getTracks().forEach((t) => t.stop()); return }
        const v = video.current!
        v.srcObject = flujo
        await v.play()
        pista.current = flujo.getVideoTracks()[0] ?? null
        const capacidades = pista.current?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
        if (capacidades?.torch) setLinterna(false)
        setEstado('activa')
        leer()
      } catch (e) {
        const nombre = (e as DOMException)?.name
        setEstado(nombre === 'NotAllowedError' || nombre === 'SecurityError' ? 'sin-permiso'
          : nombre === 'NotFoundError' || nombre === 'OverconstrainedError' ? 'sin-camara' : 'error')
      }
    })()

    return () => {
      activo = false
      clearTimeout(temporizador)
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
          <div aria-hidden="true" className="absolute inset-[14%] rounded-[22px] shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]">
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
