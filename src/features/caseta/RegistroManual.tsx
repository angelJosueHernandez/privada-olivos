import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Icon, { IconName } from '../../shared/ui/Icon'
import { Opciones, OpcionesMultiples } from '../../shared/ui/Opciones'
import LectorPlaca from './LectorPlaca'
import LogoEmpresa from './LogoEmpresa'
import SelectorCasa from './SelectorCasa'
import { casetaService } from './casetaService'
import { prepararFoto } from './fotos'
import {
  Acceso, Color, COLORES, EMPRESAS, ETIQUETAS, LecturaPlaca, NuevoAcceso, tienePlaca, Vehiculo, VEHICULOS,
} from './tipos'

const TIPOS: { valor: NuevoAcceso['tipo']; etiqueta: string; icono: IconName }[] = [
  { valor: 'PAQUETERIA', etiqueta: 'Paquetería', icono: 'paquete' },
  { valor: 'COMIDA', etiqueta: 'Comida', icono: 'comida' },
  { valor: 'SERVICIO', etiqueta: 'Servicio', icono: 'herramienta' },
  { valor: 'VISITA_SIN_QR', etiqueta: 'Visita', icono: 'visita' },
]
const VEHICULO_POR_IA: Record<LecturaPlaca['tipoVehiculo'], Vehiculo | undefined> = {
  AUTO: 'AUTO', CAMIONETA: 'CAMIONETA', MOTO: 'MOTO', CAMION: 'CAMION', DESCONOCIDO: undefined,
}
const MAX_FOTOS = 4
const OTRA = 'Otra'

type Foto = { blob: Blob; url: string; deIa?: boolean }

function Paso({ n, titulo, extra, children }: { n: number; titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`paso-${n}`} className="anim-entrar" style={{ animationDelay: `${Math.min(n * 40, 200)}ms` }}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 id={`paso-${n}`} className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

export default function RegistroManual({ idFormulario, onEnviar }: {
  idFormulario: string
  onEnviar: (datos: NuevoAcceso, fotos: Blob[]) => void
}) {
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
  const [fotos, setFotos] = useState<Foto[]>([])
  const [procesando, setProcesando] = useState(false)
  const [sugerencia, setSugerencia] = useState<Acceso | null>(null)
  const [error, setError] = useState('')
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const cambiarTipo = (t: NuevoAcceso['tipo']) => { setTipo(t); setEmpresa(null); setEtiquetas([]); setError('') }

  // ---- IA de placas + automatización por historial ----
  const alLeerPlaca = async (lectura: LecturaPlaca, foto: Blob) => {
    const url = URL.createObjectURL(foto)
    setFotos((f) => [{ blob: foto, url, deIa: true }, ...f.filter((x) => !x.deIa)].slice(0, MAX_FOTOS))
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
    if (sugerencia.tipo !== 'VISITA_QR') setTipo(sugerencia.tipo)
    const lista = sugerencia.tipo === 'VISITA_QR' ? [] : EMPRESAS[sugerencia.tipo]
    if (sugerencia.tipo === 'VISITA_SIN_QR' || sugerencia.tipo === 'VISITA_QR') setNombre(sugerencia.nombre)
    else if (lista.includes(sugerencia.nombre)) setEmpresa(sugerencia.nombre)
    else { setEmpresa(OTRA); setOtraEmpresa(sugerencia.nombre) }
    setCasa(sugerencia.casa)
    setSugerencia(null)
    toast.success('Datos completados con la visita anterior')
  }

  // ---- Fotos extra de evidencia ----
  const agregarFotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []).slice(0, MAX_FOTOS - fotos.length)
    e.target.value = ''
    if (!archivos.length) return
    setProcesando(true)
    try {
      const nuevas: Foto[] = []
      for (const a of archivos) { const blob = await prepararFoto(a); nuevas.push({ blob, url: URL.createObjectURL(blob) }) }
      setFotos((f) => [...f, ...nuevas])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar la foto.')
    } finally { setProcesando(false) }
  }
  const quitarFoto = (i: number) => setFotos((f) => { URL.revokeObjectURL(f[i].url); return f.filter((_, j) => j !== i) })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const esVisita = tipo === 'VISITA_SIN_QR'
    const quien = esVisita ? nombre.trim() : empresa === OTRA ? otraEmpresa.trim() : empresa
    const falta =
      !quien ? (esVisita ? 'Escribe el nombre de la visita.' : 'Elige la empresa.')
      : !vehiculo ? 'Elige cómo llegó.'
      : tienePlaca(vehiculo) && !placas ? 'Toma la foto de la placa o escríbela.'
      : !casa ? 'Elige la casa destino.'
      : ''
    if (falta) { setError(falta); toast.error(falta); return }
    setError('')
    onEnviar({
      tipo, casa, nombre: quien!, vehiculo,
      color: tienePlaca(vehiculo) ? color : undefined,
      placas: tienePlaca(vehiculo) ? placas : undefined,
      etiquetas: etiquetas.length ? etiquetas : undefined,
      nota: conNota && nota.trim() ? nota.trim() : undefined,
      paquete: tipo === 'PAQUETERIA' ? paquete : undefined,
      cantidad: tipo === 'PAQUETERIA' ? cantidad : undefined,
    }, fotos.map((f) => f.blob))
  }

  const empresas = EMPRESAS[tipo]

  return (
    <form id={idFormulario} onSubmit={enviar} noValidate className="space-y-9">
      <Paso n={1} titulo="¿Quién llega?">
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
      </Paso>

      <Paso n={2} titulo={tipo === 'VISITA_SIN_QR' ? 'Nombre de la visita' : 'Empresa'}>
        {tipo === 'VISITA_SIN_QR' ? (
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="off" placeholder="Nombre completo"
            className="block w-full h-14 rounded-[14px] bg-panel px-4 text-[1.0625rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave" />
        ) : (
          <div key={tipo} className="space-y-3">
            <Opciones etiqueta="Empresa" valor={empresa} onCambio={setEmpresa}
              opciones={[...empresas, OTRA].map((e) => ({ valor: e, etiqueta: e, extra: <LogoEmpresa nombre={e} size={22} /> }))} />
            {empresa === OTRA && (
              <input value={otraEmpresa} onChange={(e) => setOtraEmpresa(e.target.value)} maxLength={40} autoComplete="off" autoFocus
                placeholder="¿Cuál empresa?" aria-label="Otra empresa"
                className="anim-llenar block w-full h-12 rounded-[14px] bg-panel px-4 text-[1rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave" />
            )}
          </div>
        )}
      </Paso>

      <Paso n={3} titulo="¿Cómo llegó?">
        <Opciones etiqueta="Vehículo" valor={vehiculo} onCambio={setVehiculo} cuadricula="grid grid-cols-3 sm:grid-cols-6 gap-2"
          opciones={VEHICULOS.map((v) => ({ valor: v.valor, etiqueta: v.etiqueta }))} />
        {tienePlaca(vehiculo) && (
          <div className="anim-llenar mt-5 space-y-5">
            <LectorPlaca placa={placas} onPlaca={setPlacas} onLectura={alLeerPlaca} />

            {sugerencia && (
              <div role="status" className="anim-llenar flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-acento/[0.08] px-4 py-3.5 ring-1 ring-inset ring-acento/25">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-semibold">Esta placa ya vino antes</p>
                  <p className="text-[0.875rem] text-suave">
                    {sugerencia.nombre} → {sugerencia.casa} · {sugerencia.entrada.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button type="button" onClick={usarSugerencia} className="btn-primario btn-chico">Usar esos datos</button>
              </div>
            )}

            <div>
              <p className="mb-2 text-[0.875rem] text-suave">Color</p>
              <Opciones etiqueta="Color" valor={color} onCambio={setColor}
                opciones={COLORES.map((c) => ({
                  valor: c.valor, etiqueta: c.etiqueta,
                  extra: <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/15" style={{ background: c.muestra }} />,
                }))} />
            </div>
          </div>
        )}
      </Paso>

      <Paso n={4} titulo="Casa destino" extra={casa && <span className="anim-llenar text-[0.9375rem] font-medium text-acento">{casa}</span>}>
        <SelectorCasa valor={casa} onCambio={setCasa} />
      </Paso>

      {tipo === 'PAQUETERIA' && (
        <Paso n={5} titulo="Entrega">
          <div className="space-y-3">
            <Opciones etiqueta="Dónde se entrega" valor={paquete} onCambio={setPaquete} cuadricula="grid grid-cols-2 gap-2"
              opciones={[{ valor: 'CASA', etiqueta: 'En la casa' }, { valor: 'CASETA', etiqueta: 'En caseta' }]} />
            <Opciones etiqueta="Cantidad de paquetes" valor={cantidad} onCambio={setCantidad}
              opciones={[{ valor: '1', etiqueta: '1 paquete' }, { valor: '2', etiqueta: '2 paquetes' }, { valor: '3+', etiqueta: '3 o más' }]} />
          </div>
        </Paso>
      )}

      <Paso n={6} titulo="Detalles" extra={<span className="text-[0.8125rem] text-suave">Opcional</span>}>
        <div className="space-y-3">
          <OpcionesMultiples etiqueta="Detalles" opciones={ETIQUETAS[tipo]} valores={etiquetas} onCambio={setEtiquetas} />
          {conNota ? (
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={280} rows={2} autoFocus aria-label="Nota"
              placeholder="Algo más que deba saberse"
              className="anim-llenar block w-full rounded-[14px] bg-panel px-4 py-3 text-[1rem] ring-1 ring-inset ring-borde outline-none focus:ring-[1.5px] focus:ring-acento placeholder:text-suave resize-none" />
          ) : (
            <button type="button" onClick={() => setConNota(true)} className="text-[0.9375rem] font-medium text-acento min-h-11">+ Agregar nota</button>
          )}
        </div>
      </Paso>

      <Paso n={7} titulo="Fotos de evidencia" extra={<span className="text-[0.8125rem] text-suave cifras">{fotos.length}/{MAX_FOTOS}</span>}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {fotos.map((f, i) => (
            <div key={f.url} className="anim-llenar relative aspect-square overflow-hidden rounded-[16px] bg-panel ring-1 ring-inset ring-borde">
              <img src={f.url} alt={f.deIa ? 'Foto de la placa' : `Evidencia ${i + 1}`} className="h-full w-full object-cover" />
              {f.deIa && <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white backdrop-blur-md">Placa</span>}
              <button type="button" onClick={() => quitarFoto(i)} aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1.5 top-1.5 h-9 w-9 grid place-items-center rounded-full bg-black/55 text-white backdrop-blur-md active:scale-95 transition-transform">
                <Icon n="basura" size={17} />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <label className={`relative aspect-square flex flex-col items-center justify-center gap-1.5 rounded-[16px] cursor-pointer
              bg-acento/[0.06] text-acento ring-1 ring-inset ring-acento/30 text-[0.875rem] font-semibold
              transition-transform duration-150 active:scale-[0.97]
              focus-within:outline focus-within:outline-[3px] focus-within:outline-acento/55 ${procesando ? 'opacity-60' : ''}`}>
              <input type="file" accept="image/*" capture="environment" multiple onChange={agregarFotos} disabled={procesando} className="sr-only" />
              <Icon n="camara" size={26} />
              {procesando ? 'Procesando…' : 'Agregar foto'}
            </label>
          )}
        </div>
        <p className="mt-2 text-[0.8125rem] leading-[1.45] text-suave">
          Fotografía solo placas, paquetes o gafetes; no rostros ni identificaciones completas. Las fotos se reducen,
          se les quita la ubicación y se borran a los 90 días. Indica a la persona que el aviso de privacidad está en caseta.
        </p>
      </Paso>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-[0.9375rem] text-peligro">
          <span className="mt-0.5 shrink-0"><Icon n="alerta" size={18} /></span>{error}
        </p>
      )}
    </form>
  )
}
