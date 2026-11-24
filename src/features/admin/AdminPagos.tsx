import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Icon from '../../shared/ui/Icon'
import { Opciones } from '../../shared/ui/Opciones'
import { Paginacion, usePaginacion } from '../../shared/ui/Paginacion'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import TarjetaAvisos from '../../shared/avisos/TarjetaAvisos'
import { useAuth } from '../auth/AuthContext'
import type { Actor } from '../caseta/tipos'
import { comunidadService } from '../comunidad/comunidadService'
import { CobranzaCasa, Comprobante, EstadoComprobante, MOTIVOS_RECHAZO, nombrePeriodo, pesos } from '../comunidad/tipos'
import { ESTADO_COMPROBANTE, VerComprobante } from '../residente/PagosPage'

type Filtro = EstadoComprobante | 'CASAS'
const PESTANAS: [EstadoComprobante, string][] = [['EN_REVISION', 'Por revisar'], ['APROBADO', 'Aprobados'], ['RECHAZADO', 'Rechazados']]
const mes = (p: string) => nombrePeriodo(p).split(' ')[0]

/* Administración: revisa los comprobantes de pago que suben los residentes */
export default function AdminPagos() {
  const { user } = useAuth()
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'ADMIN' }), [user])
  const [lista, setLista] = useState<Comprobante[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(() => (new URLSearchParams(window.location.search).get('ver') === 'casas' ? 'CASAS' : 'EN_REVISION'))
  const [cobranza, setCobranza] = useState<CobranzaCasa[] | null>(null)
  const [abierto, setAbierto] = useState<Comprobante | null>(null)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([comunidadService.comprobantes(), comunidadService.resumenCobranza()])
      setLista(l); setCobranza(c)
    } catch { toast.error('No se pudieron cargar los pagos') }
  }, [])
  useEffect(() => { void cargar(); return comunidadService.suscribir(() => void cargar()) }, [cargar])

  const cerrar = () => { setAbierto(null); setRechazando(false); setMotivo(null) }
  useAtrasCierra(abierto !== null, cerrar)

  const revisar = async (aprobar: boolean) => {
    if (!abierto) return
    if (!aprobar && !motivo) { toast.error('Elige el motivo del rechazo'); return }
    setEnviando(true)
    try {
      await comunidadService.revisarComprobante(abierto.id, aprobar ? { aprobar: true } : { aprobar: false, motivo: motivo! }, actor)
      toast.success(aprobar ? 'Pago aprobado' : 'Comprobante rechazado', { description: `Se le avisó a ${abierto.casa}.` })
      cerrar(); void cargar()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar la revisión') }
    finally { setEnviando(false) }
  }

  const porEstado = (e: EstadoComprobante) => (lista ?? []).filter((c) => c.estado === e)
  const visibles = filtro === 'CASAS' ? [] : porEstado(filtro)
  const pendientes = porEstado('EN_REVISION')
  const pag = usePaginacion(visibles, 20, filtro)
  const totalPendiente = pendientes.reduce((s, c) => s + c.monto, 0)

  return (
    <>
      <Encabezado titulo="Pagos" detalle={lista === null ? 'Cargando…' : pendientes.length ? `${pendientes.length} comprobante${pendientes.length > 1 ? 's' : ''} por revisar · ${pesos(totalPendiente)}` : 'No hay comprobantes pendientes'} />
      <div className="mb-6"><TarjetaAvisos texto="Te avisamos en cuanto un residente suba un comprobante de pago." /></div>

      <div role="group" aria-label="Filtrar comprobantes" className="mb-4 flex gap-1 overflow-x-auto rounded-[12px] bg-texto/[0.06] p-1 [scrollbar-width:none] sm:inline-flex">
        {PESTANAS.map(([v, t]) => (
          <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}
            className={`flex-1 shrink-0 h-9 px-3 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
              ${filtro === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>
            {t} <span className={`cifras ${v === 'EN_REVISION' && pendientes.length ? 'text-acento font-semibold' : ''}`}>{porEstado(v).length}</span>
          </button>
        ))}
        <button aria-pressed={filtro === 'CASAS'} onClick={() => setFiltro('CASAS')}
          className={`flex-1 shrink-0 h-9 px-3 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
            ${filtro === 'CASAS' ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>Casas</button>
      </div>

      {filtro === 'CASAS' ? <TablaCobranza cobranza={cobranza} /> : (<>
      <div ref={pag.ancla} className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
        {lista === null ? <div className="h-40 animate-pulse" /> : visibles.length === 0 ? (
          <div key={filtro} className="anim-entrar px-6 py-12 text-center">
            <p className="text-[1.0625rem] font-semibold">{filtro === 'EN_REVISION' ? 'Todo revisado' : 'Sin comprobantes'}</p>
            <p className="mt-1 text-[0.9375rem] text-suave">{filtro === 'EN_REVISION' ? 'Cuando un residente suba un comprobante aparecerá aquí.' : 'Aquí verás el historial de revisiones.'}</p>
          </div>
        ) : (
          <ul key={`${filtro}-${pag.props.pagina}`} className="divide-y divide-separador">
            {pag.visibles.map((c, i) => (
              <li key={c.id} className="anim-entrar" style={{ animationDelay: `${Math.min(i * 35, 210)}ms` }}>
                <button type="button" onClick={() => setAbierto(c)}
                  className="flex w-full items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                  {c.imagen ? <img src={c.imagen} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-[12px] object-cover ring-1 ring-inset ring-black/[0.06]" />
                    : <span className="grid place-items-center h-14 w-14 shrink-0 rounded-[12px] bg-fondo text-texto/50"><Icon n="imagen" size={22} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1rem] font-semibold truncate">{c.casa}</span>
                    <span className="block text-[0.875rem] text-suave truncate">{c.periodos.map(mes).join(', ')} · {c.subidoPor.nombre}</span>
                    <span className="block text-[0.8125rem] text-suave truncate">
                      {c.estado === 'EN_REVISION' ? `Enviado ${c.subidoEn.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : `${c.estado === 'APROBADO' ? 'Aprobó' : 'Rechazó'} ${c.revisadoPor?.nombre ?? ''}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[1.0625rem] font-semibold cifras">{pesos(c.monto)}</span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${ESTADO_COMPROBANTE[c.estado].clase}`}>{ESTADO_COMPROBANTE[c.estado].texto}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Paginacion {...pag.props} nombre="comprobantes" />
      </>)}

      {abierto && (
        <VerComprobante comprobante={abierto} onCerrar={cerrar}
          acciones={abierto.estado !== 'EN_REVISION' ? undefined : rechazando ? (
            <div className="space-y-3">
              <p className="text-[0.9375rem] font-semibold">¿Por qué se rechaza?</p>
              <Opciones etiqueta="Motivo del rechazo" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS_RECHAZO.map((m) => ({ valor: m, etiqueta: m }))} />
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => { setRechazando(false); setMotivo(null) }} className="btn-secundario w-full">Volver</button>
                <button type="button" onClick={() => revisar(false)} disabled={enviando || !motivo} className="btn w-full bg-peligro text-white disabled:opacity-40">Rechazar</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setRechazando(true)} className="btn-secundario w-full text-peligro">Rechazar</button>
              <button type="button" onClick={() => revisar(true)} disabled={enviando} className="btn-primario w-full"><Icon n="check" size={18} stroke={2.4} />Aprobar</button>
            </div>
          )} />
      )}
    </>
  )
}

/* Cobranza por casa: quién debe, cuánto y desde cuándo. Ordenada por adeudo (lo urgente arriba). */
function TablaCobranza({ cobranza }: { cobranza: CobranzaCasa[] | null }) {
  const [soloDeudores, setSoloDeudores] = useState(true)
  const deudores = (cobranza ?? []).filter((c) => !c.alCorriente)
  const filas = (soloDeudores ? deudores : cobranza ?? []).slice().sort((a, b) => b.atrasados.length - a.atrasados.length || b.adeudo - a.adeudo || a.casa.localeCompare(b.casa))
  const pag = usePaginacion(filas, 20, soloDeudores)
  if (!cobranza) return <div className="h-40 rounded-[20px] bg-panel shadow-tarjeta animate-pulse" />
  return (
    <section aria-label="Cobranza por casa">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-suave"><strong className="text-texto cifras">{cobranza.length - deudores.length}</strong> de <span className="cifras">{cobranza.length}</span> casas sin atrasos</p>
        <label className="inline-flex items-center gap-2 min-h-11 text-[0.9375rem] cursor-pointer">
          <input type="checkbox" checked={soloDeudores} onChange={(e) => setSoloDeudores(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--acento))]" />
          Solo con atraso
        </label>
      </div>
      <div ref={pag.ancla} className="overflow-x-auto rounded-[20px] bg-panel shadow-tarjeta">
        <table className="w-full min-w-[480px] text-left text-[0.9375rem]">
          <thead className="text-[0.8125rem] text-suave">
            <tr className="border-b border-separador">
              <th scope="col" className="px-4 py-3 font-medium">Casa</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">Meses atrasados</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Por pagar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-separador">
            {filas.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-suave">Todas las casas están al corriente.</td></tr>
            ) : pag.visibles.map((c) => (
              <tr key={c.casa}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{c.casa}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap
                    ${c.atrasados.length >= 2 ? 'bg-peligro/[0.1] text-peligro' : c.atrasados.length ? 'bg-alerta/[0.12] text-alerta' : 'bg-ok/[0.12] text-ok'}`}>
                    <Icon n={c.atrasados.length ? 'alerta' : 'check'} size={13} stroke={2.4} />
                    {c.atrasados.length ? (c.atrasados.length >= 2 ? 'Atraso grave' : 'Atrasada') : 'Al corriente'}
                  </span>
                  {c.enRevision && <span className="ml-1.5 text-[0.8125rem] text-acento whitespace-nowrap">· pago en revisión</span>}
                </td>
                <td className="px-4 py-3 text-suave">{c.atrasados.length ? c.atrasados.map(mes).join(', ') : '—'}</td>
                <td className="px-4 py-3 text-right font-semibold cifras whitespace-nowrap">{c.adeudo ? pesos(c.adeudo) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion {...pag.props} nombre="casas" />
    </section>
  )
}
