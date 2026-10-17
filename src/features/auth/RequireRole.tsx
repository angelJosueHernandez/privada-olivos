import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { rutaInicio, useAuth } from './AuthContext'
import { Rol } from './authService'

// Solo controla la navegacion. La seguridad real la aplica la API en cada peticion.
export default function RequireRole({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.rol !== rol) return <Navigate to={rutaInicio(user.rol)} replace />
  return <>{children}</>
}
