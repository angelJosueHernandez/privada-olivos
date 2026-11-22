import { useId } from 'react'

// Ícono de la app: una rama de olivo con tallo curvo, hojas alternadas y una aceituna,
// sobre un cuadro redondeado al estilo de los íconos de app. Usa el acento de la privada.
export default function Marca({ size = 64 }: { size?: number }) {
  const id = useId()
  const tinta = 'rgb(var(--acento-texto))'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="text-acento shrink-0"
      style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.08)) drop-shadow(0 8px 14px rgb(var(--acento) / 0.32))' }}>
      <rect width="64" height="64" rx="15" fill="currentColor" />
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Tallo curvo */}
      <path d="M16 50 C26 44 34 32 47 14" fill="none" stroke={tinta} strokeWidth="2.6" strokeLinecap="round" />
      {/* Hojas alternadas a lo largo del tallo */}
      <g fill={tinta}>
        <ellipse cx="44" cy="14" rx="7.5" ry="3.3" transform="rotate(-62 44 14)" />
        <ellipse cx="33" cy="22" rx="7.5" ry="3.3" transform="rotate(-100 33 22)" />
        <ellipse cx="44.5" cy="29" rx="7.5" ry="3.3" transform="rotate(-25 44.5 29)" />
        <ellipse cx="24" cy="35" rx="7.5" ry="3.3" transform="rotate(-115 24 35)" />
        <ellipse cx="36" cy="42" rx="7.5" ry="3.3" transform="rotate(-20 36 42)" opacity="0.92" />
      </g>
      {/* Aceituna colgando del tallo */}
      <path d="M22 46.5 L22.5 50" stroke={tinta} strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="23" cy="54" rx="3.6" ry="4.4" fill={tinta} />
    </svg>
  )
}
