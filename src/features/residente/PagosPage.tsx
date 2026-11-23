import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import Icon from '../../shared/ui/Icon'
import { Opciones, OpcionesMultiples } from '../../shared/ui/Opciones'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import { useAuth } from '../auth/AuthContext'
import type { Actor } from '../caseta/tipos'
import { prepararFoto } from '../caseta/fotos'
import { comunidadService } from '../comunidad/comunidadService'
import { COBRO, referenciaDe } from '../comunidad/config'
import { Comprobante, Cuota, EstadoComprobante, EstadoCuota, fechaLocal, METODOS, MetodoPago, nombrePeriodo, pesos } from '../comunidad/tipos'

const ESTADO_CUOTA: Record<EstadoCuota, { texto: string; clase: string }> = {
  PAGADO: { texto: 'Pagado', clase: 'bg-ok/[0.12] text-ok' },
  EN_REVISION: { texto: 'En revisión', clase: 'bg-acento/[0.1] text-acento' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-texto/[0.07] text-texto/75' },
  ATRASADO: { texto: 'Atrasado', clase: 'bg-peligro/[0.1] text-peligro' },
}
export const ESTADO_COMPROBANTE: Record<EstadoComprobante, { texto: string; clase: string }> = {
  EN_REVISION: { texto: 'En revisión', clase: 'bg-acento/[0.1] text-acento' },
  APROBADO: { texto: 'Aprobado', clase: 'bg-ok/[0.12] text-ok' },
  RECHAZADO: { texto: 'Rechazado', clase: 'bg-peligro/[0.1] text-peligro' },
}
const FORM = 'subir-comprobante'
const fecha = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const mes = (p: string) => nombrePeriodo(p).split(' ')[0]

type Vista = { modo: 'subir' } | { modo: 'ver'; comprobante: Comprobante } | null

export default function PagosPage() {
  const { user } = useAuth()
  const casa = user?.casa ?? ''
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'RESIDENTE', casa }), [user, casa])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState<Vista>(null)
  const [enviando, setEnviando] = useState(false)

  const recargar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([comunidadService.estadoDeCuenta(casa), comunidadService.misComprobantes(casa)])
      setCuotas(c); setComprobantes(p)
    } catch { toast.error('No se pudo cargar tu estado de cuenta') }
    finally { setCargando(false) }
  }, [casa])
  useEffect(() => { void recargar(); return comunidadService.suscribir(() => void recargar()) }, [recargar])
  const cerrar = () => setVista(null)
  useAtrasCierra(vista !== null, cerrar)

  const porPagar = cuotas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'ATRASADO')
  const atrasadas = cuotas.filter((c) => c.estado === 'ATRASADO')
  const enRevision = cuotas.filter((c) => c.estado === 'EN_REVISION')
  const adeudo = porPagar.reduce((s, c) => s + c.monto, 0)

  const subir = async (datos: Parameters<typeof comunidadService.subirComprobante>[0], imagen: Blob) => {
    setEnviando(true)
    try {
      await comunidadService.subirComprobante(datos, imagen, actor)
      navigator.vibrate?.(40)
      toast.success('Comprobante enviado', { description: 'Te avisaremos cuando la administración lo revise.' })
      setVista(null); void recargar()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo enviar el comprobante') }
    finally { setEnviando(false) }
  }

  return (
    <>
      <Encabezado titulo="Pagos" detalle={`${COBRO.concepto} · ${pesos(COBRO.cuotaMensual)} al mes`} />

      {/* Resumen */}
      <section className={`anim-entrar rounded-[24px] p-6 shadow-tarjeta ${adeudo > 0 ? (atrasadas.length ? 'bg-peligro/[0.06] ring-1 ring-inset ring-peligro/20' : 'bg-panel') : 'bg-panel'}`}>
        {cargando ? <div className="h-24 rounded-[14px] bg-fondo animate-pulse" /> : adeudo > 0 ? (
          <>
            <p className="text-[0.9375rem] font-medium text-suave">{atrasadas.length ? 'Tienes pagos atrasados' : 'Por pagar'}</p>
            <p className={`mt-1 text-[2.25rem] font-bold tracking-[-0.02em] cifras ${atrasadas.length ? 'text-peligro' : ''}`}>{pesos(adeudo)}</p>
            <p className="text-[0.9375rem] text-suave">{porPagar.map((c) => mes(c.periodo)).join(', ')} · vence el día {COBRO.diaVencimiento}</p>
            <button onClick={() => setVista({ modo: 'subir' })} className="btn-primario w-full mt-5"><Icon n="imagen" size={19} />Subir comprobante</button>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <span className="anim-pop grid place-items-center h-14 w-14 shrink-0 rounded-full bg-ok text-white"><Icon n="check" size={28} stroke={2.6} /></span>
            <div>
              <p className="text-[1.375rem] font-bold tracking-[-0.015em]">Estás al corriente</p>
              <p className="text-[0.9375rem] text-suave">{enRevision.length ? `${enRevision.length === 1 ? 'Un pago' : `${enRevision.length} pagos`} en revisión.` : '¡Gracias por tu pago puntual!'}</p>
            </div>
          </div>
        )}
      </section>

      {/* Datos para pagar */}
      <section aria-labelledby="t-datos" className="mt-8">
        <h2 id="t-datos" className="mb-3 text-[1.375rem] font-semibold tracking-[-0.015em]">Datos para transferir</h2>
        <dl className="anim-entrar rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador px-5" style={{ animationDelay: '60ms' }}>
          <Dato k="Banco" v={COBRO.banco} />
          <Dato k="CLABE" v={COBRO.clabe} copiar />
          <Dato k="Titular" v={COBRO.titular} />
          <Dato k="Referencia" v={referenciaDe(casa)} copiar nota="Escríbela en el concepto para identificar tu pago" />
        </dl>
      </section>

      {/* Estado de cuenta */}
      <section aria-labelledby="t-cuenta" className="mt-8">
        <h2 id="t-cuenta" className="mb-3 text-[1.375rem] font-semibold tracking-[-0.015em]">Estado de cuenta</h2>
        <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
          {cuotas.map((c, i) => (
            <li key={c.periodo} className="anim-entrar flex items-center gap-4 px-5 py-4" style={{ animationDelay: `${i * 35}ms` }}>
              <div className="min-w-0 flex-1">
                <p className="text-[1rem] font-semibold">{nombrePeriodo(c.periodo)}</p>
                <p className="text-[0.875rem] text-suave">Vence {fecha(c.vence)}</p>
              </div>
              <span className="text-[1rem] font-semibold cifras">{pesos(c.monto)}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${ESTADO_CUOTA[c.estado].clase}`}>{ESTADO_CUOTA[c.estado].texto}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Comprobantes enviados */}
      <section aria-labelledby="t-comp" className="mt-8">
        <h2 id="t-comp" className="mb-3 text-[1.375rem] font-semibold tracking-[-0.015em]">Mis comprobantes</h2>
        {comprobantes.length === 0 ? (
          <p className="rounded-[20px] bg-panel shadow-tarjeta px-5 py-8 text-center text-[0.9375rem] text-suave">Aún no has enviado comprobantes.</p>
        ) : (
          <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
            {comprobantes.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setVista({ modo: 'ver', comprobante: c })}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                  {c.imagen ? <img src={c.imagen} alt="" className="h-12 w-12 shrink-0 rounded-[10px] object-cover ring-1 ring-inset ring-black/[0.06]" />
                    : <span className="grid place-items-center h-12 w-12 shrink-0 rounded-[10px] bg-fondo text-texto/50"><Icon n="imagen" size={20} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1rem] font-semibold cifras">{pesos(c.monto)} · {c.periodos.map(mes).join(', ')}</span>
                    <span className="block text-[0.875rem] text-suave truncate">
                      {c.estado === 'RECHAZADO' && c.motivoRechazo ? c.motivoRechazo : `Enviado ${fecha(c.subidoEn)} · ${c.folio}`}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${ESTADO_COMPROBANTE[c.estado].clase}`}>{ESTADO_COMPROBANTE[c.estado].texto}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {vista?.modo === 'subir' && (
        <Hoja titulo="Subir comprobante" onCerrar={cerrar}
          pie={<button type="submit" form={FORM} disabled={enviando} className="btn-primario w-full">{enviando ? 'Enviando…' : 'Enviar a revisión'}</button>}>
          <FormComprobante porPagar={porPagar} onEnviar={subir} />
        </Hoja>
      )}
      {vista?.modo === 'ver' && <VerComprobante comprobante={vista.comprobante} onCerrar={cerrar} />}
    </>
  )
}

function Dato({ k, v, copiar, nota }: { k: string; v: string; copiar?: boolean; nota?: string }) {
  const pendiente = v.startsWith('[')
  const copiarTexto = async () => {
    try { await navigator.clipboard.writeText(v); toast.success(`${k} copiada`) } catch { toast.error('No se pudo copiar') }
  }
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-[0.8125rem] text-suave">{k}</dt>
        <dd className={`text-[1rem] font-semibold break-all cifras ${pendiente ? 'text-texto/40' : ''}`}>{v}</dd>
        {nota && <p className="text-[0.8125rem] text-suave">{nota}</p>}
      </div>
      {copiar && !pendiente && (
        <button type="button" onClick={copiarTexto} aria-label={`Copiar ${k}`} className="grid place-items-center h-11 w-11 shrink-0 rounded-full text-acento hover:bg-acento/[0.08] active:scale-95 transition-transform">
          <Icon n="copiar" size={19} />
        </button>
      )}
    </div>
  )
}

function FormComprobante({ porPagar, onEnviar }: {
  porPagar: Cuota[]
  onEnviar: (d: Parameters<typeof comunidadService.subirComprobante>[0], imagen: Blob) => Promise<void>
}) {
  const [periodos, setPeriodos] = useState<string[]>(() => porPagar.map((c) => c.periodo))
  const [metodo, setMetodo] = useState<MetodoPago | null>('TRANSFERENCIA')
  const [cuando, setCuando] = useState<'HOY' | 'AYER' | 'OTRO'>('HOY')
  const [otraFecha, setOtraFecha] = useState('')
  const [referencia, setReferencia] = useState('')
  const [imagen, setImagen] = useState<{ blob: Blob; url: string } | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const opciones = porPagar.map((c) => nombrePeriodo(c.periodo))
  const monto = periodos.length * COBRO.cuotaMensual
  useEffect(() => () => { if (imagen) URL.revokeObjectURL(imagen.url) }, [imagen])

  const elegirImagen = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setProcesando(true)
    try {
      // Se re-codifica (quita metadatos) y se reduce para que pese poco
      const blob = await prepararFoto(archivo, { ladoMax: 1200, calidad: 0.72 })
      setImagen({ blob, url: URL.createObjectURL(blob) })
    } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo usar la imagen') }
    finally { setProcesando(false) }
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const fechaPago = cuando === 'HOY' ? new Date() : cuando === 'AYER' ? new Date(Date.now() - 86_400_000) : otraFecha ? new Date(`${otraFecha}T12:00:00`) : null
    const falta = !periodos.length ? 'Elige qué meses pagas.' : !metodo ? 'Elige cómo pagaste.' : !fechaPago || isNaN(fechaPago.getTime()) || fechaPago.getTime() > Date.now() + 86_400_000 ? 'Revisa la fecha del pago.' : !imagen ? 'Agrega la foto o captura del comprobante.' : ''
    if (falta) { setError(falta); toast.error(falta); return }
    setError('')
    await onEnviar({ periodos, monto, metodo: metodo!, fechaPago: fechaPago!, referencia: referencia.trim().slice(0, 40) || undefined }, imagen!.blob)
  }

  if (!porPagar.length) return <p className="text-center text-[1rem] text-suave py-10">No tienes pagos pendientes.</p>

  return (
    <form id={FORM} onSubmit={enviar} noValidate className="space-y-8">
      <section className="anim-entrar">
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Qué meses pagas?</h3>
        <OpcionesMultiples etiqueta="Meses" opciones={opciones} valores={periodos.map(nombrePeriodo)}
          onCambio={(v) => setPeriodos(porPagar.filter((c) => v.includes(nombrePeriodo(c.periodo))).map((c) => c.periodo))} />
        <p className="mt-3 rounded-[14px] bg-fondo px-4 py-3 text-[1rem]">Total: <strong className="cifras">{pesos(monto)}</strong></p>
      </section>

      <section className="anim-entrar" style={{ animationDelay: '40ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Cómo pagaste?</h3>
        <Opciones etiqueta="Método" valor={metodo} opcional={false} onCambio={setMetodo} opciones={METODOS} />
      </section>

      <section className="anim-entrar" style={{ animationDelay: '80ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Cuándo?</h3>
        <Opciones etiqueta="Fecha" valor={cuando} opcional={false} onCambio={(v) => v && setCuando(v)} cuadricula="grid grid-cols-3 gap-2"
          opciones={[{ valor: 'HOY' as const, etiqueta: 'Hoy' }, { valor: 'AYER' as const, etiqueta: 'Ayer' }, { valor: 'OTRO' as const, etiqueta: 'Otro día' }]} />
        {cuando === 'OTRO' && (
          <input type="date" value={otraFecha} onChange={(e) => setOtraFecha(e.target.value)} max={fechaLocal()} aria-label="Fecha del pago"
            className="anim-llenar mt-3 block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none focus:ring-2 focus:ring-acento" />
        )}
      </section>

      <section className="anim-entrar" style={{ animationDelay: '120ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">Comprobante</h3>
        {imagen ? (
          <div className="relative overflow-hidden rounded-[18px] bg-texto/[0.04]">
            <img src={imagen.url} alt="Comprobante" className="anim-llenar max-h-[420px] w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 p-3 bg-gradient-to-t from-black/40 to-transparent">
              <label className="cursor-pointer inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/90 text-[#1D1D1F] text-[0.875rem] font-semibold backdrop-blur-md">
                <input type="file" accept="image/*" onChange={elegirImagen} className="sr-only" />Cambiar
              </label>
            </div>
          </div>
        ) : (
          <label className={`cursor-pointer flex flex-col items-center justify-center gap-3 rounded-[18px] py-10 border-2 border-dashed border-borde bg-fondo text-center transition-[transform,border-color] duration-150 active:scale-[0.98] hover:border-acento/50 focus-within:outline focus-within:outline-[3px] focus-within:outline-acento/55 ${procesando ? 'opacity-60' : ''}`}>
            <input type="file" accept="image/*" onChange={elegirImagen} className="sr-only" />
            <span className="grid place-items-center h-14 w-14 rounded-[18px] bg-panel text-texto/60 shadow-tarjeta"><Icon n="imagen" size={28} /></span>
            <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-acento text-acento-texto text-[0.9375rem] font-semibold">{procesando ? 'Procesando…' : 'Elegir captura o foto'}</span>
            <span className="px-6 text-[0.8125rem] text-suave">Captura de pantalla de tu app del banco o foto del ticket</span>
          </label>
        )}
      </section>

      <section className="anim-entrar" style={{ animationDelay: '160ms' }}>
        <label htmlFor="ref" className="mb-1.5 block text-[1.0625rem] font-semibold">Folio o clave de rastreo <span className="font-normal text-[0.9375rem] text-suave">(opcional)</span></label>
        <input id="ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={40} autoComplete="off" spellCheck={false}
          className="block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none focus:ring-2 focus:ring-acento" />
      </section>

      {error && <p role="alert" className="anim-sacudir rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] font-medium text-peligro">{error}</p>}
    </form>
  )
}

export function VerComprobante({ comprobante: c, onCerrar, acciones }: { comprobante: Comprobante; onCerrar: () => void; acciones?: React.ReactNode }) {
  const filas: [string, string][] = [
    ['Casa', c.casa],
    ['Meses', c.periodos.map(nombrePeriodo).join(', ')],
    ['Monto', pesos(c.monto)],
    ['Método', METODOS.find((m) => m.valor === c.metodo)?.etiqueta ?? c.metodo],
    ['Fecha de pago', c.fechaPago.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })],
    ...(c.referencia ? [['Folio / rastreo', c.referencia] as [string, string]] : []),
    ['Folio', c.folio],
    ['Enviado por', `${c.subidoPor.nombre} · ${c.subidoEn.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`],
    ...(c.revisadoPor && c.revisadoEn ? [[c.estado === 'APROBADO' ? 'Aprobó' : 'Rechazó', `${c.revisadoPor.nombre} · ${c.revisadoEn.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`] as [string, string]] : []),
  ]
  return (
    <Hoja titulo="Comprobante" onCerrar={onCerrar} pie={acciones}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[1.75rem] font-bold tracking-[-0.02em] cifras">{pesos(c.monto)}</p>
          <span className={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${ESTADO_COMPROBANTE[c.estado].clase}`}>{ESTADO_COMPROBANTE[c.estado].texto}</span>
        </div>
        {c.estado === 'RECHAZADO' && c.motivoRechazo && (
          <p className="rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] text-peligro"><strong>Motivo:</strong> {c.motivoRechazo}</p>
        )}
        {c.imagen && <img src={c.imagen} alt="Imagen del comprobante" className="anim-llenar mx-auto max-h-[60vh] rounded-[18px] object-contain shadow-tarjeta" />}
        <dl className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador px-5">
          {filas.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-[0.9375rem] text-suave shrink-0">{k}</dt>
              <dd className="text-[0.9375rem] font-medium text-right cifras">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Hoja>
  )
}
