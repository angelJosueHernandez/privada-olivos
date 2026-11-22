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
import { Anuncio, CATEGORIAS, CategoriaAnuncio } from '../comunidad/tipos'

const FORM = 'nuevo-anuncio'
const campo = 'block w-full rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none transition-[box-shadow] duration-150 focus:ring-2 focus:ring-acento placeholder:text-texto/40'

/* Administración: publica anuncios para todas las casas (les llega notificación) */
export default function AdminAnuncios() {
  const { user } = useAuth()
  const actor: Actor = useMemo(() => ({ id: user?.id ?? '', nombre: user?.nombre ?? '', rol: 'ADMIN' }), [user])
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null)
  const [creando, setCreando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [borrar, setBorrar] = useState<Anuncio | null>(null)

  const cargar = useCallback(async () => {
    try { setAnuncios(await comunidadService.anuncios()) } catch { toast.error('No se pudieron cargar los anuncios') }
  }, [])
  useEffect(() => { void cargar(); return comunidadService.suscribir(() => void cargar()) }, [cargar])
  useAtrasCierra(creando, () => setCreando(false))

  const publicar = async (d: { titulo: string; cuerpo: string; categoria: CategoriaAnuncio; importante: boolean }) => {
    setEnviando(true)
    try {
      await comunidadService.publicarAnuncio(d, actor)
      toast.success('Anuncio publicado', { description: 'Se envió una notificación a todas las casas.' })
      setCreando(false); void cargar()
    } catch { toast.error('No se pudo publicar el anuncio') }
    finally { setEnviando(false) }
  }
  const confirmarBorrado = async () => {
    if (!borrar) return
    try { await comunidadService.borrarAnuncio(borrar.id); toast.success('Anuncio borrado'); setBorrar(null); void cargar() }
    catch { toast.error('No se pudo borrar') }
  }

  return (
    <>
      <Encabezado titulo="Anuncios" detalle="Lo que publiques llega a todas las casas"
        accion={<button onClick={() => setCreando(true)} className="btn-primario btn-chico"><Icon n="mas" size={17} stroke={2.2} />Nuevo</button>} />

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
        : anuncios.length === 0 ? <Vacio icono="megafono" titulo="Sin anuncios" texto="Publica avisos de mantenimiento, eventos o pagos para todas las casas." />
        : <ListaAnuncios anuncios={anuncios} onBorrar={setBorrar} />}

      {creando && (
        <Hoja titulo="Nuevo anuncio" onCerrar={() => setCreando(false)}
          pie={<button type="submit" form={FORM} disabled={enviando} className="btn-primario w-full">{enviando ? 'Publicando…' : <><Icon n="megafono" size={19} />Publicar y notificar</>}</button>}>
          <FormAnuncio onPublicar={publicar} />
        </Hoja>
      )}
    </>
  )
}

function FormAnuncio({ onPublicar }: { onPublicar: (d: { titulo: string; cuerpo: string; categoria: CategoriaAnuncio; importante: boolean }) => Promise<void> }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaAnuncio | null>('GENERAL')
  const [importante, setImportante] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const t = titulo.trim(), c = cuerpo.trim()
    const falta = t.length < 4 ? 'Escribe un título.' : c.length < 10 ? 'Escribe el mensaje.' : !categoria ? 'Elige una categoría.' : ''
    if (falta) { setError(falta); toast.error(falta); return }
    setError('')
    await onPublicar({ titulo: t.slice(0, 90), cuerpo: c.slice(0, 2000), categoria: categoria!, importante })
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
      <label className="anim-entrar flex items-center gap-4 rounded-[18px] bg-panel p-4 shadow-tarjeta cursor-pointer" style={{ animationDelay: '120ms' }}>
        <span className="min-w-0 flex-1">
          <span className="block text-[1rem] font-semibold">Marcar como importante</span>
          <span className="block text-[0.875rem] text-suave">Se fija arriba y se resalta para todos.</span>
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
