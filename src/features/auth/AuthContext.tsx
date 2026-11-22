import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService, Usuario } from './authService'
export { rutaInicio } from './permisos'

type Ctx = {
  user: Usuario | null
  /** Cuándo inició la sesión actual (se muestra en el perfil) */
  inicioSesion: Date | null
  pendiente2fa: boolean
  /** false mientras se revisa si hay una sesión que recuperar (al recargar) */
  listo: boolean
  login: (email: string, password: string) => Promise<void>
  verificar2fa: (codigo: string) => Promise<void>
  logout: () => void
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
    if (r.requiere2fa) setPendiente(congelar(r.usuario))
    else { const ahora = new Date(); setUser(congelar(r.usuario)); setInicioSesion(ahora); authService.recordar(r.usuario, ahora) }
  }, [])

  const verificar2fa = useCallback<Ctx['verificar2fa']>(async (codigo) => {
    if (!pendiente) throw new Error('Inicia sesión de nuevo.')
    await authService.verificar2fa(codigo)
    const ahora = new Date()
    setUser(pendiente)
    setInicioSesion(ahora)
    authService.recordar(pendiente, ahora)
    setPendiente(null)
  }, [pendiente])

  // Cierra la sesión local de inmediato, limpia el historial y pide a la API invalidar la cookie
  const logout = useCallback(() => {
    setUser(null)
    setPendiente(null)
    setInicioSesion(null)
    void authService.logout()
    // Reemplaza la entrada actual para que "atrás" no regrese a una pantalla protegida
    window.history.replaceState(null, '', '/login')
  }, [])

  const valor = useMemo(() => ({ user, inicioSesion, pendiente2fa: !!pendiente, listo, login, verificar2fa, logout }), [user, inicioSesion, pendiente, listo, login, verificar2fa, logout])
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
