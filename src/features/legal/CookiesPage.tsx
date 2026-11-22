import { Link } from 'react-router-dom'
import DocumentoLegal, { Seccion } from './DocumentoLegal'
import { LEGAL } from './config'

export default function CookiesPage() {
  return (
    <DocumentoLegal titulo="Cookies y almacenamiento"
      resumen={`${LEGAL.producto} solo guarda en tu dispositivo lo indispensable para funcionar de forma segura. No usa cookies de publicidad, analítica de terceros ni rastreo.`}>

      <Seccion id="que-usamos" titulo="Qué guardamos en tu dispositivo">
        <table>
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué sirve</th><th>Duración</th></tr></thead>
          <tbody>
            <tr><td>Sesión</td><td>Cookie esencial, HttpOnly y segura</td><td>Mantener tu sesión iniciada de forma segura. JavaScript no puede leerla.</td><td>Hasta cerrar sesión o que expire</td></tr>
            <tr><td>XSRF-TOKEN</td><td>Cookie esencial</td><td>Proteger contra solicitudes falsificadas desde otros sitios.</td><td>La sesión</td></tr>
            <tr><td>privada.email</td><td>Almacenamiento local, opcional</td><td>Recordar tu correo en este dispositivo, solo si marcas “Recordar mi correo”.</td><td>Hasta que lo desmarques</td></tr>
            <tr><td>privada.aviso-cookies</td><td>Almacenamiento local, esencial</td><td>Recordar que ya leíste este aviso para no mostrarlo de nuevo.</td><td>Permanente</td></tr>
            <tr><td>Caché de la app</td><td>Service worker, esencial</td><td>Que la app cargue rápido y pueda abrirse sin conexión. No guarda datos personales.</td><td>Hasta la siguiente actualización</td></tr>
          </tbody>
        </table>
      </Seccion>

      <Seccion id="no-usamos" titulo="Qué no usamos">
        <ul>
          <li>Cookies de publicidad o de redes sociales.</li>
          <li>Analítica de terceros (como Google Analytics) ni píxeles de seguimiento.</li>
          <li>Venta o intercambio de datos con anunciantes.</li>
        </ul>
        <p>Si en el futuro se agregara alguna tecnología no esencial, se te pedirá tu consentimiento antes de activarla.</p>
      </Seccion>

      <Seccion id="control" titulo="Cómo controlarlas">
        <p>Puedes borrar las cookies y el almacenamiento de este sitio desde la configuración de tu navegador. Si borras las cookies esenciales se cerrará tu sesión y tendrás que volver a iniciarla. Para dejar de recordar tu correo, desmarca “Recordar mi correo” al iniciar sesión.</p>
        <p>Más información en el <Link to="/privacidad">aviso de privacidad</Link>.</p>
      </Seccion>
    </DocumentoLegal>
  )
}
