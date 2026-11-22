import { Link } from 'react-router-dom'
import DocumentoLegal, { Seccion } from './DocumentoLegal'
import { LEGAL } from './config'

const L = LEGAL

export default function TerminosPage() {
  return (
    <DocumentoLegal titulo="Términos y condiciones"
      resumen={`Las reglas de uso de ${L.producto} para residentes, personal de caseta y administración de la privada ${L.privada}.`}>

      <Seccion id="objeto" titulo="1. Qué es Mi Privada">
        <p>{L.producto} es una herramienta para administrar el acceso de visitas, la bitácora de caseta y el registro de pagos de cuotas de la privada. La administra <strong>{L.responsable}</strong> y la opera <strong>{L.proveedor}</strong>. Al usarla aceptas estos términos y el <Link to="/privacidad">aviso de privacidad</Link>.</p>
      </Seccion>

      <Seccion id="cuentas" titulo="2. Tu cuenta">
        <ul>
          <li>Las cuentas las crea la administración de la privada. Solo pueden tener cuenta residentes, personal autorizado y la administración.</li>
          <li>Tu cuenta es personal e intransferible. Eres responsable de cuidar tu contraseña y tu verificación en dos pasos y de todo lo que se haga con tu cuenta.</li>
          <li>Avisa de inmediato a la administración si crees que alguien más usó tu cuenta.</li>
          <li>La administración puede suspender una cuenta por uso indebido, por dejar de ser residente o por motivos de seguridad.</li>
        </ul>
      </Seccion>

      <Seccion id="pases" titulo="3. Pases de visita">
        <ul>
          <li>El residente que genera un pase es responsable de las personas a quienes lo comparte y de su conducta dentro de la privada, conforme al reglamento interno.</li>
          <li>No compartas pases en redes sociales ni con personas que no conoces. Los pases de un solo uso dejan de funcionar al usarse, y puedes cancelar cualquier pase en todo momento.</li>
          <li>El personal de caseta puede negar el acceso aun con un pase válido si existe un riesgo para la seguridad, conforme al reglamento.</li>
        </ul>
      </Seccion>

      <Seccion id="caseta" titulo="4. Uso por el personal de caseta">
        <ul>
          <li>El personal solo debe registrar los datos necesarios para el control de acceso y tomar fotografías de evidencia cuando ayuden a ese control (placas, paquetes, gafetes). No deben tomarse fotografías de rostros ni de identificaciones oficiales completas sin autorización.</li>
          <li>Los datos y fotografías de la bitácora son confidenciales y no pueden copiarse, compartirse ni usarse fuera de la app.</li>
        </ul>
      </Seccion>

      <Seccion id="pagos" titulo="5. Comprobantes de pago">
        <p>Subir un comprobante no equivale a un pago confirmado: el pago se considera aplicado cuando la administración lo revisa y aprueba. Los comprobantes falsos o alterados pueden tener consecuencias conforme al reglamento interno y a la ley.</p>
      </Seccion>

      <Seccion id="uso" titulo="6. Uso prohibido">
        <ul>
          <li>Intentar acceder a cuentas, datos o funciones que no te corresponden.</li>
          <li>Probar, escanear o vulnerar la seguridad de la app, o interferir con su funcionamiento.</li>
          <li>Usar la app para acosar, discriminar o vigilar a otras personas.</li>
          <li>Subir contenido ilegal, ofensivo o que no corresponda al propósito de la app.</li>
        </ul>
      </Seccion>

      <Seccion id="disponibilidad" titulo="7. Disponibilidad y responsabilidad">
        <p>Procuramos que la app esté disponible y funcione correctamente, pero puede haber interrupciones por mantenimiento o causas ajenas. La app es un apoyo para la seguridad de la privada y no sustituye las demás medidas de seguridad, el criterio del personal de caseta ni el reglamento interno. En la medida que permita la ley, no somos responsables por daños derivados del mal uso de la app o del uso de cuentas por terceros debido a descuido en el resguardo de las credenciales.</p>
      </Seccion>

      <Seccion id="cambios" titulo="8. Cambios">
        <p>Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su fecha y te avisaremos en la app cuando los cambios sean importantes.</p>
      </Seccion>

      <Seccion id="ley" titulo="9. Ley aplicable y contacto">
        <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier duda o aclaración escribe a <strong>{L.correoContacto}</strong>.</p>
      </Seccion>
    </DocumentoLegal>
  )
}
