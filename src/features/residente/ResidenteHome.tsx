import Vacio from '../../shared/ui/Vacio'

export default function ResidenteHome() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-5">Mis códigos QR</h1>
      <Vacio titulo="Aún no has creado códigos" texto="Crea un código para que tu visita pase por la caseta."
        accion={<button className="rounded-lg bg-acento text-fondo font-bold px-5 py-2.5 hover:brightness-110">Crear código QR</button>} />
    </>
  )
}
