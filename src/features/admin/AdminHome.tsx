import Encabezado from '../../shared/ui/Encabezado'
import Vacio from '../../shared/ui/Vacio'

export default function AdminHome() {
  return (
    <>
      <Encabezado titulo="Pagos por revisar" detalle="Comprobantes de cuota que esperan tu aprobación." />
      <Vacio icono="pagos" titulo="No hay pagos pendientes"
        texto="Cuando un residente suba un comprobante, aparecerá aquí para que lo apruebes o rechaces." />
    </>
  )
}
