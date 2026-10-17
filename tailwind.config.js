/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#F4F6F2',
        panel: '#FFFFFF',
        borde: '#D5DDD3',
        texto: '#1B2A21',
        suave: '#5E6F64',
        acento: '#2F6B4A',
        bosque: '#1F4D36',
        ok: '#2E8B57',
        alerta: '#B7791F',
        peligro: '#C0392B',
      },
      fontFamily: { sans: ['"Figtree Variable"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}