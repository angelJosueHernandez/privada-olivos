import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Icon, { IconName } from '../../shared/ui/Icon'
import { Opciones, OpcionesMultiples } from '../../shared/ui/Opciones'
import LectorPlaca from './LectorPlaca'
import LogoEmpresa from './LogoEmpresa'
import SelectorCasa from './SelectorCasa'
import { casetaService } from './casetaService'
import FotosGuiadas, { FotoEvidencia } from './FotosGuiadas'
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
const OTRA = 'Otra'


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
  onEnviar: (datos: NuevoAcceso, fotos: { blob: Blob; etiqueta: string }[]) => void
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
  const [fotos, setFotos] = useState<FotoEvidencia[]>([])
  const [sugerencia, setSugerencia] = useState<Acceso | null>(null)
  const [error, setError] = useState('')
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const cambiarTipo = (t: NuevoAcceso['tipo']) => { setTipo(t); setEmpresa(null); setEtiquetas([]); setError('') }

  // ---- IA de placas + automatización por historial ----
  const alLeerPlaca = async (lectura: LecturaPlaca, foto: Blob) => {
    const url = URL.createObjectURL(foto)
    // La foto de la placa ocupa su lugar en las fotos guiadas
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
    if (sugerencia.tipo !== 'VISITA_QR') setTipo(sugerencia.tipo)
    const lista = sugerencia.tipo === 'VISITA_QR' ? [] : EMPRESAS[sugerencia.tipo]
    if (sugerencia.tipo === 'VISITA_SIN_QR' || sugerencia.tipo === 'VISITA_QR') setNombre(sugerencia.nombre)
    else if (lista.includes(sugerencia.nombre)) setEmpresa(sugerencia.nombre)
    else { setEmpresa(OTRA); setOtraEmpresa(sugerencia.nombre) }
    setCasa(sugerencia.casa)
    setSugerencia(null)
    toast.success('Datos completados con la visita anterior')
  }

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
    }, fotos.map((f) => ({ blob: f.blob, etiqueta: f.slot.startsWith('extra-') ? 'adicional' : f.slot })))
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
        <Opciones etiqueta="Vehículo" valor={vehiculo} onCambio={(v) => setVehiculo(v ?? undefined)} cuadricula="grid grid-cols-3 sm:grid-cols-6 gap-2"
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
              <Opciones etiqueta="Color" valor={color} onCambio={(v) => setColor(v ?? undefined)}
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
            <Opciones etiqueta="Dónde se entrega" valor={paquete} onCambio={(v) => v && setPaquete(v)} opcional={false} cuadricula="grid grid-cols-2 gap-2"
              opciones={[{ valor: 'CASA', etiqueta: 'En la casa' }, { valor: 'CASETA', etiqueta: 'En caseta' }]} />
            <Opciones etiqueta="Cantidad de paquetes" valor={cantidad} onCambio={(v) => v && setCantidad(v)} opcional={false}
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

      <Paso n={7} titulo="Fotos de evidencia">
        <FotosGuiadas tipo={tipo} vehiculo={vehiculo} fotos={fotos} onCambio={setFotos} />
      </Paso>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-[0.9375rem] text-peligro">
          <span className="mt-0.5 shrink-0"><Icon n="alerta" size={18} /></span>{error}
        </p>
      )}
    </form>
  )
}
