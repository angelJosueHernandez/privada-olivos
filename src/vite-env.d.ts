/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública de la API (https). Sin ella la app corre en modo demostración. Nunca pongas secretos en VITE_*. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
