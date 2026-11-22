import { ReactNode } from 'react'
import Icon, { IconName } from './Icon'

export default function Vacio({ icono, titulo, texto, accion }: { icono: IconName; titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <section className="rounded-[28px] bg-panel shadow-tarjeta px-6 py-14 sm:py-20 flex flex-col items-center text-center">
      <span className="grid place-items-center h-16 w-16 rounded-[20px] bg-acento/[0.12] text-acento">
        <Icon n={icono} size={30} stroke={1.7} />
      </span>
      <h2 className="mt-6 text-[1.375rem] font-semibold tracking-[-0.015em]">{titulo}</h2>
      <p className="mt-2 max-w-[34ch] text-[1.0625rem] leading-relaxed text-suave text-balance">{texto}</p>
      {accion && <div className="mt-8">{accion}</div>}
    </section>
  )
}
