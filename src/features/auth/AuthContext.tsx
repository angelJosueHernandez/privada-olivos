import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { authService, Usuario } from './authService'
export { rutaInicio } from './permisos'

type Ctx = {
  user: Usuario | null
  pendiente2fa: boolean
  login: (email: string, password: string) => Promise<void>
  verificar2fa: (codigo: string) => Promise<void>
  logout: () => void
}
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

// El usuario solo nace de una respuesta validada del servicio y queda congelado:
// ningún código, parámetro de URL ni consola puede cambiarle el rol a mitad de la sesión.
const congelar = (u: Usuario): Usuario => Object.freeze({ ...u })

// La sesión vive solo en memoria (no en localStorage) para reducir el riesgo de robo por XSS.
// Con la API real, la sesión se recupera con la cookie HttpOnly de renovación.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [pendiente, setPendiente] = useState<Usuario | null>(null)

  const login = useCallback<Ctx['login']>(async (email, password) => {
    const r = await authService.login(email, password)
    if (r.requiere2fa) setPendiente(congelar(r.usuario))
    else setUser(congelar(r.usuario))
  }, [])

  const verificar2fa = useCallback<Ctx['verificar2fa']>(async (codigo) => {
    if (!pendiente) throw new Error('Inicia sesión de nuevo.')
    await authService.verificar2fa(codigo)
    setUser(pendiente)
    setPendiente(null)
  }, [pendiente])

  // Cierra la sesión local de inmediato, limpia el historial y pide a la API invalidar la cookie
  const logout = useCallback(() => {
    setUser(null)
    setPendiente(null)
    void authService.logout()
    // Reemplaza la entrada actual para que "atrás" no regrese a una pantalla protegida
    window.history.replaceState(null, '', '/login')
  }, [])

  const valor = useMemo(() => ({ user, pendiente2fa: !!pendiente, login, verificar2fa, logout }), [user, pendiente, login, verificar2fa, logout])
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
