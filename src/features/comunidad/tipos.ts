import type { Actor } from '../caseta/tipos'

// ---------- Anuncios de la administración ----------
export type CategoriaAnuncio = 'GENERAL' | 'MANTENIMIENTO' | 'SEGURIDAD' | 'EVENTO' | 'PAGOS'

export const CATEGORIAS: { valor: CategoriaAnuncio; etiqueta: string; clase: string }[] = [
  { valor: 'GENERAL', etiqueta: 'General', clase: 'bg-texto/[0.07] text-texto/75' },
  { valor: 'MANTENIMIENTO', etiqueta: 'Mantenimiento', clase: 'bg-alerta/[0.12] text-alerta' },
  { valor: 'SEGURIDAD', etiqueta: 'Seguridad', clase: 'bg-peligro/[0.1] text-peligro' },
  { valor: 'EVENTO', etiqueta: 'Evento', clase: 'bg-acento/[0.1] text-acento' },
  { valor: 'PAGOS', etiqueta: 'Pagos', clase: 'bg-ok/[0.12] text-ok' },
]

export type Anuncio = {
  id: string
  titulo: string
  cuerpo: string
  categoria: CategoriaAnuncio
  /** Se fija arriba, se resalta y aparece como aviso en el inicio del residente */
  importante: boolean
  /** Calle a la que va dirigido (sin valor: todas las casas) */
  calle?: string
  /** Deja de mostrarse a los residentes después de esta fecha (sin valor: no vence) */
  vence?: Date
  /** Pide a cada casa confirmar de enterado o su asistencia (sin valor: solo informativo) */
  pideRespuesta?: TipoRespuesta
  publicadoPor: Actor
  publicadoEn: Date
  editadoEn?: Date
  /** Residente: lo que respondió su casa */
  miRespuesta?: Respuesta
  /** Administración: respuestas de todas las casas */
  respuestas?: Respuesta[]
  /** Administración: cuántas casas reciben el anuncio */
  casasDestino?: number
}
export type NuevoAnuncio = Pick<Anuncio, 'titulo' | 'cuerpo' | 'categoria' | 'importante' | 'calle' | 'vence' | 'pideRespuesta'>

// ---------- Confirmaciones de los residentes ----------
export type TipoRespuesta = 'ENTERADO' | 'ASISTENCIA'
export type ValorRespuesta = 'ENTERADO' | 'ASISTE' | 'NO_ASISTE'
/** Una respuesta por casa; si la casa vuelve a responder se reemplaza */
export type Respuesta = { casa: string; valor: ValorRespuesta; personas?: number; por: Actor; en: Date }
export const MAX_PERSONAS = 10

export const calleDe = (casa: string) => casa.replace(/^Calle\s+/i, '').replace(/\s+\d+.*$/, '')
export const anuncioVigente = (a: Anuncio, ahora = Date.now()) => !a.vence || a.vence.getTime() > ahora
export const anuncioPara = (a: Anuncio, casa: string) => !a.calle || calleDe(casa) === a.calle

/** Cobranza de una casa (vista de administración) */
export type CobranzaCasa = { casa: string; atrasados: string[]; adeudo: number; alCorriente: boolean; enRevision: boolean }

// ---------- Cuotas y comprobantes ----------
export type EstadoCuota = 'PENDIENTE' | 'ATRASADO' | 'EN_REVISION' | 'PAGADO'
export type Cuota = {
  /** "2026-11" */
  periodo: string
  casa: string
  concepto: string
  monto: number
  vence: Date
  estado: EstadoCuota
}

export type MetodoPago = 'TRANSFERENCIA' | 'DEPOSITO' | 'EFECTIVO'
export const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
  { valor: 'DEPOSITO', etiqueta: 'Depósito' },
  { valor: 'EFECTIVO', etiqueta: 'Efectivo en oficina' },
]

export type EstadoComprobante = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO'
export type Comprobante = {
  id: string
  folio: string
  casa: string
  periodos: string[]
  monto: number
  metodo: MetodoPago
  fechaPago: Date
  referencia?: string
  /** URL de la imagen (con API: URL firmada y temporal) */
  imagen: string
  estado: EstadoComprobante
  motivoRechazo?: string
  subidoPor: Actor
  subidoEn: Date
  revisadoPor?: Actor
  revisadoEn?: Date
}
export type NuevoComprobante = Pick<Comprobante, 'periodos' | 'monto' | 'metodo' | 'fechaPago' | 'referencia'>

export const MOTIVOS_RECHAZO = [
  'El monto no coincide',
  'No se ve bien el comprobante',
  'No encontramos el depósito',
  'Es de otro periodo',
  'Comprobante repetido',
] as const

/** "2026-11-23" con la fecha LOCAL (para <input type="date">) */
export const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
export const nombrePeriodo = (p: string) => {
  const [a, m] = p.split('-').map(Number)
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}
