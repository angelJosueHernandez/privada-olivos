import { siDhl, siFedex, siUbereats, siUps } from 'simple-icons'
import Icon, { IconName } from '../../shared/ui/Icon'

/*
  Insignia de cada empresa, con el estilo de un ícono de app.
  - Logotipo oficial cuando existe en Simple Icons (licencia CC0): DHL, FedEx, UPS, Uber Eats.
  - Para las demás marcas, sus iniciales sobre su color oficial (no se dibujan imitaciones de logotipos).
  - Servicios: íconos descriptivos (rayo, flama, gota…).
*/
type Insignia =
  | { tipo: 'logo'; path: string; fondo: string; tinta: string }
  | { tipo: 'iniciales'; texto: string; fondo: string; tinta: string }
  | { tipo: 'icono'; n: IconName; fondo: string; tinta: string }

const MARCAS: Record<string, Insignia> = {
  DHL: { tipo: 'logo', path: siDhl.path, fondo: '#FFCC00', tinta: '#D40511' },
  FedEx: { tipo: 'logo', path: siFedex.path, fondo: '#4D148C', tinta: '#FFFFFF' },
  UPS: { tipo: 'logo', path: siUps.path, fondo: '#351C15', tinta: '#FFB500' },
  'Uber Eats': { tipo: 'logo', path: siUbereats.path, fondo: '#06C167', tinta: '#142328' },
  Amazon: { tipo: 'iniciales', texto: 'a', fondo: '#232F3E', tinta: '#FF9900' },
  'Mercado Libre': { tipo: 'iniciales', texto: 'ML', fondo: '#FFE600', tinta: '#2D3277' },
  Estafeta: { tipo: 'iniciales', texto: 'E', fondo: '#C8102E', tinta: '#FFFFFF' },
  '99 Minutos': { tipo: 'iniciales', texto: '99', fondo: '#2BB673', tinta: '#FFFFFF' },
  'J&T Express': { tipo: 'iniciales', texto: 'J&T', fondo: '#E60012', tinta: '#FFFFFF' },
  Paquetexpress: { tipo: 'iniciales', texto: 'PX', fondo: '#00539F', tinta: '#FFFFFF' },
  'Correos de México': { tipo: 'iniciales', texto: 'CM', fondo: '#9D2449', tinta: '#FFFFFF' },
  Rappi: { tipo: 'iniciales', texto: 'R', fondo: '#FF441F', tinta: '#FFFFFF' },
  'DiDi Food': { tipo: 'iniciales', texto: 'D', fondo: '#FC4C02', tinta: '#FFFFFF' },
  'Repartidor del restaurante': { tipo: 'icono', n: 'comida', fondo: '#F2F2F7', tinta: '#3A3A3C' },
  CFE: { tipo: 'icono', n: 'rayo', fondo: '#E6F4EA', tinta: '#00843D' },
  Gas: { tipo: 'icono', n: 'flama', fondo: '#FFF1E6', tinta: '#D9480F' },
  'Agua potable': { tipo: 'icono', n: 'gota', fondo: '#E7F1FF', tinta: '#0A60C2' },
  'Internet / TV': { tipo: 'icono', n: 'wifi', fondo: '#EEF0FF', tinta: '#3A4BD8' },
  Jardinería: { tipo: 'icono', n: 'hoja', fondo: '#E9F7EC', tinta: '#248A3D' },
  Plomería: { tipo: 'icono', n: 'herramienta', fondo: '#EAF4FB', tinta: '#1F6F9F' },
  Electricista: { tipo: 'icono', n: 'enchufe', fondo: '#FFF7DB', tinta: '#A66A00' },
  Limpieza: { tipo: 'icono', n: 'chispas', fondo: '#E8F8F7', tinta: '#0F7B74' },
  Fumigación: { tipo: 'icono', n: 'insecto', fondo: '#F4EFE6', tinta: '#7A5A2B' },
  Mudanza: { tipo: 'icono', n: 'camion', fondo: '#F2F2F7', tinta: '#3A3A3C' },
}

export const tieneInsignia = (nombre: string) => nombre in MARCAS

export default function LogoEmpresa({ nombre, size = 22 }: { nombre: string; size?: number }) {
  const m = MARCAS[nombre]
  if (!m) return null
  const radio = Math.round(size * 0.28)
  return (
    <span aria-hidden="true" className="inline-grid shrink-0 place-items-center overflow-hidden ring-1 ring-inset ring-black/[0.08]"
      style={{ width: size, height: size, borderRadius: radio, background: m.fondo, color: m.tinta }}>
      {m.tipo === 'logo' && (
        <svg viewBox="0 0 24 24" width={size * 0.72} height={size * 0.72} fill="currentColor"><path d={m.path} /></svg>
      )}
      {m.tipo === 'iniciales' && (
        <span className="font-bold leading-none tracking-[-0.02em]"
          style={{ fontSize: size * (m.texto.length > 2 ? 0.3 : m.texto.length > 1 ? 0.38 : 0.52) }}>{m.texto}</span>
      )}
      {m.tipo === 'icono' && <Icon n={m.n} size={Math.round(size * 0.62)} stroke={2} />}
    </span>
  )
}
