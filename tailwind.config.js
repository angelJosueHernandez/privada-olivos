/** @type {import('tailwindcss').Config} */
const token = (v) => `rgb(var(--${v}) / <alpha-value>)`

export default {
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: token('fondo'),
        panel: token('panel'),
        borde: token('borde'),
        separador: token('separador'),
        texto: token('texto'),
        suave: token('suave'),
        acento: token('acento'),
        'acento-texto': token('acento-texto'),
        ok: token('ok'),
        alerta: token('alerta'),
        peligro: token('peligro'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Inter Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tarjeta: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
}
