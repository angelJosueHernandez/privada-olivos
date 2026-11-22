import { useAuth } from '../auth/AuthContext'
import Encabezado from '../../shared/ui/Encabezado'
import Icon from '../../shared/ui/Icon'
import Vacio from '../../shared/ui/Vacio'

export default function ResidenteHome() {
  const { user } = useAuth()
  return (
    <>
      <Encabezado titulo="Mis códigos QR" detalle={user?.nombre ? `Hola, ${user.nombre.split(' ')[0]}` : undefined} />
      <Vacio icono="qr" titulo="Aún no has creado códigos"
        texto="Crea un código para que tu visita pase por la caseta sin esperar."
        accion={<button className="btn-primario"><Icon n="mas" size={19} stroke={2.2} />Crear código QR</button>} />
    </>
  )
}
