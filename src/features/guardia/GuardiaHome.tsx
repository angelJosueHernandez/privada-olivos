import Vacio from '../../shared/ui/Vacio'

export default function GuardiaHome() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-5">Caseta principal</h1>
      <Vacio titulo="Lector listo" texto="Escanea el código de la visita para validar su acceso."
        accion={<button className="rounded-lg bg-acento text-fondo font-bold px-5 py-2.5 hover:brightness-110">Escanear código</button>} />
    </>
  )
}
