import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { directorioService } from '../directorio/directorioService'
import { sincronizar } from '../../shared/api/cliente'
import { cola } from '../../shared/red/cola'
import { conexion } from '../../shared/red/conexion'
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
const MARCA_SIN_CONEXION = 'olv-sesion-sin-conexion'
const congelar = (u: Usuario): Usuario => Object.freeze({ ...u })

// La sesión vive en memoria; ningún token se guarda en el navegador (reduce el riesgo de robo por XSS).
// Al recargar, la API la recupera con la cookie HttpOnly; en demo, solo con el ID en sessionStorage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [pendiente, setPendiente] = useState<Usuario | null>(null)
  const [configurar, setConfigurar] = useState(false)
  const [inicioSesion, setInicioSesion] = useState<Date | null>(null)
  const [listo, setListo] = useState(false)
  /** La sesión empezó sin internet: no existe en el servidor hasta volver a entrar con conexión */
  const sinConexionRef = useRef(false)

  // Al cargar: recupera la sesión si sigue vigente (recarga, o "atrás" que recargó la página)
  useEffect(() => {
    let vivo = true
    authService.restaurar().then((r) => {
      if (!vivo) return
      if (r) {
        setUser(congelar(r.usuario)); setInicioSesion(r.inicio); cola.usuario = r.usuario.id; cola.rol = r.usuario.rol; void sincronizar()
        try { sinConexionRef.current = sessionStorage.getItem(MARCA_SIN_CONEXION) === '1' } catch { /* nada */ }
      }
      setListo(true)
    })
    return () => { vivo = false }
  }, [])

  const login = useCallback<Ctx['login']>(async (email, password) => {
    const r = await authService.login(email, password)
    if (r.requiere2fa) { setPendiente(congelar(r.usuario)); setConfigurar(r.configurar2fa) }
    else {
      const ahora = new Date(); setUser(congelar(r.usuario)); setInicioSesion(ahora); authService.recordar(r.usuario, ahora)
      if (r.sinConexion) {
        sinConexionRef.current = true
        try { sessionStorage.setItem(MARCA_SIN_CONEXION, '1') } catch { /* nada */ }
        toast.info('Entraste sin internet', { description: 'Puedes trabajar normal. Al volver la conexión te pediremos entrar otra vez para enviar tus cambios.', duration: 6000 })
      }
    }
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
    sinConexionRef.current = false
    try { sessionStorage.removeItem(MARCA_SIN_CONEXION) } catch { /* nada */ }
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
      if (sinConexionRef.current) {
        // Entró sin internet: el servidor no conoce esta sesión. Al reconectar se entra de nuevo
        // (contraseña + código) y entonces se envía lo hecho sin conexión, que sigue guardado.
        toast.info('Ya hay internet', { description: 'Entra de nuevo para enviar lo que hiciste sin conexión; no se perdió nada.', duration: 10000 })
      } else {
        toast.error('Tu sesión se cerró', { description: 'La administración cerró tu sesión o suspendió tu cuenta.', duration: 8000 })
      }
      sinConexionRef.current = false
      try { sessionStorage.removeItem(MARCA_SIN_CONEXION) } catch { /* nada */ }
      logout()
    }
    const quitar = directorioService.suscribir(() => void revisar())
    const quitarRed = conexion.suscribir(() => { if (conexion.enLinea) void revisar() })
    const t = setInterval(() => void revisar(), 60_000)
    const alVolver = () => { if (document.visibilityState === 'visible') void revisar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { vivo = false; quitar(); quitarRed(); clearInterval(t); document.removeEventListener('visibilitychange', alVolver) }
  }, [user, inicioSesion, logout])

  const valor = useMemo(() => ({ user, inicioSesion, pendiente2fa: !!pendiente, pendienteUsuario: pendiente, configurar2fa: !!pendiente && configurar, activar2fa, listo, login, verificar2fa, logout, crearPassword }),
    [user, inicioSesion, pendiente, configurar, activar2fa, listo, login, verificar2fa, logout, crearPassword])
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
