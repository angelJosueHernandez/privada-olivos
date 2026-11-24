/*
  Almacenamiento local para trabajar sin conexión (IndexedDB: guarda objetos, fechas y fotos/Blob).
  - "cola": cambios hechos sin internet, en orden, pendientes de enviar al servidor.
  - "copia": última respuesta de cada consulta, para seguir viendo los datos sin red.
  Todo se borra al cerrar sesión (no deja datos de una persona en el celular de otra).
*/
const NOMBRE = 'olv-sin-conexion'
const VERSION = 1

let abierta: Promise<IDBDatabase> | null = null
function abrir(): Promise<IDBDatabase> {
  if (abierta) return abierta
  abierta = new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE, VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('cola')) db.createObjectStore('cola', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('copia')) db.createObjectStore('copia', { keyPath: 'clave' })
    }
    r.onsuccess = () => ok(r.result)
    r.onerror = () => { abierta = null; mal(r.error) }
  })
  return abierta
}

function operar<T>(almacen: 'cola' | 'copia', modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return abrir().then((db) => new Promise<T>((ok, mal) => {
    const tx = db.transaction(almacen, modo)
    const req = f(tx.objectStore(almacen))
    tx.oncomplete = () => ok((req ? req.result : undefined) as T)
    tx.onerror = () => mal(tx.error)
    tx.onabort = () => mal(tx.error)
  }))
}

export const almacen = {
  poner: <T>(a: 'cola' | 'copia', valor: T) => operar<void>(a, 'readwrite', (s) => { s.put(valor) }),
  leer: <T>(a: 'cola' | 'copia', clave: string) => operar<T | undefined>(a, 'readonly', (s) => s.get(clave)),
  todos: <T>(a: 'cola' | 'copia') => operar<T[]>(a, 'readonly', (s) => s.getAll()),
  quitar: (a: 'cola' | 'copia', clave: string) => operar<void>(a, 'readwrite', (s) => { s.delete(clave) }),
  vaciar: (a: 'cola' | 'copia') => operar<void>(a, 'readwrite', (s) => { s.clear() }),
}
