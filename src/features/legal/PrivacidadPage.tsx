import { Link } from 'react-router-dom'
import DocumentoLegal, { Seccion } from './DocumentoLegal'
import { LEGAL } from './config'

const L = LEGAL

export default function PrivacidadPage() {
  return (
    <DocumentoLegal titulo="Aviso de privacidad"
      resumen={`Cómo ${L.responsable} trata los datos personales de residentes, personal y visitantes de la privada ${L.privada} a través de ${L.producto}, y cómo puedes ejercer tus derechos.`}>

      <Seccion id="responsable" titulo="1. Responsable de tus datos">
        <p><strong>{L.responsable}</strong>, con domicilio en {L.domicilio}, es responsable del tratamiento de tus datos personales, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su normativa aplicable.</p>
        <p>La plataforma {L.producto} es operada por <strong>{L.proveedor}</strong>, que trata los datos únicamente por cuenta y bajo las instrucciones del responsable, en calidad de encargado.</p>
        <p>Contacto de privacidad: <strong>{L.correoPrivacidad}</strong></p>
      </Seccion>

      <Seccion id="datos" titulo="2. Datos personales que tratamos">
        <h3>Residentes y personal de la privada</h3>
        <ul>
          <li><strong>Identificación y contacto:</strong> nombre, correo electrónico, domicilio dentro de la privada (calle y número de casa) y, en su caso, teléfono.</li>
          <li><strong>Datos de la cuenta:</strong> rol (residente, guardia o administración), credenciales de acceso (la contraseña se guarda cifrada y nadie puede verla) y el factor de verificación en dos pasos.</li>
          <li><strong>Datos patrimoniales y financieros:</strong> comprobantes de pago de cuotas de mantenimiento, montos, fechas y estado de pago.</li>
          <li><strong>Actividad:</strong> pases de visita que generas y registro de accesos relacionados con tu domicilio.</li>
        </ul>
        <h3>Visitantes, repartidores y prestadores de servicios</h3>
        <ul>
          <li>Nombre o empresa, casa que visitan, fecha y hora de entrada y salida.</li>
          <li>Placas del vehículo, cuando se registran.</li>
          <li>Fotografías de evidencia tomadas en caseta (por ejemplo, de la placa del vehículo, del paquete o del gafete de la empresa).</li>
        </ul>
        <p><strong>No tratamos datos personales sensibles</strong> (como salud, origen étnico, creencias o datos biométricos). No se solicita ni se fotografía la credencial para votar u otra identificación oficial completa, salvo que la persona lo autorice para un caso particular.</p>
      </Seccion>

      <Seccion id="finalidades" titulo="3. Para qué usamos tus datos">
        <h3>Finalidades necesarias (primarias)</h3>
        <p>Son indispensables para la relación con la privada y no requieren tu consentimiento adicional:</p>
        <ul>
          <li>Crear y administrar tu cuenta y verificar tu identidad al iniciar sesión.</li>
          <li>Controlar el acceso a la privada: generar, validar y registrar pases de visita, entradas y salidas.</li>
          <li>Llevar la bitácora de seguridad de caseta, incluidas las fotografías de evidencia de repartidores, paquetería y servicios.</li>
          <li>Recibir, revisar y conciliar los comprobantes de pago de cuotas y llevar el estado de cuenta de cada domicilio.</li>
          <li>Enviarte avisos relacionados con la operación y la seguridad de la privada.</li>
          <li>Atender solicitudes, aclaraciones, incidentes de seguridad y requerimientos de autoridades competentes.</li>
        </ul>
        <h3>Finalidades secundarias</h3>
        <p>Actualmente <strong>no usamos tus datos para finalidades secundarias</strong> (como publicidad, mercadotecnia o venta de datos). Si en el futuro se agregara alguna, se te informará antes y podrás negarte sin que ello afecte el servicio.</p>
      </Seccion>

      <Seccion id="consentimiento" titulo="4. Consentimiento">
        <p>Al crear tu cuenta e iniciar sesión, aceptas el tratamiento de tus datos para las finalidades necesarias descritas en este aviso.</p>
        <p>Para los <strong>datos patrimoniales y financieros</strong> (comprobantes de pago) se te pedirá tu <strong>consentimiento expreso</strong> la primera vez que subas un comprobante. Puedes revocar tu consentimiento en cualquier momento según la sección 7, considerando que algunas obligaciones (por ejemplo, conservar registros de pagos) pueden impedir eliminar ciertos datos de inmediato.</p>
        <p>A los visitantes se les informa del tratamiento de sus datos mediante el aviso de privacidad simplificado colocado en la caseta de acceso.</p>
      </Seccion>

      <Seccion id="transferencias" titulo="5. Con quién compartimos tus datos">
        <p>Tus datos <strong>no se venden ni se comparten con fines comerciales</strong>. Solo se comunican a:</p>
        <ul>
          <li><strong>Encargados que nos dan servicio</strong>, como {L.proveedor} (operación de la plataforma) y {L.hosting}, quienes solo pueden usarlos para prestarnos el servicio y bajo obligaciones de confidencialidad y seguridad. Estas comunicaciones no requieren tu consentimiento.</li>
          <li><strong>Anthropic, PBC</strong>, proveedor del servicio de inteligencia artificial que lee automáticamente las placas en las fotografías tomadas en caseta. Solo recibe la fotografía de la placa, la procesa para devolver la lectura y, conforme a sus condiciones comerciales, no la usa para entrenar sus modelos.</li>
          <li><strong>Autoridades competentes</strong>, cuando lo exija la ley o una orden judicial, o para la investigación de un delito o incidente de seguridad dentro de la privada.</li>
        </ul>
        <p>Dentro de la privada, cada persona solo ve lo que corresponde a su rol: un residente ve sus propios pases y pagos; el personal de caseta ve los datos necesarios para controlar el acceso; la administración ve lo necesario para administrar la privada.</p>
      </Seccion>

      <Seccion id="conservacion" titulo="6. Cuánto tiempo conservamos tus datos">
        <table>
          <thead><tr><th>Información</th><th>Plazo</th></tr></thead>
          <tbody>
            <tr><td>Fotografías de evidencia de caseta</td><td>{L.retencionFotosDias} días, salvo que se requieran para aclarar un incidente</td></tr>
            <tr><td>Bitácora de accesos y pases de visita</td><td>{L.retencionBitacoraMeses} meses</td></tr>
            <tr><td>Comprobantes y registros de pago</td><td>{L.retencionComprobantesAnios} años, por obligaciones contables y fiscales</td></tr>
            <tr><td>Datos de tu cuenta</td><td>Mientras seas residente o personal de la privada; al darte de baja se bloquean y después se suprimen</td></tr>
          </tbody>
        </table>
      </Seccion>

      <Seccion id="arco" titulo="7. Tus derechos ARCO y revocación del consentimiento">
        <p>Tienes derecho a <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong> si son inexactos, <strong>Cancelarlos</strong> cuando ya no sean necesarios y <strong>Oponerte</strong> a su tratamiento para fines específicos. También puedes revocar el consentimiento que hayas otorgado.</p>
        <p>Envía tu solicitud a <strong>{L.correoPrivacidad}</strong> con:</p>
        <ul>
          <li>Tu nombre y un medio para comunicarte contigo.</li>
          <li>Un documento que acredite tu identidad (o la de tu representante legal).</li>
          <li>La descripción clara de los datos y del derecho que quieres ejercer.</li>
          <li>Cualquier documento que facilite localizar tus datos.</li>
        </ul>
        <p>Te responderemos en un plazo máximo de <strong>20 días hábiles</strong> contados desde que recibamos tu solicitud completa y, si procede, la haremos efectiva dentro de los <strong>15 días hábiles</strong> siguientes. El ejercicio de estos derechos es gratuito; solo podrían cobrarse costos justificados de envío o reproducción.</p>
      </Seccion>

      <Seccion id="limitar" titulo="8. Cómo limitar el uso de tus datos">
        <p>Puedes pedir que limitemos el uso o divulgación de tus datos escribiendo a {L.correoPrivacidad}. Desde la app también puedes dejar de recordar tu correo en este dispositivo desmarcando “Recordar mi correo” al iniciar sesión.</p>
      </Seccion>

      <Seccion id="rastreo" titulo="9. Cookies y tecnologías similares">
        <p>{L.producto} solo usa almacenamiento <strong>esencial</strong> para que la app funcione (mantener tu sesión segura, proteger contra solicitudes falsificadas y permitir que funcione sin conexión) y, si tú lo eliges, para recordar tu correo. <strong>No usamos cookies de publicidad, analítica de terceros ni rastreo.</strong> Consulta el detalle en la <Link to="/cookies">política de cookies y almacenamiento</Link>.</p>
      </Seccion>

      <Seccion id="seguridad" titulo="10. Cómo protegemos tus datos">
        <p>Aplicamos medidas de seguridad administrativas, técnicas y físicas, entre ellas: conexión cifrada (HTTPS), contraseñas cifradas, verificación en dos pasos, control de acceso por rol, registro de actividad y reducción de las fotografías con eliminación de su ubicación (metadatos) antes de guardarlas. Si ocurriera una vulneración de seguridad que afecte de forma significativa tus derechos, te lo informaremos sin demora.</p>
      </Seccion>

      <Seccion id="cambios" titulo="11. Cambios a este aviso">
        <p>Cualquier cambio a este aviso se publicará en esta misma página, con su fecha de actualización, y te lo notificaremos dentro de la app antes de que entre en vigor cuando afecte las finalidades o las transferencias de tus datos.</p>
      </Seccion>

      <Seccion id="autoridad" titulo="12. Autoridad">
        <p>Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir a la autoridad competente en la materia, la Secretaría Anticorrupción y Buen Gobierno, conforme a la LFPDPPP vigente.</p>
      </Seccion>
    </DocumentoLegal>
  )
}
