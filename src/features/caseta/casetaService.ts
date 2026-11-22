import { api, hayApi } from '../../shared/api/cliente'
import type { Acceso, LecturaPlaca, NuevoAcceso, Pase, Validacion } from './tipos'

/*
  Servicio de caseta.
  Con API: el contenido del QR se manda tal cual al servidor, que es el único que decide si el
  pase es válido (vigencia, uso único, revocación). El navegador nunca valida pases por su cuenta.
  Sin API: modo demostración en memoria.
*/

// ---------- Modo demostración ----------
const hoy = () => new Date()
const hora = (h: number, m = 0) => { const d = hoy(); d.setHours(h, m, 0, 0); return d }

const PASES_DEMO: Record<string, { pase: Pase; estado: Validacion['estado']; detalle?: string }> = {
  'OLV-4821-KQ': { estado: 'VALIDO', pase: { id: 'p1', visitante: 'Ramiro Hernández', motivo: 'Plomero', casa: 'Calle Palma 104', residente: 'María Treviño', tipo: 'UNICO', vigencia: 'Hoy · 08:00 – 18:00', personas: 1, placas: 'RTS-482-C' } },
  'OLV-7730-ZD': { estado: 'VALIDO', pase: { id: 'p2', visitante: 'Rosa López', motivo: 'Limpieza', casa: 'Calle Encino 212', residente: 'Jorge Salinas', tipo: 'RECURRENTE', vigencia: 'Lun, mié y vie · 07:00 – 16:00', personas: 1 } },
  'OLV-1199-AX': { estado: 'VENCIDO', detalle: 'Era válido ayer de 10:00 a 14:00.', pase: { id: 'p3', visitante: 'Carlos Méndez', casa: 'Calle Olmo 303', residente: 'Familia Rocha', tipo: 'UNICO', vigencia: 'Ayer · 10:00 – 14:00', personas: 2 } },
  'OLV-5506-MP': { estado: 'USADO', detalle: 'Ya se usó hoy a las 09:12.', pase: { id: 'p4', visitante: 'Daniela Ruiz', casa: 'Calle Palma 107', residente: 'Ana Lucía Cantú', tipo: 'UNICO', vigencia: 'Hoy · 09:00 – 13:00', personas: 1 } },
  'OLV-3344-RV': { estado: 'REVOCADO', detalle: 'El residente canceló este pase.', pase: { id: 'p5', visitante: 'Luis Ortega', casa: 'Calle Encino 205', residente: 'Patricia Garza', tipo: 'UNICO', vigencia: 'Hoy · 12:00 – 20:00', personas: 3 } },
}

let accesosDemo: Acceso[] = [
  { id: 'a1', tipo: 'PAQUETERIA', nombre: 'DHL', casa: 'Calle Palma 101', vehiculo: 'CAMIONETA', color: 'BLANCO', placas: 'NHT-482-B', paquete: 'CASETA', cantidad: '1', fotos: [], entrada: hora(8, 41), salida: hora(8, 45) },
  { id: 'a2', tipo: 'VISITA_QR', nombre: 'Daniela Ruiz', casa: 'Calle Palma 107', fotos: [], entrada: hora(9, 12), paseId: 'p4' },
  { id: 'a3', tipo: 'COMIDA', nombre: 'Rappi', casa: 'Calle Olmo 302', vehiculo: 'MOTO', color: 'NEGRO', placas: 'XKR-91-27', fotos: [], entrada: hora(10, 5), salida: hora(10, 14) },
  { id: 'a4', tipo: 'SERVICIO', nombre: 'Jardinería', casa: 'Calle Encino 205', vehiculo: 'CAMIONETA', color: 'ROJO', placas: 'JRD-220-A', etiquetas: ['Trabajo programado'], fotos: [], entrada: hora(7, 30) },
]
const usadosDemo = new Set<string>()
const espera = (ms = 450) => new Promise((r) => setTimeout(r, ms))
const nuevoId = () => crypto.randomUUID()

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
    if (hayApi) return api<Validacion>('/api/caseta/pases/validar', { metodo: 'POST', cuerpo: { contenido } })
    await espera()
    const codigo = extraerCodigo(contenido)
    const d = codigo ? PASES_DEMO[codigo] : undefined
    if (!d) return { estado: 'NO_EXISTE' }
    if (d.estado === 'VALIDO' && d.pase.tipo === 'UNICO' && usadosDemo.has(d.pase.id)) {
      return { estado: 'USADO', pase: d.pase, detalle: 'Este pase ya se usó para entrar.' }
    }
    return { estado: d.estado, pase: d.pase, detalle: d.detalle }
  },

  async registrarEntradaConPase(pase: Pase): Promise<Acceso> {
    if (hayApi) return api<Acceso>(`/api/caseta/pases/${encodeURIComponent(pase.id)}/entrada`, { metodo: 'POST' })
    await espera(300)
    if (pase.tipo === 'UNICO') usadosDemo.add(pase.id)
    const acceso: Acceso = { id: nuevoId(), tipo: 'VISITA_QR', nombre: pase.visitante, casa: pase.casa, placas: pase.placas, fotos: [], entrada: new Date(), paseId: pase.id }
    accesosDemo = [acceso, ...accesosDemo]
    return acceso
  },

  async registrarManual(datos: NuevoAcceso, evidencias: { blob: Blob; etiqueta: string }[]): Promise<Acceso> {
    const fotos = evidencias.map((e) => e.blob)
    if (hayApi) {
      const form = new FormData()
      form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
      // El nombre del archivo indica qué es (placa, guia, paquete…); la API lo renombra con un UUID al guardarlo
      evidencias.forEach((e, i) => form.append('fotos', e.blob, `${e.etiqueta.replace(/[^a-z]/g, '') || 'foto'}-${i + 1}.jpg`))
      return api<Acceso>('/api/caseta/accesos', { metodo: 'POST', cuerpo: form })
    }
    await espera(600)
    const acceso: Acceso = { id: nuevoId(), ...datos, fotos: fotos.map((f) => URL.createObjectURL(f)), entrada: new Date() }
    accesosDemo = [acceso, ...accesosDemo]
    return acceso
  },

  async registrarSalida(id: string): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/salida`, { metodo: 'POST' })
    await espera(250)
    accesosDemo = accesosDemo.map((a) => (a.id === id ? { ...a, salida: new Date() } : a))
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
  async entregarPaquete(id: string): Promise<void> {
    if (hayApi) return api<void>(`/api/caseta/accesos/${encodeURIComponent(id)}/entrega`, { metodo: 'POST' })
    await espera(250)
    accesosDemo = accesosDemo.map((a) => (a.id === id ? { ...a, entregado: new Date() } : a))
  },

  async listarHoy(): Promise<Acceso[]> {
    if (hayApi) {
      const lista = await api<(Omit<Acceso, 'entrada' | 'salida'> & { entrada: string; salida?: string })[]>('/api/caseta/accesos/hoy')
      return lista.map((a) => ({ ...a, entrada: new Date(a.entrada), salida: a.salida ? new Date(a.salida) : undefined, entregado: a.entregado ? new Date(a.entregado as unknown as string) : undefined }))
    }
    await espera(200)
    return [...accesosDemo].sort((a, b) => b.entrada.getTime() - a.entrada.getTime())
  },
}
