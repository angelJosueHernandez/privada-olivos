import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import Icon from '../../shared/ui/Icon'
import type { PaseResidente } from '../caseta/tipos'

/*
  El pase con su código QR, listo para compartir.
  El QR solo contiene el código (OLV-XXXX-XX): sin nombre, casa ni placas. Si alguien le toma foto,
  no obtiene datos personales; y si el residente lo cancela, el código deja de servir en la caseta.
*/
export const ESTADO_PASE: Record<PaseResidente['estado'], { texto: string; clase: string }> = {
  VALIDO: { texto: 'Activo', clase: 'bg-ok/[0.12] text-ok' },
  USADO: { texto: 'Ya se usó', clase: 'bg-texto/[0.07] text-texto/70' },
  VENCIDO: { texto: 'Vencido', clase: 'bg-texto/[0.07] text-texto/70' },
  REVOCADO: { texto: 'Cancelado', clase: 'bg-peligro/[0.1] text-peligro' },
  FUERA_DE_HORARIO: { texto: 'Fuera de horario', clase: 'bg-alerta/[0.12] text-alerta' },
}

const OPCIONES_QR = { margin: 1, errorCorrectionLevel: 'M' as const, color: { dark: '#1D1D1F', light: '#FFFFFF' } }

const mensaje = (p: PaseResidente) =>
  `Hola ${p.visitante.split(' ')[0]}, este es tu pase para entrar a la privada.\n` +
  `Vigencia: ${p.vigencia}${p.personas > 1 ? ` · ${p.personas} personas` : ''}\n` +
  `Muestra el código QR en la caseta. Código: ${p.codigo}`

/** Imagen del pase (tarjeta con QR) para mandarla por WhatsApp como foto */
async function imagenDelPase(p: PaseResidente): Promise<File> {
  const W = 1080, H = 1440
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#F5F5F7'; x.fillRect(0, 0, W, H)
  x.fillStyle = '#FFFFFF'; x.beginPath(); x.roundRect(60, 60, W - 120, H - 120, 56); x.fill()
  const fuente = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  x.textAlign = 'center'
  x.fillStyle = '#6E6E73'; x.font = `600 40px ${fuente}`; x.fillText('PASE DE VISITA', W / 2, 190)
  x.fillStyle = '#1D1D1F'; x.font = `700 72px ${fuente}`; x.fillText(p.visitante.slice(0, 26), W / 2, 290)
  x.fillStyle = '#3A3A3C'; x.font = `500 46px ${fuente}`; x.fillText(p.vigencia, W / 2, 365)
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, p.codigo, { ...OPCIONES_QR, width: 720 })
  x.drawImage(qr, (W - 720) / 2, 430, 720, 720)
  x.fillStyle = '#1D1D1F'; x.font = `700 64px ui-monospace, Menlo, Consolas, monospace`; x.fillText(p.codigo, W / 2, 1250)
  x.fillStyle = '#6E6E73'; x.font = `500 36px ${fuente}`; x.fillText('Muestra este código en la caseta', W / 2, 1315)
  const blob = await new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'))
  return new File([blob], `pase-${p.codigo}.png`, { type: 'image/png' })
}

export default function PaseQR({ pase: p, onCancelar }: { pase: PaseResidente; onCancelar?: () => Promise<void> }) {
  const [qr, setQr] = useState<string>('')
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const activo = p.estado === 'VALIDO'

  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(p.codigo, { ...OPCIONES_QR, width: 600 }).then((u) => vivo && setQr(u)).catch(() => setQr(''))
    return () => { vivo = false }
  }, [p.codigo])

  const compartir = async () => {
    try {
      const archivo = await imagenDelPase(p)
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: mensaje(p), title: 'Pase de visita' })
        return
      }
      if (navigator.share) { await navigator.share({ text: mensaje(p), title: 'Pase de visita' }); return }
      porWhatsApp()
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return // el usuario cerró el menú de compartir
      porWhatsApp()
    }
  }
  const porWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(mensaje(p))}`, '_blank', 'noopener,noreferrer')
  const copiar = async () => {
    try { await navigator.clipboard.writeText(p.codigo); toast.success('Código copiado') }
    catch { toast.error('No se pudo copiar') }
  }

  return (
    <div className="space-y-5">
      <div className="anim-entrar rounded-[28px] bg-panel shadow-tarjeta px-6 pt-6 pb-7 text-center">
        <span className={`inline-block rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${ESTADO_PASE[p.estado].clase}`}>{ESTADO_PASE[p.estado].texto}</span>
        <p className="mt-3 text-[1.5rem] font-bold tracking-[-0.02em] leading-tight">{p.visitante}</p>
        <p className="mt-1 text-[1rem] text-suave">{p.vigencia}</p>

        <div className={`relative mx-auto mt-5 w-full max-w-[280px] aspect-square rounded-[20px] bg-white p-3 ring-1 ring-inset ring-black/[0.06] ${activo ? '' : 'opacity-35 grayscale'}`}>
          {qr ? <img src={qr} alt={`Código QR del pase ${p.codigo}`} className="anim-llenar h-full w-full [image-rendering:pixelated]" />
            : <span className="block h-full w-full rounded-[12px] bg-fondo animate-pulse" />}
        </div>
        <p className="mt-4 font-mono text-[1.375rem] font-bold tracking-[0.08em] cifras">{p.codigo}</p>
        {!activo && <p className="mt-1 text-[0.9375rem] text-suave">Este código ya no sirve para entrar.</p>}
      </div>

      {activo && (
        <div className="anim-entrar grid gap-2.5" style={{ animationDelay: '60ms' }}>
          <button type="button" onClick={compartir} className="btn-primario w-full"><Icon n="compartir" size={19} />Compartir pase</button>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={porWhatsApp} className="btn-secundario w-full">WhatsApp</button>
            <button type="button" onClick={copiar} className="btn-secundario w-full"><Icon n="copiar" size={18} />Copiar</button>
          </div>
        </div>
      )}

      <dl className="anim-entrar rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador px-5" style={{ animationDelay: '100ms' }}>
        {[
          ['Casa', p.casa],
          ['Motivo', p.motivo ?? '—'],
          ['Personas', String(p.personas)],
          ['Placas', p.placas ?? 'Sin vehículo'],
          ['Folio', p.folio],
          ['Creado', p.creadoEn.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })],
          ...(p.usadoEn ? [['Se usó', p.usadoEn.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-[0.9375rem] text-suave">{k}</dt>
            <dd className="text-[0.9375rem] font-medium text-right cifras">{v}</dd>
          </div>
        ))}
      </dl>

      {activo && onCancelar && (
        confirmando ? (
          <div role="alertdialog" aria-label="Confirmar cancelación" className="anim-llenar rounded-[20px] bg-peligro/[0.06] p-4 ring-1 ring-inset ring-peligro/20">
            <p className="text-[0.9375rem] font-semibold">¿Cancelar este pase?</p>
            <p className="mt-0.5 text-[0.875rem] text-suave">El código dejará de funcionar en la caseta de inmediato.</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConfirmando(false)} className="btn-secundario w-full">No</button>
              <button type="button" disabled={cancelando} className="btn w-full bg-peligro text-white"
                onClick={async () => { setCancelando(true); try { await onCancelar() } finally { setCancelando(false); setConfirmando(false) } }}>
                {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="btn-secundario w-full text-peligro">
            <Icon n="cerrar" size={18} />Cancelar pase
          </button>
        )
      )}
    </div>
  )
}
