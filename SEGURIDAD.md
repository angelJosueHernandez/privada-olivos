# Seguridad de Mi Privada

Este documento explica qué protege el frontend (esta app) y, sobre todo, qué **debe** hacer la API .NET.
La regla de oro: **todo lo que corre en el navegador se puede leer y modificar.** Cualquiera puede abrir
las herramientas de desarrollador, cambiar el JavaScript o mandar peticiones directo a la API sin usar
esta página. La seguridad real vive en el servidor.

## Lo que ya protege el frontend

| Amenaza | Protección | Dónde |
|---|---|---|
| Ver llaves o contraseñas con F12 | No hay secretos en el código. El modo demo guarda solo hashes SHA-256. Sin source maps ni `console.log` en producción. | `authService.ts`, `vite.config.ts` |
| Robo de sesión por XSS | La sesión vive en una cookie HttpOnly que JavaScript no puede leer; nunca en localStorage. React escapa todo el texto; no se usa `innerHTML`. | `shared/api/cliente.ts` |
| Inyección de scripts (XSS) | Content-Security-Policy: solo scripts del propio sitio, sin `eval`, sin plugins. | `vercel.json` |
| Clickjacking (meter la página en un iframe) | `frame-ancestors 'none'` y `X-Frame-Options: DENY`. | `vercel.json` |
| Intercepción de peticiones (man-in-the-middle) | HSTS obliga HTTPS por 2 años; la API debe usar `https://` o la app no arranca. | `vercel.json`, `cliente.ts` |
| CSRF (peticiones falsas desde otro sitio) | Cookie SameSite + token `X-XSRF-TOKEN` en toda petición que cambia datos. | `cliente.ts` |
| Enviar la cookie a otro dominio | El cliente solo acepta rutas `/api/...` hacia la API configurada y no sigue redirecciones. | `cliente.ts` |
| Fuerza bruta (UX) | Tras 5 fallos, espera progresiva de 30 s hasta 15 min. Topes de longitud en campos. | `LoginPage.tsx` |
| Filtrar detalles internos | Los errores del servidor se muestran con mensajes genéricos. | `cliente.ts` |
| Dependencias vulnerables | `react-router` actualizado; `npm audit --omit=dev` en 0. | `package.json` |
| Cambiar de rol o entrar a otra sección por la URL | Lista blanca de rutas por rol (`permisos.ts`); cualquier ruta no permitida redirige al inicio del rol con aviso. El usuario solo nace de una respuesta validada y queda congelado. | `permisos.ts`, `RequireRole.tsx`, `AuthContext.tsx` |
| Sesión olvidada abierta | Cierre por inactividad (admin 15 min, residente 30, guardia 60) con aviso 1 min antes; al cerrar sesión se limpia el historial y "atrás" no regresa a pantallas protegidas; recarga si el navegador restaura la página desde caché. | `useInactividad.ts`, `main.tsx` |
| Datos sensibles en caché | La PWA nunca guarda respuestas de `/api/` en caché. | `vite.config.ts` |

## Lo que DEBE hacer la API .NET (no opcional)

### 1. Inyección SQL
- Usar **Entity Framework Core** con LINQ, o consultas **parametrizadas** (`@parametro`). Nunca concatenar texto del usuario en SQL.
- Si se usa `FromSqlRaw`/`ExecuteSqlRaw`, siempre con parámetros; preferir `FromSqlInterpolated`.
- `ORDER BY`, nombres de columna o tabla dinámicos: solo desde una lista blanca, nunca del usuario.
- El usuario de la base de datos con permisos mínimos (sin `db_owner`, sin `xp_cmdshell`).
- Nunca devolver errores de SQL al cliente.

### 2. Sesión y autenticación
- Cookie de sesión: `HttpOnly`, `Secure`, `SameSite=Strict` (o `Lax`), con expiración corta y renovación.
- Contraseñas con **Argon2id** o el `PasswordHasher` de ASP.NET Core Identity. Mínimo 8 caracteres, máximo ≥ 128.
- 2FA (TOTP) verificado en el servidor, con límite de intentos por usuario.
- Al cerrar sesión, al cambiar contraseña o al dar de baja a un residente: invalidar todas sus sesiones.
- Respuestas idénticas para "correo no existe" y "contraseña incorrecta".

### 3. Rate limiting y fuerza bruta
- `Microsoft.AspNetCore.RateLimiting` en `/api/auth/login` y `/api/auth/2fa` (por IP y por cuenta).
- Bloqueo temporal de cuenta tras varios fallos (Identity lockout).

### 4. CSRF
- `services.AddAntiforgery(o => o.HeaderName = "X-XSRF-TOKEN")` y validar en todo POST/PUT/PATCH/DELETE.
- Enviar el token en una cookie `XSRF-TOKEN` legible por JavaScript (no HttpOnly) en el mismo sitio.
- Si la API vive en otro dominio, usar un subdominio del mismo sitio (por ejemplo `api.tudominio.com`) o un rewrite de Vercel `/api/*` hacia la API, para que las cookies SameSite funcionen.

### 5. Permisos (lo más importante en una app multi-privada)
- Validar el **rol** en cada endpoint (`[Authorize(Roles = "ADMIN")]`). Ocultar un botón en la página no es seguridad.
- Validar **pertenencia** en cada consulta: un residente solo ve sus pases y pagos; un admin solo su privada.
  Filtrar siempre por `PrivadaId` y `UsuarioId` del usuario de la sesión, nunca por un ID que mande el cliente.
- Usar **GUID/UUID** en vez de IDs consecutivos (evita adivinar `/api/pagos/124`).
- No aceptar campos de más (mass assignment): DTOs con solo los campos permitidos, nunca enlazar el modelo de la base de datos.
- Responder 404 en vez de 403 cuando el recurso no es del usuario.

### 5b. Trazabilidad (bitácora de auditoría)
- Cada pase guarda **quién lo creó** (residente) y cuándo; cada acceso guarda **qué guardia** registró la entrada, la salida y la entrega del paquete, con hora.
- El **actor y la hora los pone el servidor** a partir de la sesión y de su propio reloj. Nunca se aceptan del navegador (el frontend manda el actor solo en modo demo).
- La bitácora es de **solo agregar**: sin UPDATE ni DELETE desde la app. Las correcciones se registran como un evento nuevo, con quién y por qué.
- Cada registro lleva un **folio** único y legible para rastrearlo, y el ID interno es un UUID.

### 6. Pases QR
- El QR solo lleva un identificador aleatorio y firmado (o un token opaco), nunca datos personales.
- Expiración, uso único (o ventana horaria) y validación siempre en el servidor al escanear.
- El código del demo (`OLV-XXXX-XX`, ~30 bits) es corto para escribirse a mano. En producción: generarlo en el
  servidor con más entropía (≥ 10 caracteres o un token firmado), y limitar `POST /api/caseta/pases/validar` a
  **sesión de guardia** con límite de intentos (p. ej. 20 por minuto) para que no se puedan adivinar códigos.
- `POST /api/pases/{id}/cancelar`: solo el residente dueño de la casa del pase (o admin). Responder 404 si no es suyo.

### 7. Comprobantes de pago (subida de archivos)
- Lista blanca: JPG, PNG, PDF. Validar los **bytes mágicos**, no solo la extensión. Tamaño máximo (por ejemplo 5 MB).
- Renombrar con un UUID, guardar fuera de la carpeta pública (Blob Storage privado) y servir con
  `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff`.
- Nunca aceptar SVG ni HTML.
- El navegador ya re-codifica la imagen (quita ubicación GPS y metadatos) y la reduce; **el servidor debe repetir
  la validación** porque el navegador no es confiable.
- `POST /api/admin/comprobantes/{id}/revision`: solo ADMIN de la misma privada; aceptar únicamente
  `{ aprobar, motivo }` (motivo de la lista cerrada); el revisor y la hora salen de la sesión. Un comprobante ya
  revisado no se puede volver a revisar (409).
- El monto y los meses los valida el servidor contra la cuota real de la casa; el residente no decide cuánto debe.

### 7b. Anuncios, cobranza y panel de administración
- `POST/PUT/DELETE /api/anuncios` y todo `/api/admin/*` (comprobantes, cobranza, avisos, bitácora): **solo ADMIN**.
- `GET /api/anuncios` (residente): el servidor filtra por privada, vigencia y calle de la casa de la sesión.
- El texto de los anuncios se guarda y se devuelve como **texto plano** (la app nunca lo pinta como HTML).
- La bitácora se exporta en CSV desde el navegador con protección contra **inyección de fórmulas** (las celdas que
  empiezan con `= + - @` se escapan). Si la API ofrece su propia exportación, debe hacer lo mismo.

- **Confirmaciones de anuncios** (`PUT /api/anuncios/{id}/respuesta`): la casa sale de la sesión, nunca del cuerpo. El servidor valida que el anuncio sea para esa casa, siga vigente y pida ese tipo de respuesta; `valor` contra lista cerrada y `personas` entero entre 1 y 10. Una respuesta por casa (upsert). El recordatorio (`POST /api/admin/anuncios/{id}/recordatorio`) es solo ADMIN y con límite (p. ej. 1 por anuncio cada 12 h) para no usarlo como spam.

### 7d. Directorio: usuarios, casas y sesiones

- **Solo ADMIN** puede llamar `/api/admin/usuarios*`, `/api/admin/casas*` y `/api/admin/bitacora`; el rol sale de la sesión del servidor, nunca del cuerpo ni de la URL.
- **Reglas que valida el servidor:** correo único y válido; residente siempre con una casa activa; nadie puede cambiar su propio rol, suspenderse ni eliminarse; siempre debe quedar al menos un ADMIN activo. Filtrar campos permitidos (sin asignación masiva: el cliente no puede mandar `estado`, `hash` ni fechas).
- **Contraseñas:** hash con Argon2id (o bcrypt) por el servidor; nunca se devuelven ni se registran en logs. La contraseña temporal se genera en el servidor con CSPRNG (≥ 12 caracteres), se devuelve una sola vez, vence en 72 h y obliga a crear una propia (`debeCambiar`): mientras tanto la sesión solo puede llamar `POST /api/auth/password`. Cambiar la propia pide la contraseña actual (excepto justo después de una temporal). Mínimo 10 caracteres, máximo 128, rechazar contraseñas comunes o filtradas.
- **Sesiones:** suspender, restablecer contraseña, cerrar sesiones o cambiar rol/casa/correo **invalida en el servidor** todas las sesiones de esa cuenta (borrar sus sesiones o guardar `sesionesCerradasEn` y rechazar cookies emitidas antes). La app revisa `GET /api/auth/sesion` cada minuto y al volver a la pestaña; un 401 la saca al login.
- **Login de cuenta suspendida:** responder el mensaje de suspensión solo si la contraseña es correcta (si no, el genérico) para no revelar qué cuentas existen.
- **Casas:** la dirección (calle + número) no se edita porque pagos, accesos y anuncios quedan ligados a ella; se desactiva y se crea otra. No se puede desactivar una casa con residentes activos.
- **Bitácora:** cada alta, cambio, suspensión, restablecimiento y cierre de sesiones se guarda con quién, cuándo e IP; es de solo lectura (sin UPDATE/DELETE para la app).
- **Demo:** las cuentas viven en `localStorage` con hash SHA-256 (`olv:<id>:<contraseña>`); sirve para probar el flujo, no es seguridad real.

### 7c. Notificaciones push
- Guardar cada suscripción ligada al usuario y la privada de la sesión; borrarla al cerrar sesión o si el servicio
  push responde 404/410.
- La llave **privada** VAPID solo en el servidor (Key Vault). La pública (`VITE_VAPID_PUBLIC_KEY`) sí puede ir al navegador.
- El aviso solo lleva título, texto y una ruta interna (`/residente`, `/admin/pagos`…); el service worker rechaza
  cualquier URL externa. Evitar datos sensibles en el texto: se ven en la pantalla bloqueada.

### 8. CORS y encabezados
- CORS solo para el dominio de la app (nunca `*` con credenciales).
- Mismos encabezados de seguridad que `vercel.json` en las respuestas de la API.
- `Cache-Control: no-store` en respuestas con datos personales.

### 9. Secretos y registros
- Cadenas de conexión y llaves en **Azure Key Vault** / variables de entorno del servidor, nunca en el repositorio.
- No registrar contraseñas, códigos 2FA ni tokens en los logs.

## Lectura de placas con IA (`/api/placas`)

- Función del servidor de Vercel (`api/placas.ts`). La llave `ANTHROPIC_API_KEY` vive solo en Vercel; nunca en el navegador.
- Solo acepta peticiones del propio dominio (Origin), JSON, JPEG real (bytes mágicos) de máximo ~2 MB, y 30 lecturas por IP cada 10 minutos.
- La respuesta del modelo se valida contra una lista cerrada (tipo, color, confianza) y la placa se limpia a `[A-Z0-9-]`.
- **Pendiente:** cuando exista la API .NET, exigir sesión de guardia y mover esta función allá. Mientras tanto, cualquiera que abra el sitio podría usarla dentro del límite por IP: pon un **límite de gasto** en la consola de Anthropic.

## Variables de entorno del frontend

`VITE_API_URL` y `VITE_VAPID_PUBLIC_KEY` (pública por diseño). **Todo lo que empieza con `VITE_` termina en el JavaScript público**:
nunca pongas ahí llaves, contraseñas ni cadenas de conexión. Ver `.env.example`.

## Pendiente conocido

- Dependencias de desarrollo (Vite 5 / Workbox) con avisos moderados que solo afectan `npm run dev` en la máquina local.
  Se corrigen al migrar a Vite 8.
- Cuando exista la API, agregar su dominio a `connect-src` en la CSP de `vercel.json`.
- **Modo demostración:** los datos de prueba (pases, bitácora, comprobantes como imagen, anuncios) se guardan en el
  `localStorage` del navegador para poder probar entre pestañas. Con `VITE_API_URL` configurada no se guarda nada de eso:
  todo vive en el servidor. No usar el modo demostración con datos reales.
- `/api/placas` sin sesión (ver arriba): poner límite de gasto en Anthropic.
