// Servicio de autenticacion. Hoy usa usuarios de demostracion.
// Cuando exista la API .NET, solo se reemplaza el cuerpo de estas funciones
// por fetch('/api/auth/login') y fetch('/api/auth/2fa'); el resto de la app no cambia.
export type Rol = 'ADMIN' | 'RESIDENTE' | 'GUARDIA'
export type Usuario = { id: string; nombre: string; rol: Rol; casa?: string }

const DEMO: Record<string, { pass: string; usuario: Usuario }> = {
  'admin@demo.mx': { pass: 'Admin123', usuario: { id: '1', nombre: 'Alejandro Garza', rol: 'ADMIN' } },
  'residente@demo.mx': { pass: 'Residente123', usuario: { id: '2', nombre: 'María Treviño', rol: 'RESIDENTE', casa: 'Calle Palma 104' } },
  'guardia@demo.mx': { pass: 'Guardia123', usuario: { id: '3', nombre: 'Luis Herrera', rol: 'GUARDIA' } },
}
const espera = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export const authService = {
  async login(email: string, password: string) {
    await espera()
    const d = DEMO[email.trim().toLowerCase()]
    if (!d || d.pass !== password) throw new Error('Correo o contraseña incorrectos.')
    return { usuario: d.usuario, requiere2fa: true }
  },
  async verificar2fa(codigo: string) {
    await espera()
    if (codigo !== '123456') throw new Error('El código no es correcto. Revisa tu app de autenticación.')
  },
}
