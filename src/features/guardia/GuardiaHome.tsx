import Encabezado from '../../shared/ui/Encabezado'
import Icon from '../../shared/ui/Icon'
import Vacio from '../../shared/ui/Vacio'

export default function GuardiaHome() {
  return (
    <>
      <Encabezado titulo="Caseta principal" detalle="Valida el acceso de cada visita." />
      <Vacio icono="escanear" titulo="Lector listo"
        texto="Escanea el código de la visita para validar su acceso."
        accion={<button className="btn-primario"><Icon n="escanear" size={19} stroke={2} />Escanear código</button>} />
    </>
  )
}
