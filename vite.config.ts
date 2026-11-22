import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Las respuestas de la API (datos de residentes, pagos, sesión) nunca se guardan en caché
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      manifest: {
        name: 'Mi Privada',
        short_name: 'Privada',
        lang: 'es',
        display: 'standalone',
        theme_color: '#F5F5F7',
        background_color: '#F5F5F7',
        // TODO: agregar iconos 192x192 y 512x512 en /public para poder instalarla
        icons: [],
      },
    }),
  ],
  build: {
    // Sin mapas de código fuente en producción: no se publica el código original legible
    sourcemap: false,
  },
  esbuild: mode === 'production'
    ? { drop: ['console', 'debugger'], legalComments: 'none' }
    : undefined,
}))
