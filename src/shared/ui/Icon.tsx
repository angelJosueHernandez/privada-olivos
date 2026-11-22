const D = {
  inicio: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pagos: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z M9 8h6 M9 12h6',
  avisos: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0',
  caseta: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  lista: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  correo: 'M3 6h18v12H3z M3 7l9 7 9-7',
  candado: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ojoOculto: 'M3 3l18 18 M10.6 6.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4 M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.2-1',
  atras: 'M15 18l-6-6 6-6',
  qr: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2 M14 18h2 M18 18h2v2 M18 16v2',
  escanear: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16',
  salir: 'M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3 M15 8l4 4-4 4 M19 12H9',
  mas: 'M12 5v14 M5 12h14',
  compartir: 'M12 3v12 M8 7l4-4 4 4 M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  copiar: 'M9 9h11v11H9z M5 15H4V4h11v1',
  descargar: 'M12 4v12 M8 12l4 4 4-4 M5 20h14',
  calendario: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  alerta: 'M12 8v5 M12 16.5h.01 M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  camara: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  paquete: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z M3 7.5l9 4.5 9-4.5 M12 12v9 M7.5 5.2l9 4.6',
  auto: 'M5 17H3v-5l2-5h14l2 5v5h-2 M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M9 17h6 M3 12h18',
  comida: 'M4 11h16a8 8 0 0 1-16 0z M12 3v3 M8 4.5l1 2 M16 4.5l-1 2 M3 19h18',
  herramienta: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  visita: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.1a4 4 0 0 1 0 7.8 M22 21a7 7 0 0 0-4-6.3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cerrar: 'M6 6l12 12 M18 6L6 18',
  linterna: 'M8 3h8v4l-2 3v11h-4V10L8 7z M12 13v2',
  teclado: 'M3 6h18v12H3z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h10',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  entrada: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 8l4 4-4 4 M14 12H4',
  basura: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
  flama: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-1.5 2-2 3.5-2 5-1-1-2-2.5-2-4-3 2.5-6 6-6 9a7 7 0 0 0 7 7z',
  gota: 'M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z',
  wifi: 'M2 9a15 15 0 0 1 20 0 M5.5 12.5a10 10 0 0 1 13 0 M9 16a5 5 0 0 1 6 0 M12 19.5h.01',
  hoja: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19c3-4 6-7 10-9',
  chispas: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  camion: 'M3 6h11v10H3z M14 10h4l3 3v3h-7 M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  enchufe: 'M9 2v5 M15 2v5 M6 7h12v4a6 6 0 0 1-12 0z M12 17v5',
  insecto: 'M12 7a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0v-6a3 3 0 0 1 3-3z M12 7V4 M9 10H4 M15 10h5 M9 14H4 M15 14h5 M10 4l-2-2 M14 4l2-2',
}
export type IconName = keyof typeof D

export default function Icon({ n, size = 22, stroke = 1.8 }: { n: IconName; size?: number; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={D[n]} />
    </svg>
  )
}
