import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Icon, { IconName } from '../../shared/ui/Icon'
import { Opciones, OpcionesMultiples } from '../../shared/ui/Opciones'
import FotosGuiadas, { ApartadoFoto, FotoEvidencia, GUIAS, guiasPara } from './FotosGuiadas'
import LectorPlaca from './LectorPlaca'
import LogoEmpresa from './LogoEmpresa'
import SelectorCasa from './SelectorCasa'
import { CAMPO_INVALIDO, ErrorFormulario, MensajeCampo, useValidacion } from '../../shared/ui/useValidacion'
import { filtrar, LARGO, validar } from '../../shared/validacion'
import { casetaService } from './casetaService'
import {
  Acceso, Color, COLORES, EMPRESAS, ETIQUETA_TIPO, ETIQUETAS, LecturaPlaca, NuevoAcceso, tienePlaca, Vehiculo, VEHICULOS,
} from './tipos'

export type PasoRegistro = 'fotos' | 'datos'

const TIPOS: { valor: NuevoAcceso['tipo']; etiqueta: string; icono: IconName }[] = [
  { valor: 'PAQUETERIA', etiqueta: 'Paquetería', icono: 'paquete' },
  { valor: 'COMIDA', etiqueta: 'Comida', icono: 'comida' },
  { valor: 'SERVICIO', etiqueta: 'Servicio', icono: 'herramienta' },
  { valor: 'VISITA_SIN_QR', etiqueta: 'Visita', icono: 'visita' },
]
const VEHICULO_POR_IA: Record<LecturaPlaca['tipoVehiculo'], Vehiculo | undefined> = {
  AUTO: 'AUTO', CAMIONETA: 'CAMIONETA', MOTO: 'MOTO', CAMION: 'CAMION', DESCONOCIDO: undefined,
}
const OTRA = 'Otra'

function Seccion({ titulo, extra, children, retraso = 0 }: { titulo: string; extra?: ReactNode; children: ReactNode; retraso?: number }) {
  return (
    <section className="anim-entrar" style={{ animationDelay: `${retraso}ms` }}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

export default function RegistroManual({ idFormulario, onEnviar, onPaso }: {
  idFormulario: string
  onEnviar: (datos: NuevoAcceso, fotos: { blob: Blob; etiqueta: string }[]) => void
  /** Avisa al contenedor en qué paso va (para el texto del botón del pie) */
  onPaso?: (p: PasoRegistro) => void
}) {
  const [paso, setPasoLocal] = useState<PasoRegistro>('fotos')
  const [tipo, setTipo] = useState<NuevoAcceso['tipo']>('PAQUETERIA')
  const [empresa, setEmpresa] = useState<string | null>(null)
  const [otraEmpresa, setOtraEmpresa] = useState('')
  const [nombre, setNombre] = useState('')
  const [vehiculo, setVehiculo] = useState<Vehiculo | undefined>()
  const [color, setColor] = useState<Color | undefined>()
  const [placas, setPlacas] = useState('')
  const [casa, setCasa] = useState('')
  const [paquete, setPaquete] = useState<'CASA' | 'CASETA'>('CASA')
  const [cantidad, setCantidad] = useState<'1' | '2' | '3+'>('1')
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [conNota, setConNota] = useState(false)
  const [nota, setNota] = useState('')
  const [fotos, setFotos] = useState<FotoEvidencia[]>([])
  const [sugerencia, setSugerencia] = useState<Acceso | null>(null)
  const [error, setError] = useState('')
  const inicio = useRef<HTMLDivElement>(null)
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const setPaso = (p: PasoRegistro) => {
    setPasoLocal(p); onPaso?.(p); setError('')
    // Sube al inicio moviendo solo el contenedor de la hoja: scrollIntoView en iOS también desplaza
    // la página de fondo y deja la hoja trabada sin poder hacer scroll
    requestAnimationFrame(() => {
      const contenedor = inicio.current?.closest<HTMLElement>('[data-hoja-scroll]')
      if (contenedor) contenedor.scrollTop = 0
    })
  }
  const cambiarTipo = (t: NuevoAcceso['tipo']) => {
    setTipo(t); setEmpresa(null); setEtiquetas([]); setError('')
    // Las fotos que no aplican al nuevo tipo se descartan (la de la placa se conserva)
    const validas = new Set(['placa', ...GUIAS[t].map((g) => g.id)])
    setFotos((f) => { f.filter((x) => !validas.has(x.slot)).forEach((x) => URL.revokeObjectURL(x.url)); return f.filter((x) => validas.has(x.slot)) })
  }

  // ---- IA de placas + automatización por historial ----
  const alLeerPlaca = async (lectura: LecturaPlaca, foto: Blob) => {
    const url = URL.createObjectURL(foto)
    setFotos((f) => { f.filter((x) => x.slot === 'placa').forEach((x) => URL.revokeObjectURL(x.url)); return [{ blob: foto, url, slot: 'placa' }, ...f.filter((x) => x.slot !== 'placa')] })
    const v = VEHICULO_POR_IA[lectura.tipoVehiculo]
    if (v) setVehiculo(v)
    if (lectura.color !== 'OTRO' || !color) setColor(lectura.color)
    if (lectura.placa) {
      toast.success(`Placa ${lectura.placa} leída`, { description: 'Revisa que coincida con el vehículo.' })
      const previo = await casetaService.buscarPorPlaca(lectura.placa)
      if (previo) setSugerencia(previo)
    }
  }

  const usarSugerencia = () => {
    if (!sugerencia) return
    if (sugerencia.tipo !== 'VISITA_QR' && sugerencia.tipo !== tipo) cambiarTipo(sugerencia.tipo)
    const lista = sugerencia.tipo === 'VISITA_QR' ? [] : EMPRESAS[sugerencia.tipo]
    if (sugerencia.tipo === 'VISITA_SIN_QR' || sugerencia.tipo === 'VISITA_QR') setNombre(sugerencia.nombre)
    else if (lista.includes(sugerencia.nombre)) setEmpresa(sugerencia.nombre)
    else { setEmpresa(OTRA); setOtraEmpresa(sugerencia.nombre) }
    setCasa(sugerencia.casa)
    setSugerencia(null)
    toast.success('Datos completados con la visita anterior', { description: 'Revisa la empresa y la casa en el paso 2.' })
  }

  // Fotos del paso 1: placa (si aplica) + las del tipo
  const guias = guiasPara(tipo, vehiculo)
  const conPlaca = tienePlaca(vehiculo)
  const totalFotos = guias.length + (conPlaca ? 1 : 0)
  const fotoPlaca = fotos.find((f) => f.slot === 'placa')
  const tomadas = fotos.filter((f) => (f.slot === 'placa' ? conPlaca : guias.some((g) => g.id === f.slot))).length
  const faltanObligatorias = [
    ...(conPlaca && !placas ? ['la placa'] : []),
    ...guias.filter((g) => g.obligatoria && !fotos.some((f) => f.slot === g.id)).map((g) => g.titulo.toLowerCase()),
  ]

  const esVisita = tipo === 'VISITA_SIN_QR'
  const v = useValidacion({
    nombre: paso === 'datos' && esVisita ? validar.nombre(nombre) : '',
    empresa: paso === 'datos' && !esVisita ? (!empresa ? 'Elige la empresa.' : empresa === OTRA ? validar.empresa(otraEmpresa) : '') : '',
    casa: paso === 'datos' && !casa ? 'Elige la casa destino.' : '',
  }, 'registro')

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (paso === 'fotos') {
      const falta = !vehiculo ? 'Elige cómo llegó.' : faltanObligatorias.length ? `Falta la foto de ${faltanObligatorias.join(', ')}.` : ''
      if (falta) { setError(falta); return }
      setPaso('datos')
      return
    }
    const quien = esVisita ? nombre.trim() : empresa === OTRA ? otraEmpresa.trim() : empresa
    setError('')
    if (v.revisar()) return
    setError('')
    // Solo se envían las fotos que aplican al tipo y vehículo elegidos
    const enviar = fotos.filter((f) => (f.slot === 'placa' ? conPlaca : guias.some((g) => g.id === f.slot)))
    onEnviar({
      tipo, casa, nombre: quien!, vehiculo,
      color: conPlaca ? color : undefined,
      placas: conPlaca ? placas : undefined,
      etiquetas: etiquetas.length ? etiquetas : undefined,
      nota: conNota && nota.trim() ? nota.trim() : undefined,
      paquete: tipo === 'PAQUETERIA' ? paquete : undefined,
      cantidad: tipo === 'PAQUETERIA' ? cantidad : undefined,
    }, enviar.map((f) => ({ blob: f.blob, etiqueta: f.slot })))
  }

  return (
    <form id={idFormulario} onSubmit={enviar} noValidate>
      <div ref={inicio} className="scroll-mt-4" />

      {/* Progreso de los dos pasos */}
      <ol aria-label="Pasos del registro" className="mb-7 grid grid-cols-2 gap-2">
        {([['fotos', '1', 'Fotos'], ['datos', '2', 'Datos']] as const).map(([p, n, t]) => {
          const actual = paso === p
          const hecho = p === 'fotos' && paso === 'datos'
          return (
            <li key={p} aria-current={actual ? 'step' : undefined}>
              <button type="button" disabled={p === 'datos' && paso === 'fotos'} onClick={() => p === 'fotos' && setPaso('fotos')}
                className="w-full text-left disabled:cursor-default">
                <span className={`block h-1.5 rounded-full transition-colors duration-300 ${actual || hecho ? 'bg-acento' : 'bg-texto/[0.08]'}`} />
                <span className={`mt-2 flex items-center gap-1.5 text-[0.875rem] font-semibold ${actual ? 'text-texto' : 'text-suave'}`}>
                  {hecho ? <Icon n="check" size={15} stroke={3} /> : <span className="cifras">{n}.</span>}{t}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {paso === 'fotos' ? (
        <div key="fotos" className="space-y-9">
          <Seccion titulo="¿Quién llega?">
            <div role="group" aria-label="Tipo" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIPOS.map((t) => (
                <button key={t.valor} type="button" aria-pressed={tipo === t.valor} onClick={() => cambiarTipo(t.valor)}
                  className={`flex flex-col items-center justify-center gap-2 h-[88px] rounded-[18px] text-[0.9375rem] font-medium
                    transition-[transform,background-color,box-shadow,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]
                    ${tipo === t.valor ? 'bg-acento/[0.08] text-acento ring-2 ring-inset ring-acento' : 'bg-panel ring-1 ring-inset ring-borde'}`}>
                  <Icon n={t.icono} size={26} />{t.etiqueta}
                </button>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="¿Cómo llegó?" retraso={40}>
            <Opciones etiqueta="Vehículo" valor={vehiculo} onCambio={(v) => setVehiculo(v ?? undefined)} cuadricula="grid grid-cols-3 sm:grid-cols-6 gap-2"
              opciones={VEHICULOS.map((v) => ({ valor: v.valor, etiqueta: v.etiqueta }))} />
          </Seccion>

          <Seccion titulo="Fotos de evidencia" retraso={80}
            extra={totalFotos > 0 ? <span className="text-[0.8125rem] font-medium text-suave cifras">{tomadas} de {totalFotos}</span> : undefined}>
            <div className="space-y-4">
              {totalFotos === 0 && (
                <p className="anim-llenar flex items-center gap-3 rounded-[18px] bg-panel px-4 py-4 text-[0.9375rem] text-suave shadow-tarjeta">
                  <Icon n="check" size={18} stroke={2.4} />No se necesitan fotos para este registro. Continúa a los datos.
                </p>
              )}
              {conPlaca && (
                <ApartadoFoto numero={1} total={totalFotos} titulo="Placa del vehículo" icono="auto" obligatoria
                  ayuda="Que se lean todos los caracteres. La IA llena la placa, el vehículo y el color." foto={fotoPlaca}>
                  <div className="space-y-4">
                    <LectorPlaca placa={placas} onPlaca={setPlacas} onLectura={alLeerPlaca} />
                    {sugerencia && (
                      <div role="status" className="anim-llenar flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-acento/[0.08] px-4 py-3.5 ring-1 ring-inset ring-acento/25">
                        <div className="min-w-0">
                          <p className="text-[0.9375rem] font-semibold">Esta placa ya vino antes</p>
                          <p className="text-[0.875rem] text-suave">{sugerencia.nombre} → {sugerencia.casa} · {sugerencia.entrada.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button type="button" onClick={usarSugerencia} className="btn-primario btn-chico">Usar esos datos</button>
                      </div>
                    )}
                  </div>
                </ApartadoFoto>
              )}
              <FotosGuiadas guias={guias} fotos={fotos} onCambio={setFotos} numeroInicial={conPlaca ? 2 : 1} total={totalFotos} />
            </div>
            <p className="mt-4 text-[0.8125rem] leading-[1.45] text-suave">
              Nunca fotografíes rostros ni identificaciones completas. Las fotos se reducen, se les quita la ubicación
              y se borran a los 90 días. Indica a la persona que el aviso de privacidad está en caseta.
            </p>
          </Seccion>
        </div>
      ) : (
        <div key="datos" className="space-y-9">
          {/* Resumen del paso 1 */}
          <div className="anim-entrar flex items-center gap-3 rounded-[20px] bg-panel shadow-tarjeta p-3 pr-4">
            <div className="flex -space-x-3">
              {fotos.slice(0, 3).map((f) => <img key={f.url} src={f.url} alt="" className="h-12 w-12 rounded-[12px] object-cover ring-2 ring-panel" />)}
              {!fotos.length && <span className="grid place-items-center h-12 w-12 rounded-[12px] bg-fondo text-texto/60"><Icon n="camara" size={20} /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">{ETIQUETA_TIPO[tipo]}{placas && conPlaca ? ` · ${placas}` : ''}</p>
              <p className="text-[0.8125rem] text-suave">{tomadas} foto{tomadas === 1 ? '' : 's'} · {VEHICULOS.find((v) => v.valor === vehiculo)?.etiqueta}</p>
            </div>
            <button type="button" onClick={() => setPaso('fotos')} className="text-[0.9375rem] font-medium text-acento min-h-11 px-1">Editar</button>
          </div>

          <Seccion titulo={tipo === 'VISITA_SIN_QR' ? 'Nombre de la visita' : 'Empresa'} retraso={40}>
            {tipo === 'VISITA_SIN_QR' ? (
              <>
                <input value={nombre} onChange={(e) => setNombre(filtrar.nombre(e.target.value))} maxLength={LARGO.nombre} autoComplete="off" autoCapitalize="words" placeholder="Nombre completo"
                  aria-label="Nombre de la visita" {...v.props('nombre')}
                  className={`block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave ${CAMPO_INVALIDO}`} />
                <MensajeCampo id={v.idError('nombre')} mensaje={v.error('nombre')} />
              </>
            ) : (
              <div className="space-y-3">
                <Opciones etiqueta="Empresa" valor={empresa} onCambio={setEmpresa}
                  opciones={[...EMPRESAS[tipo], OTRA].map((e) => ({ valor: e, etiqueta: e, extra: <LogoEmpresa nombre={e} size={22} /> }))} />
                {empresa === OTRA && (
                  <input value={otraEmpresa} onChange={(e) => setOtraEmpresa(filtrar.empresa(e.target.value))} maxLength={LARGO.empresa} autoComplete="off" autoFocus
                    placeholder="¿Cuál empresa?" aria-label="Otra empresa" {...v.props('empresa')}
                    className={`anim-llenar block w-full h-12 rounded-[14px] bg-panel px-4 text-[1rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave ${CAMPO_INVALIDO}`} />
                )}
                <MensajeCampo id={v.idError('empresa')} mensaje={v.error('empresa')} />
              </div>
            )}
          </Seccion>

          {conPlaca && (
            <Seccion titulo="Color del vehículo" retraso={80} extra={<span className="text-[0.8125rem] text-suave">La IA lo sugiere</span>}>
              <Opciones etiqueta="Color" valor={color} onCambio={(v) => setColor(v ?? undefined)}
                opciones={COLORES.map((c) => ({
                  valor: c.valor, etiqueta: c.etiqueta,
                  extra: <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/15" style={{ background: c.muestra }} />,
                }))} />
            </Seccion>
          )}

          <Seccion titulo="Casa destino" retraso={120} extra={casa && <span className="anim-llenar text-[0.9375rem] font-medium text-acento">{casa}</span>}>
            <SelectorCasa valor={casa} onCambio={(c) => { setCasa(c); setError('') }} />
            <MensajeCampo id={v.idError('casa')} mensaje={v.error('casa')} />
          </Seccion>

          {tipo === 'PAQUETERIA' && (
            <Seccion titulo="Entrega" retraso={160}>
              <div className="space-y-3">
                <Opciones etiqueta="Dónde se entrega" valor={paquete} onCambio={(v) => v && setPaquete(v)} opcional={false} cuadricula="grid grid-cols-2 gap-2"
                  opciones={[{ valor: 'CASA', etiqueta: 'En la casa' }, { valor: 'CASETA', etiqueta: 'En caseta' }]} />
                <Opciones etiqueta="Cantidad de paquetes" valor={cantidad} onCambio={(v) => v && setCantidad(v)} opcional={false}
                  opciones={[{ valor: '1', etiqueta: '1 paquete' }, { valor: '2', etiqueta: '2 paquetes' }, { valor: '3+', etiqueta: '3 o más' }]} />
              </div>
            </Seccion>
          )}

          <Seccion titulo="Detalles" retraso={200} extra={<span className="text-[0.8125rem] text-suave">Opcional</span>}>
            <div className="space-y-3">
              <OpcionesMultiples etiqueta="Detalles" opciones={ETIQUETAS[tipo]} valores={etiquetas} onCambio={setEtiquetas} />
              {conNota ? (
                <textarea value={nota} onChange={(e) => setNota(filtrar.texto(e.target.value, LARGO.nota))} maxLength={LARGO.nota} rows={2} autoFocus aria-label="Nota"
                  placeholder="Algo más que deba saberse"
                  className="anim-llenar block w-full rounded-[14px] bg-panel px-4 py-3 text-[1rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave resize-none" />
              ) : (
                <button type="button" onClick={() => setConNota(true)} className="text-[0.9375rem] font-medium text-acento min-h-11">+ Agregar nota</button>
              )}
            </div>
          </Seccion>
        </div>
      )}

      <div className="mt-6"><ErrorFormulario mensaje={error} /></div>
    </form>
  )
}
