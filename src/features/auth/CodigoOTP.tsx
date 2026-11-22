import { useEffect, useRef, useState } from 'react'

const LARGO = 6

/*
  Código de verificación en 6 cuadros separados.
  Hay un solo <input> real, invisible, encima de los cuadros: así funcionan el autocompletado
  del sistema (autocomplete="one-time-code" en iOS/Android y gestores de contraseñas),
  pegar el código completo y borrar con el teclado, sin saltar de un campo a otro.
  Los cuadros solo dibujan lo que hay en ese input.
*/
export default function CodigoOTP({ valor, onCambio, invalido, describe, deshabilitado }: {
  valor: string
  onCambio: (v: string) => void
  invalido?: boolean
  describe?: string
  deshabilitado?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [enfocado, setEnfocado] = useState(false)
  const cambio = useRef(onCambio)
  cambio.current = onCambio

  // Android/Chrome: si el código llega por SMS con el formato de Web OTP, se llena solo.
  useEffect(() => {
    if (!('OTPCredential' in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((c) => {
        const code = (c as unknown as { code?: string } | null)?.code
        if (code) cambio.current(code.replace(/\D/g, '').slice(0, LARGO))
      })
      .catch(() => { /* cancelado o no disponible */ })
    return () => ac.abort()
  }, [])

  // El cursor siempre al final: se escribe y se borra en orden
  const alFinal = () => {
    const el = ref.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }

  const activo = Math.min(valor.length, LARGO - 1)

  return (
    <div className="relative">
      <input
        ref={ref}
        id="codigo"
        className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-text text-[16px] caret-transparent"
        inputMode="numeric" pattern="[0-9]*" maxLength={LARGO}
        autoComplete="one-time-code" autoFocus required disabled={deshabilitado}
        aria-label="Código de verificación de 6 dígitos"
        aria-invalid={invalido} aria-describedby={describe}
        value={valor}
        onChange={(e) => onCambio(e.target.value.replace(/\D/g, '').slice(0, LARGO))}
        onFocus={() => { setEnfocado(true); requestAnimationFrame(alFinal) }}
        onBlur={() => setEnfocado(false)}
        onSelect={alFinal}
        onClick={alFinal}
      />
      <div aria-hidden="true" className="flex items-center justify-between gap-2 sm:gap-2.5">
        {Array.from({ length: LARGO }, (_, i) => {
          const digito = valor[i]
          const esActivo = enfocado && i === activo && !deshabilitado
          return (
            <div key={i} className="contents">
              {i === LARGO / 2 && <span className="w-2 h-[2px] shrink-0 rounded-full bg-borde" />}
              <span
                className={`relative grid place-items-center flex-1 max-w-[56px] aspect-[5/6] rounded-[14px]
                  text-[1.75rem] font-semibold cifras text-texto
                  ${invalido
                    ? 'bg-peligro/[0.05] ring-1 ring-inset ring-peligro/60'
                    : esActivo
                      ? 'bg-panel ring-[1.5px] ring-inset ring-acento'
                      : digito ? 'bg-panel ring-1 ring-inset ring-borde' : 'bg-fondo'}`}>
                {digito}
                {esActivo && !digito && (
                  <span className="absolute h-7 w-[2px] rounded-full bg-acento anim-parpadeo" />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
