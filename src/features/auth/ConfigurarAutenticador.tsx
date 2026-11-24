import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Icon from '../../shared/ui/Icon'
import CodigoOTP from './CodigoOTP'
import { secretoLegible } from './totp'

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const esTactil = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/*
  Configura Google Authenticator, las Contraseñas de iPhone u otra app TOTP:
  1) agregar la cuenta (botón que abre la app en el celular, QR para escanear o clave manual)
  2) confirmar con el primer código de 6 dígitos.
*/
export default function ConfigurarAutenticador({ iniciar, onCodigo }: {
  iniciar: () => Promise<{ secreto: string; uri: string }>
  /** Verifica y activa; lanza error si el código no coincide */
  onCodigo: (codigo: string) => Promise<void>
}) {
  const [datos, setDatos] = useState<{ secreto: string; uri: string; qr: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [manual, setManual] = useState(false)
  const iniciarRef = useRef(iniciar)
  const tactil = esTactil()
  const ios = esIOS()

  useEffect(() => {
    let vivo = true
    iniciarRef.current()
      .then(async (d) => {
        const qr = await QRCode.toDataURL(d.uri, { margin: 1, width: 440, errorCorrectionLevel: 'M', color: { dark: '#1D1D1F', light: '#FFFFFF' } })
        if (vivo) setDatos({ ...d, qr })
      })
      .catch(() => { if (vivo) setError('No se pudo preparar la configuración. Intenta de nuevo.') })
    return () => { vivo = false }
  }, [])

  const verificar = async (c: string) => {
    setCargando(true); setError('')
    try { await onCodigo(c) }
    catch (e) { setError(e instanceof Error ? e.message : 'El código no coincide.'); setCodigo('') }
    finally { setCargando(false) }
  }
  const cambiar = (v: string) => {
    if (cargando) return
    setCodigo(v)
    if (error) setError('')
    if (v.length === 6) void verificar(v)
  }
  const copiar = async () => {
    if (!datos) return
    try { await navigator.clipboard.writeText(datos.secreto); toast.success('Clave copiada', { description: 'Pégala en tu app autenticadora.' }) }
    catch { setManual(true) }
  }

  const paso = (n: number, titulo: string, detalle?: string) => (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-acento text-acento-texto text-[0.875rem] font-semibold cifras">{n}</span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[1rem] font-semibold leading-snug">{titulo}</p>
        {detalle && <p className="mt-0.5 text-[0.875rem] text-suave text-pretty">{detalle}</p>}
      </div>
    </div>
  )

  if (!datos) {
    return error
      ? <p role="alert" className="rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] font-medium text-peligro">{error}</p>
      : <div className="h-72 rounded-[20px] bg-fondo animate-pulse" aria-busy="true" aria-label="Preparando" />
  }

  const qr = (
    <div className="flex flex-col items-center">
      <img src={datos.qr} alt="Código QR para agregar la cuenta a tu app autenticadora" width={220} height={220}
        className="h-[220px] w-[220px] rounded-[16px] bg-white p-2 ring-1 ring-borde" />
      {!tactil && <p className="mt-2 text-[0.8125rem] text-suave text-center">Escanéalo con la cámara de tu celular o desde la app.</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {paso(1, 'Agrega tu cuenta a una app autenticadora',
        ios ? 'Funciona con las Contraseñas de iPhone (código de verificación) o Google Authenticator.' : 'Funciona con Google Authenticator, Microsoft Authenticator o las Contraseñas de iPhone.')}

      {tactil ? (
        <div className="space-y-3 pl-10">
          {/* En el celular la cámara no puede escanear su propia pantalla: se abre la app con el enlace */}
          <a href={datos.uri} className="btn-primario w-full"><Icon n="candado" size={19} />{ios ? 'Agregar a Contraseñas o Authenticator' : 'Abrir app autenticadora'}</a>
          <button type="button" onClick={() => setManual(!manual)} aria-expanded={manual} className="w-full min-h-11 text-[0.9375rem] font-medium text-acento">
            {manual ? 'Ocultar clave y QR' : '¿No se abrió? Escribe la clave a mano'}
          </button>
        </div>
      ) : <div className="pl-10">{qr}</div>}

      {(manual || !tactil) && (
        <div className={`anim-llenar ${tactil ? '' : 'pl-10'} space-y-4`}>
          {tactil && qr}
          <div className="rounded-[16px] bg-fondo p-4">
            <p className="text-[0.8125rem] font-medium text-suave">Clave para escribir a mano · tipo “basada en tiempo”</p>
            <p className="mt-1.5 select-all break-all font-mono text-[1.0625rem] font-semibold tracking-[0.04em]">{secretoLegible(datos.secreto)}</p>
            <button type="button" onClick={copiar} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-acento"><Icon n="copiar" size={16} />Copiar clave</button>
          </div>
        </div>
      )}

      {paso(2, 'Escribe el código que aparece en la app', 'Son 6 dígitos y cambian cada 30 segundos.')}
      <div className="pl-10">
        <CodigoOTP valor={codigo} onCambio={cambiar} invalido={!!error || undefined} describe={error ? 'error-2fa' : undefined} deshabilitado={cargando} autoFoco={false} />
        {error && <p id="error-2fa" role="alert" className="mt-3 flex items-start gap-2 text-[0.9375rem] text-peligro"><span className="mt-0.5 shrink-0"><Icon n="alerta" size={18} /></span>{error}</p>}
        {cargando && <p className="mt-3 text-[0.9375rem] text-suave" aria-live="polite">Verificando…</p>}
      </div>
    </div>
  )
}
