import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import './index.css'
// Se registra temprano para no perder el aviso de instalación de Android
import './shared/avisos/instalar'
import App from './App'
import { AuthProvider } from './features/auth/AuthContext'

// Si el navegador restaura la página desde su caché al ir "atrás", se recarga:
// así nunca se muestra una pantalla protegida de una sesión que ya no existe.
window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload() })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
