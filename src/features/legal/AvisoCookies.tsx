import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const CLAVE = 'privada.aviso-cookies'
const yaVisto = () => { try { return localStorage.getItem(CLAVE) === '1' } catch { return true } }

/*
  Aviso informativo de almacenamiento. La app solo usa almacenamiento esencial (sesión, anti-CSRF,
  caché offline) y uno opcional que el usuario activa (recordar correo), así que no se bloquea el uso:
  basta con informar. Si algún día se agrega analítica o algo no esencial, este aviso debe
  convertirse en un consentimiento previo con opción de rechazar.
*/
export default function AvisoCookies() {
  const [visible, setVisible] = useState(() => !yaVisto())
  const { pathname } = useLocation()
  if (!visible || pathname === '/cookies') return null

  const aceptar = () => {
    try { localStorage.setItem(CLAVE, '1') } catch { /* sin almacenamiento: se mostrará de nuevo */ }
    setVisible(false)
  }

  return (
    <div role="region" aria-label="Aviso de cookies"
      className="anim-entrar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-[400px]
        material rounded-[20px] border border-texto/[0.08] shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)] p-4">
      <p className="text-[0.9375rem] leading-[1.45] text-texto">
        Solo usamos almacenamiento esencial para que la app funcione de forma segura. Sin publicidad ni rastreo.{' '}
        <Link to="/cookies" className="font-medium text-acento underline underline-offset-4">Más información</Link>
      </p>
      <button onClick={aceptar} className="btn-primario btn-chico mt-3 w-full sm:w-auto">Entendido</button>
    </div>
  )
}
