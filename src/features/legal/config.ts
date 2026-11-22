/*
  Datos legales de la plataforma. LLENAR ANTES DE PUBLICAR A USUARIOS REALES.
  Todo lo que está entre [corchetes] es un dato pendiente.

  Como Mi Privada atiende a varias privadas:
  - "Responsable" del tratamiento = la administración / asociación de colonos de cada privada
    (decide para qué se usan los datos de sus residentes y visitantes).
  - "Proveedor" = la empresa dueña de la plataforma; actúa como ENCARGADO (trata los datos por
    cuenta del responsable). Si el proveedor también decide finalidades propias, es responsable también.
  Cuando existan varias privadas, estos datos deben venir de la configuración de cada privada.

  Estos textos son una base redactada conforme a la LFPDPPP (DOF 20/03/2025). No sustituyen la
  revisión de un abogado: valídalos antes de lanzar.
*/
export const LEGAL = {
  producto: 'Mi Privada',
  privada: 'Los Olivos',
  responsable: '[Nombre o razón social de la administración o asociación de colonos de Los Olivos]',
  domicilio: '[Calle, número, colonia, municipio, estado y código postal de la administración]',
  correoPrivacidad: '[privacidad@tu-dominio.mx]',
  correoContacto: '[contacto@tu-dominio.mx]',
  proveedor: '[Razón social del proveedor de la plataforma Mi Privada]',
  hosting: 'Vercel Inc. (alojamiento de la aplicación web)',
  actualizado: '22 de noviembre de 2026',
  retencionFotosDias: 90,
  retencionBitacoraMeses: 12,
  retencionComprobantesAnios: 5,
} as const

/** true mientras falte llenar algún dato entre corchetes */
export const LEGAL_PENDIENTE = Object.values(LEGAL).some((v) => typeof v === 'string' && v.includes('['))
