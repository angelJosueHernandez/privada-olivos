import Vacio from '../../shared/ui/Vacio'

export default function AdminHome() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-5">Pagos por revisar</h1>
      <Vacio titulo="No hay pagos pendientes" texto="Cuando un residente suba un comprobante, aparecerá aquí para que lo apruebes o rechaces." />
    </>
  )
}
