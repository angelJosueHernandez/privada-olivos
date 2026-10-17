import { ReactNode } from 'react'

export default function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borde p-10 text-center">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <p className="text-suave mt-1 mb-5">{texto}</p>
      {accion}
    </div>
  )
}
