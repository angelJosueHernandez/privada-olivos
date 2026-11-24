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
        // Todo lo necesario para abrir y usar la app sin internet (código, estilos, iconos, imágenes)
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
        // Avisos: push del servidor y abrir la app al tocar una notificación
        importScripts: ['sw-avisos.js'],
      },
      manifest: {
        name: 'Mi Privada',
        short_name: 'Privada',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#FFFFFF',
        background_color: '#F5F5F7',
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
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
