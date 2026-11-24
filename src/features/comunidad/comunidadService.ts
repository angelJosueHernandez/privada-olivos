import { api, hayApi } from '../../shared/api/cliente'
import { CASAS, casetaService } from '../caseta/casetaService'
import type { Actor } from '../caseta/tipos'
import { COBRO } from './config'
import {
  anuncioPara, anuncioVigente, MAX_PERSONAS, nombrePeriodo, pesos, type Anuncio, type CobranzaCasa, type Comprobante, type Cuota, type NuevoAnuncio, type NuevoComprobante,
  type Respuesta, type ValorRespuesta,
} from './tipos'

/*
  Anuncios de la administración y pagos de cuotas.
  Con API: el servidor decide quién puede publicar (solo ADMIN), filtra los pagos por la casa de la
  sesión, guarda los comprobantes con nombre aleatorio y deja registro de quién aprobó o rechazó.
  Sin API: modo demostración guardado en este navegador y compartido entre pestañas.
*/

/** respuestas[idAnuncio][casa] */
type Respuestas = Record<string, Record<string, Respuesta>>
type EstadoDemo = { anuncios: Anuncio[]; comprobantes: Comprobante[]; pagados: Record<string, string[]>; respuestas: Respuestas }
const CLAVE = 'olv-comunidad-v4'
const admin: Actor = { id: '1', nombre: 'Alejandro Garza', rol: 'ADMIN' }
const jorge: Actor = { id: 'u-res-7', nombre: 'Jorge Salinas', rol: 'RESIDENTE', casa: 'Calle Encino 212' }
const rocha: Actor = { id: 'u-res-9', nombre: 'Familia Rocha', rol: 'RESIDENTE', casa: 'Calle Olmo 303' }

const periodoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const mesesAtras = (n: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return d }
const haceDias = (n: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d }

/** Imagen de ejemplo de un comprobante (solo para el demo, marcada como EJEMPLO) */
function comprobanteEjemplo(monto: number, ref: string, fecha: Date): string {
  try {
    const c = document.createElement('canvas'); c.width = 600; c.height = 800
    const x = c.getContext('2d')!
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 600, 800)
    x.fillStyle = '#0A60C2'; x.fillRect(0, 0, 600, 110)
    x.fillStyle = '#FFFFFF'; x.font = '600 34px Arial'; x.fillText('Transferencia exitosa', 40, 68)
    x.fillStyle = '#1D1D1F'; x.font = '700 64px Arial'; x.fillText(pesos(monto), 40, 220)
    x.font = '400 26px Arial'; x.fillStyle = '#6E6E73'
    const filas: [string, string][] = [['Fecha', fecha.toLocaleDateString('es-MX')], ['Concepto', ref], ['Rastreo', `MBAN0${Math.floor(fecha.getTime() / 1000)}`], ['Cuenta destino', '**** 4821']]
    filas.forEach(([k, v], i) => { x.fillStyle = '#6E6E73'; x.fillText(k, 40, 310 + i * 80); x.fillStyle = '#1D1D1F'; x.fillText(v, 40, 345 + i * 80) })
    x.save(); x.translate(300, 640); x.rotate(-0.2); x.fillStyle = 'rgba(215,0,21,0.18)'; x.font = '700 80px Arial'; x.textAlign = 'center'; x.fillText('EJEMPLO', 0, 0); x.restore()
    return c.toDataURL('image/jpeg', 0.7)
  } catch { return '' }
}

function semilla(): EstadoDemo {
  const actual = periodoDe(new Date())
  const anuncios: Anuncio[] = [
    { id: 'n1', titulo: 'Junta de vecinos este sábado', cuerpo: 'Te esperamos el sábado a las 10:00 en la palapa. Revisaremos el presupuesto del próximo año y la propuesta de cámaras nuevas en la entrada. Confirma si vas a asistir para preparar sillas y café.', categoria: 'EVENTO', importante: true, pideRespuesta: 'ASISTENCIA', publicadoPor: admin, publicadoEn: haceDias(1, 18) },
    { id: 'n2', titulo: 'Mantenimiento de la alberca', cuerpo: 'El martes y miércoles la alberca permanecerá cerrada por limpieza profunda y cambio de filtros. Gracias por tu comprensión.', categoria: 'MANTENIMIENTO', importante: false, pideRespuesta: 'ENTERADO', publicadoPor: admin, publicadoEn: haceDias(3, 9) },
    { id: 'n3', titulo: `La cuota vence el día ${COBRO.diaVencimiento}`, cuerpo: `Recuerda subir tu comprobante en la sección Pagos. Usa como referencia tu calle y número (por ejemplo PALMA104) para identificar tu depósito más rápido.`, categoria: 'PAGOS', importante: false, publicadoPor: admin, publicadoEn: haceDias(12, 8) },
    { id: 'n4', titulo: 'Nuevo horario de recolección de basura', cuerpo: 'A partir de este mes, el camión pasa lunes, miércoles y viernes a las 7:30. Saca tus bolsas después de las 6:00.', categoria: 'GENERAL', importante: false, publicadoPor: admin, publicadoEn: haceDias(16, 12) },
  ]
  const comprobantes: Comprobante[] = [
    { id: 'c1', folio: 'PG-1021', casa: 'Calle Palma 104', periodos: [periodoDe(mesesAtras(1))], monto: COBRO.cuotaMensual, metodo: 'TRANSFERENCIA', fechaPago: haceDias(27), referencia: 'PALMA104', imagen: comprobanteEjemplo(COBRO.cuotaMensual, 'PALMA104', haceDias(27)), estado: 'APROBADO', subidoPor: { id: 'u-res-2', nombre: 'María Treviño', rol: 'RESIDENTE', casa: 'Calle Palma 104' }, subidoEn: haceDias(27, 12), revisadoPor: admin, revisadoEn: haceDias(26, 9) },
    { id: 'c2', folio: 'PG-1102', casa: 'Calle Encino 212', periodos: [actual], monto: COBRO.cuotaMensual, metodo: 'TRANSFERENCIA', fechaPago: haceDias(2), referencia: 'ENCINO212', imagen: comprobanteEjemplo(COBRO.cuotaMensual, 'ENCINO212', haceDias(2)), estado: 'EN_REVISION', subidoPor: jorge, subidoEn: haceDias(2, 20) },
    { id: 'c3', folio: 'PG-1103', casa: 'Calle Olmo 303', periodos: [periodoDe(mesesAtras(1)), actual], monto: COBRO.cuotaMensual * 2, metodo: 'DEPOSITO', fechaPago: haceDias(1), referencia: 'OLMO303', imagen: comprobanteEjemplo(COBRO.cuotaMensual * 2, 'OLMO303', haceDias(1)), estado: 'EN_REVISION', subidoPor: rocha, subidoEn: haceDias(1, 16) },
  ]
  // Historial de pagos de ejemplo: la mayoría al corriente hasta el mes pasado, algunas con atraso
  // y unas cuantas que ya pagaron el mes actual. María (Palma 104) debe el mes actual.
  const pagados: Record<string, string[]> = {}
  CASAS.forEach((casa, i) => {
    const debe = i % 9 === 4 ? 2 : i % 7 === 1 ? 1 : 0 // meses atrasados además del actual
    const pagoActual = casa !== 'Calle Palma 104' && i % 5 !== 2
    pagados[casa] = [3, 2, 1].filter((n) => n > debe).map((n) => periodoDe(mesesAtras(n)))
    if (pagoActual && debe === 0) pagados[casa].push(actual)
  })
  // Algunas casas ya respondieron (María, de Palma 104, todavía no: así se puede probar)
  const respuestas: Respuestas = { n1: {}, n2: {} }
  CASAS.forEach((casa, i) => {
    if (casa === 'Calle Palma 104') return
    const por: Actor = { id: `u-casa-${i}`, nombre: 'Residente', rol: 'RESIDENTE', casa }
    if (i % 3 !== 0) respuestas.n1[casa] = { casa, valor: i % 5 === 1 ? 'NO_ASISTE' : 'ASISTE', personas: i % 5 === 1 ? undefined : 1 + (i % 3), por, en: haceDias(i % 2, 9 + (i % 10)) }
    if (i % 4 !== 3) respuestas.n2[casa] = { casa, valor: 'ENTERADO', por, en: haceDias(2 - (i % 3), 8 + (i % 12)) }
  })
  return { anuncios, comprobantes, pagados, respuestas }
}

const fechas = <T extends object>(o: T, campos: string[]): T => {
  const r: Record<string, unknown> = { ...(o as Record<string, unknown>) }
  campos.forEach((c) => { if (typeof r[c] === 'string') r[c] = new Date(r[c] as string) })
  return r as T
}
const revivirAnuncio = (a: Anuncio) => fechas(a, ['publicadoEn', 'vence', 'editadoEn'])
const revivirComprobante = (c: Comprobante) => fechas(c, ['fechaPago', 'subidoEn', 'revisadoEn'])
const revivirRespuesta = (r: Respuesta) => fechas(r, ['en'])
const revivirRespuestas = (rs: Respuestas): Respuestas =>
  Object.fromEntries(Object.entries(rs).map(([id, porCasa]) => [id, Object.fromEntries(Object.entries(porCasa).map(([c, r]) => [c, revivirRespuesta(r)]))]))
const conRespuestas = (a: Anuncio): Anuncio => ({ ...revivirAnuncio(a), miRespuesta: a.miRespuesta && revivirRespuesta(a.miRespuesta), respuestas: a.respuestas?.map(revivirRespuesta) })
/** Casas que reciben un anuncio (todas o las de su calle) */
const casasDe = (a: Anuncio) => CASAS.filter((c) => anuncioPara(a, c))

function leer(): EstadoDemo {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as EstadoDemo | null
    if (s && Array.isArray(s.anuncios) && Array.isArray(s.comprobantes) && s.pagados) {
      return { anuncios: s.anuncios.map(revivirAnuncio), comprobantes: s.comprobantes.map(revivirComprobante), pagados: s.pagados, respuestas: revivirRespuestas(s.respuestas ?? {}) }
    }
  } catch { /* se reinicia */ }
  return semilla()
}
let demo: EstadoDemo = hayApi ? { anuncios: [], comprobantes: [], pagados: {}, respuestas: {} } : leer()
const oyentes = new Set<() => void>()
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(demo)) }
  catch { throw new Error('No hay espacio para guardar más comprobantes en este navegador (modo demostración).') }
  oyentes.forEach((f) => f())
}
if (!hayApi && typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { demo = leer(); oyentes.forEach((f) => f()) } })
}

const espera = (ms = 350) => new Promise((r) => setTimeout(r, ms))
const folio = () => `PG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
const aDataUrl = (b: Blob) => new Promise<string>((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => mal(new Error('No se pudo leer la imagen')); r.readAsDataURL(b) })
const listaPeriodos = (ps: string[]) => ps.map((p) => nombrePeriodo(p).split(' ')[0].toLowerCase()).join(', ')

/** Estado de cuenta: los últimos 4 meses de la casa */
function cuotasDe(casa: string): Cuota[] {
  const pagados = new Set(demo.pagados[casa] ?? [])
  const enRevision = new Set(demo.comprobantes.filter((c) => c.casa === casa && c.estado === 'EN_REVISION').flatMap((c) => c.periodos))
  return [0, 1, 2, 3].map((n) => {
    const d = mesesAtras(n)
    const periodo = periodoDe(d)
    const vence = new Date(d.getFullYear(), d.getMonth(), COBRO.diaVencimiento, 23, 59)
    const estado = pagados.has(periodo) ? 'PAGADO' : enRevision.has(periodo) ? 'EN_REVISION' : Date.now() > vence.getTime() ? 'ATRASADO' : 'PENDIENTE'
    return { periodo, casa, concepto: COBRO.concepto, monto: COBRO.cuotaMensual, vence, estado }
  })
}

export const comunidadService = {
  suscribir(f: () => void): () => void {
    if (hayApi) { const t = setInterval(f, 60_000); return () => clearInterval(t) }
    oyentes.add(f)
    return () => { oyentes.delete(f) }
  },

  // ---------- Anuncios ----------
  /**
   * Con `casa`: lo que ve ese residente (vigentes y dirigidos a su calle o a todas).
   * Sin `casa`: todos, para la administración. Con API el servidor filtra según la sesión.
   */
  async anuncios(casa?: string): Promise<Anuncio[]> {
    if (hayApi) return (await api<Anuncio[]>(casa ? '/api/anuncios' : '/api/admin/anuncios')).map(conRespuestas)
    await espera(150)
    const lista: Anuncio[] = casa
      ? demo.anuncios.filter((a) => anuncioVigente(a) && anuncioPara(a, casa)).map((a) => ({ ...a, miRespuesta: demo.respuestas[a.id]?.[casa] }))
      // La administración solo ve respuestas de casas que todavía reciben el anuncio (si cambió la calle)
      : demo.anuncios.map((a) => { const destino = new Set(casasDe(a)); return { ...a, casasDestino: destino.size, respuestas: Object.values(demo.respuestas[a.id] ?? {}).filter((r) => destino.has(r.casa)) } })
    return [...lista].sort((a, b) => Number(b.importante) - Number(a.importante) || b.publicadoEn.getTime() - a.publicadoEn.getTime())
  },
  async editarAnuncio(id: string, datos: NuevoAnuncio): Promise<void> {
    if (hayApi) return api<void>(`/api/anuncios/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos })
    await espera()
    const antes = demo.anuncios.find((a) => a.id === id)
    demo.anuncios = demo.anuncios.map((a) => (a.id === id ? { ...a, ...datos, editadoEn: new Date() } : a))
    // Si cambia la pregunta, las respuestas anteriores ya no aplican
    if (antes && antes.pideRespuesta !== datos.pideRespuesta) { const { [id]: _viejas, ...resto } = demo.respuestas; demo.respuestas = resto }
    guardar()
  },
  async publicarAnuncio(datos: NuevoAnuncio, actor: Actor): Promise<Anuncio> {
    if (hayApi) return revivirAnuncio(await api<Anuncio>('/api/anuncios', { metodo: 'POST', cuerpo: datos }))
    await espera()
    const a: Anuncio = { ...datos, id: crypto.randomUUID(), publicadoPor: actor, publicadoEn: new Date() }
    demo.anuncios = [a, ...demo.anuncios]
    guardar()
    casetaService.avisar({ para: a.calle ? `CALLE:${a.calle}` : 'TODAS', tipo: 'anuncio', titulo: `${a.importante ? 'Importante: ' : 'Nuevo anuncio: '}${a.titulo}`, cuerpo: a.cuerpo.slice(0, 140) })
    return a
  },
  async borrarAnuncio(id: string): Promise<void> {
    if (hayApi) return api<void>(`/api/anuncios/${encodeURIComponent(id)}`, { metodo: 'DELETE' })
    await espera(200)
    demo.anuncios = demo.anuncios.filter((a) => a.id !== id)
    const { [id]: _borradas, ...resto } = demo.respuestas
    demo.respuestas = resto
    guardar()
  },
  /**
   * El residente confirma de enterado o su asistencia. Una respuesta por casa (se puede cambiar).
   * Con API el servidor toma la casa de la sesión, verifica que el anuncio sea para ella, siga vigente
   * y pida ese tipo de respuesta.
   */
  async responderAnuncio(id: string, valor: ValorRespuesta, personas: number | undefined, actor: Actor): Promise<Respuesta> {
    const n = valor === 'ASISTE' ? Math.min(MAX_PERSONAS, Math.max(1, Math.round(personas ?? 1))) : undefined
    if (hayApi) return revivirRespuesta(await api<Respuesta>(`/api/anuncios/${encodeURIComponent(id)}/respuesta`, { metodo: 'PUT', cuerpo: { valor, personas: n } }))
    await espera(200)
    const casa = actor.casa ?? ''
    const a = demo.anuncios.find((x) => x.id === id)
    if (!a || !anuncioVigente(a) || !anuncioPara(a, casa) || !a.pideRespuesta) throw new Error('Este anuncio ya no acepta respuestas.')
    if ((a.pideRespuesta === 'ENTERADO') !== (valor === 'ENTERADO')) throw new Error('Respuesta no válida.')
    const r: Respuesta = { casa, valor, personas: n, por: actor, en: new Date() }
    demo.respuestas = { ...demo.respuestas, [id]: { ...(demo.respuestas[id] ?? {}), [casa]: r } }
    guardar()
    return r
  },
  /** Administración: manda un recordatorio solo a las casas que no han respondido. Devuelve cuántas. */
  async recordarPendientes(id: string): Promise<number> {
    if (hayApi) return (await api<{ enviados: number }>(`/api/admin/anuncios/${encodeURIComponent(id)}/recordatorio`, { metodo: 'POST' })).enviados
    await espera(300)
    const a = demo.anuncios.find((x) => x.id === id)
    if (!a || !a.pideRespuesta || !anuncioVigente(a)) throw new Error('Este anuncio ya no acepta respuestas.')
    const faltan = casasDe(a).filter((c) => !demo.respuestas[id]?.[c])
    const titulo = a.pideRespuesta === 'ASISTENCIA' ? 'Confirma tu asistencia' : 'Confirma que leíste el anuncio'
    faltan.forEach((casa) => casetaService.avisar({ para: casa, tipo: 'anuncio', titulo, cuerpo: a.titulo }))
    return faltan.length
  },

  // ---------- Pagos (residente) ----------
  async estadoDeCuenta(casa: string): Promise<Cuota[]> {
    if (hayApi) return (await api<Cuota[]>('/api/pagos/estado-de-cuenta')).map((c) => fechas(c, ['vence']))
    await espera(150)
    return cuotasDe(casa)
  },
  async misComprobantes(casa: string): Promise<Comprobante[]> {
    if (hayApi) return (await api<Comprobante[]>('/api/pagos/comprobantes')).map(revivirComprobante)
    await espera(150)
    return demo.comprobantes.filter((c) => c.casa === casa).sort((a, b) => b.subidoEn.getTime() - a.subidoEn.getTime())
  },
  /** Sube un comprobante. La imagen ya viene re-codificada (sin metadatos) por prepararFoto. */
  async subirComprobante(datos: NuevoComprobante, imagen: Blob, actor: Actor): Promise<Comprobante> {
    if (hayApi) {
      const form = new FormData()
      form.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
      form.append('imagen', imagen, 'comprobante.jpg')
      return revivirComprobante(await api<Comprobante>('/api/pagos/comprobantes', { metodo: 'POST', cuerpo: form }))
    }
    await espera(600)
    const casa = actor.casa ?? ''
    const c: Comprobante = { ...datos, id: crypto.randomUUID(), folio: folio(), casa, imagen: await aDataUrl(imagen), estado: 'EN_REVISION', subidoPor: actor, subidoEn: new Date() }
    demo.comprobantes = [c, ...demo.comprobantes]
    guardar()
    casetaService.avisar({ para: 'ADMIN', tipo: 'pago', titulo: 'Nuevo comprobante por revisar', cuerpo: `${casa} · ${pesos(c.monto)} · ${listaPeriodos(c.periodos)}` })
    return c
  },

  // ---------- Pagos (administración) ----------
  /** Cobranza de todas las casas: quién está al corriente y cuánto se debe */
  async resumenCobranza(): Promise<CobranzaCasa[]> {
    if (hayApi) return api<CobranzaCasa[]>('/api/admin/cobranza')
    await espera(150)
    return CASAS.map((casa) => {
      const cuotas = cuotasDe(casa)
      const atrasados = cuotas.filter((c) => c.estado === 'ATRASADO').map((c) => c.periodo)
      const pendientes = cuotas.filter((c) => c.estado === 'ATRASADO' || c.estado === 'PENDIENTE')
      return {
        casa, atrasados, adeudo: pendientes.reduce((s, c) => s + c.monto, 0),
        alCorriente: atrasados.length === 0, enRevision: cuotas.some((c) => c.estado === 'EN_REVISION'),
      }
    })
  },
  async comprobantes(): Promise<Comprobante[]> {
    if (hayApi) return (await api<Comprobante[]>('/api/admin/comprobantes')).map(revivirComprobante)
    await espera(150)
    return [...demo.comprobantes].sort((a, b) => b.subidoEn.getTime() - a.subidoEn.getTime())
  },
  async revisarComprobante(id: string, decision: { aprobar: true } | { aprobar: false; motivo: string }, actor: Actor): Promise<void> {
    if (hayApi) return api<void>(`/api/admin/comprobantes/${encodeURIComponent(id)}/revision`, { metodo: 'POST', cuerpo: decision })
    await espera(300)
    const c = demo.comprobantes.find((x) => x.id === id)
    if (!c || c.estado !== 'EN_REVISION') throw new Error('Este comprobante ya fue revisado.')
    const revisado: Comprobante = decision.aprobar
      ? { ...c, estado: 'APROBADO', revisadoPor: actor, revisadoEn: new Date() }
      : { ...c, estado: 'RECHAZADO', motivoRechazo: decision.motivo, revisadoPor: actor, revisadoEn: new Date() }
    demo.comprobantes = demo.comprobantes.map((x) => (x.id === id ? revisado : x))
    if (decision.aprobar) demo.pagados = { ...demo.pagados, [c.casa]: [...new Set([...(demo.pagados[c.casa] ?? []), ...c.periodos])] }
    guardar()
    casetaService.avisar(decision.aprobar
      ? { para: c.casa, tipo: 'pago', titulo: 'Pago aprobado', cuerpo: `Tu pago de ${pesos(c.monto)} (${listaPeriodos(c.periodos)}) quedó registrado. ¡Gracias!` }
      : { para: c.casa, tipo: 'pago', titulo: 'Comprobante rechazado', cuerpo: `${decision.motivo}. Revisa y vuelve a subirlo en Pagos.` })
  },
}
