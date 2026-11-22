import type { Usuario } from '../../features/auth/authService'
import { useAvisos } from '../../features/caseta/useAvisos'

/*
  Escucha los avisos del usuario en TODA la app (no solo en su inicio): así le llega "Pago aprobado"
  aunque esté en Pagos o Anuncios. El guardia los maneja en su pantalla (van a su campana del turno).
*/
export default function AvisosGlobales({ user }: { user: Usuario }) {
  const para = user.rol === 'RESIDENTE' ? user.casa : user.rol === 'ADMIN' ? 'ADMIN' : undefined
  useAvisos(para, user.rol === 'ADMIN' ? '/admin' : '/residente')
  return null
}
