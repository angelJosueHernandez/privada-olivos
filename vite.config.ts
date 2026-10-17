import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mi Privada',
        short_name: 'Privada',
        lang: 'es',
        display: 'standalone',
        theme_color: '#1F4D36',
        background_color: '#F4F6F2',
        // TODO: agregar iconos 192x192 y 512x512 en /public para poder instalarla
        icons: [],
      },
    }),
  ],
})