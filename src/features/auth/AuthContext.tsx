import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { directorioService } from '../directorio/directorioService'
import { authService, Usuario } from './authService'
export { rutaInicio } from './permisos'

type Ctx = {
  user: Usuario | null
  /** Cuándo inició la sesión actual (se muestra en el perfil) */
  inicioSesion: Date | null
  pendiente2fa: boolean
  /** Cuenta que ya pasó la contraseña y espera el segundo paso */
  pendienteUsuario: Usuario | null
  /** La cuenta en espera debe configurar su app autenticadora (escanear el QR) */
  configurar2fa: boolean
  /** Activa la app autenticadora de la cuenta en espera con su primer código y entra */
  activar2fa: (codigo: string) => Promise<void>
  /** false mientras se revisa si hay una sesión que recuperar (al recargar) */
  listo: boolean
  login: (email: string, password: string) => Promise<void>
  verificar2fa: (codigo: string) => Promise<void>
  logout: () => void
  /** Crea la contraseña propia después de entrar con una temporal */
  crearPassword: (nueva: string) => Promise<void>
}
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

// El usuario solo nace de una respuesta validada del servicio y queda congelado:
// ningún código, parámetro de URL ni consola puede cambiarle el rol a mitad de la sesión.
const congelar = (u: Usuario): Usuario => Object.freeze({ ...u })

// La sesión vive en memoria; ningún token se guarda en el navegador (reduce el riesgo de robo por XSS).
// Al recargar, la API la recupera con la cookie HttpOnly; en demo, solo con el ID en sessionStorage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [pendiente, setPendiente] = useState<Usuario | null>(null)
  const [configurar, setConfigurar] = useState(false)
  const [inicioSesion, setInicioSesion] = useState<Date | null>(null)
  const [listo, setListo] = useState(false)

  // Al cargar: recupera la sesión si sigue vigente (recarga, o "atrás" que recargó la página)
  useEffect(() => {
    let vivo = true
    authService.restaurar().then((r) => {
      if (!vivo) return
      if (r) { setUser(congelar(r.usuario)); setInicioSesion(r.inicio) }
      setListo(true)
    })
    return () => { vivo = false }
  }, [])

  const login = useCallback<Ctx['login']>(async (email, password) => {
    const r = await authService.login(email, password)
    if (r.requiere2fa) { setPendiente(congelar(r.usuario)); setConfigurar(r.configurar2fa) }
    else { const ahora = new Date(); setUser(congelar(r.usuario)); setInicioSesion(ahora); authService.recordar(r.usuario, ahora) }
  }, [])

  const verificar2fa = useCallback<Ctx['verificar2fa']>(async (codigo) => {
    if (!pendiente) throw new Error('Inicia sesión de nuevo.')
    await authService.verificar2fa(codigo, pendiente)
    const ahora = new Date()
    setUser(pendiente)
    setInicioSesion(ahora)
    authService.recordar(pendiente, ahora)
    setPendiente(null)
  }, [pendiente])

  const activar2fa = useCallback<Ctx['activar2fa']>(async (codigo) => {
    if (!pendiente) throw new Error('Inicia sesión de nuevo.')
    await authService.activar2fa(pendiente, codigo)
    const ahora = new Date()
    setUser(pendiente); setInicioSesion(ahora); authService.recordar(pendiente, ahora)
    setPendiente(null); setConfigurar(false)
  }, [pendiente])

  // Cierra la sesión local de inmediato, limpia el historial y pide a la API invalidar la cookie
  const logout = useCallback(() => {
    setUser(null)
    setPendiente(null)
    setConfigurar(false)
    setInicioSesion(null)
    void authService.logout()
    // Reemplaza la entrada actual para que "atrás" no regrese a una pantalla protegida
    window.history.replaceState(null, '', '/login')
  }, [])

  const crearPassword = useCallback<Ctx['crearPassword']>(async (nueva) => {
    if (!user) throw new Error('Inicia sesión de nuevo.')
    await authService.crearPassword(user, nueva)
    setUser(congelar({ ...user, debeCambiar: false }))
  }, [user])

  // Si la administración suspende la cuenta o cierra sus sesiones, se sale de inmediato en este
  // dispositivo (demo: al cambiar el directorio; con API: el servidor responde 401 en la revisión)
  useEffect(() => {
    if (!user || !inicioSesion) return
    let vivo = true
    const revisar = async () => {
      if (await authService.sesionVigente(user, inicioSesion) || !vivo) return
      toast.error('Tu sesión se cerró', { description: 'La administración cerró tu sesión o suspendió tu cuenta.', duration: 8000 })
      logout()
    }
    const quitar = directorioService.suscribir(() => void revisar())
    const t = setInterval(() => void revisar(), 60_000)
    const alVolver = () => { if (document.visibilityState === 'visible') void revisar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { vivo = false; quitar(); clearInterval(t); document.removeEventListener('visibilitychange', alVolver) }
  }, [user, inicioSesion, logout])

  const valor = useMemo(() => ({ user, inicioSesion, pendiente2fa: !!pendiente, pendienteUsuario: pendiente, configurar2fa: !!pendiente && configurar, activar2fa, listo, login, verificar2fa, logout, crearPassword }),
    [user, inicioSesion, pendiente, configurar, activar2fa, listo, login, verificar2fa, logout, crearPassword])
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
