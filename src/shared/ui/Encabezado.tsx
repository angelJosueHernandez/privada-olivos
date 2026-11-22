import { ReactNode } from 'react'

// Título grande de pantalla, al estilo de los "large titles" de Apple.
export default function Encabezado({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="titulo-grande">{titulo}</h1>
        {detalle && <p className="mt-2 text-[1.0625rem] text-suave">{detalle}</p>}
      </div>
      {accion}
    </div>
  )
}
