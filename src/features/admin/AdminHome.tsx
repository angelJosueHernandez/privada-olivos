import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Encabezado from '../../shared/ui/Encabezado'
import Icon, { IconName } from '../../shared/ui/Icon'
import TarjetaAvisos from '../../shared/avisos/TarjetaAvisos'
import { casetaService } from '../caseta/casetaService'
import { Acceso, ETIQUETA_TIPO, TipoAcceso } from '../caseta/tipos'
import { comunidadService } from '../comunidad/comunidadService'
import { Anuncio, anuncioVigente, CobranzaCasa, Comprobante, pesos } from '../comunidad/tipos'

const hora = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const duracion = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60_000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }
const dentro = (a: Acceso) => !a.salida && a.paquete !== 'CASETA'
const enCaseta = (a: Acceso) => a.paquete === 'CASETA' && !a.entregado
const ICONO: Record<TipoAcceso, IconName> = { VISITA_QR: 'qr', PAQUETERIA: 'paquete', COMIDA: 'comida', SERVICIO: 'herramienta', VISITA_SIN_QR: 'visita' }

type Datos = { accesos: Acceso[]; comprobantes: Comprobante[]; cobranza: CobranzaCasa[]; anuncios: Anuncio[] }

/* Panel de la administración: lo que pasa hoy en la privada, la cobranza y lo que requiere atención */
export default function AdminHome() {
  const [d, setD] = useState<Datos | null>(null)
  const [ahora, setAhora] = useState(() => new Date())

  const cargar = useCallback(async () => {
    try {
      const [accesos, comprobantes, cobranza, anuncios] = await Promise.all([
        casetaService.listarHoy(), comunidadService.comprobantes(), comunidadService.resumenCobranza(), comunidadService.anuncios(),
      ])
      setD({ accesos, comprobantes, cobranza, anuncios })
    } catch { /* se reintenta con la siguiente actualización */ }
  }, [])
  useEffect(() => {
    void cargar()
    const a = casetaService.suscribir(() => void cargar())
    const b = comunidadService.suscribir(() => void cargar())
    const t = setInterval(() => setAhora(new Date()), 60_000)
    return () => { a(); b(); clearInterval(t) }
  }, [cargar])

  const fecha = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  if (!d) return (
    <>
      <Encabezado titulo="Resumen" detalle={fecha} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-[20px] bg-panel shadow-tarjeta animate-pulse" />)}</div>
    </>
  )

  const adentro = d.accesos.filter(dentro)
  const caseta = d.accesos.filter(enCaseta)
  const porRevisar = d.comprobantes.filter((c) => c.estado === 'EN_REVISION')
  const alCorriente = d.cobranza.filter((c) => c.alCorriente).length
  const adeudoTotal = d.cobranza.reduce((s, c) => s + c.adeudo, 0)
  const pct = d.cobranza.length ? Math.round((alCorriente / d.cobranza.length) * 100) : 0
  const anunciosActivos = d.anuncios.filter((a) => anuncioVigente(a)).length

  // Lo que requiere atención
  const alertas: { icono: IconName; texto: string; detalle: string; a: string; tono: string }[] = [
    ...adentro.filter((a) => ahora.getTime() - a.entrada.getTime() > 2 * 3600_000).map((a) => ({ icono: 'reloj' as IconName, texto: `${a.nombre} lleva ${duracion(ahora.getTime() - a.entrada.getTime())} dentro`, detalle: `${a.casa} · entró ${hora(a.entrada)}`, a: '/admin/accesos', tono: 'bg-peligro/[0.1] text-peligro' })),
    ...caseta.filter((a) => ahora.getTime() - a.entrada.getTime() > 4 * 3600_000).map((a) => ({ icono: 'paquete' as IconName, texto: `Paquete de ${a.nombre} sin recoger`, detalle: `${a.casa} · en caseta desde ${hora(a.entrada)}`, a: '/admin/accesos', tono: 'bg-alerta/[0.12] text-alerta' })),
    ...(porRevisar.length ? [{ icono: 'pagos' as IconName, texto: `${porRevisar.length} comprobante${porRevisar.length > 1 ? 's' : ''} por revisar`, detalle: `${pesos(porRevisar.reduce((s, c) => s + c.monto, 0))} en total`, a: '/admin/pagos', tono: 'bg-acento/[0.1] text-acento' }] : []),
  ]

  // Últimos movimientos (entradas y salidas)
  const movimientos = d.accesos.flatMap((a) => [
    { id: `${a.id}-e`, cuando: a.entrada, texto: `${a.nombre} entró`, detalle: `${a.casa} · ${ETIQUETA_TIPO[a.tipo]}`, icono: ICONO[a.tipo] },
    ...(a.salida ? [{ id: `${a.id}-s`, cuando: a.salida, texto: `${a.nombre} salió`, detalle: a.casa, icono: 'salir' as IconName }] : []),
  ]).sort((x, y) => y.cuando.getTime() - x.cuando.getTime()).slice(0, 6)

  return (
    <>
      <Encabezado titulo="Resumen" detalle={fecha.charAt(0).toUpperCase() + fecha.slice(1)} />
      <div className="mb-6"><TarjetaAvisos texto="Te avisamos en cuanto un residente suba un comprobante de pago." /></div>

      {/* Indicadores del momento */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Indicador a="/admin/accesos" icono="visita" etiqueta="Dentro ahora" valor={adentro.length} retraso={0} />
        <Indicador a="/admin/accesos" icono="entrada" etiqueta="Entradas hoy" valor={d.accesos.length} retraso={40} />
        <Indicador a="/admin/accesos" icono="paquete" etiqueta="Paquetes en caseta" valor={caseta.length} retraso={80} />
        <Indicador a="/admin/pagos" icono="pagos" etiqueta="Pagos por revisar" valor={porRevisar.length} retraso={120} resaltar={porRevisar.length > 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Cobranza */}
        <section aria-labelledby="t-cobranza" className="anim-entrar rounded-[22px] bg-panel p-5 shadow-tarjeta" style={{ animationDelay: '80ms' }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="t-cobranza" className="text-[1.0625rem] font-semibold">Cobranza</h2>
            <Link to="/admin/pagos?ver=casas" className="text-[0.9375rem] font-medium text-acento min-h-11 inline-flex items-center">Ver casas</Link>
          </div>
          <p className="mt-1 text-[2.5rem] font-bold leading-none tracking-[-0.02em] cifras">{pct}%</p>
          <p className="mt-1 text-[0.9375rem] text-suave">casas sin atrasos · <span className="cifras">{alCorriente} de {d.cobranza.length}</span></p>
          <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Casas sin atrasos"
            className="mt-4 h-2.5 rounded-full bg-texto/[0.08] overflow-hidden">
            <div className="anim-llenar h-full rounded-full bg-acento" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[14px] bg-fondo px-4 py-3">
              <dt className="text-[0.8125rem] text-suave">Por cobrar</dt>
              <dd className="text-[1.25rem] font-semibold cifras">{pesos(adeudoTotal)}</dd>
            </div>
            <div className="rounded-[14px] bg-fondo px-4 py-3">
              <dt className="text-[0.8125rem] text-suave">Con atraso</dt>
              <dd className="text-[1.25rem] font-semibold cifras">{d.cobranza.length - alCorriente} casas</dd>
            </div>
          </dl>
        </section>

        {/* Atención */}
        <section aria-labelledby="t-atencion" className="anim-entrar rounded-[22px] bg-panel p-5 shadow-tarjeta" style={{ animationDelay: '120ms' }}>
          <h2 id="t-atencion" className="text-[1.0625rem] font-semibold">Requiere atención</h2>
          {alertas.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-suave"><Icon n="check" size={18} stroke={2.4} />Todo en orden.</p>
          ) : (
            <ul className="mt-2 divide-y divide-separador">
              {alertas.slice(0, 5).map((x, i) => (
                <li key={i}>
                  <Link to={x.a} className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-[12px] hover:bg-texto/[0.03]">
                    <span className={`grid place-items-center h-9 w-9 shrink-0 rounded-[11px] ${x.tono}`}><Icon n={x.icono} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] font-semibold truncate">{x.texto}</span>
                      <span className="block text-[0.8125rem] text-suave truncate">{x.detalle}</span>
                    </span>
                    <span className="rotate-180 text-texto/30"><Icon n="atras" size={16} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Entradas por hora */}
        <section aria-labelledby="t-horas" className="anim-entrar rounded-[22px] bg-panel p-5 shadow-tarjeta" style={{ animationDelay: '160ms' }}>
          <h2 id="t-horas" className="text-[1.0625rem] font-semibold">Entradas por hora</h2>
          <p className="text-[0.875rem] text-suave">Hoy, de 6:00 a 22:00</p>
          <BarrasPorHora accesos={d.accesos} />
        </section>

        {/* Por tipo */}
        <section aria-labelledby="t-tipos" className="anim-entrar rounded-[22px] bg-panel p-5 shadow-tarjeta" style={{ animationDelay: '200ms' }}>
          <h2 id="t-tipos" className="text-[1.0625rem] font-semibold">Entradas por tipo</h2>
          <p className="text-[0.875rem] text-suave">Hoy</p>
          <BarrasPorTipo accesos={d.accesos} />
        </section>

        {/* Últimos movimientos */}
        <section aria-labelledby="t-mov" className="anim-entrar rounded-[22px] bg-panel p-5 shadow-tarjeta lg:col-span-2" style={{ animationDelay: '240ms' }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="t-mov" className="text-[1.0625rem] font-semibold">Últimos movimientos</h2>
            <Link to="/admin/accesos" className="text-[0.9375rem] font-medium text-acento min-h-11 inline-flex items-center">Ver bitácora</Link>
          </div>
          {movimientos.length === 0 ? <p className="mt-2 text-[0.9375rem] text-suave">Sin movimientos hoy.</p> : (
            <ul className="mt-1 divide-y divide-separador">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="grid place-items-center h-9 w-9 shrink-0 rounded-[11px] bg-fondo text-texto/70"><Icon n={m.icono} size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-semibold truncate">{m.texto}</span>
                    <span className="block text-[0.8125rem] text-suave truncate">{m.detalle}</span>
                  </span>
                  <span className="text-[0.875rem] text-suave cifras">{hora(m.cuando)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Link to="/admin/anuncios" className="anim-entrar mt-6 flex items-center gap-4 rounded-[22px] bg-panel p-5 shadow-tarjeta transition-transform duration-150 active:scale-[0.99]" style={{ animationDelay: '280ms' }}>
        <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-acento/[0.1] text-acento"><Icon n="megafono" size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-semibold">Anuncios</span>
          <span className="block text-[0.9375rem] text-suave"><span className="cifras">{anunciosActivos}</span> visibles para los residentes</span>
        </span>
        <span className="rotate-180 text-texto/30"><Icon n="atras" size={18} /></span>
      </Link>
    </>
  )
}

function Indicador({ a, icono, etiqueta, valor, retraso, resaltar }: { a: string; icono: IconName; etiqueta: string; valor: number; retraso: number; resaltar?: boolean }) {
  return (
    <Link to={a} style={{ animationDelay: `${retraso}ms` }}
      className={`anim-entrar flex flex-col gap-2 rounded-[20px] p-4 shadow-tarjeta transition-transform duration-150 active:scale-[0.98] ${resaltar ? 'bg-acento text-acento-texto' : 'bg-panel'}`}>
      <span className={`grid place-items-center h-9 w-9 rounded-[11px] ${resaltar ? 'bg-white/15' : 'bg-fondo text-texto/70'}`}><Icon n={icono} size={19} /></span>
      <span className="text-[2rem] font-bold leading-none tracking-[-0.02em] cifras">{valor}</span>
      <span className={`text-[0.875rem] font-medium ${resaltar ? 'opacity-90' : 'text-suave'}`}>{etiqueta}</span>
    </Link>
  )
}

/* Columnas por hora (una sola serie: un solo color). Toque o cursor muestra el valor exacto. */
function BarrasPorHora({ accesos }: { accesos: Acceso[] }) {
  const horas = Array.from({ length: 17 }, (_, i) => i + 6)
  const conteo = horas.map((h) => accesos.filter((a) => a.entrada.getHours() === h).length)
  const max = Math.max(1, ...conteo)
  const [activa, setActiva] = useState<number | null>(null)
  const pico = conteo.indexOf(Math.max(...conteo))
  return (
    <div className="mt-4">
      <div className="relative h-40" onPointerLeave={() => setActiva(null)}>
        {/* Línea base y línea del máximo (recesivas) */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-separador" />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-separador/60" />
        <span aria-hidden="true" className="absolute -top-2 right-0 bg-panel pl-1 text-[0.6875rem] text-suave cifras">{max}</span>
        <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden="true">
          {conteo.map((n, i) => (
            <button key={horas[i]} type="button" tabIndex={-1} onPointerEnter={() => setActiva(i)} onClick={() => setActiva(i)}
              className="relative flex h-full flex-1 items-end justify-center">
              <span className={`w-full max-w-[24px] rounded-t-[4px] transition-[opacity] duration-150 ${n ? 'bg-acento' : ''} ${activa !== null && activa !== i ? 'opacity-40' : ''}`}
                style={{ height: n ? `${Math.max(4, (n / max) * 100)}%` : 0 }} />
            </button>
          ))}
        </div>
        {activa !== null && (
          <div role="status" className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-texto px-2.5 py-1 text-[0.8125rem] font-medium text-white shadow-lg cifras"
            style={{ left: `${((activa + 0.5) / horas.length) * 100}%` }}>
            {horas[activa]}:00 · {conteo[activa]} entrada{conteo[activa] === 1 ? '' : 's'}
          </div>
        )}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex text-[0.6875rem] text-suave cifras">
        {horas.map((h) => <span key={h} className="flex-1 text-center">{h % 4 === 2 ? h : ''}</span>)}
      </div>
      {conteo[pico] > 0 && <p className="mt-2 text-[0.875rem] text-suave">Hora con más entradas: <strong className="text-texto cifras">{horas[pico]}:00</strong></p>}
      {/* Tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>Entradas por hora de hoy</caption>
        <thead><tr><th scope="col">Hora</th><th scope="col">Entradas</th></tr></thead>
        <tbody>{horas.map((h, i) => <tr key={h}><td>{h}:00</td><td>{conteo[i]}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

/* Barras horizontales por tipo: la etiqueta nombra la categoría (no el color) */
function BarrasPorTipo({ accesos }: { accesos: Acceso[] }) {
  const tipos = (Object.keys(ETIQUETA_TIPO) as TipoAcceso[])
    .map((t) => ({ t, n: accesos.filter((a) => a.tipo === t).length }))
    .sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...tipos.map((x) => x.n))
  return (
    <ul className="mt-4 space-y-3">
      {tipos.map(({ t, n }) => (
        <li key={t} className="grid grid-cols-[minmax(0,9.5rem)_1fr_2rem] items-center gap-3">
          <span className="flex items-center gap-2 text-[0.9375rem] truncate"><Icon n={ICONO[t]} size={16} />{ETIQUETA_TIPO[t]}</span>
          <span className="h-3 rounded-full bg-texto/[0.05]">
            <span className="anim-llenar block h-full rounded-[4px] bg-acento" style={{ width: n ? `${Math.max(4, (n / max) * 100)}%` : 0 }} />
          </span>
          <span className="text-right text-[0.9375rem] font-semibold cifras">{n}</span>
        </li>
      ))}
    </ul>
  )
}
