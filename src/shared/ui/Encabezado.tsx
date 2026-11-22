import { ReactNode } from 'react'

// Título grande de pantalla, al estilo de los "large titles" de Apple. La acción queda a la derecha del título.
export default function Encabezado({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="titulo-grande">{titulo}</h1>
        {detalle && <p className="mt-2 text-[1.0625rem] text-suave">{detalle}</p>}
      </div>
      {accion && <div className="shrink-0 pt-1">{accion}</div>}
    </div>
  )
}
