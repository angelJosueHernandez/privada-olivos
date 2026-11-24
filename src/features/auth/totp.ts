/*
  Códigos de un solo uso por tiempo (TOTP, RFC 6238): el estándar que usan Google Authenticator,
  las Contraseñas de iPhone (código de verificación), Microsoft Authenticator, Authy y 1Password.
  SHA-1, 6 dígitos, cada 30 segundos (lo que todas esas apps entienden).

  En producción el secreto se genera, se guarda cifrado y se verifica SOLO en el servidor.
  Aquí se usa para el modo demostración, con Web Crypto.
*/
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const PERIODO = 30
export const EMISOR = 'Mi Privada'

export function base32(bytes: Uint8Array): string {
  let bits = 0, valor = 0, salida = ''
  for (const b of bytes) {
    valor = (valor << 8) | b; bits += 8
    while (bits >= 5) { salida += ABC[(valor >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) salida += ABC[(valor << (5 - bits)) & 31]
  return salida
}
function deBase32(texto: string): Uint8Array<ArrayBuffer> {
  const limpio = texto.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, valor = 0
  const salida: number[] = []
  for (const c of limpio) {
    valor = (valor << 5) | ABC.indexOf(c); bits += 5
    if (bits >= 8) { salida.push((valor >>> (bits - 8)) & 255); bits -= 8 }
  }
  return new Uint8Array(salida) as Uint8Array<ArrayBuffer>
}

/** Secreto aleatorio de 160 bits en Base32 (lo que se guarda en la app autenticadora) */
export const generarSecreto = () => base32(crypto.getRandomValues(new Uint8Array(20)))

/** Secreto en grupos de 4 para escribirlo a mano si no se puede escanear */
export const secretoLegible = (s: string) => s.match(/.{1,4}/g)?.join(' ') ?? s

/** Enlace otpauth:// que el QR contiene (y que abre la app autenticadora en el celular) */
export const uriOtp = (secreto: string, cuenta: string) =>
  `otpauth://totp/${encodeURIComponent(`${EMISOR}:${cuenta}`)}?secret=${secreto}&issuer=${encodeURIComponent(EMISOR)}&algorithm=SHA1&digits=6&period=${PERIODO}`

async function codigoEn(secreto: string, contador: number): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', deBase32(secreto), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const mensaje = new ArrayBuffer(8)
  const vista = new DataView(mensaje)
  vista.setUint32(0, Math.floor(contador / 2 ** 32)); vista.setUint32(4, contador >>> 0)
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', clave, mensaje))
  const o = h[h.length - 1] & 15
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/**
 * Verifica un código aceptando ±1 periodo (por relojes un poco desfasados).
 * Devuelve el contador usado, o null. Si `ultimo` viene, rechaza reusar ese código o uno anterior.
 */
export async function verificarTotp(secreto: string, codigo: string, ultimo = -1, ahora = Date.now()): Promise<number | null> {
  if (!/^\d{6}$/.test(codigo)) return null
  const actual = Math.floor(ahora / 1000 / PERIODO)
  for (const c of [actual, actual - 1, actual + 1]) {
    if (c <= ultimo) continue
    if ((await codigoEn(secreto, c)) === codigo) return c
  }
  return null
}
