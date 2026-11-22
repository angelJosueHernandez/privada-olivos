import { api, hayApi } from '../../shared/api/cliente'
import {
  HORARIOS, type Acceso, type Actor, type Aviso, type LecturaPlaca, type NuevoAcceso, type NuevoPase, type Pase,
  type PaseResidente, type Validacion,
} from './tipos'

/*
  Servicio de caseta y pases.
  Con API: el contenido del QR se manda tal cual al servidor, que es el único que decide si el
  pase es válido (vigencia, uso único, revocación). El navegador nunca valida pases por su cuenta.
  Sin API: modo demostración. Los datos se guardan en este navegador (localStorage) y se comparten
  entre pestañas, para probar el flujo completo: el residente crea un pase en una pestaña y el guardia
  lo escanea en otra; al registrar la entrada, la pestaña del residente recibe el aviso.

  Trazabilidad: cada acción guarda QUIÉN la hizo y CUÁNDO. Con API, el servidor toma el actor de la
  sesión (cookie) y la hora de su reloj; el parámetro `actor` de estas funciones solo se usa en el demo
  y la API debe ignorarlo. La bitácora en la base de datos debe ser de solo agregar (sin editar ni borrar).
*/

// ---------- Datos iniciales del modo demostración ----------
const hora = (h: number, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d }
const ayer = (h: number, m = 0) => { const d = hora(h, m); d.setDate(d.getDate() - 1); return d }
const maria: Actor = { id: 'u-res-2', nombre: 'María Treviño', rol: 'RESIDENTE', casa: 'Calle Palma 104' }
const jorge: Actor = { id: 'u-res-7', nombre: 'Jorge Salinas', rol: 'RESIDENTE', casa: 'Calle Encino 212' }
const rocha: Actor = { id: 'u-res-9', nombre: 'Familia Rocha', rol: 'RESIDENTE', casa: 'Calle Olmo 303' }
const ana: Actor = { id: 'u-res-4', nombre: 'Ana Lucía Cantú', rol: 'RESIDENTE', casa: 'Calle Palma 107' }
const patricia: Actor = { id: 'u-res-5', nombre: 'Patricia Garza', rol: 'RESIDENTE', casa: 'Calle Encino 205' }
const luis: Actor = { id: '3', nombre: 'Luis Herrera', rol: 'GUARDIA' }
const pedro: Actor = { id: 'u-gua-2', nombre: 'Pedro Sánchez', rol: 'GUARDIA' }

function semilla(): EstadoDemo {
  const pases: PaseResidente[] = [
    { codigo: 'OLV-4821-KQ', estado: 'VALIDO', id: 'p1', folio: 'PS-4821', visitante: 'Ramiro Hernández', motivo: 'Plomero', casa: 'Calle Palma 104', residente: 'María Treviño', tipo: 'UNICO', vigencia: 'Hoy · 08:00 – 18:00', personas: 1, placas: 'RTS-482-C', creadoPor: maria, creadoEn: ayer(21, 14) },
    { codigo: 'OLV-7730-ZD', estado: 'VALIDO', id: 'p2', folio: 'PS-7730', visitante: 'Rosa López', motivo: 'Limpieza', casa: 'Calle Encino 212', residente: 'Jorge Salinas', tipo: 'RECURRENTE', vigencia: 'Lun, mié y vie · 07:00 – 16:00', personas: 1, creadoPor: jorge, creadoEn: ayer(9, 2) },
    { codigo: 'OLV-1199-AX', estado: 'VENCIDO', detalle: 'Era válido ayer de 10:00 a 14:00.', id: 'p3', folio: 'PS-1199', visitante: 'Carlos Méndez', casa: 'Calle Olmo 303', residente: 'Familia Rocha', tipo: 'UNICO', vigencia: 'Ayer · 10:00 – 14:00', personas: 2, creadoPor: rocha, creadoEn: ayer(8, 40) },
    { codigo: 'OLV-5506-MP', estado: 'USADO', detalle: 'Ya se usó hoy a las 09:12.', usadoEn: hora(9, 12), id: 'p4', folio: 'PS-5506', visitante: 'Daniela Ruiz', casa: 'Calle Palma 107', residente: 'Ana Lucía Cantú', tipo: 'UNICO', vigencia: 'Hoy · 09:00 – 13:00', personas: 1, creadoPor: ana, creadoEn: hora(7, 55) },
    { codigo: 'OLV-3344-RV', estado: 'REVOCADO', detalle: 'El residente canceló este pase.', id: 'p5', folio: 'PS-3344', visitante: 'Luis Ortega', casa: 'Calle Encino 205', residente: 'Patricia Garza', tipo: 'UNICO', vigencia: 'Hoy · 12:00 – 20:00', personas: 3, creadoPor: patricia, creadoEn: ayer(19, 30) },
  ]
  const accesos: Acceso[] = [
    { id: 'a1', folio: 'CS-0841', tipo: 'PAQUETERIA', nombre: 'DHL', casa: 'Calle Palma 101', vehiculo: 'CAMIONETA', color: 'BLANCO', placas: 'NHT-482-B', paquete: 'CASETA', cantidad: '1', fotos: [], entrada: hora(8, 41), registradoPor: pedro },
    { id: 'a2', folio: 'CS-0912', tipo: 'VISITA_QR', nombre: 'Daniela Ruiz', casa: 'Calle Palma 107', fotos: [], entrada: hora(9, 12), paseId: 'p4', paseFolio: 'PS-5506', paseCreadoPor: ana, paseCreadoEn: hora(7, 55), registradoPor: luis },
    { id: 'a3', folio: 'CS-1005', tipo: 'COMIDA', nombre: 'Rappi', casa: 'Calle Olmo 302', vehiculo: 'MOTO', color: 'NEGRO', placas: 'XKR-91-27', fotos: [], entrada: hora(10, 5), salida: hora(10, 14), registradoPor: luis, salidaPor: luis },
    { id: 'a4', folio: 'CS-0730', tipo: 'SERVICIO', nombre: 'Jardinería', casa: 'Calle Encino 205', vehiculo: 'CAMIONETA', color: 'ROJO', placas: 'JRD-220-A', etiquetas: ['Trabajo programado'], fotos: [], entrada: hora(7, 30), registradoPor: pedro },
    // Para la casa del residente de prueba (María, Calle Palma 104)
    { id: 'a5', folio: 'CS-0815', tipo: 'PAQUETERIA', nombre: 'Amazon', casa: 'Calle Palma 104', vehiculo: 'CAMIONETA', color: 'AZUL', placas: 'AMZ-310-D', paquete: 'CASETA', cantidad: '2', fotos: [], entrada: hora(8, 15), registradoPor: pedro },
  ]
  const avisos: Aviso[] = [
    { id: 'v1', para: 'Calle Palma 104', tipo: 'paquete', titulo: 'Tienes 2 paquetes en caseta', cuerpo: 'Amazon los dejó a las 08:15. Pasa a recogerlos.', en: hora(8, 15), accesoId: 'a5' },
  ]
  return { dia: hoyClave(), pases, accesos, avisos }
}

// ---------- Almacén del demo (compartido entre pestañas) ----------
type EstadoDemo = { dia: string; pases: PaseResidente[]; accesos: Acceso[]; avisos: Aviso[] }
const CLAVE = 'olv-demo-v1'
const hoyClave = () => new Date().toDateString()
const CAMPOS_FECHA = ['entrada', 'salida', 'entregado', 'paseCreadoEn']
const FECHAS_PASE = ['creadoEn', 'desde', 'hasta', 'usadoEn']

const fechas = <T extends object>(o: T, campos: string[]): T => {
  const r: Record<string, unknown> = { ...(o as Record<string, unknown>) }
  campos.forEach((c) => { if (typeof r[c] === 'string') r[c] = new Date(r[c] as string) })
  return r as T
}
const conActores = (a: Acceso) => fechas(a, CAMPOS_FECHA)
const revivirPase = (p: PaseResidente) => fechas(p, FECHAS_PASE)

// Las fotos (blob:) solo existen en esta pestaña; no se guardan en el almacenamiento
const fotosMemoria = new Map<string, string[]>()

function leer(): EstadoDemo {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as EstadoDemo | null
    if (crudo && crudo.dia === hoyClave() && Array.isArray(crudo.pases) && Array.isArray(crudo.accesos) && Array.isArray(crudo.avisos)) {
      return {
        dia: crudo.dia,
        pases: crudo.pases.map(revivirPase),
        accesos: crudo.accesos.map((a) => ({ ...conActores(a), fotos: fotosMemoria.get(a.id) ?? [] })),
        avisos: crudo.avisos.map((v) => fechas(v, ['en'])),
      }
    }
  } catch { /* almacenamiento dañado o bloqueado: se reinicia */ }
  return semilla()
}

let demo: EstadoDemo = hayApi ? semilla() : leer()
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

function guardar() {
  try {
    const sinFotos = { ...demo, accesos: demo.accesos.map((a) => ({ ...a, fotos: [] })) }
    localStorage.setItem(CLAVE, JSON.stringify(sinFotos))
  } catch { /* sin almacenamiento: queda solo en memoria */ }
  avisar()
}
// Cambios hechos en otra pestaña (p. ej. el guardia registra una entrada): se recargan y se avisa
if (!hayApi && typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { demo = leer(); avisar() } })
}

const espera = (ms = 450) => new Promise((r) => setTimeout(r, ms))
const nuevoId = () => crypto.randomUUID()
const nuevoFolio = (pref = 'CS', d = new Date()) => `${pref}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
const hm = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

/** Código del QR: aleatorio criptográfico, sin letras que se confunden (O/0, I/1) */
function nuevoCodigo(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const r = crypto.getRandomValues(new Uint8Array(6))
  const c = Array.from(r, (b) => abc[b % abc.length]).join('')
  return `OLV-${c.slice(0, 4)}-${c.slice(4)}`
}

/** Aviso a una casa (o a la caseta). Con API lo genera y lo envía el servidor como push. */
function nuevoAviso(v: Omit<Aviso, 'id' | 'en'>) {
  demo.avisos = [{ ...v, id: nuevoId(), en: new Date() }, ...demo.avisos].slice(0, 200)
}

const plural = (n: string | undefined, uno: string, varios: string) => (n === '1' || !n ? uno : n === '3+' ? `3 o más ${varios}` : `${n} ${varios}`)

/** Texto del aviso que recibe la casa cuando la caseta registra una entrada */
function avisoDeEntrada(a: Acceso): Omit<Aviso, 'id' | 'en'> {
  const base = { para: a.casa, accesoId: a.id }
  const placas = a.placas ? ` (${a.placas})` : ''
  switch (a.tipo) {
    case 'VISITA_QR': return { ...base, tipo: 'llegada', titulo: 'Tu visita llegó', cuerpo: `${a.nombre} ya entró y va hacia tu casa${placas}.` }
    case 'VISITA_SIN_QR': return { ...base, tipo: 'llegada', titulo: 'Llegó una visita para ti', cuerpo: `${a.nombre} entró sin pase y va hacia tu casa${placas}.` }
    case 'COMIDA': return { ...base, tipo: 'camino', titulo: 'Tu pedido va en camino', cuerpo: `El repartidor de ${a.nombre} entró y va hacia tu casa${placas}.` }
    case 'SERVICIO': return { ...base, tipo: 'camino', titulo: 'Llegó un servicio', cuerpo: `${a.nombre} entró y va hacia tu casa${placas}.` }
    case 'PAQUETERIA':
      return a.paquete === 'CASETA'
        ? { ...base, tipo: 'paquete', titulo: `Tienes ${plural(a.cantidad, 'un paquete', 'paquetes')} en caseta`, cuerpo: `${a.nombre} lo dejó a las ${hm(a.entrada)}. Pasa a recogerlo.` }
        : { ...base, tipo: 'camino', titulo: 'Tu paquete va en camino', cuerpo: `El repartidor de ${a.nombre} entró con ${plural(a.cantidad, 'un paquete', 'paquetes')} y va hacia tu casa${placas}.` }
  }
}

/** Calcula el estado de un pase en este momento (vigencia por horario) */
function estadoActual(p: PaseResidente): PaseResidente {
  if (p.estado !== 'VALIDO') return p
  const ahora = Date.now()
  if (p.hasta && ahora > p.hasta.getTime()) return { ...p, estado: 'VENCIDO' }
  return p
}

/** Extrae el código del contenido del QR (puede venir solo o dentro de un enlace). */
export function extraerCodigo(contenido: string): string | null {
  const m = contenido.toUpperCase().match(/OLV-[A-Z0-9]{4}-[A-Z0-9]{2}/)
  return m ? m[0] : null
}

export const CASAS = [
  ...Array.from({ length: 10 }, (_, i) => `Calle Palma ${101 + i}`),
  ...Array.from({ length: 12 }, (_, i) => `Calle Encino ${201 + i}`),
  ...Array.from({ length: 6 }, (_, i) => `Calle Olmo ${301 + i}`),
]

/** Convierte una foto (Blob JPEG) a base64 sin el prefijo data: */
async function aBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export class IaNoDisponible extends Error {}

// ---------- API pública del servicio ----------
export const casetaService = {
  /**
   * Se suscribe a cambios de datos (nuevas entradas, pases, avisos).
   * Demo: cambios de esta pestaña y de otras. API: consulta periódica (luego: push / tiempo real).
   */
  suscribir(f: () => void): () => void {
    if (hayApi) { const t = setInterval(f, 30_000); return () => clearInterval(t) }
    oyentes.add(f)
    return () => { oyentes.delete(f) }
  },

  async validarPase(contenidoQr: string): Promise<Validacion> {
    const contenido = contenidoQr.trim().slice(0, 512)
    if (hayApi) {
      const v = await api<Validacion>('/api/caseta/pases/validar', { metodo: 'POST', cuerpo: { contenido } })
      return v.pase ? { ...v, pase: fechas(v.pase, ['creadoEn']) } : v
    }
    await espera()
    const codigo = extraerCodigo(contenido)
    const guardado = codigo ? demo.pases.find((p) => p.codigo === codigo) : undefined
    if (!guardado) return { estado: 'NO_EXISTE' }
    const p = estadoActual(guardado)
    if (p.estado === 'VALIDO' && p.desde && Date.now() < p.desde.getTime()) {
      return { estado: 'FUERA_DE_HORARIO', pase: p, detalle: `Es válido desde ${p.desde.toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.` }
    }
    const detalle = p.estado === 'USADO' && p.usadoEn ? `Ya se usó a las ${hm(p.usadoEn)}.` : p.estado === 'REVOCADO' ? 'El residente canceló este pase.' : p.detalle
    return { estado: p.estado, pase: p, detalle }
  },

  async registrarEntradaConPase(pase: Pase, actor: Actor): Promise<Acceso> {
    if (hayApi) return conActores(await api<Acceso>(`/api/caseta/pases/${encodeURIComponent(pase.id)}/entrada`, { metodo: 'POST' }))
    await espera(300)
    const ahora = new Date()
    if (pase.tipo === 'UNICO') demo.pases = demo.pases.map((p) => (p.id === pase.id ? { ...p, estado: 'USADO', usadoEn: ahora } : p))
    const acceso: Acceso = {
      id: nuevoId(), folio: nuevoFolio(), tipo: 'VISITA_QR', nombre: pase.visitante, casa: pase.casa, placas: pase.placas, fotos: [], entrada: ahora,
      paseId: pase.id, paseFolio: pase.folio, paseCreadoPor: pase.creadoPor, paseCreadoEn: pase.creadoEn, registradoPor: actor,
    }
    demo.accesos = [acceso, ...demo.accesos]
    nuevoAviso(avisoDeEntrada(acceso))
    guardar()
    return acceso
  },

  async registrarManual(datos: NuevoAcceso, evidencias: { blob: Blob; etiqueta: string }[], actor: Actor): Promise<Acceso> {
    if (hayApi) {
      const form = new FormData()
      form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
      // El nombre del archivo indica qué es (placa, guia, paquete…); la API lo renombra con un UUID al guardarlo
      evidencias.forEach((e, i) => form.append('fotos', e.blob, `${e.etiqueta.replace(/[^a-z]/g, '') || 'foto'}-${i + 1}.jpg`))
      return conActores(await api<Acceso>('/api/caseta/accesos', { metodo: 'POST', cuerpo: form }))
    }
    await espera(600)
    const fotos = evidencias.map((e) => URL.createObjectURL(e.blob))
    const acceso: Acceso = { id: nuevoId(), folio: nuevoFolio(), ...datos, fotos, entrada: new Date(), registradoPor: actor }
    fotosMemoria.set(acceso.id, fotos)
    demo.accesos = [acceso, ...demo.accesos]
    nuevoAviso(avisoDeEntrada(acceso))
    guardar()
    return acceso
  },

  async registrarSalida(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/salida`, { metodo: 'POST' })
    await espera(250)
    const ahora = new Date()
    demo.accesos = demo.accesos.map((a) => (a.id === id ? { ...a, salida: ahora, salidaPor: actor } : a))
    const a = demo.accesos.find((x) => x.id === id)
    if (a) nuevoAviso({ para: a.casa, tipo: 'salida', accesoId: a.id, titulo: a.tipo === 'VISITA_QR' || a.tipo === 'VISITA_SIN_QR' ? 'Tu visita salió' : `${a.nombre} salió`, cuerpo: `${a.nombre} salió de la privada a las ${hm(ahora)}.` })
    guardar()
  },

  /**
   * Lee la placa con IA. La foto va a nuestra función /api/placas (servidor de Vercel),
   * que es la única que tiene la llave de la IA. Si no está configurada, lanza IaNoDisponible
   * y el guardia elige los datos a mano.
   */
  async leerPlaca(foto: Blob): Promise<LecturaPlaca> {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 25_000)
    try {
      const r = await fetch('/api/placas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen: await aBase64(foto) }),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: ac.signal,
      })
      const esJson = (r.headers.get('content-type') ?? '').includes('application/json')
      if (r.status === 503 || r.status === 404 || !esJson) throw new IaNoDisponible('La lectura automática de placas no está configurada.')
      if (r.status === 429) throw new Error('Demasiadas lecturas seguidas. Espera un momento.')
      if (!r.ok) throw new Error('No se pudo leer la placa. Elige los datos a mano.')
      return (await r.json()) as LecturaPlaca
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error('La lectura tardó demasiado. Intenta de nuevo.')
      throw e
    } finally {
      clearTimeout(t)
    }
  },

  /** Automatización: si la placa ya vino antes, devuelve su último registro para prellenar */
  async buscarPorPlaca(placa: string): Promise<Acceso | null> {
    const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (p.length < 4) return null
    if (hayApi) return api<Acceso | null>(`/api/caseta/placas/${encodeURIComponent(p)}/ultimo`)
    return demo.accesos.find((a) => a.placas?.replace(/[^A-Z0-9]/g, '') === p) ?? null
  },

  /** Paquete que se quedó en caseta: se marca como entregado al residente */
  async entregarPaquete(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/entrega`, { metodo: 'POST' })
    await espera(250)
    const ahora = new Date()
    demo.accesos = demo.accesos.map((a) => (a.id === id ? { ...a, entregado: ahora, entregadoPor: actor } : a))
    const a = demo.accesos.find((x) => x.id === id)
    if (a) nuevoAviso({ para: a.casa, tipo: 'entrega', accesoId: a.id, titulo: 'Paquete entregado', cuerpo: `Tu paquete de ${a.nombre} se entregó a las ${hm(ahora)}. Lo entregó ${actor.nombre}.` })
    guardar()
  },

  async listarHoy(): Promise<Acceso[]> {
    if (hayApi) return (await api<Acceso[]>('/api/caseta/accesos/hoy')).map(conActores)
    await espera(200)
    return [...demo.accesos].sort((a, b) => b.entrada.getTime() - a.entrada.getTime())
  },

  /** Actividad del día de un usuario (para su perfil) */
  async actividadDe(usuarioId: string): Promise<{ entradas: number; salidas: number; entregas: number }> {
    if (hayApi) return api(`/api/usuarios/${encodeURIComponent(usuarioId)}/actividad-hoy`)
    return {
      entradas: demo.accesos.filter((a) => a.registradoPor.id === usuarioId).length,
      salidas: demo.accesos.filter((a) => a.salidaPor?.id === usuarioId).length,
      entregas: demo.accesos.filter((a) => a.entregadoPor?.id === usuarioId).length,
    }
  },

  // ---------- Residente ----------

  /** Crea un pase de visita. Con API: el servidor genera el código y valida que la casa sea la del usuario. */
  async crearPase(datos: NuevoPase, actor: Actor): Promise<PaseResidente> {
    if (hayApi) return revivirPase(await api<PaseResidente>('/api/pases', { metodo: 'POST', cuerpo: datos }))
    await espera(500)
    const h = HORARIOS.find((x) => x.valor === datos.horario) ?? HORARIOS[0]
    const desde = new Date(); desde.setHours(h.desde, 0, 0, 0)
    const hasta = new Date(); hasta.setHours(h.hasta, 0, 0, 0)
    if (datos.dia === 'MANANA') { desde.setDate(desde.getDate() + 1); hasta.setDate(hasta.getDate() + 1) }
    const dos = (n: number) => `${String(n).padStart(2, '0')}:00`
    const ahora = new Date()
    const pase: PaseResidente = {
      id: nuevoId(), codigo: nuevoCodigo(), folio: nuevoFolio('PS'), estado: 'VALIDO',
      visitante: datos.visitante, motivo: datos.motivo, casa: actor.casa ?? '', residente: actor.nombre,
      tipo: 'UNICO', vigencia: `${datos.dia === 'HOY' ? 'Hoy' : 'Mañana'} · ${dos(h.desde)} – ${dos(h.hasta)}`,
      personas: datos.personas, placas: datos.placas, creadoPor: actor, creadoEn: ahora, desde, hasta,
    }
    demo.pases = [pase, ...demo.pases]
    nuevoAviso({ para: 'CASETA', tipo: 'pase', titulo: 'Nuevo pase de visita', cuerpo: `${pase.visitante} → ${pase.casa} · ${pase.vigencia}${pase.placas ? ` · ${pase.placas}` : ''}` })
    guardar()
    return pase
  },

  /** Pases creados para la casa del usuario (con API: el servidor filtra por la sesión) */
  async misPases(casa: string): Promise<PaseResidente[]> {
    if (hayApi) return (await api<PaseResidente[]>('/api/pases/mios')).map(revivirPase)
    await espera(150)
    return demo.pases.filter((p) => p.casa === casa).map(estadoActual)
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
  },

  /** Cancela un pase: el QR deja de servir de inmediato */
  async cancelarPase(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/pases/${encodeURIComponent(id)}/cancelar`, { metodo: 'POST' })
    await espera(250)
    const p = demo.pases.find((x) => x.id === id && x.casa === actor.casa)
    if (!p) throw new Error('No se encontró el pase.')
    demo.pases = demo.pases.map((x) => (x.id === id ? { ...x, estado: 'REVOCADO' } : x))
    nuevoAviso({ para: 'CASETA', tipo: 'pase', titulo: 'Pase cancelado', cuerpo: `${p.visitante} → ${p.casa}. El código ya no es válido.` })
    guardar()
  },

  /** Entradas de hoy hacia la casa del usuario */
  async actividadCasa(casa: string): Promise<Acceso[]> {
    if (hayApi) return (await api<Acceso[]>('/api/casas/mia/accesos/hoy')).map(conActores)
    await espera(150)
    return demo.accesos.filter((a) => a.casa === casa).sort((a, b) => b.entrada.getTime() - a.entrada.getTime())
  },

  /** Avisos para una casa, la caseta ('CASETA') o la administración ('ADMIN'), del más nuevo al más viejo */
  async avisos(para: string): Promise<Aviso[]> {
    if (hayApi) {
      const ruta = para === 'CASETA' ? '/api/caseta/avisos' : para === 'ADMIN' ? '/api/admin/avisos' : '/api/casas/mia/avisos'
      return (await api<Aviso[]>(ruta)).map((v) => fechas(v, ['en']))
    }
    const esCasa = para !== 'CASETA' && para !== 'ADMIN'
    return demo.avisos.filter((v) => v.para === para || (esCasa && v.para === 'TODAS'))
  },

  /** Demo: registra un aviso (con API los genera el servidor al guardar cada evento) */
  avisar(v: Omit<Aviso, 'id' | 'en'>) {
    if (hayApi) return
    demo = leer()
    nuevoAviso(v)
    guardar()
  },
}
