# Cumplimiento legal de Mi Privada

Base: Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP, DOF 20/03/2025).
Los textos de la app son una base sólida, **no sustituyen la revisión de un abogado**.

## Ya implementado en la app

| Qué | Dónde |
|---|---|
| Aviso de privacidad integral | `/privacidad` · `src/features/legal/PrivacidadPage.tsx` |
| Términos y condiciones | `/terminos` · `src/features/legal/TerminosPage.tsx` |
| Política de cookies y almacenamiento | `/cookies` · `src/features/legal/CookiesPage.tsx` |
| Aviso de cookies (informativo, solo almacenamiento esencial) | `src/features/legal/AvisoCookies.tsx` |
| Aceptación al iniciar sesión | Pie del formulario de login |
| Enlaces legales en toda la app | Pie de la app y del login |
| Indicaciones al guardia sobre fotos y aviso a visitantes | Registro sin código |
| Minimización: fotos reducidas y sin ubicación (EXIF), sin INE ni rostros | `src/features/caseta/fotos.ts` |
| Remisión al proveedor de IA (Anthropic) para leer placas, declarada en el aviso | `/privacidad` sección 5 |

## Antes de publicar con usuarios reales

1. **Llenar los datos entre [corchetes]** en `src/features/legal/config.ts`: razón social de la administración, domicilio, correos de privacidad y contacto, y razón social del proveedor. Mientras falten, los documentos muestran un aviso de "Borrador".
2. **Revisión de un abogado** de los tres documentos y de los plazos de conservación (90 días fotos, 12 meses bitácora, 5 años pagos).
3. **Contrato de encargado** entre la privada (responsable) y el proveedor de la plataforma: qué datos trata, para qué, medidas de seguridad, confidencialidad, subcontratistas (Vercel, base de datos) y qué pasa con los datos al terminar el contrato.
4. **Letrero en caseta** con el aviso simplificado (abajo).
5. **Actualizar el reglamento interno** de la privada para mencionar el uso de la app, los pases y las fotos de evidencia.
6. **Designar quién atiende solicitudes ARCO** (responder en 20 días hábiles).

## Pendiente cuando exista la API

- **Consentimiento expreso para comprobantes de pago** (datos patrimoniales): casilla obligatoria la primera vez que el residente sube un comprobante, guardando fecha, hora y versión del aviso aceptado.
- **Registro de aceptación** de términos y aviso (usuario, fecha, versión) en el servidor.
- **Borrado automático** de fotos a los 90 días y de bitácora a los 12 meses (tarea programada en la API).
- **Solicitudes ARCO desde la app** (descargar mis datos, pedir corrección o baja).
- **Aviso de cambios** dentro de la app cuando se actualice el aviso de privacidad.
- Si algún día se agrega analítica o algo no esencial: convertir el aviso de cookies en consentimiento previo con opción de rechazar.

## Aviso de privacidad simplificado (para imprimir en caseta)

> **AVISO DE PRIVACIDAD SIMPLIFICADO**
>
> [Nombre o razón social de la administración], con domicilio en [domicilio], es responsable del tratamiento de los datos personales que se registran en esta caseta: nombre o empresa, casa que visita, fecha y hora de entrada y salida, placas del vehículo y, en su caso, fotografías de placas, paquetes o gafetes.
>
> Estos datos se usan **únicamente para controlar el acceso y la seguridad de la privada**. No se usan con fines comerciales ni se comparten, salvo con nuestros proveedores tecnológicos y con autoridades cuando la ley lo exija. Las fotografías se conservan 90 días.
>
> Consulta el aviso de privacidad integral en **[tu-dominio]/privacidad** o solicítalo en caseta. Para ejercer tus derechos ARCO escribe a **[privacidad@tu-dominio.mx]**.
