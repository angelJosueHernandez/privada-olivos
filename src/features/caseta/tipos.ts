// Modelo de datos de la caseta. Debe coincidir con los DTO de la API .NET.

export type TipoAcceso = 'VISITA_QR' | 'PAQUETERIA' | 'COMIDA' | 'SERVICIO' | 'VISITA_SIN_QR'
export type Vehiculo = 'A_PIE' | 'BICICLETA' | 'MOTO' | 'AUTO' | 'CAMIONETA' | 'CAMION'
export type Color = 'BLANCO' | 'NEGRO' | 'GRIS' | 'PLATA' | 'ROJO' | 'AZUL' | 'VERDE' | 'AMARILLO' | 'CAFE' | 'OTRO'

/** Quién hizo una acción. En producción lo asigna la API con la sesión, nunca el navegador. */
export type Actor = { id: string; nombre: string; rol: 'ADMIN' | 'RESIDENTE' | 'GUARDIA'; casa?: string }

export const ETIQUETA_ROL: Record<Actor['rol'], string> = { ADMIN: 'Administración', RESIDENTE: 'Residente', GUARDIA: 'Guardia' }

export type Pase = {
  id: string
  visitante: string
  motivo?: string
  casa: string
  residente: string
  tipo: 'UNICO' | 'RECURRENTE'
  /** Texto de vigencia listo para mostrar, p. ej. "Hoy · 08:00 – 18:00" */
  vigencia: string
  personas: number
  placas?: string
  /** Folio del pase para rastrearlo */
  folio: string
  /** Residente que creó el pase y cuándo */
  creadoPor: Actor
  creadoEn: Date
}

export type EstadoPase = 'VALIDO' | 'VENCIDO' | 'USADO' | 'REVOCADO' | 'FUERA_DE_HORARIO' | 'NO_EXISTE'

export type Validacion = { estado: EstadoPase; pase?: Pase; detalle?: string }

export type Acceso = {
  id: string
  tipo: TipoAcceso
  /** Empresa (DHL, Rappi, CFE…) o nombre de la persona */
  nombre: string
  casa: string
  vehiculo?: Vehiculo
  color?: Color
  placas?: string
  etiquetas?: string[]
  nota?: string
  paquete?: 'CASA' | 'CASETA'
  cantidad?: '1' | '2' | '3+'
  /** URLs de las fotos de evidencia (en la API: URLs firmadas y temporales) */
  fotos: string[]
  entrada: Date
  salida?: Date
  /** Para paquetes en caseta: cuándo se entregó al residente */
  entregado?: Date
  paseId?: string
  /** Folio del registro para rastrearlo */
  folio: string
  /** Trazabilidad: quién hizo cada paso (lo asigna la API con la sesión) */
  registradoPor: Actor
  salidaPor?: Actor
  entregadoPor?: Actor
  paseFolio?: string
  paseCreadoPor?: Actor
  paseCreadoEn?: Date
}

export type NuevoAcceso = Omit<Acceso, 'id' | 'fotos' | 'entrada' | 'salida' | 'entregado' | 'paseId' | 'folio' | 'registradoPor' | 'salidaPor' | 'entregadoPor' | 'paseFolio' | 'paseCreadoPor' | 'paseCreadoEn'> & {
  tipo: Exclude<TipoAcceso, 'VISITA_QR'>
}

export type LecturaPlaca = {
  placa: string | null
  estado: string | null
  tipoVehiculo: 'AUTO' | 'CAMIONETA' | 'MOTO' | 'CAMION' | 'DESCONOCIDO'
  color: Color
  confianza: 'ALTA' | 'MEDIA' | 'BAJA'
}

export const ETIQUETA_TIPO: Record<TipoAcceso, string> = {
  VISITA_QR: 'Visita con pase',
  PAQUETERIA: 'Paquetería',
  COMIDA: 'Comida a domicilio',
  SERVICIO: 'Servicio',
  VISITA_SIN_QR: 'Visita sin pase',
}

/** Opciones estándar por tipo: el guardia elige en lugar de escribir */
export const EMPRESAS: Record<NuevoAcceso['tipo'], string[]> = {
  PAQUETERIA: ['Amazon', 'Mercado Libre', 'DHL', 'FedEx', 'Estafeta', 'UPS', '99 Minutos', 'J&T Express', 'Paquetexpress', 'Correos de México'],
  COMIDA: ['Rappi', 'Uber Eats', 'DiDi Food', 'Repartidor del restaurante'],
  SERVICIO: ['CFE', 'Gas', 'Agua potable', 'Internet / TV', 'Jardinería', 'Plomería', 'Electricista', 'Limpieza', 'Fumigación', 'Mudanza'],
  VISITA_SIN_QR: [],
}

export const ETIQUETAS: Record<NuevoAcceso['tipo'], string[]> = {
  PAQUETERIA: ['Requiere firma', 'Pago contra entrega', 'Frágil', 'Recibió el residente', 'Recibió personal de la casa'],
  COMIDA: ['Ya pagado', 'Pago en efectivo', 'Recibió el residente'],
  SERVICIO: ['Trabajo programado', 'Trae herramienta', 'Requiere acompañamiento', 'Varias personas'],
  VISITA_SIN_QR: ['Autorizó por teléfono', 'Familiar', 'Amistad', 'Trabajo', 'Trae menores'],
}

export const VEHICULOS: { valor: Vehiculo; etiqueta: string }[] = [
  { valor: 'A_PIE', etiqueta: 'A pie' },
  { valor: 'BICICLETA', etiqueta: 'Bici' },
  { valor: 'MOTO', etiqueta: 'Moto' },
  { valor: 'AUTO', etiqueta: 'Auto' },
  { valor: 'CAMIONETA', etiqueta: 'Camioneta' },
  { valor: 'CAMION', etiqueta: 'Camión' },
]
export const tienePlaca = (v?: Vehiculo) => v === 'MOTO' || v === 'AUTO' || v === 'CAMIONETA' || v === 'CAMION'

export const COLORES: { valor: Color; etiqueta: string; muestra: string }[] = [
  { valor: 'BLANCO', etiqueta: 'Blanco', muestra: '#FFFFFF' },
  { valor: 'NEGRO', etiqueta: 'Negro', muestra: '#1D1D1F' },
  { valor: 'GRIS', etiqueta: 'Gris', muestra: '#8E8E93' },
  { valor: 'PLATA', etiqueta: 'Plata', muestra: '#C7C7CC' },
  { valor: 'ROJO', etiqueta: 'Rojo', muestra: '#D70015' },
  { valor: 'AZUL', etiqueta: 'Azul', muestra: '#0A60C2' },
  { valor: 'VERDE', etiqueta: 'Verde', muestra: '#248A3D' },
  { valor: 'AMARILLO', etiqueta: 'Amarillo', muestra: '#F2C200' },
  { valor: 'CAFE', etiqueta: 'Café', muestra: '#8A5A33' },
  { valor: 'OTRO', etiqueta: 'Otro', muestra: 'conic-gradient(#D70015,#F2C200,#248A3D,#0A60C2,#D70015)' },
]

// ---------- Residente: pases y avisos ----------

/** Pase tal como lo ve el residente que lo creó (incluye el código del QR y su estado) */
export type PaseResidente = Pase & {
  /** Contenido del QR. No lleva datos personales: el servidor busca el pase con este código */
  codigo: string
  estado: Exclude<EstadoPase, 'NO_EXISTE'>
  desde?: Date
  hasta?: Date
  usadoEn?: Date
  /** Explicación del estado (p. ej. "Era válido ayer de 10:00 a 14:00") */
  detalle?: string
}

export type DiaPase = 'HOY' | 'MANANA'
export type HorarioPase = 'DIA' | 'MANANA' | 'TARDE' | 'NOCHE'

export const HORARIOS: { valor: HorarioPase; etiqueta: string; desde: number; hasta: number }[] = [
  { valor: 'DIA', etiqueta: 'Todo el día', desde: 7, hasta: 22 },
  { valor: 'MANANA', etiqueta: 'Mañana', desde: 8, hasta: 14 },
  { valor: 'TARDE', etiqueta: 'Tarde', desde: 14, hasta: 20 },
  { valor: 'NOCHE', etiqueta: 'Noche', desde: 18, hasta: 23 },
]
export const MOTIVOS = ['Familiar', 'Amistad', 'Servicio', 'Trabajo doméstico', 'Entrega', 'Reunión'] as const

export type NuevoPase = {
  visitante: string
  motivo?: string
  dia: DiaPase
  horario: HorarioPase
  personas: number
  placas?: string
}

/**
 * Aviso para una casa (o para la caseta): "tu visita llegó", "tu paquete va en camino"…
 * Con la API los genera el servidor al registrar el evento y los manda como notificación push.
 */
export type TipoAviso = 'llegada' | 'camino' | 'paquete' | 'entrega' | 'salida' | 'pase' | 'anuncio' | 'pago'
export type Aviso = {
  id: string
  /** Casa destinataria, 'CASETA' (guardias), 'ADMIN' (administración) o 'TODAS' (todas las casas) */
  para: string
  tipo: TipoAviso
  titulo: string
  cuerpo: string
  en: Date
  accesoId?: string
}
