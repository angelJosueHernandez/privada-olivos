import { useCallback, useEffect, useRef, useState } from 'react'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import Icon, { IconName } from '../../shared/ui/Icon'
import { hayApi } from '../../shared/api/cliente'
import { useAuth } from '../auth/AuthContext'
import DetalleAcceso from '../caseta/DetalleAcceso'
import Escaner from '../caseta/Escaner'
import LogoEmpresa, { tieneInsignia } from '../caseta/LogoEmpresa'
import { BotonCampana, PanelNotificaciones, useNotificaciones } from '../caseta/Notificaciones'
import RegistroManual, { PasoRegistro } from '../caseta/RegistroManual'
import ResultadoPase, { verificacionesDe } from '../caseta/ResultadoPase'
import { casetaService } from '../caseta/casetaService'
import { Acceso, Actor, ETIQUETA_TIPO, NuevoAcceso, TipoAcceso, Validacion } from '../caseta/tipos'

type Vista =
  | { modo: 'escaner' }
  | { modo: 'validando' }
  | { modo: 'resultado'; validacion: Validacion }
  | { modo: 'manual' }
  | { modo: 'registrado'; titulo: string; detalle: string; logo?: string }
  | { modo: 'notificaciones' }
  | { modo: 'detalle'; acceso: Acceso }
  | null
type Filtro = 'dentro' | 'caseta' | 'todos'

const ICONO_TIPO: Record<TipoAcceso, IconName> = {
  VISITA_QR: 'qr', PAQUETERIA: 'paquete', COMIDA: 'comida', SERVICIO: 'herramienta', VISITA_SIN_QR: 'visita',
}
const horaCorta = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const FORM_MANUAL = 'registro-manual'
const LIMITE_ESTANCIA_MS = 2 * 60 * 60_000 // aviso a las 2 horas dentro

const estaDentro = (a: Acceso) => !a.salida && a.paquete !== 'CASETA'
const enCaseta = (a: Acceso) => a.paquete === 'CASETA' && !a.entregado
const tiempoDentro = (a: Acceso, ahora: Date) => ahora.getTime() - a.entrada.getTime()
const duracion = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60_000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }

export default function GuardiaHome() {
  const { user } = useAuth()
  // Quién hace las acciones en este dispositivo. Con API el servidor lo toma de la sesión (no de aquí).
  const actor: Actor = { id: user?.id ?? '', nombre: user?.nombre ?? 'Guardia', rol: 'GUARDIA' }
  const [vista, setVista] = useState<Vista>(null)
  const [pasoManual, setPasoManual] = useState<PasoRegistro>('fotos')
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('dentro')
  const [enviando, setEnviando] = useState(false)
  const [nuevoId, setNuevoId] = useState<string | null>(null)
  const [verificado, setVerificado] = useState<Record<string, boolean>>({})
  const [ahora, setAhora] = useState(() => new Date())
  const avisados = useRef(new Set<string>())
  const { eventos, sinLeer, notificar, marcarLeidas } = useNotificaciones()

  const recargar = useCallback(async () => {
    try { setAccesos(await casetaService.listarHoy()) }
    catch { notificar('error', 'No se pudo cargar la bitácora', 'Revisa la conexión.') }
    finally { setCargandoLista(false) }
  }, [notificar])
  useEffect(() => { recargar() }, [recargar])
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 30_000); return () => clearInterval(t) }, [])

  // Automatización: avisa una sola vez por registro cuando pasa del tiempo límite dentro
  useEffect(() => {
    const largos = accesos.filter((a) => estaDentro(a) && tiempoDentro(a, ahora) > LIMITE_ESTANCIA_MS && !avisados.current.has(a.id))
    largos.forEach((a) => {
      avisados.current.add(a.id)
      notificar('alerta', `${a.nombre} lleva más de 2 horas dentro`, `${a.casa} · entró ${horaCorta(a.entrada)}`)
    })
  }, [accesos, ahora, notificar])

  const cerrar = () => setVista(null)
  // "Atrás" en el celular cierra la ventana abierta en lugar de salir de la pantalla
  useAtrasCierra(vista !== null, cerrar)
  const marcarNuevo = (id: string) => { setNuevoId(id); setTimeout(() => setNuevoId((x) => (x === id ? null : x)), 2200) }
  // Confirmación animada que se cierra sola
  const confirmar = (titulo: string, detalle: string, logo?: string) => {
    setVista({ modo: 'registrado', titulo, detalle, logo })
    setTimeout(() => setVista((v) => (v?.modo === 'registrado' ? null : v)), 1700)
  }

  const alLeer = async (contenido: string) => {
    setVista({ modo: 'validando' })
    setVerificado({})
    try {
      const validacion = await casetaService.validarPase(contenido)
      // Vibración distinta para que el guardia sepa el resultado sin mirar
      navigator.vibrate?.(validacion.estado === 'VALIDO' ? 50 : [80, 90, 80])
      setVista({ modo: 'resultado', validacion })
    } catch {
      setVista({ modo: 'resultado', validacion: { estado: 'NO_EXISTE', detalle: 'No se pudo validar el pase. Revisa la conexión e intenta de nuevo.' } })
    }
  }

  const registrarConPase = async (v: Validacion) => {
    if (!v.pase) return
    setEnviando(true)
    try {
      const a = await casetaService.registrarEntradaConPase(v.pase, actor)
      notificar('entrada', 'Entrada registrada', `${a.nombre} → ${a.casa}`)
      setFiltro('dentro'); marcarNuevo(a.id); recargar()
      confirmar('Entrada registrada', `${a.nombre} → ${a.casa} · ${horaCorta(a.entrada)}`)
    } catch { notificar('error', 'No se pudo registrar la entrada', 'Intenta de nuevo.') }
    finally { setEnviando(false) }
  }

  const registrarManual = async (datos: NuevoAcceso, fotos: { blob: Blob; etiqueta: string }[]) => {
    setEnviando(true)
    try {
      const a = await casetaService.registrarManual(datos, fotos, actor)
      notificar('entrada', `${ETIQUETA_TIPO[a.tipo]} registrada`,
        `${a.nombre} → ${a.casa}${fotos.length ? ` · ${fotos.length} foto${fotos.length > 1 ? 's' : ''}` : ''}`)
      // Automatización: si el paquete se queda en caseta, se avisa a la casa
      if (a.paquete === 'CASETA') {
        setTimeout(() => notificar('paquete', `Aviso enviado a ${a.casa}`,
          hayApi ? 'Su paquete está en caseta.' : 'Su paquete está en caseta. (En modo demostración no se envía realmente).'), 900)
      }
      setFiltro(a.paquete === 'CASETA' ? 'caseta' : 'dentro'); marcarNuevo(a.id); recargar()
      confirmar(a.paquete === 'CASETA' ? 'Paquete en caseta' : 'Entrada registrada', `${a.nombre} → ${a.casa}`, a.nombre)
    } catch { notificar('error', 'No se pudo guardar el registro', 'Intenta de nuevo.') }
    finally { setEnviando(false) }
  }

  const registrarSalida = async (a: Acceso) => {
    try {
      await casetaService.registrarSalida(a.id, actor)
      notificar('salida', `Salida · ${a.nombre}`, `${a.casa} · estuvo ${duracion(Date.now() - a.entrada.getTime())}`)
      recargar()
    } catch { notificar('error', 'No se pudo registrar la salida') }
  }

  const entregar = async (a: Acceso) => {
    try {
      await casetaService.entregarPaquete(a.id, actor)
      notificar('entrega', 'Paquete entregado', `${a.nombre} → ${a.casa}`)
      recargar()
    } catch { notificar('error', 'No se pudo marcar la entrega') }
  }

  const dentro = accesos.filter(estaDentro)
  const caseta = accesos.filter(enCaseta)
  const lista = filtro === 'dentro' ? dentro : filtro === 'caseta' ? caseta : accesos
  const pestanas: [Filtro, string, number][] = [['dentro', 'Dentro', dentro.length], ['caseta', 'En caseta', caseta.length], ['todos', 'Todos', accesos.length]]
  const vacio = { dentro: ['No hay nadie dentro', 'Las entradas que registres aparecerán aquí.'], caseta: ['Sin paquetes en caseta', 'Los paquetes que se queden aquí aparecerán para entregarlos.'], todos: ['Sin registros hoy', 'Las entradas que registres aparecerán aquí.'] }[filtro]

  const pase = vista?.modo === 'resultado' ? vista.validacion.pase : undefined
  const faltan = pase && vista?.modo === 'resultado' && vista.validacion.estado === 'VALIDO'
    ? verificacionesDe(pase).filter((v) => !verificado[v.id]).length : 0

  return (
    <>
      <Encabezado titulo="Caseta principal"
        detalle={ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + horaCorta(ahora)}
        accion={<BotonCampana sinLeer={sinLeer} onAbrir={() => { setVista({ modo: 'notificaciones' }); marcarLeidas() }} />} />

      {/* Acciones principales: grandes para usarse rápido, con guantes o a pleno sol */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setVista({ modo: 'escaner' })}
          className="anim-entrar flex items-center gap-4 rounded-[24px] bg-acento px-5 py-5 sm:py-6 text-left text-acento-texto
            shadow-[0_8px_24px_-12px_rgb(var(--acento)/0.7)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.98]">
          <span className="grid place-items-center h-14 w-14 shrink-0 rounded-[18px] bg-white/15"><Icon n="escanear" size={30} /></span>
          <span>
            <span className="block text-[1.25rem] font-semibold tracking-[-0.015em]">Escanear código QR</span>
            <span className="block text-[0.9375rem] opacity-85">Visitas con pase del residente</span>
          </span>
        </button>
        <button onClick={() => { setPasoManual('fotos'); setVista({ modo: 'manual' }) }} style={{ animationDelay: '50ms' }}
          className="anim-entrar flex items-center gap-4 rounded-[24px] bg-panel px-5 py-5 sm:py-6 text-left shadow-tarjeta
            transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.98]">
          <span className="grid place-items-center h-14 w-14 shrink-0 rounded-[18px] bg-fondo text-texto/80"><Icon n="paquete" size={30} /></span>
          <span>
            <span className="block text-[1.25rem] font-semibold tracking-[-0.015em]">Registrar sin código</span>
            <span className="block text-[0.9375rem] text-suave">Paquetería, repartidores y servicios</span>
          </span>
        </button>
      </div>

      {/* Bitácora del día */}
      <section aria-labelledby="bitacora" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h2 id="bitacora" className="text-[1.375rem] font-semibold tracking-[-0.015em]">Bitácora de hoy</h2>
          <div role="tablist" aria-label="Filtrar bitácora" className="grid grid-cols-3 gap-1 rounded-[12px] bg-texto/[0.06] p-1 w-full sm:w-auto">
            {pestanas.map(([v, t, n]) => (
              <button key={v} role="tab" aria-selected={filtro === v} onClick={() => setFiltro(v)}
                className={`h-9 px-3 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
                  ${filtro === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>
                {t} <span key={n} className={`inline-block cifras ${n > 0 ? 'anim-llenar' : ''} ${v === 'caseta' && n > 0 ? 'text-alerta font-semibold' : ''}`}>{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
          {cargandoLista ? (
            <ul aria-hidden="true" className="divide-y divide-separador">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-4">
                  <span className="h-11 w-11 rounded-[14px] bg-fondo animate-pulse" />
                  <span className="flex-1 space-y-2"><span className="block h-3.5 w-2/5 rounded bg-fondo animate-pulse" /><span className="block h-3 w-3/5 rounded bg-fondo animate-pulse" /></span>
                </li>
              ))}
            </ul>
          ) : lista.length === 0 ? (
            <div key={filtro} className="anim-entrar px-6 py-12 text-center">
              <p className="text-[1.0625rem] font-semibold">{vacio[0]}</p>
              <p className="mt-1 text-[0.9375rem] text-suave">{vacio[1]}</p>
            </div>
          ) : (
            <ul key={filtro} className="divide-y divide-separador">
              {lista.map((a, i) => {
                const largo = estaDentro(a) && tiempoDentro(a, ahora) > LIMITE_ESTANCIA_MS
                return (
                  <li key={a.id} style={{ animationDelay: a.id === nuevoId ? undefined : `${Math.min(i * 35, 210)}ms` }}
                    className={`${a.id === nuevoId ? 'anim-resaltar' : 'anim-entrar'} flex items-center gap-3 px-4 sm:px-5 py-4`}>
                    <button type="button" onClick={() => setVista({ modo: 'detalle', acceso: a })} aria-label={`Ver detalle de ${a.nombre}, ${a.casa}`}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left rounded-[14px] -m-1.5 p-1.5 hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                    {tieneInsignia(a.nombre) ? (
                      <LogoEmpresa nombre={a.nombre} size={44} />
                    ) : (
                      <span className="grid place-items-center h-11 w-11 shrink-0 rounded-[14px] bg-fondo text-texto/75">
                        <Icon n={ICONO_TIPO[a.tipo]} size={22} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[1rem] font-semibold truncate">{a.nombre}</p>
                      <p className="text-[0.875rem] text-suave truncate">{a.casa} · {ETIQUETA_TIPO[a.tipo]}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.8125rem] cifras">
                        <span className="text-suave">Entró {horaCorta(a.entrada)}{a.salida ? ` · Salió ${horaCorta(a.salida)}` : ''}</span>
                        {a.placas && <span className="rounded-md bg-fondo px-1.5 py-0.5 font-semibold tracking-[0.04em]">{a.placas}</span>}
                        {enCaseta(a) && <span className="rounded-md bg-alerta/[0.12] px-1.5 py-0.5 font-semibold text-alerta">En caseta{a.cantidad ? ` · ${a.cantidad}` : ''}</span>}
                        {a.entregado && <span className="rounded-md bg-ok/[0.12] px-1.5 py-0.5 font-semibold text-ok">Entregado {horaCorta(a.entregado)}</span>}
                        {largo && <span className="rounded-md bg-peligro/[0.1] px-1.5 py-0.5 font-semibold text-peligro">{duracion(tiempoDentro(a, ahora))} dentro</span>}
                        {a.fotos.length > 0 && <span className="inline-flex items-center gap-1 text-suave"><Icon n="camara" size={14} />{a.fotos.length}</span>}
                      </div>
                      <p className="mt-1 text-[0.8125rem] text-suave truncate">Registró {a.registradoPor.nombre}{a.paseCreadoPor ? ` · pase de ${a.paseCreadoPor.nombre}` : ''}</p>
                    </div>
                    {a.fotos[0] && <img src={a.fotos[0]} alt="" className="hidden sm:block h-12 w-12 rounded-[10px] object-cover" />}
                    <span className="hidden sm:block rotate-180 text-texto/30"><Icon n="atras" size={18} /></span>
                    </button>
                    {estaDentro(a) && <button onClick={() => registrarSalida(a)} className="btn-secundario btn-chico shrink-0">Salida</button>}
                    {enCaseta(a) && <button onClick={() => entregar(a)} className="btn-primario btn-chico shrink-0">Entregar</button>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Hojas de cada tarea */}
      {vista?.modo === 'escaner' && (
        <Hoja titulo="Escanear pase" oscura onCerrar={cerrar}>
          <Escaner onLeido={alLeer} />
        </Hoja>
      )}

      {(vista?.modo === 'validando' || vista?.modo === 'resultado') && (
        <Hoja titulo="Resultado del pase" onCerrar={cerrar}
          pie={vista.modo === 'resultado' && (
            <div className="space-y-2.5">
              {vista.validacion.estado === 'VALIDO' ? (
                <>
                  {faltan > 0 && <p className="text-center text-[0.875rem] text-suave">Confirma {faltan === 1 ? 'el dato pendiente' : `los ${faltan} datos`} para registrar la entrada</p>}
                  <button onClick={() => registrarConPase(vista.validacion)} disabled={enviando || faltan > 0} className="btn-primario w-full">
                    <Icon n="entrada" size={20} />{enviando ? 'Registrando…' : 'Registrar entrada'}
                  </button>
                </>
              ) : (
                <button onClick={() => { setPasoManual('fotos'); setVista({ modo: 'manual' }) }} className="btn-primario w-full">Registrar sin código</button>
              )}
              <button onClick={() => setVista({ modo: 'escaner' })} className="btn-secundario w-full">Escanear otro</button>
            </div>
          )}>
          {vista.modo === 'validando' ? (
            <div role="status" className="flex min-h-[55svh] flex-col items-center justify-center gap-4 text-suave">
              <span aria-hidden="true" className="h-8 w-8 rounded-full border-[3px] border-acento border-r-transparent animate-[spin_0.7s_linear_infinite]" />
              Validando pase…
            </div>
          ) : (
            <ResultadoPase validacion={vista.validacion} verificado={verificado}
              onVerificar={(id) => setVerificado((v) => ({ ...v, [id]: !v[id] }))} />
          )}
        </Hoja>
      )}

      {vista?.modo === 'manual' && (
        <Hoja titulo="Registrar sin código" onCerrar={cerrar}
          pie={
            <button type="submit" form={FORM_MANUAL} disabled={enviando} className="btn-primario w-full">
              {pasoManual === 'fotos'
                ? <>Continuar a datos<span className="rotate-180 inline-flex"><Icon n="atras" size={20} /></span></>
                : <><Icon n="entrada" size={20} />{enviando ? 'Guardando…' : 'Registrar entrada'}</>}
            </button>
          }>
          <RegistroManual idFormulario={FORM_MANUAL} onEnviar={registrarManual} onPaso={setPasoManual} />
        </Hoja>
      )}

      {/* Confirmación animada: se cierra sola */}
      {vista?.modo === 'registrado' && (
        <Hoja titulo="Listo" onCerrar={cerrar}>
          <div role="status" className="flex min-h-[60svh] flex-col items-center justify-center text-center">
            <span className="anim-pop anim-trazo grid place-items-center h-24 w-24 rounded-full bg-ok text-white shadow-[0_14px_32px_-12px_rgb(0_0_0/0.35)]">
              <Icon n="check" size={50} stroke={2.6} />
            </span>
            <p className="anim-llenar mt-6 text-[1.75rem] font-bold tracking-[-0.02em]" style={{ animationDelay: '200ms' }}>{vista.titulo}</p>
            <p className="anim-llenar mt-2 flex items-center gap-2 text-[1.0625rem] text-suave" style={{ animationDelay: '260ms' }}>
              {vista.logo && <LogoEmpresa nombre={vista.logo} size={24} />}{vista.detalle}
            </p>
          </div>
        </Hoja>
      )}

      {vista?.modo === 'notificaciones' && <PanelNotificaciones eventos={eventos} onCerrar={cerrar} />}
      {vista?.modo === 'detalle' && <DetalleAcceso acceso={vista.acceso} onCerrar={cerrar} />}
    </>
  )
}
