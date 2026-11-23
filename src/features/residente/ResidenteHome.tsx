import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import Icon, { IconName } from '../../shared/ui/Icon'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import TarjetaAvisos from '../../shared/avisos/TarjetaAvisos'
import { casetaService } from '../caseta/casetaService'
import DetalleAcceso from '../caseta/DetalleAcceso'
import LogoEmpresa, { tieneInsignia } from '../caseta/LogoEmpresa'
import { BotonCampana, Evento, PanelNotificaciones, TipoEvento } from '../caseta/Notificaciones'
import { Acceso, Actor, Aviso, ETIQUETA_TIPO, NuevoPase, PaseResidente, TipoAcceso, TipoAviso } from '../caseta/tipos'
import { useAvisos } from '../caseta/useAvisos'
import CrearPase from './CrearPase'
import { comunidadService } from '../comunidad/comunidadService'
import { leerVisto } from '../comunidad/ListaAnuncios'
import { Anuncio, Cuota, pesos } from '../comunidad/tipos'
import PaseQR, { ESTADO_PASE } from './PaseQR'

type Vista =
  | { modo: 'crear' }
  | { modo: 'pase'; pase: PaseResidente; recien?: boolean }
  | { modo: 'avisos' }
  | { modo: 'detalle'; acceso: Acceso }
  | null

const FORM_PASE = 'crear-pase'
const ICONO_TIPO: Record<TipoAcceso, IconName> = { VISITA_QR: 'qr', PAQUETERIA: 'paquete', COMIDA: 'comida', SERVICIO: 'herramienta', VISITA_SIN_QR: 'visita' }
const EVENTO_DE: Record<TipoAviso, TipoEvento> = { llegada: 'entrada', camino: 'entrada', paquete: 'paquete', entrega: 'entrega', salida: 'salida', pase: 'pase', anuncio: 'anuncio', pago: 'pago' }
const hora = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function estadoAcceso(a: Acceso): { texto: string; clase: string } {
  if (a.paquete === 'CASETA' && !a.entregado) return { texto: 'En caseta', clase: 'bg-alerta/[0.12] text-alerta' }
  if (a.entregado) return { texto: `Entregado ${hora(a.entregado)}`, clase: 'bg-ok/[0.12] text-ok' }
  if (a.salida) return { texto: `Salió ${hora(a.salida)}`, clase: 'bg-texto/[0.07] text-texto/70' }
  return { texto: 'Dentro', clase: 'bg-acento/[0.1] text-acento' }
}

function Titulo({ children, extra }: { children: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[1.375rem] font-semibold tracking-[-0.015em]">{children}</h2>
      {extra}
    </div>
  )
}

export default function ResidenteHome() {
  const { user } = useAuth()
  const casa = user?.casa ?? ''
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'RESIDENTE', casa }), [user, casa])
  const [vista, setVista] = useState<Vista>(null)
  const [pases, setPases] = useState<PaseResidente[]>([])
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [verAnteriores, setVerAnteriores] = useState(false)
  const { avisos, sinLeer, marcarLeidos } = useAvisos(casa || undefined, '/residente', false)

  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const cargarComunidad = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([comunidadService.estadoDeCuenta(casa), comunidadService.anuncios(casa)])
      setCuotas(c); setAnuncios(a)
    } catch { /* el resumen es secundario */ }
  }, [casa])
  useEffect(() => { void cargarComunidad(); return comunidadService.suscribir(() => void cargarComunidad()) }, [cargarComunidad])

  const recargar = useCallback(async () => {
    if (!casa) return
    try {
      const [p, a] = await Promise.all([casetaService.misPases(casa), casetaService.actividadCasa(casa)])
      setPases(p); setAccesos(a)
      // Si hay un pase abierto, se actualiza su estado (p. ej. el guardia lo acaba de usar)
      setVista((v) => (v?.modo === 'pase' ? { ...v, pase: p.find((x) => x.id === v.pase.id) ?? v.pase } : v))
    } catch { toast.error('No se pudo cargar tu información', { description: 'Revisa la conexión.' }) }
    finally { setCargando(false) }
  }, [casa])
  useEffect(() => { void recargar(); return casetaService.suscribir(() => void recargar()) }, [recargar])

  const cerrar = () => setVista(null)
  useAtrasCierra(vista !== null, cerrar)

  const crear = async (datos: NuevoPase) => {
    setCreando(true)
    try {
      const pase = await casetaService.crearPase(datos, actor)
      navigator.vibrate?.(40)
      toast.success('Pase creado', { description: 'Compártelo con tu visita.' })
      setVista({ modo: 'pase', pase, recien: true })
      void recargar()
    } catch { toast.error('No se pudo crear el pase', { description: 'Intenta de nuevo.' }) }
    finally { setCreando(false) }
  }
  const cancelar = async (p: PaseResidente) => {
    try {
      await casetaService.cancelarPase(p.id, actor)
      toast.success('Pase cancelado', { description: 'El código ya no sirve en la caseta.' })
      await recargar()
    } catch { toast.error('No se pudo cancelar el pase') }
  }

  const activos = pases.filter((p) => p.estado === 'VALIDO')
  const anteriores = pases.filter((p) => p.estado !== 'VALIDO')
  const enCaseta = accesos.filter((a) => a.paquete === 'CASETA' && !a.entregado)
  const eventos: Evento[] = avisos.map((v: Aviso) => ({ id: v.id, tipo: EVENTO_DE[v.tipo], titulo: v.titulo, detalle: `${v.cuerpo}`, hora: v.en, leido: sinLeer === 0 || avisos.indexOf(v) >= sinLeer }))

  return (
    <>
      <Encabezado titulo={user?.nombre ? `Hola, ${user.nombre.split(' ')[0]}` : 'Inicio'} detalle={casa}
        accion={<BotonCampana sinLeer={sinLeer} onAbrir={() => { setVista({ modo: 'avisos' }); marcarLeidos() }} />} />

      <div className="space-y-4">
        <TarjetaAvisos texto="Te avisamos al momento cuando tu visita llegue, tu pedido vaya en camino o tengas un paquete en caseta." />

        {/* Acción principal */}
        <button onClick={() => setVista({ modo: 'crear' })}
          className="anim-entrar flex w-full items-center gap-4 rounded-[24px] bg-acento px-5 py-5 sm:py-6 text-left text-acento-texto
            shadow-[0_8px_24px_-12px_rgb(var(--acento)/0.7)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.98]">
          <span className="grid place-items-center h-14 w-14 shrink-0 rounded-[18px] bg-white/15"><Icon n="qr" size={30} /></span>
          <span className="flex-1">
            <span className="block text-[1.25rem] font-semibold tracking-[-0.015em]">Crear pase de visita</span>
            <span className="block text-[0.9375rem] opacity-85">Tu visita entra sin esperar en la caseta</span>
          </span>
          <Icon n="mas" size={22} stroke={2.2} />
        </button>

        {/* Anuncios importantes de la administración: siempre visibles arriba mientras estén vigentes */}
        {anuncios.filter((a) => a.importante).slice(0, 2).map((a) => (
          <Link key={a.id} to="/residente/anuncios"
            className="anim-entrar flex items-start gap-4 rounded-[22px] bg-acento/[0.08] p-4 ring-1 ring-inset ring-acento/25 transition-transform duration-150 active:scale-[0.98]">
            <span className="grid place-items-center h-10 w-10 shrink-0 rounded-[12px] bg-acento text-acento-texto"><Icon n="megafono" size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-acento">Aviso importante</span>
              <span className="block text-[1.0625rem] font-semibold leading-snug">{a.titulo}</span>
              <span className="mt-0.5 block text-[0.9375rem] text-texto/75 line-clamp-2">{a.cuerpo}</span>
            </span>
          </Link>
        ))}

        {/* Resumen: pagos y anuncios */}
        <ResumenComunidad cuotas={cuotas} anuncios={anuncios} />

        {/* Paquetes que esperan en caseta */}
        {enCaseta.length > 0 && (
          <button onClick={() => setVista({ modo: 'detalle', acceso: enCaseta[0] })} style={{ animationDelay: '40ms' }}
            className="anim-entrar flex w-full items-center gap-4 rounded-[22px] bg-alerta/[0.1] px-5 py-4 text-left ring-1 ring-inset ring-alerta/25 transition-transform duration-150 active:scale-[0.98]">
            <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-alerta text-white"><Icon n="paquete" size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.0625rem] font-semibold">{enCaseta.length === 1 ? 'Tienes un paquete en caseta' : `Tienes ${enCaseta.length} entregas en caseta`}</span>
              <span className="block truncate text-[0.9375rem] text-texto/75">{enCaseta.map((a) => `${a.nombre} ${hora(a.entrada)}`).join(' · ')}</span>
            </span>
            <span className="rotate-180 text-texto/40"><Icon n="atras" size={18} /></span>
          </button>
        )}
      </div>

      {/* Pases activos */}
      <section aria-labelledby="t-pases" className="mt-10">
        <Titulo extra={activos.length > 0 ? <span className="text-[0.9375rem] text-suave cifras">{activos.length} activo{activos.length > 1 ? 's' : ''}</span> : undefined}>Mis pases</Titulo>
        <div className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
          {cargando ? <Esqueleto /> : activos.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[1.0625rem] font-semibold">No tienes pases activos</p>
              <p className="mt-1 text-[0.9375rem] text-suave">Crea uno y compártelo por WhatsApp con tu visita.</p>
            </div>
          ) : (
            <ul className="divide-y divide-separador">
              {activos.map((p, i) => <FilaPase key={p.id} pase={p} i={i} onAbrir={() => setVista({ modo: 'pase', pase: p })} />)}
            </ul>
          )}
        </div>
        {anteriores.length > 0 && (
          <>
            <button type="button" onClick={() => setVerAnteriores(!verAnteriores)} aria-expanded={verAnteriores}
              className="mt-3 inline-flex items-center gap-1.5 min-h-11 px-2 text-[0.9375rem] font-medium text-acento">
              <span className={`transition-transform duration-200 ${verAnteriores ? 'rotate-90' : '-rotate-90'}`}><Icon n="atras" size={16} /></span>
              {verAnteriores ? 'Ocultar pases anteriores' : `Ver pases anteriores (${anteriores.length})`}
            </button>
            {verAnteriores && (
              <ul className="anim-llenar mt-1 rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
                {anteriores.map((p, i) => <FilaPase key={p.id} pase={p} i={i} onAbrir={() => setVista({ modo: 'pase', pase: p })} />)}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Lo que pasó hoy en la casa */}
      <section aria-labelledby="t-hoy" className="mt-10">
        <Titulo>Hoy en tu casa</Titulo>
        <div className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
          {cargando ? <Esqueleto /> : accesos.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[1.0625rem] font-semibold">Sin movimientos hoy</p>
              <p className="mt-1 text-[0.9375rem] text-suave">Aquí verás quién entra a tu casa, a qué hora y quién lo registró.</p>
            </div>
          ) : (
            <ul className="divide-y divide-separador">
              {accesos.map((a, i) => {
                const e = estadoAcceso(a)
                return (
                  <li key={a.id} className="anim-entrar" style={{ animationDelay: `${Math.min(i * 35, 210)}ms` }}>
                    <button type="button" onClick={() => setVista({ modo: 'detalle', acceso: a })}
                      className="flex w-full items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                      {tieneInsignia(a.nombre) ? <LogoEmpresa nombre={a.nombre} size={44} />
                        : <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-fondo text-texto/75"><Icon n={ICONO_TIPO[a.tipo]} size={22} /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1rem] font-semibold truncate">{a.nombre}</span>
                        <span className="block text-[0.875rem] text-suave truncate">{ETIQUETA_TIPO[a.tipo]} · entró {hora(a.entrada)}</span>
                        <span className="block text-[0.8125rem] text-suave truncate">Registró {a.registradoPor.nombre}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold cifras ${e.clase}`}>{e.texto}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Ventanas */}
      {vista?.modo === 'crear' && (
        <Hoja titulo="Nuevo pase" onCerrar={cerrar}
          pie={<button type="submit" form={FORM_PASE} disabled={creando} className="btn-primario w-full">
            {creando ? 'Creando…' : <><Icon n="qr" size={19} />Crear pase</>}
          </button>}>
          <CrearPase idFormulario={FORM_PASE} onCrear={crear} />
        </Hoja>
      )}
      {vista?.modo === 'pase' && (
        <Hoja titulo={vista.recien ? 'Pase listo' : 'Pase de visita'} onCerrar={cerrar}>
          <PaseQR pase={vista.pase} onCancelar={() => cancelar(vista.pase)} />
        </Hoja>
      )}
      {vista?.modo === 'avisos' && (
        <PanelNotificaciones eventos={eventos} onCerrar={cerrar} titulo="Notificaciones"
          textoVacio="Aquí verás cuando llegue tu visita, tu pedido vaya en camino o tengas un paquete en caseta." />
      )}
      {vista?.modo === 'detalle' && <DetalleAcceso acceso={vista.acceso} onCerrar={cerrar} />}
    </>
  )
}

function FilaPase({ pase: p, i, onAbrir }: { pase: PaseResidente; i: number; onAbrir: () => void }) {
  const e = ESTADO_PASE[p.estado]
  return (
    <li className="anim-entrar" style={{ animationDelay: `${Math.min(i * 35, 210)}ms` }}>
      <button type="button" onClick={onAbrir}
        className="flex w-full items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
        <span className={`grid place-items-center h-11 w-11 shrink-0 rounded-[14px] ${p.estado === 'VALIDO' ? 'bg-acento/[0.1] text-acento' : 'bg-fondo text-texto/50'}`}><Icon n="qr" size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1rem] font-semibold truncate">{p.visitante}</span>
          <span className="block text-[0.875rem] text-suave truncate">{p.vigencia}{p.personas > 1 ? ` · ${p.personas} personas` : ''}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${e.clase}`}>{e.texto}</span>
      </button>
    </li>
  )
}

function ResumenComunidad({ cuotas, anuncios }: { cuotas: Cuota[]; anuncios: Anuncio[] }) {
  const porPagar = cuotas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'ATRASADO')
  const atrasado = porPagar.some((c) => c.estado === 'ATRASADO')
  const visto = leerVisto()
  const nuevos = anuncios.filter((a) => a.publicadoEn.getTime() > visto).length
  const ultimo = anuncios[0]
  const tarjeta = 'anim-entrar flex flex-col gap-1 rounded-[22px] bg-panel p-4 shadow-tarjeta transition-transform duration-150 active:scale-[0.98] min-w-0'
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link to="/residente/pagos" className={tarjeta} style={{ animationDelay: '40ms' }}>
        <span className={`grid place-items-center h-9 w-9 rounded-[11px] ${porPagar.length ? (atrasado ? 'bg-peligro/[0.1] text-peligro' : 'bg-alerta/[0.12] text-alerta') : 'bg-ok/[0.12] text-ok'}`}><Icon n="pagos" size={19} /></span>
        <span className="mt-1 text-[0.8125rem] font-medium text-suave">Cuota</span>
        <span className={`text-[1.0625rem] font-semibold leading-tight cifras ${atrasado ? 'text-peligro' : ''}`}>
          {cuotas.length === 0 ? '…' : porPagar.length ? `${pesos(porPagar.reduce((s, c) => s + c.monto, 0))} ${atrasado ? 'atrasado' : 'por pagar'}` : 'Al corriente'}
        </span>
      </Link>
      <Link to="/residente/anuncios" className={tarjeta} style={{ animationDelay: '70ms' }}>
        <span className="relative grid place-items-center h-9 w-9 rounded-[11px] bg-acento/[0.1] text-acento">
          <Icon n="megafono" size={19} />
          {nuevos > 0 && <span className="anim-pop absolute -right-1.5 -top-1.5 grid place-items-center min-w-[20px] h-5 px-1 rounded-full bg-peligro text-white text-[0.6875rem] font-bold cifras ring-2 ring-panel">{nuevos}</span>}
        </span>
        <span className="mt-1 text-[0.8125rem] font-medium text-suave">Anuncios</span>
        <span className="text-[1.0625rem] font-semibold leading-tight line-clamp-2">{ultimo ? ultimo.titulo : 'Sin anuncios'}</span>
      </Link>
    </div>
  )
}

function Esqueleto() {
  return (
    <ul aria-hidden="true" className="divide-y divide-separador">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="h-11 w-11 rounded-[14px] bg-fondo animate-pulse" />
          <span className="flex-1 space-y-2"><span className="block h-3.5 w-2/5 rounded bg-fondo animate-pulse" /><span className="block h-3 w-3/5 rounded bg-fondo animate-pulse" /></span>
        </li>
      ))}
    </ul>
  )
}
