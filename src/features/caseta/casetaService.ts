import { api, hayApi } from '../../shared/api/cliente'
import type { Acceso, Actor, LecturaPlaca, NuevoAcceso, Pase, Validacion } from './tipos'

/*
  Servicio de caseta.
  Con API: el contenido del QR se manda tal cual al servidor, que es el único que decide si el
  pase es válido (vigencia, uso único, revocación). El navegador nunca valida pases por su cuenta.
  Sin API: modo demostración en memoria.

  Trazabilidad: cada acción guarda QUIÉN la hizo y CUÁNDO. Con API, el servidor toma el actor de la
  sesión (cookie) y la hora de su reloj; el parámetro `actor` de estas funciones solo se usa en el demo
  y la API debe ignorarlo. La bitácora en la base de datos debe ser de solo agregar (sin editar ni borrar).
*/

// ---------- Modo demostración ----------
const hoy = () => new Date()
const hora = (h: number, m = 0) => { const d = hoy(); d.setHours(h, m, 0, 0); return d }

const ayer = (h: number, m = 0) => { const d = hora(h, m); d.setDate(d.getDate() - 1); return d }
const maria: Actor = { id: 'u-res-2', nombre: 'María Treviño', rol: 'RESIDENTE', casa: 'Calle Palma 104' }
const jorge: Actor = { id: 'u-res-7', nombre: 'Jorge Salinas', rol: 'RESIDENTE', casa: 'Calle Encino 212' }
const rocha: Actor = { id: 'u-res-9', nombre: 'Familia Rocha', rol: 'RESIDENTE', casa: 'Calle Olmo 303' }
const ana: Actor = { id: 'u-res-4', nombre: 'Ana Lucía Cantú', rol: 'RESIDENTE', casa: 'Calle Palma 107' }
const patricia: Actor = { id: 'u-res-5', nombre: 'Patricia Garza', rol: 'RESIDENTE', casa: 'Calle Encino 205' }
const luis: Actor = { id: '3', nombre: 'Luis Herrera', rol: 'GUARDIA' }
const pedro: Actor = { id: 'u-gua-2', nombre: 'Pedro Sánchez', rol: 'GUARDIA' }

const PASES_DEMO: Record<string, { pase: Pase; estado: Validacion['estado']; detalle?: string }> = {
  'OLV-4821-KQ': { estado: 'VALIDO', pase: { id: 'p1', folio: 'PS-4821', visitante: 'Ramiro Hernández', motivo: 'Plomero', casa: 'Calle Palma 104', residente: 'María Treviño', tipo: 'UNICO', vigencia: 'Hoy · 08:00 – 18:00', personas: 1, placas: 'RTS-482-C', creadoPor: maria, creadoEn: ayer(21, 14) } },
  'OLV-7730-ZD': { estado: 'VALIDO', pase: { id: 'p2', folio: 'PS-7730', visitante: 'Rosa López', motivo: 'Limpieza', casa: 'Calle Encino 212', residente: 'Jorge Salinas', tipo: 'RECURRENTE', vigencia: 'Lun, mié y vie · 07:00 – 16:00', personas: 1, creadoPor: jorge, creadoEn: ayer(9, 2) } },
  'OLV-1199-AX': { estado: 'VENCIDO', detalle: 'Era válido ayer de 10:00 a 14:00.', pase: { id: 'p3', folio: 'PS-1199', visitante: 'Carlos Méndez', casa: 'Calle Olmo 303', residente: 'Familia Rocha', tipo: 'UNICO', vigencia: 'Ayer · 10:00 – 14:00', personas: 2, creadoPor: rocha, creadoEn: ayer(8, 40) } },
  'OLV-5506-MP': { estado: 'USADO', detalle: 'Ya se usó hoy a las 09:12.', pase: { id: 'p4', folio: 'PS-5506', visitante: 'Daniela Ruiz', casa: 'Calle Palma 107', residente: 'Ana Lucía Cantú', tipo: 'UNICO', vigencia: 'Hoy · 09:00 – 13:00', personas: 1, creadoPor: ana, creadoEn: hora(7, 55) } },
  'OLV-3344-RV': { estado: 'REVOCADO', detalle: 'El residente canceló este pase.', pase: { id: 'p5', folio: 'PS-3344', visitante: 'Luis Ortega', casa: 'Calle Encino 205', residente: 'Patricia Garza', tipo: 'UNICO', vigencia: 'Hoy · 12:00 – 20:00', personas: 3, creadoPor: patricia, creadoEn: ayer(19, 30) } },
}

let accesosDemo: Acceso[] = [
  { id: 'a1', folio: 'CS-0841', tipo: 'PAQUETERIA', nombre: 'DHL', casa: 'Calle Palma 101', vehiculo: 'CAMIONETA', color: 'BLANCO', placas: 'NHT-482-B', paquete: 'CASETA', cantidad: '1', fotos: [], entrada: hora(8, 41), registradoPor: pedro },
  { id: 'a2', folio: 'CS-0912', tipo: 'VISITA_QR', nombre: 'Daniela Ruiz', casa: 'Calle Palma 107', fotos: [], entrada: hora(9, 12), paseId: 'p4', paseFolio: 'PS-5506', paseCreadoPor: ana, paseCreadoEn: hora(7, 55), registradoPor: luis },
  { id: 'a3', folio: 'CS-1005', tipo: 'COMIDA', nombre: 'Rappi', casa: 'Calle Olmo 302', vehiculo: 'MOTO', color: 'NEGRO', placas: 'XKR-91-27', fotos: [], entrada: hora(10, 5), salida: hora(10, 14), registradoPor: luis, salidaPor: luis },
  { id: 'a4', folio: 'CS-0730', tipo: 'SERVICIO', nombre: 'Jardinería', casa: 'Calle Encino 205', vehiculo: 'CAMIONETA', color: 'ROJO', placas: 'JRD-220-A', etiquetas: ['Trabajo programado'], fotos: [], entrada: hora(7, 30), registradoPor: pedro },
]
const usadosDemo = new Set<string>()
const espera = (ms = 450) => new Promise((r) => setTimeout(r, ms))
const nuevoId = () => crypto.randomUUID()
const nuevoFolio = (d = new Date()) => `CS-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
const fechas = <T extends Record<string, unknown>>(o: T, campos: string[]): T => {
  const r: Record<string, unknown> = { ...o }
  campos.forEach((c) => { if (typeof r[c] === 'string') r[c] = new Date(r[c] as string) })
  return r as T
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
  async validarPase(contenidoQr: string): Promise<Validacion> {
    const contenido = contenidoQr.trim().slice(0, 512)
    if (hayApi) {
      const v = await api<Validacion>('/api/caseta/pases/validar', { metodo: 'POST', cuerpo: { contenido } })
      return v.pase ? { ...v, pase: fechas(v.pase, ['creadoEn']) } : v
    }
    await espera()
    const codigo = extraerCodigo(contenido)
    const d = codigo ? PASES_DEMO[codigo] : undefined
    if (!d) return { estado: 'NO_EXISTE' }
    if (d.estado === 'VALIDO' && d.pase.tipo === 'UNICO' && usadosDemo.has(d.pase.id)) {
      return { estado: 'USADO', pase: d.pase, detalle: 'Este pase ya se usó para entrar.' }
    }
    return { estado: d.estado, pase: d.pase, detalle: d.detalle }
  },

  async registrarEntradaConPase(pase: Pase, actor: Actor): Promise<Acceso> {
    if (hayApi) return fechas(await api<Acceso>(`/api/caseta/pases/${encodeURIComponent(pase.id)}/entrada`, { metodo: 'POST' }), CAMPOS_FECHA)
    await espera(300)
    if (pase.tipo === 'UNICO') usadosDemo.add(pase.id)
    const acceso: Acceso = {
      id: nuevoId(), folio: nuevoFolio(), tipo: 'VISITA_QR', nombre: pase.visitante, casa: pase.casa, placas: pase.placas, fotos: [], entrada: new Date(),
      paseId: pase.id, paseFolio: pase.folio, paseCreadoPor: pase.creadoPor, paseCreadoEn: pase.creadoEn, registradoPor: actor,
    }
    accesosDemo = [acceso, ...accesosDemo]
    return acceso
  },

  async registrarManual(datos: NuevoAcceso, evidencias: { blob: Blob; etiqueta: string }[], actor: Actor): Promise<Acceso> {
    const fotos = evidencias.map((e) => e.blob)
    if (hayApi) {
      const form = new FormData()
      form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
      // El nombre del archivo indica qué es (placa, guia, paquete…); la API lo renombra con un UUID al guardarlo
      evidencias.forEach((e, i) => form.append('fotos', e.blob, `${e.etiqueta.replace(/[^a-z]/g, '') || 'foto'}-${i + 1}.jpg`))
      return fechas(await api<Acceso>('/api/caseta/accesos', { metodo: 'POST', cuerpo: form }), CAMPOS_FECHA)
    }
    await espera(600)
    const acceso: Acceso = { id: nuevoId(), folio: nuevoFolio(), ...datos, fotos: fotos.map((f) => URL.createObjectURL(f)), entrada: new Date(), registradoPor: actor }
    accesosDemo = [acceso, ...accesosDemo]
    return acceso
  },

  async registrarSalida(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/salida`, { metodo: 'POST' })
    await espera(250)
    accesosDemo = accesosDemo.map((a) => (a.id === id ? { ...a, salida: new Date(), salidaPor: actor } : a))
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
    return accesosDemo.find((a) => a.placas?.replace(/[^A-Z0-9]/g, '') === p) ?? null
  },

  /** Paquete que se quedó en caseta: se marca como entregado al residente */
  async entregarPaquete(id: string, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/entrega`, { metodo: 'POST' })
    await espera(250)
    accesosDemo = accesosDemo.map((a) => (a.id === id ? { ...a, entregado: new Date(), entregadoPor: actor } : a))
  },

  async listarHoy(): Promise<Acceso[]> {
    if (hayApi) {
      const lista = await api<Acceso[]>('/api/caseta/accesos/hoy')
      return lista.map((a) => fechas(a, CAMPOS_FECHA))
    }
    await espera(200)
    return [...accesosDemo].sort((a, b) => b.entrada.getTime() - a.entrada.getTime())
  },

  /** Actividad del día de un usuario (para su perfil) */
  async actividadDe(usuarioId: string): Promise<{ entradas: number; salidas: number; entregas: number }> {
    if (hayApi) return api(`/api/usuarios/${encodeURIComponent(usuarioId)}/actividad-hoy`)
    return {
      entradas: accesosDemo.filter((a) => a.registradoPor.id === usuarioId).length,
      salidas: accesosDemo.filter((a) => a.salidaPor?.id === usuarioId).length,
      entregas: accesosDemo.filter((a) => a.entregadoPor?.id === usuarioId).length,
    }
  },
}

const CAMPOS_FECHA = ['entrada', 'salida', 'entregado', 'paseCreadoEn']
