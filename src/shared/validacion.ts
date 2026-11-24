/*
  Validación de campos, en dos capas:
  - `filtrar`: se aplica en cada tecla. Lo que no corresponde al campo ni siquiera entra
    (letras en un teléfono, números en un nombre, más de 10 dígitos...). También limpia lo pegado.
  - `validar`: se revisa al salir del campo y al guardar. Devuelve el mensaje de error o ''.
  Los servicios repiten `validar` antes de guardar; con API, el servidor debe repetirlo otra vez
  (la validación del navegador es comodidad, no seguridad).
*/

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g
const espacios = (v: string) => v.replace(/^\s+/, '').replace(/[ \t]{2,}/g, ' ')

export const LARGO = {
  telefono: 10, nombre: 80, empresa: 40, email: 254, placa: 10, calle: 30, numeroCasa: 6,
  referencia: 30, titulo: 90, mensaje: 2000, nota: 280, notaCorta: 200, codigoPase: 11, busqueda: 60,
} as const

export const filtrar = {
  /** Solo dígitos, 10 como máximo. Si se pega con lada (+52, 52 o 521) se quita. */
  telefono(v: string): string {
    let d = v.replace(/\D/g, '')
    if (d.length > 10 && d.startsWith('521')) d = d.slice(3)
    else if (d.length > 10 && d.startsWith('52')) d = d.slice(2)
    return d.slice(0, LARGO.telefono)
  },
  /** Nombres de persona: letras (con acentos y ñ), espacios, punto, apóstrofo y guion */
  nombre: (v: string) => espacios(v.replace(/[^\p{L}\p{M} .'-]/gu, '')).slice(0, LARGO.nombre),
  /** Empresas y servicios: también admiten números y & ("7-Eleven", "H&M") */
  empresa: (v: string) => espacios(v.replace(/[^\p{L}\p{M}\p{N} .&'-]/gu, '')).slice(0, LARGO.empresa),
  /** Correo: sin espacios y en minúsculas */
  email: (v: string) => v.replace(/\s/g, '').toLowerCase().slice(0, LARGO.email),
  /** Placas: mayúsculas, letras, números y guiones (sin guiones dobles ni al inicio) */
  placa: (v: string) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, LARGO.placa),
  /** Nombre de calle: letras, espacios, punto, apóstrofo y guion */
  calle: (v: string) => espacios(v.replace(/[^\p{L}\p{M} .'-]/gu, '')).slice(0, LARGO.calle),
  /** Número de casa: hasta 5 dígitos y, opcional, una letra al final (12B) */
  numeroCasa(v: string): string {
    const m = v.toUpperCase().replace(/[^0-9A-Z]/g, '').match(/^(\d{0,5})([A-Z]?)/)
    return m ? m[1] + (m[1] ? m[2] : '') : ''
  },
  /** Referencia bancaria: letras sin acento, números, espacio y guion */
  referencia: (v: string) => v.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 -]/g, '').replace(/ {2,}/g, ' ').slice(0, LARGO.referencia),
  /** Código de pase: arma el formato OLV-XXXX-XX mientras se escribe */
  codigoPase(v: string): string {
    let r = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!r) return ''
    if (!r.startsWith('OLV') && !'OLV'.startsWith(r)) r = `OLV${r}`
    if (r.length <= 3) return r
    const resto = r.slice(3, 9)
    return `OLV-${resto.slice(0, 4)}${resto.length > 4 ? `-${resto.slice(4)}` : ''}`
  },
  /** Texto de una línea (títulos): sin saltos ni caracteres invisibles */
  linea: (v: string, max: number) => espacios(v.replace(CONTROL, '').replace(/[\r\n]+/g, ' ')).slice(0, max),
  /** Texto libre de varias líneas: sin caracteres invisibles ni más de 2 renglones vacíos seguidos */
  texto: (v: string, max: number) => v.replace(CONTROL, '').replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n').slice(0, max),
}

const letras = (v: string) => (v.match(/\p{L}/gu) ?? []).length

export const validar = {
  telefono(v: string, opcional = false): string {
    if (!v) return opcional ? '' : 'Escribe el teléfono.'
    if (!/^\d+$/.test(v)) return 'El teléfono solo lleva números.'
    if (v.length !== LARGO.telefono) return `El teléfono lleva 10 dígitos (faltan ${LARGO.telefono - v.length}).`
    if (/^0/.test(v) || /^(\d)\1{9}$/.test(v)) return 'Revisa el número: no parece un teléfono válido.'
    return ''
  },
  /** Nombre y al menos un apellido */
  nombreCompleto(v: string): string {
    const t = v.trim()
    if (!t) return 'Escribe el nombre completo.'
    const partes = t.split(/\s+/).filter((p) => letras(p) >= 2)
    if (partes.length < 2) return 'Escribe nombre y apellido.'
    return ''
  },
  /** Un nombre corto basta (visitas: a veces solo se sabe el nombre de pila) */
  nombre(v: string): string {
    const t = v.trim()
    if (!t) return 'Escribe el nombre.'
    if (letras(t) < 3) return 'El nombre es muy corto.'
    return ''
  },
  empresa(v: string): string {
    const t = v.trim()
    if (!t) return 'Escribe el nombre de la empresa.'
    if ((t.match(/[\p{L}\p{N}]/gu) ?? []).length < 2) return 'El nombre de la empresa es muy corto.'
    return ''
  },
  email(v: string): string {
    if (!v) return 'Escribe el correo.'
    if (v.length > LARGO.email || !/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(v) || v.includes('..')) {
      return 'Revisa el correo (ejemplo: nombre@correo.com).'
    }
    return ''
  },
  placa(v: string, opcional = false): string {
    if (!v) return opcional ? '' : 'Escribe las placas.'
    const s = v.replace(/-/g, '')
    if (s.length < 5 || s.length > 8) return 'Las placas llevan de 5 a 8 letras y números.'
    if (!/[A-Z]/.test(s) || !/\d/.test(s)) return 'Las placas combinan letras y números.'
    return ''
  },
  calle(v: string): string {
    if (letras(v.trim()) < 2) return 'Escribe el nombre de la calle.'
    return ''
  },
  numeroCasa(v: string): string {
    if (!v) return 'Escribe el número.'
    if (!/^\d{1,5}[A-Z]?$/.test(v)) return 'El número va como 104 o 12B.'
    if (/^0+[A-Z]?$/.test(v)) return 'El número no puede ser 0.'
    return ''
  },
  referencia: (v: string) => (v && v.replace(/\W/g, '').length < 4 ? 'La referencia es muy corta (mínimo 4 caracteres).' : ''),
  codigoPase: (v: string) => (/^OLV-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(v) ? '' : 'El código va como OLV-XXXX-XX.'),
  /** Texto obligatorio con mínimo de caracteres útiles */
  texto(v: string, min: number, que: string): string {
    const n = (v.match(/[\p{L}\p{N}]/gu) ?? []).length
    if (!n) return `Escribe ${que}.`
    if (n < min) return `${que.charAt(0).toUpperCase()}${que.slice(1)} es muy corto.`
    return ''
  },
}
