import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'
import { Rol } from './authService'
import { puedeVer, rutaInicio } from './permisos'

/*
  Guardia de ruta: solo deja ver la pantalla si el rol de la sesión la tiene en su lista blanca.
  Si alguien escribe o pega la dirección de otra sección, vuelve a su inicio con un aviso.
  La seguridad real la aplica la API en cada petición; esto controla la navegación.
*/
export default function RequireRole({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const permitido = !!user && user.rol === rol && puedeVer(user.rol, pathname)

  useEffect(() => {
    if (user && !permitido) toast.error('No tienes acceso a esa sección', { id: 'sin-acceso' })
  }, [user, permitido])

  if (!user) return <Navigate to="/login" replace />
  if (!permitido) return <Navigate to={rutaInicio(user.rol)} replace />
  return <>{children}</>
}
