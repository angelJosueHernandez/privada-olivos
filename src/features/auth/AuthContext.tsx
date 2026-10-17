import { createContext, ReactNode, useContext, useState } from 'react'
import { authService, Rol, Usuario } from './authService'

type Ctx = {
  user: Usuario | null
  pendiente2fa: boolean
  login: (email: string, password: string) => Promise<void>
  verificar2fa: (codigo: string) => Promise<void>
  logout: () => void
}
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

export const rutaInicio = (rol: Rol) =>
  ({ ADMIN: '/admin', RESIDENTE: '/residente', GUARDIA: '/guardia' })[rol]

// La sesion vive solo en memoria (no en localStorage) para reducir el riesgo de robo por XSS.
// Con la API real, la sesion se recupera con la cookie HttpOnly de renovacion.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [pendiente, setPendiente] = useState<Usuario | null>(null)

  const login: Ctx['login'] = async (email, password) => {
    const r = await authService.login(email, password)
    if (r.requiere2fa) setPendiente(r.usuario)
    else setUser(r.usuario)
  }
  const verificar2fa: Ctx['verificar2fa'] = async (codigo) => {
    await authService.verificar2fa(codigo)
    setUser(pendiente)
    setPendiente(null)
  }
  const logout = () => { setUser(null); setPendiente(null) }

  return (
    <AuthCtx.Provider value={{ user, pendiente2fa: !!pendiente, login, verificar2fa, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}
