/*
  Datos de cobro de la privada. Los que están entre [corchetes] los debe llenar la administración
  antes de usar la app en producción (con API, vendrán de la configuración de la privada).
*/
export const COBRO = Object.freeze({
  concepto: 'Cuota de mantenimiento',
  /** Cuota mensual en pesos */
  cuotaMensual: 1200,
  /** Día del mes en que vence la cuota */
  diaVencimiento: 10,
  banco: '[Banco]',
  clabe: '[CLABE de 18 dígitos]',
  titular: '[Nombre de la asociación o administración]',
})

/** Referencia de pago de cada casa, p. ej. "Calle Palma 104" → "PALMA104" */
export const referenciaDe = (casa: string) => casa.replace(/^Calle\s+/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
