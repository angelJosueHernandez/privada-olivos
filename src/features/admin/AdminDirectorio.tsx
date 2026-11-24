import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import Icon, { IconName } from '../../shared/ui/Icon'
import { Opciones } from '../../shared/ui/Opciones'
import { Paginacion, usePaginacion } from '../../shared/ui/Paginacion'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import Vacio from '../../shared/ui/Vacio'
import { CAMPO_INVALIDO, ErrorFormulario, MensajeCampo, useValidacion } from '../../shared/ui/useValidacion'
import { filtrar, LARGO, validar } from '../../shared/validacion'
import { useAuth } from '../auth/AuthContext'
import type { Rol } from '../auth/authService'
import SelectorCasa from '../caseta/SelectorCasa'
import type { Actor } from '../caseta/tipos'
import { directorioService } from '../directorio/directorioService'
import { Cambio, Casa, Cuenta, DatosCuenta, ETIQUETA_ROL, HORAS_TEMPORAL, nombreCasa } from '../directorio/tipos'

type Vista = 'USUARIOS' | 'CASAS' | 'CAMBIOS'
type FiltroCuenta = 'TODAS' | Rol | 'SUSPENDIDAS' | 'PENDIENTES'
type HojaAbierta =
  | { t: 'cuenta'; id: string }
  | { t: 'nueva-cuenta'; casa?: string }
  | { t: 'editar-cuenta'; id: string }
  | { t: 'temporal'; nombre: string; email: string; temporal: string }
  | { t: 'casa'; id: string }
  | { t: 'nueva-casa' }

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const fecha = (d?: Date) => (d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const haceCuanto = (d?: Date) => {
  if (!d) return 'Nunca ha entrado'
  const min = Math.round((Date.now() - d.getTime()) / 60_000)
  if (min < 2) return 'Activo ahora'
  if (min < 60) return `Hace ${min} min`
  if (min < 24 * 60) return `Hace ${Math.round(min / 60)} h`
  const dias = Math.round(min / 1440)
  return dias < 30 ? `Hace ${dias} ${dias === 1 ? 'día' : 'días'}` : `El ${fecha(d)}`
}
const ICONO_ROL: Record<Rol, IconName> = { ADMIN: 'candado', RESIDENTE: 'inicio', GUARDIA: 'caseta' }
const campo = 'block w-full rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento placeholder:text-suave'

/** Etiqueta de estado de acceso de una cuenta */
function estadoAcceso(c: Cuenta): { t: string; c: string } | null {
  if (c.estado === 'SUSPENDIDA') return { t: 'Suspendida', c: 'bg-peligro/[0.1] text-peligro' }
  if (!c.tieneAcceso) return { t: 'Sin contraseña', c: 'bg-alerta/[0.12] text-alerta' }
  if (c.debeCambiar) return { t: 'Invitación pendiente', c: 'bg-alerta/[0.12] text-alerta' }
  return null
}

/* Administración: alta y control de usuarios y casas, con bitácora de cambios */
export default function AdminDirectorio() {
  const { user } = useAuth()
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'ADMIN' }), [user])
  const [vista, setVista] = useState<Vista>(() => (new URLSearchParams(window.location.search).get('ver') === 'casas' ? 'CASAS' : 'USUARIOS'))
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [casas, setCasas] = useState<Casa[]>([])
  const [cambios, setCambios] = useState<Cambio[]>([])
  const [hoja, setHoja] = useState<HojaAbierta | null>(null)
  const [guardando, setGuardando] = useState(false)
  /** Envuelve un guardado para que el botón de la hoja muestre que está trabajando */
  const conCarga = <T,>(f: (d: T) => Promise<void>) => async (d: T) => { setGuardando(true); try { await f(d) } finally { setGuardando(false) } }

  const cargar = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([directorioService.cuentas(), directorioService.casas(), directorioService.cambios()])
      setCuentas(a); setCasas(b); setCambios(c)
    } catch { toast.error('No se pudo cargar el directorio') }
  }, [])
  useEffect(() => { void cargar(); return directorioService.suscribir(() => void cargar()) }, [cargar])
  useAtrasCierra(hoja !== null, () => setHoja(null))

  const cerrar = () => setHoja(null)
  const cuentaDe = (id: string) => cuentas?.find((c) => c.id === id)
  const casaDe = (id: string) => casas.find((c) => c.id === id)

  let contenidoHoja: { titulo: string; cuerpo: ReactNode; pie?: ReactNode } | null = null
  if (hoja?.t === 'cuenta') {
    const c = cuentaDe(hoja.id)
    if (c) contenidoHoja = { titulo: 'Usuario', cuerpo: <DetalleCuenta cuenta={c} actor={actor} onEditar={() => setHoja({ t: 'editar-cuenta', id: c.id })} onTemporal={(temporal) => setHoja({ t: 'temporal', nombre: c.nombre, email: c.email, temporal })} onEliminada={cerrar} /> }
  } else if (hoja?.t === 'nueva-cuenta' || hoja?.t === 'editar-cuenta') {
    const inicial = hoja.t === 'editar-cuenta' ? cuentaDe(hoja.id) : undefined
    contenidoHoja = {
      titulo: inicial ? 'Editar usuario' : 'Nuevo usuario',
      cuerpo: <FormCuenta inicial={inicial} casaInicial={hoja.t === 'nueva-cuenta' ? hoja.casa : undefined} esYo={inicial?.id === actor.id}
        onGuardar={conCarga(async (d: DatosCuenta) => {
          if (inicial) {
            await directorioService.editarCuenta(inicial.id, d, actor)
            toast.success('Datos actualizados')
            setHoja({ t: 'cuenta', id: inicial.id })
          } else {
            const r = await directorioService.crearCuenta(d, actor)
            setHoja({ t: 'temporal', nombre: r.cuenta.nombre, email: r.cuenta.email, temporal: r.temporal })
          }
        })} />,
      pie: <button type="submit" form="form-cuenta" disabled={guardando} className="btn-primario w-full">{guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Crear y generar acceso'}</button>,
    }
  } else if (hoja?.t === 'temporal') {
    contenidoHoja = { titulo: 'Acceso listo', cuerpo: <PasswordTemporal {...hoja} />, pie: <button type="button" onClick={cerrar} className="btn-primario w-full">Listo</button> }
  } else if (hoja?.t === 'casa') {
    const c = casaDe(hoja.id)
    if (c) contenidoHoja = { titulo: `${c.calle} ${c.numero}`, cuerpo: <DetalleCasa casa={c} cuentas={cuentas ?? []} actor={actor} onCuenta={(id) => setHoja({ t: 'cuenta', id })} onAgregar={() => setHoja({ t: 'nueva-cuenta', casa: nombreCasa(c) })} /> }
  } else if (hoja?.t === 'nueva-casa') {
    contenidoHoja = {
      titulo: 'Nueva casa',
      cuerpo: <FormCasa onGuardar={conCarga(async (d: { calle: string; numero: string; notas?: string }) => { const casa = await directorioService.crearCasa(d, actor); toast.success('Casa dada de alta', { description: `${nombreCasa(casa)} ya aparece en caseta, anuncios y cobranza.` }); setHoja({ t: 'casa', id: casa.id }) })} />,
      pie: <button type="submit" form="form-casa" disabled={guardando} className="btn-primario w-full">{guardando ? 'Guardando…' : 'Dar de alta'}</button>,
    }
  }

  const activas = casas.filter((c) => c.activa).length
  return (
    <>
      <Encabezado titulo="Directorio" detalle="Usuarios, casas y cambios"
        accion={vista !== 'CAMBIOS' && (
          <button type="button" onClick={() => setHoja(vista === 'CASAS' ? { t: 'nueva-casa' } : { t: 'nueva-cuenta' })} className="btn-primario btn-chico">
            <Icon n="mas" size={17} stroke={2.2} />{vista === 'CASAS' ? 'Casa' : 'Usuario'}
          </button>
        )} />

      <div role="group" aria-label="Ver" className="mb-4 grid grid-cols-3 gap-1 rounded-[12px] bg-texto/[0.06] p-1">
        {([['USUARIOS', 'Usuarios', cuentas?.length], ['CASAS', 'Casas', activas], ['CAMBIOS', 'Cambios', undefined]] as [Vista, string, number | undefined][]).map(([v, t, n]) => (
          <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
            className={`h-9 px-2 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
              ${vista === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>
            {t}{n !== undefined && <> <span className="cifras">{n}</span></>}
          </button>
        ))}
      </div>

      {cuentas === null ? <div className="h-64 rounded-[20px] bg-panel shadow-tarjeta animate-pulse" />
        : vista === 'USUARIOS' ? <ListaCuentas cuentas={cuentas} yo={actor.id} onAbrir={(id) => setHoja({ t: 'cuenta', id })} />
        : vista === 'CASAS' ? <ListaCasas casas={casas} cuentas={cuentas} onAbrir={(id) => setHoja({ t: 'casa', id })} />
        : <ListaCambios cambios={cambios} />}

      {contenidoHoja && <Hoja titulo={contenidoHoja.titulo} onCerrar={cerrar} pie={contenidoHoja.pie}>{contenidoHoja.cuerpo}</Hoja>}
    </>
  )
}

// ---------------------------------------------------------------- Listas

function Avatar({ nombre, rol, apagado }: { nombre: string; rol: Rol; apagado?: boolean }) {
  const color = rol === 'ADMIN' ? 'bg-texto text-panel' : rol === 'GUARDIA' ? 'bg-alerta/[0.16] text-alerta' : 'bg-acento/[0.12] text-acento'
  return <span aria-hidden="true" className={`grid place-items-center h-11 w-11 shrink-0 rounded-full text-[0.9375rem] font-semibold ${apagado ? 'bg-texto/[0.08] text-texto/45' : color}`}>{iniciales(nombre)}</span>
}

function ListaCuentas({ cuentas, yo, onAbrir }: { cuentas: Cuenta[]; yo: string; onAbrir: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<FiltroCuenta | null>(null)
  const cumple = (c: Cuenta, f: FiltroCuenta | null) => !f || f === 'TODAS' ? true
    : f === 'SUSPENDIDAS' ? c.estado === 'SUSPENDIDA'
    : f === 'PENDIENTES' ? c.estado === 'ACTIVA' && (!c.tieneAcceso || c.debeCambiar)
    : c.rol === f
  const lista = useMemo(() => {
    const t = normal(q.trim())
    return cuentas.filter((c) => cumple(c, filtro) && (!t || normal(`${c.nombre} ${c.email} ${c.casa ?? ''} ${c.telefono ?? ''}`).includes(t)))
  }, [cuentas, q, filtro])
  const n = (f: FiltroCuenta) => cuentas.filter((c) => cumple(c, f)).length
  const pag = usePaginacion(lista, 20, `${filtro}|${q}`)

  return (
    <>
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Buscar usuario</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto/45"><Icon n="buscar" size={18} /></span>
          <input type="search" value={q} onChange={(e) => setQ(filtrar.linea(e.target.value, LARGO.busqueda))} maxLength={LARGO.busqueda} placeholder="Buscar nombre, correo o casa"
            className="block w-full h-12 rounded-[14px] bg-panel pl-11 pr-4 text-[1rem] shadow-tarjeta outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-acento placeholder:text-suave" />
        </label>
        <Opciones etiqueta="Filtrar" valor={filtro} onCambio={setFiltro}
          cuadricula="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&>*]:shrink-0 [&>*]:whitespace-nowrap sm:mx-0 sm:flex-wrap sm:px-0"
          opciones={([['RESIDENTE', 'Residentes'], ['GUARDIA', 'Guardias'], ['ADMIN', 'Administración'], ['PENDIENTES', 'Sin entrar aún'], ['SUSPENDIDAS', 'Suspendidas']] as [FiltroCuenta, string][])
            .map(([v, t]) => ({ valor: v, etiqueta: `${t} ${n(v)}` }))} />
      </div>
      <p className="mt-5 mb-2 px-1 text-[0.875rem] text-suave" aria-live="polite"><span className="cifras">{lista.length}</span> {lista.length === 1 ? 'usuario' : 'usuarios'}</p>
      <div ref={pag.ancla} className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
        {lista.length === 0 ? <p className="px-6 py-12 text-center text-[0.9375rem] text-suave">Nadie coincide con la búsqueda.</p> : (
          <ul className="divide-y divide-separador">
            {pag.visibles.map((c) => {
              const e = estadoAcceso(c)
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => onAbrir(c.id)} className="flex w-full items-center gap-4 px-4 sm:px-5 py-3.5 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05] transition-colors">
                    <Avatar nombre={c.nombre} rol={c.rol} apagado={c.estado === 'SUSPENDIDA'} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`truncate text-[1rem] font-semibold ${c.estado === 'SUSPENDIDA' ? 'text-texto/55' : ''}`}>{c.nombre}</span>
                        {c.id === yo && <span className="shrink-0 text-[0.8125rem] text-suave">(tú)</span>}
                      </span>
                      <span className="block truncate text-[0.875rem] text-suave">{c.rol === 'RESIDENTE' ? c.casa : ETIQUETA_ROL[c.rol]} · {haceCuanto(c.ultimoAcceso)}</span>
                    </span>
                    {e && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${e.c}`}>{e.t}</span>}
                    <span className="hidden sm:block rotate-180 text-texto/30"><Icon n="atras" size={18} /></span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <Paginacion {...pag.props} nombre="usuarios" />
    </>
  )
}

function ListaCasas({ casas, cuentas, onAbrir }: { casas: Casa[]; cuentas: Cuenta[]; onAbrir: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [inactivas, setInactivas] = useState(false)
  const t = normal(q.trim())
  const visibles = casas.filter((c) => (inactivas || c.activa) && (!t || normal(`${c.calle} ${c.numero}`).includes(t)))
  const pag = usePaginacion(visibles, 36, `${q}|${inactivas}`)
  const calles = [...new Set(pag.visibles.map((c) => c.calle))]
  const residentes = (c: Casa) => cuentas.filter((u) => u.casa === nombreCasa(c) && u.estado === 'ACTIVA')
  const hayInactivas = casas.some((c) => !c.activa)
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-0 flex-1 basis-56">
          <span className="sr-only">Buscar casa</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto/45"><Icon n="buscar" size={18} /></span>
          <input type="search" value={q} onChange={(e) => setQ(filtrar.linea(e.target.value, 40))} maxLength={40} placeholder="Buscar calle o número"
            className="block w-full h-12 rounded-[14px] bg-panel pl-11 pr-4 text-[1rem] shadow-tarjeta outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-acento placeholder:text-suave" />
        </label>
        {hayInactivas && (
          <button type="button" aria-pressed={inactivas} onClick={() => setInactivas(!inactivas)}
            className={`h-10 rounded-full px-4 text-[0.875rem] font-medium transition-colors ${inactivas ? 'bg-texto text-panel' : 'bg-texto/[0.06] text-texto/75'}`}>Incluir desactivadas</button>
        )}
      </div>
      <div ref={pag.ancla} />
      {visibles.length === 0 ? <div className="mt-5"><Vacio icono="inicio" titulo="Sin casas" texto="Da de alta las casas de la privada para asignarles residentes." /></div> : calles.map((calle) => (
        <section key={calle} className="mt-6">
          <h2 className="mb-2 px-1 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-suave">Calle {calle}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {pag.visibles.filter((c) => c.calle === calle).map((c) => {
              const rs = residentes(c)
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => onAbrir(c.id)} aria-label={`${nombreCasa(c)}: ${!c.activa ? 'desactivada' : rs.length ? rs.map((r) => r.nombre).join(', ') : 'sin residentes'}`}
                    className={`block w-full rounded-[16px] bg-panel px-3.5 py-3 text-left shadow-tarjeta transition-transform duration-150 active:scale-[0.97] ${c.activa ? '' : 'opacity-60'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[1.25rem] font-semibold leading-tight cifras">{c.numero}</span>
                      {c.activa && !rs.length && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-alerta" />}
                    </span>
                    <span className={`mt-0.5 block truncate text-[0.8125rem] ${rs.length && c.activa ? 'text-texto/80' : 'text-suave'}`}>
                      {!c.activa ? 'Desactivada' : rs.length ? rs.map((r) => r.nombre.split(' ')[0]).join(', ') : 'Sin residentes'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <div className="mt-2"><Paginacion {...pag.props} nombre="casas" /></div>
    </>
  )
}

function ListaCambios({ cambios }: { cambios: Cambio[] }) {
  const pag = usePaginacion(cambios, 20)
  if (!cambios.length) return <Vacio icono="lista" titulo="Sin cambios" texto="Aquí quedará registro de altas, bajas y cambios de acceso." />
  return (
    <>
      <p className="mb-2 px-1 text-[0.875rem] text-suave">Registro de quién hizo cada cambio. No se puede editar.</p>
      <div ref={pag.ancla} />
      <ul className="rounded-[20px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
        {pag.visibles.map((k) => (
          <li key={k.id} className="px-4 sm:px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[1rem] font-semibold">{k.accion}</span>
              <span className="shrink-0 text-[0.8125rem] text-suave cifras">{k.en.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-[0.9375rem] text-texto/80 break-words">{k.detalle}</p>
            <p className="mt-0.5 text-[0.8125rem] text-suave">Por {k.por.nombre}</p>
          </li>
        ))}
      </ul>
      <Paginacion {...pag.props} nombre="cambios" />
    </>
  )
}

// ---------------------------------------------------------------- Detalle de cuenta

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[0.9375rem] text-suave">{etiqueta}</span>
      <span className="min-w-0 text-right text-[0.9375rem] font-medium break-words">{children}</span>
    </div>
  )
}
function Accion({ icono, texto, detalle, peligro, onClick, disabled }: { icono: IconName; texto: string; detalle?: string; peligro?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-texto/[0.03] active:bg-texto/[0.06] disabled:opacity-50 ${peligro ? 'text-peligro' : ''}`}>
      <span className={`grid place-items-center h-9 w-9 shrink-0 rounded-[10px] ${peligro ? 'bg-peligro/[0.1]' : 'bg-acento/[0.1] text-acento'}`}><Icon n={icono} size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] font-medium">{texto}</span>
        {detalle && <span className={`block text-[0.8125rem] ${peligro ? 'text-peligro/80' : 'text-suave'}`}>{detalle}</span>}
      </span>
    </button>
  )
}

function Confirmacion({ titulo, texto, boton, onSi, onNo, ocupado, children }: { titulo: string; texto: string; boton: string; onSi: () => void; onNo: () => void; ocupado: boolean; children?: ReactNode }) {
  return (
    <div role="alertdialog" aria-label={titulo} className="anim-llenar rounded-[20px] bg-peligro/[0.06] p-4 ring-1 ring-inset ring-peligro/20">
      <p className="text-[1rem] font-semibold">{titulo}</p>
      <p className="mt-0.5 text-[0.875rem] text-texto/75">{texto}</p>
      {children}
      <div className="mt-3 flex gap-2.5">
        <button type="button" onClick={onNo} className="btn-secundario btn-chico">Cancelar</button>
        <button type="button" onClick={onSi} disabled={ocupado} className="btn btn-chico bg-peligro text-white">{ocupado ? 'Un momento…' : boton}</button>
      </div>
    </div>
  )
}

const MOTIVOS = ['Ya no vive en la privada', 'Adeudo', 'Mal uso de la app', 'Dejó de trabajar aquí']

function DetalleCuenta({ cuenta: c, actor, onEditar, onTemporal, onEliminada }: {
  cuenta: Cuenta; actor: Actor; onEditar: () => void; onTemporal: (t: string) => void; onEliminada: () => void
}) {
  const [confirmar, setConfirmar] = useState<'suspender' | 'eliminar' | 'restablecer' | 'sesiones' | '2fa' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const esYo = c.id === actor.id
  const e = estadoAcceso(c)

  const hacer = async (f: () => Promise<void>) => {
    setOcupado(true)
    try { await f(); setConfirmar(null) } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo completar') }
    finally { setOcupado(false) }
  }
  const restablecer = () => hacer(async () => { onTemporal(await directorioService.restablecerPassword(c.id, actor)) })
  const dosPasos = () => hacer(async () => { await directorioService.restablecer2fa(c.id, actor); toast.success('Verificación restablecida', { description: 'Al entrar configurará su app autenticadora de nuevo.' }) })
  const sesiones = () => hacer(async () => { await directorioService.cerrarSesiones(c.id, actor); toast.success('Sesiones cerradas', { description: `${c.nombre.split(' ')[0]} tendrá que volver a iniciar sesión.` }) })
  const suspender = () => hacer(async () => { await directorioService.suspender(c.id, motivo, actor); toast.success('Cuenta suspendida', { description: 'Ya no puede entrar y se cerraron sus sesiones.' }) })
  const reactivar = () => hacer(async () => { await directorioService.reactivar(c.id, actor); toast.success('Cuenta reactivada') })
  const eliminar = () => hacer(async () => { await directorioService.eliminarCuenta(c.id, actor); toast.success('Cuenta eliminada'); onEliminada() })

  const cancelar = () => setConfirmar(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="scale-125 origin-left"><Avatar nombre={c.nombre} rol={c.rol} apagado={c.estado === 'SUSPENDIDA'} /></span>
        <div className="min-w-0 pl-2">
          <p className="text-[1.25rem] font-semibold leading-tight break-words">{c.nombre}{esYo && <span className="text-[0.9375rem] font-normal text-suave"> (tú)</span>}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.9375rem] text-suave">
            <span className="inline-flex items-center gap-1"><Icon n={ICONO_ROL[c.rol]} size={15} />{ETIQUETA_ROL[c.rol]}</span>
            {e && <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${e.c}`}>{e.t}</span>}
          </p>
        </div>
      </div>

      {c.estado === 'SUSPENDIDA' && (
        <div className="rounded-[18px] bg-peligro/[0.06] p-4 text-[0.9375rem]">
          <p className="font-semibold text-peligro">Cuenta suspendida</p>
          <p className="mt-0.5 text-texto/80">{c.motivoSuspension ?? 'Sin motivo registrado.'} No puede entrar a la app.</p>
        </div>
      )}
      {c.estado === 'ACTIVA' && c.debeCambiar && (
        <div className="rounded-[18px] bg-alerta/[0.1] p-4 text-[0.9375rem] text-texto/85">
          Todavía no crea su contraseña.{c.temporalVence && (c.temporalVence.getTime() > Date.now()
            ? <> La temporal vence el <span className="font-semibold cifras">{c.temporalVence.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>.</>
            : <> <span className="font-semibold">La temporal ya venció</span>: genera una nueva.</>)}
        </div>
      )}

      <div className="rounded-[18px] bg-panel shadow-tarjeta divide-y divide-separador">
        <Dato etiqueta="Correo">{c.email}</Dato>
        <Dato etiqueta="Teléfono">{c.telefono ? <span className="cifras">{c.telefono.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3')}</span> : '—'}</Dato>
        {c.rol === 'RESIDENTE' && <Dato etiqueta="Casa">{c.casa ?? '—'}</Dato>}
        <Dato etiqueta="Dos pasos">{c.dosPasos === 'APP' ? 'App autenticadora' : c.dosPasos === 'PRUEBA' ? 'Código de prueba' : <span className="text-alerta">Sin configurar</span>}</Dato>
        <Dato etiqueta="Último acceso">{haceCuanto(c.ultimoAcceso)}</Dato>
        <Dato etiqueta="Alta">{fecha(c.creadoEn)}</Dato>
      </div>

      {confirmar === 'restablecer' ? (
        <Confirmacion ocupado={ocupado} onNo={cancelar} titulo={c.tieneAcceso ? '¿Restablecer contraseña?' : '¿Generar acceso?'} boton="Generar contraseña" onSi={restablecer}
          texto={c.tieneAcceso ? 'Su contraseña actual dejará de servir y se cerrará su sesión en todos sus dispositivos.' : 'Se creará una contraseña temporal para que pueda entrar.'} />
      ) : confirmar === '2fa' ? (
        <Confirmacion ocupado={ocupado} onNo={cancelar} titulo="¿Restablecer su verificación en dos pasos?" boton="Restablecer" onSi={dosPasos}
          texto="Su app autenticadora actual dejará de servir, se cerrarán sus sesiones y la próxima vez que entre escaneará un código nuevo. Confirma antes que realmente es la persona (por ejemplo, en persona o por llamada)." />
      ) : confirmar === 'sesiones' ? (
        <Confirmacion ocupado={ocupado} onNo={cancelar} titulo="¿Cerrar sus sesiones?" boton="Cerrar sesiones" onSi={sesiones}
          texto="Saldrá de la app en todos sus dispositivos. Podrá volver a entrar con su contraseña. Útil si perdió o le robaron el celular." />
      ) : confirmar === 'suspender' ? (
        <Confirmacion ocupado={ocupado} onNo={cancelar} titulo={`¿Suspender a ${c.nombre.split(' ')[0]}?`} boton="Suspender" onSi={suspender}
          texto="No podrá entrar a la app y se cerrarán sus sesiones. Sus registros se conservan y puedes reactivarla después.">
          <div className="mt-3 flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button key={m} type="button" aria-pressed={motivo === m} onClick={() => setMotivo(motivo === m ? '' : m)}
                className={`min-h-9 rounded-full px-3 text-[0.875rem] font-medium transition-colors ${motivo === m ? 'bg-peligro text-white' : 'bg-panel ring-1 ring-inset ring-borde'}`}>{m}</button>
            ))}
          </div>
        </Confirmacion>
      ) : confirmar === 'eliminar' ? (
        <Confirmacion ocupado={ocupado} onNo={cancelar} titulo="¿Eliminar la cuenta?" boton="Eliminar" onSi={eliminar}
          texto="Se borra la cuenta y no se puede deshacer. Si solo quieres impedir que entre, mejor suspéndela." />
      ) : esYo ? (
        <div className="rounded-[18px] bg-panel shadow-tarjeta overflow-hidden">
          <Accion icono="editar" texto="Editar mis datos" onClick={onEditar} />
          <p className="border-t border-separador px-4 py-3 text-[0.8125rem] text-suave">Es tu cuenta: tu contraseña y tu sesión se manejan desde tu perfil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
            <Accion icono="editar" texto="Editar datos" detalle="Nombre, correo, teléfono, rol o casa" onClick={onEditar} />
            <Accion icono="candado" texto={c.tieneAcceso ? 'Restablecer contraseña' : 'Generar contraseña'} detalle={`Temporal, vence en ${HORAS_TEMPORAL} h`} onClick={() => setConfirmar('restablecer')} disabled={c.estado === 'SUSPENDIDA'} />
            <Accion icono="escanear" texto="Restablecer verificación en dos pasos" detalle="Si perdió o cambió de celular" onClick={() => setConfirmar('2fa')} disabled={c.estado === 'SUSPENDIDA' || c.dosPasos === 'SIN_CONFIGURAR'} />
            <Accion icono="salir" texto="Cerrar sus sesiones" detalle="La saca de todos sus dispositivos" onClick={() => setConfirmar('sesiones')} disabled={c.estado === 'SUSPENDIDA' || !c.tieneAcceso} />
          </div>
          <div className="rounded-[18px] bg-panel shadow-tarjeta divide-y divide-separador overflow-hidden">
            {c.estado === 'ACTIVA'
              ? <Accion icono="cerrar" texto="Suspender cuenta" detalle="Bloquea el acceso; se puede revertir" peligro onClick={() => { setMotivo(''); setConfirmar('suspender') }} />
              : <Accion icono="check" texto="Reactivar cuenta" detalle="Podrá volver a entrar con su contraseña" onClick={reactivar} disabled={ocupado} />}
            <Accion icono="basura" texto="Eliminar cuenta" peligro onClick={() => setConfirmar('eliminar')} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Contraseña temporal

function PasswordTemporal({ nombre, email, temporal }: { nombre: string; email: string; temporal: string }) {
  const mensaje = `Hola ${nombre.split(' ')[0]}, este es tu acceso a la app de la privada:\n\n${window.location.origin}\nCorreo: ${email}\nContraseña temporal: ${temporal}\n\nAl entrar te pedirá crear tu propia contraseña. La temporal vence en ${HORAS_TEMPORAL} horas.`
  const copiar = async (texto: string, que: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(`${que} copiado`) } catch { toast.error('No se pudo copiar. Selecciona el texto y cópialo.') }
  }
  const compartir = async () => {
    if (navigator.share) { try { await navigator.share({ text: mensaje }); return } catch { return } }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 shrink-0 rounded-full bg-ok text-white"><Icon n="check" size={22} stroke={2.4} /></span>
        <p className="text-[1.0625rem]"><span className="font-semibold">{nombre}</span> ya puede entrar con esta contraseña temporal.</p>
      </div>
      <div className="rounded-[20px] bg-panel p-5 shadow-tarjeta text-center">
        <p className="text-[0.8125rem] font-medium text-suave">{email}</p>
        <p className="mt-2 select-all font-mono text-[1.625rem] font-semibold tracking-[0.04em] break-all" aria-label={`Contraseña temporal: ${temporal.split('').join(' ')}`}>{temporal}</p>
        <button type="button" onClick={() => copiar(temporal, 'Contraseña')} className="mt-3 btn-secundario btn-chico"><Icon n="copiar" size={16} />Copiar</button>
      </div>
      <button type="button" onClick={compartir} className="btn-secundario w-full"><Icon n="compartir" size={18} />Enviar por WhatsApp</button>
      <ul className="list-disc space-y-2 rounded-[18px] bg-alerta/[0.08] py-4 pl-9 pr-4 text-[0.875rem] text-texto/85 marker:text-alerta">
        <li>Se muestra <span className="font-semibold">solo esta vez</span>. Si se pierde, genera otra.</li>
        <li>Vence en {HORAS_TEMPORAL} horas y al entrar se le pedirá crear la suya.</li>
        <li>Mándala solo a la persona, por un chat privado.</li>
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- Formularios

function FormCuenta({ inicial, casaInicial, esYo, onGuardar }: { inicial?: Cuenta; casaInicial?: string; esYo: boolean; onGuardar: (d: DatosCuenta) => Promise<void> }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [rol, setRol] = useState<Rol>(inicial?.rol ?? 'RESIDENTE')
  const [casa, setCasa] = useState(inicial?.casa ?? casaInicial ?? '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const v = useValidacion({
    nombre: validar.nombreCompleto(nombre),
    email: validar.email(email),
    telefono: validar.telefono(telefono, true),
    casa: rol === 'RESIDENTE' && !casa ? 'Elige la casa del residente.' : '',
  }, 'cuenta')
  const delicado = inicial && !esYo && (rol !== inicial.rol || (rol === 'RESIDENTE' && casa !== inicial.casa) || email !== inicial.email)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setError('')
    if (v.revisar()) return
    setEnviando(true)
    try { await onGuardar({ nombre: nombre.trim(), email, telefono: telefono || undefined, rol, casa: rol === 'RESIDENTE' ? casa : undefined }) }
    catch (err) {
      // El error se muestra en el campo al que se refiere (y la vista se mueve ahí)
      const m = err instanceof Error ? err.message : 'No se pudo guardar'
      if (/correo/i.test(m)) v.fallo('email', m)
      else if (/nombre/i.test(m)) v.fallo('nombre', m)
      else if (/tel[eé]fono/i.test(m)) v.fallo('telefono', m)
      else if (/casa/i.test(m)) v.fallo('casa', m)
      else setError(m)
    }
    finally { setEnviando(false) }
  }
  return (
    <form id="form-cuenta" onSubmit={enviar} noValidate className="space-y-6">
      <div>
        <label htmlFor="c-nombre" className="mb-2 block text-[1.0625rem] font-semibold">Nombre completo</label>
        <input id="c-nombre" value={nombre} onChange={(e) => setNombre(filtrar.nombre(e.target.value))} maxLength={LARGO.nombre} autoComplete="off" autoCapitalize="words"
          className={`${campo} ${CAMPO_INVALIDO} h-14`} placeholder="Ej. Ana López" {...v.props('nombre')} />
        <MensajeCampo id={v.idError('nombre')} mensaje={v.error('nombre')} />
      </div>
      <div>
        <label htmlFor="c-email" className="mb-2 block text-[1.0625rem] font-semibold">Correo</label>
        <input id="c-email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" spellCheck={false} value={email}
          onChange={(e) => setEmail(filtrar.email(e.target.value))} maxLength={LARGO.email} className={`${campo} ${CAMPO_INVALIDO} h-14`} placeholder="ana@correo.com" {...v.props('email')} />
        {v.error('email') ? <MensajeCampo id={v.idError('email')} mensaje={v.error('email')} /> : <p className="mt-1.5 px-1 text-[0.8125rem] text-suave">Con este correo entrará a la app.</p>}
      </div>
      <div>
        <label htmlFor="c-tel" className="mb-2 block text-[1.0625rem] font-semibold">Teléfono <span className="font-normal text-suave">(opcional)</span></label>
        <input id="c-tel" type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={telefono} onChange={(e) => setTelefono(filtrar.telefono(e.target.value))}
          maxLength={LARGO.telefono} className={`${campo} ${CAMPO_INVALIDO} h-14 cifras tracking-[0.04em]`} placeholder="10 dígitos" {...v.props('telefono')} />
        {v.error('telefono') ? <MensajeCampo id={v.idError('telefono')} mensaje={v.error('telefono')} />
          : <p className="mt-1.5 px-1 text-[0.8125rem] text-suave cifras">{telefono ? `${telefono.length} de 10 dígitos` : 'Solo números, sin lada (+52).'}</p>}
      </div>
      <div>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">Rol</h3>
        {esYo ? <p className="text-[0.9375rem] text-suave">{ETIQUETA_ROL[rol]} · no puedes cambiar tu propio rol.</p> : (
          <Opciones etiqueta="Rol" valor={rol} opcional={false} onCambio={(r) => r && setRol(r)}
            opciones={(['RESIDENTE', 'GUARDIA', 'ADMIN'] as Rol[]).map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r], extra: <Icon n={ICONO_ROL[r]} size={16} /> }))} />
        )}
        {rol === 'ADMIN' && !esYo && <p className="mt-3 rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.875rem] text-texto/85">Administración puede ver pagos, datos de todas las casas y dar de alta o suspender usuarios.</p>}
      </div>
      {rol === 'RESIDENTE' && (
        <div className="anim-llenar">
          <h3 className="mb-3 text-[1.0625rem] font-semibold">Casa {casa && <span className="font-normal text-suave">· {casa}</span>}</h3>
          <SelectorCasa valor={casa} onCambio={(c) => { setCasa(c); v.limpiar('casa') }} />
          <MensajeCampo id={v.idError('casa')} mensaje={v.error('casa')} />
        </div>
      )}
      {delicado && <p className="rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.875rem] text-texto/85">Al cambiar rol, casa o correo se cerrará su sesión para que entre con los permisos nuevos.</p>}
      <ErrorFormulario mensaje={error} />
    </form>
  )
}

function FormCasa({ onGuardar }: { onGuardar: (d: { calle: string; numero: string; notas?: string }) => Promise<void> }) {
  const calles = directorioService.calles()
  const [calle, setCalle] = useState<string | null>(calles[0] ?? 'OTRA')
  const [otra, setOtra] = useState('')
  const [numero, setNumero] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const nombreCalle = calle === 'OTRA' ? otra.trim() : calle ?? ''
  const repetida = calle === 'OTRA' && calles.some((c) => normal(c) === normal(otra.trim()))
  const v = useValidacion({
    calle: calle === 'OTRA' ? validar.calle(otra) || (repetida ? 'Esa calle ya existe: elígela arriba.' : '') : '',
    numero: validar.numeroCasa(numero) || (directorioService.casasActivas().some((c) => normal(c) === normal(`Calle ${nombreCalle} ${numero}`)) ? 'Esa casa ya está dada de alta.' : ''),
  }, 'casa')
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setError('')
    if (v.revisar()) return
    setEnviando(true)
    try { await onGuardar({ calle: nombreCalle, numero, notas: notas.trim() }) }
    catch (err) {
      const m = err instanceof Error ? err.message : 'No se pudo guardar'
      if (/calle/i.test(m) && calle === 'OTRA') v.fallo('calle', m)
      else if (/n[uú]mero|casa/i.test(m)) v.fallo('numero', m)
      else setError(m)
    }
    finally { setEnviando(false) }
  }
  return (
    <form id="form-casa" onSubmit={enviar} noValidate className="space-y-6">
      <div>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">Calle</h3>
        <Opciones etiqueta="Calle" valor={calle} opcional={false} onCambio={(c) => c && setCalle(c)}
          opciones={[...calles.map((c) => ({ valor: c, etiqueta: c })), { valor: 'OTRA', etiqueta: 'Calle nueva', extra: <Icon n="mas" size={16} /> }]} />
        {calle === 'OTRA' && (
          <>
            <input value={otra} onChange={(e) => setOtra(filtrar.calle(e.target.value))} maxLength={LARGO.calle} aria-label="Nombre de la calle nueva" placeholder="Ej. Sauce"
              autoCapitalize="words" className={`${campo} ${CAMPO_INVALIDO} anim-llenar mt-3 h-14`} {...v.props('calle')} />
            <MensajeCampo id={v.idError('calle')} mensaje={v.error('calle')} />
          </>
        )}
      </div>
      <div>
        <label htmlFor="casa-num" className="mb-2 block text-[1.0625rem] font-semibold">Número</label>
        <input id="casa-num" value={numero} onChange={(e) => setNumero(filtrar.numeroCasa(e.target.value))} maxLength={LARGO.numeroCasa} inputMode="text" autoComplete="off"
          autoCapitalize="characters" className={`${campo} ${CAMPO_INVALIDO} h-14 cifras`} placeholder="Ej. 111 o 12B" {...v.props('numero')} />
        {v.error('numero') ? <MensajeCampo id={v.idError('numero')} mensaje={v.error('numero')} />
          : <p className="mt-1.5 px-1 text-[0.8125rem] text-suave">La dirección no se puede cambiar después porque los pagos y accesos quedan ligados a ella.</p>}
      </div>
      <div>
        <label htmlFor="casa-notas" className="mb-2 block text-[1.0625rem] font-semibold">Notas <span className="font-normal text-suave">(opcional)</span></label>
        <textarea id="casa-notas" value={notas} onChange={(e) => setNotas(filtrar.texto(e.target.value, LARGO.notaCorta))} maxLength={LARGO.notaCorta} rows={3} className={`${campo} py-3 resize-y`} placeholder="Ej. Casa en renta, esquina con área verde" />
        <p className="mt-1 px-1 text-right text-[0.8125rem] text-suave cifras">{notas.length}/{LARGO.notaCorta}</p>
      </div>
      <ErrorFormulario mensaje={error} />
    </form>
  )
}

// ---------------------------------------------------------------- Detalle de casa

function DetalleCasa({ casa: c, cuentas, actor, onCuenta, onAgregar }: { casa: Casa; cuentas: Cuenta[]; actor: Actor; onCuenta: (id: string) => void; onAgregar: () => void }) {
  const nombre = nombreCasa(c)
  const residentes = cuentas.filter((u) => u.casa === nombre)
  const [notas, setNotas] = useState(c.notas ?? '')
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const guardar = async (activa: boolean, aviso?: string) => {
    setOcupado(true)
    try { await directorioService.editarCasa(c.id, { notas, activa }, actor); if (aviso) toast.success(aviso); setConfirmar(false) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo guardar') }
    finally { setOcupado(false) }
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[1.25rem] font-semibold">{nombre}</p>
        <p className="mt-0.5 text-[0.9375rem] text-suave">{c.activa ? `Alta: ${fecha(c.creadaEn)}` : 'Desactivada: no aparece en caseta, anuncios ni cobranza'}</p>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-[1.0625rem] font-semibold">Residentes</h3>
          {c.activa && <button type="button" onClick={onAgregar} className="min-h-11 inline-flex items-center gap-1 text-[0.9375rem] font-medium text-acento"><Icon n="mas" size={16} stroke={2.2} />Agregar</button>}
        </div>
        <div className="rounded-[18px] bg-panel shadow-tarjeta overflow-hidden">
          {residentes.length === 0 ? <p className="px-4 py-6 text-center text-[0.9375rem] text-suave">Nadie registrado en esta casa.</p> : (
            <ul className="divide-y divide-separador">
              {residentes.map((u) => {
                const e = estadoAcceso(u)
                return (
                  <li key={u.id}>
                    <button type="button" onClick={() => onCuenta(u.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-texto/[0.03] active:bg-texto/[0.05]">
                      <Avatar nombre={u.nombre} rol={u.rol} apagado={u.estado === 'SUSPENDIDA'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[1rem] font-medium">{u.nombre}</span>
                        <span className="block truncate text-[0.8125rem] text-suave">{u.email}</span>
                      </span>
                      {e && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${e.c}`}>{e.t}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <label htmlFor="det-notas" className="mb-2 block px-1 text-[1.0625rem] font-semibold">Notas</label>
        <textarea id="det-notas" value={notas} onChange={(e) => setNotas(filtrar.texto(e.target.value, LARGO.notaCorta))} maxLength={LARGO.notaCorta} rows={2} className={`${campo} py-3 resize-y`} placeholder="Solo las ve la administración" />
        {notas !== (c.notas ?? '') && <button type="button" onClick={() => guardar(c.activa, 'Notas guardadas')} disabled={ocupado} className="anim-llenar mt-2 btn-secundario btn-chico">Guardar notas</button>}
      </section>

      {confirmar ? (
        <div role="alertdialog" aria-label="Confirmar" className="anim-llenar rounded-[20px] bg-peligro/[0.06] p-4 ring-1 ring-inset ring-peligro/20">
          <p className="text-[1rem] font-semibold">¿Desactivar {c.calle} {c.numero}?</p>
          <p className="mt-0.5 text-[0.875rem] text-texto/75">Dejará de aparecer en caseta, anuncios y cobranza. Su historial se conserva.</p>
          <div className="mt-3 flex gap-2.5">
            <button type="button" onClick={() => setConfirmar(false)} className="btn-secundario btn-chico">Cancelar</button>
            <button type="button" onClick={() => guardar(false, 'Casa desactivada')} disabled={ocupado} className="btn btn-chico bg-peligro text-white">Desactivar</button>
          </div>
        </div>
      ) : (
        <div className="rounded-[18px] bg-panel shadow-tarjeta overflow-hidden">
          {c.activa
            ? <Accion icono="cerrar" texto="Desactivar casa" detalle="Por ejemplo si se fusionó con otra o se capturó mal" peligro onClick={() => setConfirmar(true)} />
            : <Accion icono="check" texto="Reactivar casa" onClick={() => guardar(true, 'Casa reactivada')} disabled={ocupado} />}
        </div>
      )}
    </div>
  )
}
