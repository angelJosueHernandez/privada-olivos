import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Encabezado from '../../shared/ui/Encabezado'
import Hoja from '../../shared/ui/Hoja'
import Icon from '../../shared/ui/Icon'
import { Opciones } from '../../shared/ui/Opciones'
import { useAtrasCierra } from '../../shared/ui/useAtrasCierra'
import Vacio from '../../shared/ui/Vacio'
import { useAuth } from '../auth/AuthContext'
import type { Actor } from '../caseta/tipos'
import { comunidadService } from '../comunidad/comunidadService'
import ListaAnuncios from '../comunidad/ListaAnuncios'
import { Anuncio, anuncioVigente, CALLES, CATEGORIAS, CategoriaAnuncio, fechaLocal, NuevoAnuncio } from '../comunidad/tipos'

const FORM = 'anuncio'
const campo = 'block w-full rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento placeholder:text-texto/40'
type Vigencia = 'SIEMPRE' | 'SEMANA' | 'MES' | 'FECHA'
type Filtro = 'VISIBLES' | 'TODOS'

/* Administración: configura los anuncios que ven los residentes (a quién, hasta cuándo, si se destacan) */
export default function AdminAnuncios() {
  const { user } = useAuth()
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'ADMIN' }), [user])
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  const [editando, setEditando] = useState<Anuncio | 'nuevo' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [borrar, setBorrar] = useState<Anuncio | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('VISIBLES')

  const cargar = useCallback(async () => {
    try { setAnuncios(await comunidadService.anuncios()) } catch { toast.error('No se pudieron cargar los anuncios') }
  }, [])
  useEffect(() => { void cargar(); return comunidadService.suscribir(() => void cargar()) }, [cargar])
  useAtrasCierra(editando !== null, () => setEditando(null))

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
        : <ListaAnuncios anuncios={lista} onBorrar={setBorrar} onEditar={setEditando} />}

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
  const [error, setError] = useState('')
  const hoy = fechaLocal()

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
    const falta = t.length < 4 ? 'Escribe un título.' : c.length < 10 ? 'Escribe el mensaje.' : !categoria ? 'Elige una categoría.' : vence === null ? 'Elige una fecha a partir de hoy.' : ''
    if (falta) { setError(falta); toast.error(falta); return }
    setError('')
    await onGuardar({ titulo: t.slice(0, 90), cuerpo: c.slice(0, 2000), categoria: categoria!, importante, calle: calle === 'TODAS' ? undefined : calle, vence: vence ?? undefined })
  }

  return (
    <form id={FORM} onSubmit={enviar} noValidate className="space-y-7">
      <div className="anim-entrar">
        <label htmlFor="titulo" className="mb-2 block text-[1.0625rem] font-semibold">Título</label>
        <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={90} className={`${campo} h-14`} placeholder="Ej. Corte de agua el jueves" />
      </div>
      <div className="anim-entrar" style={{ animationDelay: '40ms' }}>
        <label htmlFor="cuerpo" className="mb-2 block text-[1.0625rem] font-semibold">Mensaje</label>
        <textarea id="cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} maxLength={2000} rows={6} className={`${campo} py-3 leading-[1.5] resize-y`}
          placeholder="Qué pasa, cuándo y qué deben hacer los vecinos." />
        <p className="mt-1 px-1 text-right text-[0.8125rem] text-suave cifras">{cuerpo.length}/2000</p>
      </div>
      <div className="anim-entrar" style={{ animationDelay: '80ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">Categoría</h3>
        <Opciones etiqueta="Categoría" valor={categoria} opcional={false} onCambio={setCategoria} opciones={CATEGORIAS.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))} />
      </div>
      <div className="anim-entrar" style={{ animationDelay: '120ms' }}>
        <h3 className="mb-3 text-[1.0625rem] font-semibold">¿Para quién?</h3>
        <Opciones etiqueta="Destinatarios" valor={calle} opcional={false} onCambio={(v) => v && setCalle(v)}
          opciones={[{ valor: 'TODAS', etiqueta: 'Todas las casas' }, ...CALLES.map((c) => ({ valor: c as string, etiqueta: `Calle ${c}` }))]} />
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
      <label className="anim-entrar flex items-center gap-4 rounded-[18px] bg-panel p-4 shadow-tarjeta cursor-pointer" style={{ animationDelay: '200ms' }}>
        <span className="min-w-0 flex-1">
          <span className="block text-[1rem] font-semibold">Destacar en el inicio</span>
          <span className="block text-[0.875rem] text-suave">Aparece como aviso importante arriba de todo en la app del residente.</span>
        </span>
        <input type="checkbox" checked={importante} onChange={(e) => setImportante(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-texto/[0.16] transition-colors duration-200 peer-checked:bg-ok
          after:absolute after:left-[2px] after:top-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-white after:shadow-[0_2px_4px_rgb(0_0_0/0.2)]
          after:transition-transform after:duration-200 after:ease-[var(--ease-out)] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-acento/55" />
      </label>
      {error && <p role="alert" className="anim-sacudir rounded-[14px] bg-peligro/[0.08] px-4 py-3 text-[0.9375rem] font-medium text-peligro">{error}</p>}
    </form>
  )
}
