import { useSyncExternalStore } from 'react'
import { almacen } from './almacen'

/*
  Cola de cambios hechos sin conexión (solo cuando hay API; el modo demo ya guarda todo local).

  - Cada cambio guarda la petición completa (incluidas fotos como Blob) y una clave de idempotencia:
    si la conexión se corta a mitad del envío y se reintenta, el servidor reconoce la clave y no
    lo duplica.
  - Se envían en el mismo orden en que se hicieron (una salida nunca llega antes que su entrada).
  - Cada cambio es de la persona que lo hizo: solo se envía con SU sesión (`usuario`).
  - Mientras están pendientes se muestran en pantalla: `local` (algo nuevo) o `parche` (un cambio
    sobre algo existente) se aplican sobre la última copia de los datos.
*/

export type Parche = { lista: string; id: string; cambios: Record<string, unknown> }
export type Parte = { nombre: string; valor: string | Blob; archivo?: string }
export type Cuerpo = { tipo: 'json'; valor: unknown } | { tipo: 'form'; partes: Parte[] } | { tipo: 'nada' }
export type Pendiente = {
  id: string
  usuario: string
  ruta: string
  metodo: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo: Cuerpo
  /** Misma clave en cada reintento: el servidor no lo duplica */
  idempotencia: string
  /** Texto para la persona: "Entrada de DHL a Calle Palma 104" */
  descripcion: string
  creado: number
  intentos: number
  /** Algo nuevo que debe verse ya en la lista `lista` */
  local?: { lista: string; objeto: { id: string } & Record<string, unknown> }
  /** Cambios a elementos existentes (p. ej. la salida de un acceso, o el pase que quedó usado) */
  parches?: Parche[]
}

let usuarioActual = ''
let rolActual = ''
let cuantos = 0
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

async function recontar() {
  try { cuantos = (await almacen.todos<Pendiente>('cola')).filter((p) => p.usuario === usuarioActual).length } catch { cuantos = 0 }
  avisar()
}

export const cola = {
  /** La sesión activa: solo se envían y se muestran sus cambios */
  set usuario(id: string) { usuarioActual = id; void recontar() },
  get usuario() { return usuarioActual },
  /** Rol de la sesión (la copia de datos de caseta se comparte entre guardias) */
  set rol(r: string) { rolActual = r },
  get rol() { return rolActual },
  get pendientes() { return cuantos },
  suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f) } },

  async agregar(p: Omit<Pendiente, 'id' | 'usuario' | 'creado' | 'intentos'>): Promise<void> {
    await almacen.poner<Pendiente>('cola', { ...p, id: crypto.randomUUID(), usuario: usuarioActual, creado: Date.now(), intentos: 0 })
    await recontar()
  },
  /** Pendientes de la persona en sesión, del más viejo al más nuevo */
  async lista(): Promise<Pendiente[]> {
    const todos = await almacen.todos<Pendiente>('cola').catch(() => [] as Pendiente[])
    return todos.filter((p) => p.usuario === usuarioActual).sort((a, b) => a.creado - b.creado)
  },
  async quitar(id: string) { await almacen.quitar('cola', id); await recontar() },
  async reintento(p: Pendiente) { await almacen.poner<Pendiente>('cola', { ...p, intentos: p.intentos + 1 }) },

  /** Aplica a una lista los cambios que aún no llegan al servidor (para verlos sin conexión) */
  async aplicar<T extends { id: string }>(lista: string, datos: T[], revivir: (o: T) => T = (o) => o): Promise<T[]> {
    const pendientes = await cola.lista()
    let r = [...datos]
    for (const p of pendientes) {
      if (p.local?.lista === lista && !r.some((x) => x.id === p.local!.objeto.id)) r = [revivir(p.local.objeto as unknown as T), ...r]
      for (const { lista: l, id, cambios } of p.parches ?? []) {
        if (l === lista) r = r.map((x) => (x.id === id ? revivir({ ...x, ...cambios } as T) : x))
      }
    }
    return r
  },
}

export const usePendientes = () => useSyncExternalStore(cola.suscribir, () => cuantos, () => 0)

/** Convierte FormData a partes guardables (IndexedDB no guarda FormData, sí Blob) */
export function aPartes(form: FormData): Parte[] {
  const partes: Parte[] = []
  form.forEach((valor, nombre) => {
    if (typeof valor === 'string') partes.push({ nombre, valor })
    else partes.push({ nombre, valor, archivo: (valor as File).name || undefined })
  })
  return partes
}
export function deCuerpo(c: Cuerpo): unknown {
  if (c.tipo === 'nada') return undefined
  if (c.tipo === 'json') return c.valor
  const form = new FormData()
  c.partes.forEach((p) => (typeof p.valor === 'string' ? form.append(p.nombre, p.valor) : form.append(p.nombre, p.valor, p.archivo)))
  return form
}
