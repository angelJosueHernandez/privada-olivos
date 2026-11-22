import Icon, { IconName } from '../../shared/ui/Icon'
import Marca from '../../shared/ui/Marca'

const FUNCIONES: { icono: IconName; titulo: string; texto: string }[] = [
  { icono: 'qr', titulo: 'Pases QR para tus visitas', texto: 'Crea un código y compártelo en segundos.' },
  { icono: 'escanear', titulo: 'Acceso ágil en caseta', texto: 'El guardia valida cada visita al escanear.' },
  { icono: 'pagos', titulo: 'Cuotas sin papeles', texto: 'Sube tu comprobante y sigue su revisión.' },
]

// Lo que hace la app. Íconos en gris neutro: el verde se reserva para lo que se puede tocar.
export function ListaFunciones() {
  return (
    <ul className="space-y-4">
      {FUNCIONES.map((f) => (
        <li key={f.titulo} className="flex items-center gap-4">
          <span className="grid place-items-center h-10 w-10 shrink-0 rounded-[12px] bg-fondo text-texto/75">
            <Icon n={f.icono} size={21} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-semibold tracking-[-0.01em]">{f.titulo}</span>
            <span className="block text-[0.875rem] text-suave text-pretty">{f.texto}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Panel izquierdo, solo en computadora: qué es la app y qué hace.
export default function PanelLogin() {
  return (
    <aside className="hidden lg:flex flex-col bg-fondo px-12 xl:px-16 py-12 min-h-dvh">
      <div className="flex items-center gap-3">
        <Marca size={36} />
        <span className="text-[1.0625rem] font-semibold tracking-[-0.01em]">Mi Privada</span>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-[440px] py-12">
        <h2 className="text-[2.75rem] leading-[1.06] font-bold tracking-[-0.03em] text-balance">
          Tu privada,<br /><span className="text-suave">más simple.</span>
        </h2>
        <p className="mt-4 text-[1.0625rem] leading-[1.45] text-suave max-w-[36ch] text-pretty">
          Visitas, caseta y cuotas en un solo lugar, desde tu celular o tu computadora.
        </p>
        <div className="mt-12 [&_span.bg-fondo]:bg-panel"><ListaFunciones /></div>
      </div>
    </aside>
  )
}
