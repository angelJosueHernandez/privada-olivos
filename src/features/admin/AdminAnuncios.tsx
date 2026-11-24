import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import Icon from '../../shared/ui/Icon'
import { Opciones } from '../../shared/ui/Opciones'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import Vacio from '../../shared/ui/Vacio'
import { CAMPO_INVALIDO, ErrorFormulario, MensajeCampo, useValidacion } from '../../shared/ui/useValidacion'
import { filtrar, LARGO, validar } from '../../shared/validacion'
import { useAuth } from '../auth/AuthContext'
import { directorioService } from '../directorio/directorioService'
import type { Actor } from '../caseta/tipos'
import { comunidadService } from '../comunidad/comunidadService'
import ListaAnuncios, { contarRespuestas } from '../comunidad/ListaAnuncios'
import { Anuncio, anuncioPara, anuncioVigente, CATEGORIAS, CategoriaAnuncio, fechaLocal, NuevoAnuncio, TipoRespuesta } from '../comunidad/tipos'

const FORM = 'anuncio'
const campo = 'block w-full rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento placeholder:text-suave'
type Vigencia = 'SIEMPRE' | 'SEMANA' | 'MES' | 'FECHA'
type Filtro = 'VISIBLES' | 'TODOS'
type PideRespuesta = TipoRespuesta | 'NO'

/* Administración: configura los anuncios que ven los residentes (a quién, hasta cuándo, si se destacan) */
export default function AdminAnuncios() {
  const { user } = useAuth()
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'ADMIN' }), [user])
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  const [editando, setEditando] = useState<Anuncio | 'nuevo' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [borrar, setBorrar] = useState<Anuncio | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('VISIBLES')
  const [respuestasDe, setRespuestasDe] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try { setAnuncios(await comunidadService.anuncios()) } catch { toast.error('No se pudieron cargar los anuncios') }
  }, [])
  useEffect(() => { void cargar(); return comunidadService.suscribir(() => void cargar()) }, [cargar])
  useAtrasCierra(editando !== null, () => setEditando(null))
  useAtrasCierra(respuestasDe !== null, () => setRespuestasDe(null))
  // Se busca por id para que la hoja se actualice en vivo cuando llegan respuestas
  const viendo = respuestasDe ? anuncios?.find((a) => a.id === respuestasDe) : undefined

  const guardar = async (d: NuevoAnuncio) => {
    setEnviando(true)
    try {
      if (editando && editando !== 'nuevo') {
        await comunidadService.editarAnuncio(editando.id, d)
        toast.success('Anuncio actualizado')
      } else {
        await comunidadService.publicarAnuncio(d, actor)
        toast.success('Anuncio publicado', { description: d.calle ? `Se notificó a las casas de Calle ${d.calle}.` : 'Se notificó a todas las casas.' })
      }
      setEditando(null); void cargar()
    } catch { toast.error('No se pudo guardar el anuncio') }
    finally { setEnviando(false) }
  }
  const confirmarBorrado = async () => {
    if (!borrar) return
    try { await comunidadService.borrarAnuncio(borrar.id); toast.success('Anuncio borrado'); setBorrar(null); void cargar() }
    catch { toast.error('No se pudo borrar') }
  }

  const visibles = (anuncios ?? []).filter((a) => anuncioVigente(a))
  const lista = filtro === 'VISIBLES' ? visibles : anuncios ?? []

  return (
    <>
      <Encabezado titulo="Anuncios" detalle="Configura lo que ven los residentes"
        accion={<button onClick={() => setEditando('nuevo')} className="btn-primario btn-chico"><Icon n="mas" size={17} stroke={2.2} />Nuevo</button>} />

      <div role="group" aria-label="Filtrar anuncios" className="mb-4 inline-grid grid-cols-2 gap-1 rounded-[12px] bg-texto/[0.06] p-1">
        {([['VISIBLES', 'Visibles', visibles.length], ['TODOS', 'Todos', anuncios?.length ?? 0]] as [Filtro, string, number][]).map(([v, t, n]) => (
          <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}
            className={`h-9 px-4 rounded-[9px] text-[0.875rem] font-medium transition-[background-color,color,box-shadow] duration-150
              ${filtro === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>{t} <span className="cifras">{n}</span></button>
        ))}
      </div>

      {borrar && (
        <div role="alertdialog" aria-label="Confirmar borrado" className="anim-llenar mb-4 rounded-[20px] bg-peligro/[0.06] p-4 ring-1 ring-inset ring-peligro/20">
          <p className="text-[0.9375rem] font-semibold">¿Borrar “{borrar.titulo}”?</p>
          <p className="mt-0.5 text-[0.875rem] text-suave">Dejará de verse para los residentes.</p>
          <div className="mt-3 flex gap-2.5">
            <button type="button" onClick={() => setBorrar(null)} className="btn-secundario btn-chico">Cancelar</button>
            <button type="button" onClick={confirmarBorrado} className="btn btn-chico bg-peligro text-white">Borrar</button>
          </div>
        </div>
      )}

      {anuncios === null ? <div className="h-40 rounded-[22px] bg-panel shadow-tarjeta animate-pulse" />
        : lista.length === 0 ? <Vacio icono="megafono" titulo="Sin anuncios" texto="Publica avisos de mantenimiento, eventos o pagos para todas las casas o para una calle." />
        : <ListaAnuncios anuncios={lista} onBorrar={setBorrar} onEditar={setEditando} onVerRespuestas={(a) => setRespuestasDe(a.id)} />}

      {viendo && (
        <Hoja titulo="Respuestas" onCerrar={() => setRespuestasDe(null)}>
          <RespuestasPorCasa anuncio={viendo} />
        </Hoja>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Nuevo anuncio' : 'Editar anuncio'} onCerrar={() => setEditando(null)}
          pie={<button type="submit" form={FORM} disabled={enviando} className="btn-primario w-full">
            {enviando ? 'Guardando…' : editando === 'nuevo' ? <><Icon n="megafono" size={19} />Publicar y notificar</> : 'Guardar cambios'}
          </button>}>
          <FormAnuncio inicial={editando === 'nuevo' ? undefined : editando} onGuardar={guardar} />
        </Hoja>
      )}
    </>
  )
}

function FormAnuncio({ inicial, onGuardar }: { inicial?: Anuncio; onGuardar: (d: NuevoAnuncio) => Promise<void> }) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [cuerpo, setCuerpo] = useState(inicial?.cuerpo ?? '')
  const [categoria, setCategoria] = useState<CategoriaAnuncio | null>(inicial?.categoria ?? 'GENERAL')
  const [importante, setImportante] = useState(inicial?.importante ?? false)
  const [calle, setCalle] = useState<string>(inicial?.calle ?? 'TODAS')
  const [vigencia, setVigencia] = useState<Vigencia>(inicial?.vence ? 'FECHA' : 'SIEMPRE')
  const [fecha, setFecha] = useState(inicial?.vence ? fechaLocal(inicial.vence) : '')
  const [pide, setPide] = useState<PideRespuesta>(inicial?.pideRespuesta ?? 'NO')
  const [error, setError] = useState('')
  const hoy = fechaLocal()
  const v = useValidacion({
    titulo: validar.texto(titulo, 4, 'el título'),
    cuerpo: validar.texto(cuerpo, 10, 'el mensaje'),
  }, 'anuncio')

  const calcularVence = (): Date | undefined | null => {
    const d = new Date()
    if (vigencia === 'SIEMPRE') return undefined
    if (vigencia === 'SEMANA') { d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); return d }
    if (vigencia === 'MES') { d.setMonth(d.getMonth() + 1); d.setHours(23, 59, 0, 0); return d }
    if (!fecha) return null
    const f = new Date(`${fecha}T23:59:00`)
    return isNaN(f.getTime()) || f.getTime() < Date.now() ? null : f
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const t = titulo.trim(), c = cuerpo.trim()
    const vence = calcularVence()
    setError('')
    if (v.revisar()) return
    const falta = !categoria ? 'Elige una categoría.' : vence === null ? 'Elige una fecha a partir de hoy.' : ''
    if (falta) { setError(falta); return }
    setError('')
    await onGuardar({ titulo: t.slice(0, 90), cuerpo: c.slice(0, 2000), categoria: categoria!, importante, calle: calle === 'TODAS' ? undefined : calle, vence: vence ?? undefined, pideRespuesta: pide === 'NO' ? undefined : pide })
  }

  return (
    <form id={FORM} onSubmit={enviar} noValidate className="space-y-7">
      <div className="anim-entrar">
        <label htmlFor="titulo" className="mb-2 block text-[1.0625rem] font-semibold">Título</label>
        <input id="titulo" value={titulo} onChange={(e) => setTitulo(filtrar.linea(e.target.value, LARGO.titulo))} maxLength={LARGO.titulo} className={`${campo} ${CAMPO_INVALIDO} h-14`} placeholder="Ej. Corte de agua el jueves" {...v.props('titulo')} />
        <MensajeCampo id={v.idError('titulo')} mensaje={v.error('titulo')} />
      </div>
      <div className="anim-entrar" style={{ animationDelay: '40ms' }}>
        <label htmlFor="cuerpo" className="mb-2 block text-[1.0625rem] font-semibold">Mensaje</label>
        <textarea id="cuerpo" value={cuerpo} onChange={(e) => setCuerpo(filtrar.texto(e.target.value, LARGO.mensaje))} maxLength={LARGO.mensaje} rows={6} className={`${campo} ${CAMPO_INVALIDO} py-3 leading-[1.5] resize-y`} {...v.props('cuerpo')}
          placeholder="Qué pasa, cuándo y qué deben hacer los vecinos." />
        <div className="mt-1 flex items-start justify-between gap-3">
          <MensajeCampo id={v.idError('cuerpo')} mensaje={v.error('cuerpo')} />
          <p className="ml-auto px-1 pt-1.5 text-[0.8125rem] text-suave cifras">{cuerpo.length}/{LARGO.mensaje}</p>
        </div>
      </div>
      <div className="anim-entrar" style={{ animationDelay: '80ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">Categoría</h3>
        <Opciones etiqueta="Categoría" valor={categoria} opcional={false} onCambio={setCategoria} opciones={CATEGORIAS.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))} />
      </div>
      <div className="anim-entrar" style={{ animationDelay: '120ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Para quién?</h3>
        <Opciones etiqueta="Destinatarios" valor={calle} opcional={false} onCambio={(v) => v && setCalle(v)}
          opciones={[{ valor: 'TODAS', etiqueta: 'Todas las casas' }, ...directorioService.calles().map((c) => ({ valor: c, etiqueta: `Calle ${c}` }))]} />
      </div>
      <div className="anim-entrar" style={{ animationDelay: '160ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Hasta cuándo se muestra?</h3>
        <Opciones etiqueta="Vigencia" valor={vigencia} opcional={false} onCambio={(v) => v && setVigencia(v)}
          opciones={[{ valor: 'SIEMPRE' as Vigencia, etiqueta: 'Sin fecha límite' }, { valor: 'SEMANA' as Vigencia, etiqueta: '1 semana' }, { valor: 'MES' as Vigencia, etiqueta: '1 mes' }, { valor: 'FECHA' as Vigencia, etiqueta: 'Elegir fecha', extra: <Icon n="calendario" size={16} /> }]} />
        {vigencia === 'FECHA' && (
          <input type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} aria-label="Mostrar hasta"
            className={`${campo} anim-llenar mt-3 h-14`} />
        )}
      </div>
      <div className="anim-entrar" style={{ animationDelay: '200ms' }}>
        <h3 className="mb-1 text-[1.0625rem] font-semibold">¿Pedir respuesta a las casas?</h3>
        <p className="mb-3 text-[0.875rem] text-suave">Verás quién ya respondió y podrás recordarle a quien falte.</p>
        <Opciones etiqueta="Respuesta" valor={pide} opcional={false} onCambio={(v) => v && setPide(v)}
          opciones={[{ valor: 'NO' as PideRespuesta, etiqueta: 'No, solo informar' }, { valor: 'ENTERADO' as PideRespuesta, etiqueta: 'Confirmar de enterado', extra: <Icon n="check" size={16} /> },
            { valor: 'ASISTENCIA' as PideRespuesta, etiqueta: 'Confirmar asistencia', extra: <Icon n="calendario" size={16} /> }]} />
        {inicial?.pideRespuesta && pide !== inicial.pideRespuesta && (
          <p className="anim-llenar mt-3 rounded-[14px] bg-alerta/[0.1] px-4 py-3 text-[0.875rem] text-texto/85">
            Al cambiar la pregunta se borran las {inicial.respuestas?.length ?? 0} respuestas que ya llegaron y las casas tendrán que responder de nuevo.</p>
        )}
      </div>
      <label className="anim-entrar flex items-center gap-4 rounded-[18px] bg-panel p-4 shadow-tarjeta cursor-pointer" style={{ animationDelay: '240ms' }}>
        <span className="min-w-0 flex-1">
          <span className="block text-[1rem] font-semibold">Destacar en el inicio</span>
          <span className="block text-[0.875rem] text-suave">Aparece como aviso importante arriba de todo en la app del residente.</span>
        </span>
        <input type="checkbox" checked={importante} onChange={(e) => setImportante(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-texto/[0.16] transition-colors duration-200 peer-checked:bg-ok
          after:absolute after:left-[2px] after:top-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-white after:shadow-[0_2px_4px_rgb(0_0_0/0.2)]
          after:transition-transform after:duration-200 after:ease-[var(--ease-out)] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-acento/55" />
      </label>
      <ErrorFormulario mensaje={error} />
    </form>
  )
}

type Grupo = 'SI' | 'NO' | 'FALTAN'
const horaRespuesta = (d: Date) => d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/* Quién respondió y quién falta, con recordatorio para los pendientes */
function RespuestasPorCasa({ anuncio: a }: { anuncio: Anuncio }) {
  const asistencia = a.pideRespuesta === 'ASISTENCIA'
  const [grupo, setGrupo] = useState<Grupo>('SI')
  const [enviando, setEnviando] = useState(false)
  const t = contarRespuestas(a)
  const porCasa = new Map((a.respuestas ?? []).map((r) => [r.casa, r]))
  const destino = directorioService.casasActivas().filter((c) => anuncioPara(a, c))
  const faltan = destino.filter((c) => !porCasa.has(c))
  const si = (a.respuestas ?? []).filter((r) => r.valor !== 'NO_ASISTE').sort((x, y) => y.en.getTime() - x.en.getTime())
  const no = (a.respuestas ?? []).filter((r) => r.valor === 'NO_ASISTE').sort((x, y) => y.en.getTime() - x.en.getTime())
  const grupos: [Grupo, string, number][] = asistencia
    ? [['SI', 'Asisten', si.length], ['NO', 'No van', no.length], ['FALTAN', 'Faltan', faltan.length]]
    : [['SI', 'Enterados', si.length], ['FALTAN', 'Faltan', faltan.length]]

  const recordar = async () => {
    setEnviando(true)
    try {
      const n = await comunidadService.recordarPendientes(a.id)
      toast.success('Recordatorio enviado', { description: `Se notificó a ${n} ${n === 1 ? 'casa' : 'casas'} que no han respondido.` })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo enviar el recordatorio') }
    finally { setEnviando(false) }
  }

  const fila = (casa: string, detalle: string, extra?: string) => (
    <li key={casa} className="flex items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] font-medium truncate">{casa}</span>
        <span className="block text-[0.8125rem] text-suave truncate cifras">{detalle}</span>
      </span>
      {extra && <span className="shrink-0 rounded-full bg-ok/[0.12] px-2.5 py-1 text-[0.8125rem] font-semibold text-ok cifras">{extra}</span>}
    </li>
  )
  const lista = grupo === 'FALTAN' ? faltan.map((c) => fila(c, 'Todavía no responde'))
    : (grupo === 'SI' ? si : no).map((r) => fila(r.casa, `${r.por.nombre} · ${horaRespuesta(r.en)}`,
      r.valor === 'ASISTE' ? `${r.personas ?? 1} ${(r.personas ?? 1) === 1 ? 'persona' : 'personas'}` : undefined))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[1.0625rem] font-semibold leading-snug">{a.titulo}</p>
        <p className="mt-0.5 text-[0.9375rem] text-suave">{a.calle ? `Calle ${a.calle}` : 'Todas las casas'} · {t.total} casas</p>
      </div>
      {asistencia && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-panel p-4 shadow-tarjeta">
            <p className="text-[0.8125rem] font-medium text-suave">Personas confirmadas</p>
            <p className="mt-1 text-[1.75rem] font-semibold leading-none cifras">{t.personas}</p>
          </div>
          <div className="rounded-[18px] bg-panel p-4 shadow-tarjeta">
            <p className="text-[0.8125rem] font-medium text-suave">Casas que asisten</p>
            <p className="mt-1 text-[1.75rem] font-semibold leading-none cifras">{t.asisten}<span className="text-[1rem] font-medium text-suave"> / {t.total}</span></p>
          </div>
        </div>
      )}
      <div role="group" aria-label="Mostrar" className={`grid gap-1 rounded-[12px] bg-texto/[0.06] p-1 ${grupos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {grupos.map(([v, txt, n]) => (
          <button key={v} type="button" aria-pressed={grupo === v} onClick={() => setGrupo(v)}
            className={`h-9 px-2 rounded-[9px] text-[0.875rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150
              ${grupo === v ? 'bg-panel text-texto shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-texto/70'}`}>{txt} <span className="cifras">{n}</span></button>
        ))}
      </div>
      {grupo === 'FALTAN' && faltan.length > 0 && anuncioVigente(a) && (
        <button type="button" onClick={recordar} disabled={enviando} className="btn-primario w-full">
          <Icon n="avisos" size={19} />{enviando ? 'Enviando…' : `Recordar a ${faltan.length} ${faltan.length === 1 ? 'casa' : 'casas'}`}
        </button>
      )}
      <div className="rounded-[20px] bg-panel shadow-tarjeta overflow-hidden">
        {lista.length ? <ul className="divide-y divide-separador">{lista}</ul>
          : <p className="px-5 py-10 text-center text-[0.9375rem] text-suave">{grupo === 'FALTAN' ? 'Todas las casas respondieron.' : 'Nadie en este grupo todavía.'}</p>}
      </div>
    </div>
  )
}
