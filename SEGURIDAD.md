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

### 7e. Verificación en dos pasos (app autenticadora)

- **Estándar TOTP (RFC 6238)**: SHA-1, 6 dígitos, 30 s. Compatible con Google Authenticator, Contraseñas de iPhone (código de verificación), Microsoft Authenticator, Authy y 1Password.
- **El secreto vive solo en el servidor**: 160 bits de CSPRNG, guardado **cifrado** (AES-GCM con llave en Key Vault/variable de entorno, no en la BD). Solo se muestra al configurarlo (`POST /api/auth/2fa/configurar` devuelve `otpauth://` y el secreto); queda *pendiente* hasta confirmarlo con un código válido (`POST /api/auth/2fa/activar`).
- **Verificación**: ventana de ±1 periodo; guardar el último periodo usado y **rechazar reutilizar** un código; límite de intentos por cuenta e IP (p. ej. 5 fallos → espera exponencial) porque 6 dígitos se pueden adivinar por fuerza bruta.
- **Primer ingreso obligatorio**: una cuenta sin app autenticadora solo puede llamar a configurar/activar 2FA hasta terminar; ninguna otra ruta responde.
- **Cambiar la app desde el perfil** debe pedir antes la contraseña actual o el código vigente (re-autenticación).
- **Celular perdido**: la administración usa *Restablecer verificación en dos pasos* (queda en bitácora y cierra sesiones) **después de confirmar la identidad** en persona o por llamada. Opcional: códigos de recuperación de un solo uso.
- **Demo**: el secreto se guarda en `localStorage` y se verifica en el navegador con Web Crypto; las cuentas de prueba aceptan `123456` hasta configurar una app.

### 7f. Validación de campos

Las reglas viven en `src/shared/validacion.ts` y la API debe aplicar **las mismas** (la del navegador es comodidad, no seguridad):

| Campo | Regla |
|---|---|
| Teléfono | Solo dígitos, exactamente 10 (se quita lada +52/521 al pegar); no empieza en 0 ni repite un dígito |
| Nombre de persona | Letras (acentos, ñ), espacio, punto, apóstrofo y guion; directorio exige nombre y apellido; visitas mínimo 3 letras |
| Empresa | Además admite números y & |
| Correo | Sin espacios, minúsculas, formato `usuario@dominio.tld`, máx. 254 |
| Placas | A–Z, 0–9 y guion; 5 a 8 caracteres combinando letras y números |
| Código de pase | `OLV-XXXX-XX` (se arma solo al escribir) |
| Calle / número de casa | Letras / hasta 5 dígitos + una letra opcional (12B), distinto de 0 |
| Referencia de pago | A–Z sin acentos, 0–9, espacio y guion; máx. 30 |
| Textos libres | Sin caracteres de control ni invisibles (incluye los de dirección bidi), con límite de largo |
| Fecha de pago | No futura y no más de 6 meses atrás |

### 7g. Auditoría desde la perspectiva de un atacante (2026-11-23)

Revisado contra producción (`privada-olivos.vercel.app`) con las herramientas que usaría alguien con experiencia:

| Qué se buscó | Resultado |
|---|---|
| Llaves en el JavaScript (Anthropic, AWS, Google, JWT, GitHub, llaves privadas) | **Ninguna.** Solo existe `VITE_API_URL` (pública por diseño) |
| Source maps (`.js.map`) | No publicados (403) |
| Encabezados | CSP estricta sin `unsafe-inline` en scripts, HSTS con preload, `frame-ancestors 'none'`, nosniff, COOP/CORP, Permissions-Policy |
| XSS | Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `new Function` en el código propio; React escapa todo; imágenes re-codificadas a JPEG en canvas (un SVG con script no sobrevive) |
| Redirecciones abiertas | Ninguna; el service worker solo abre rutas internas |
| Dependencias | `npm audit`: 0 vulnerabilidades |
| `/api/placas` | Ahora valida origen **antes** de revelar si está configurado; rechaza `Sec-Fetch-Site` ajeno; JPEG real, ≤2 MB, 30 lecturas/10 min por IP, `max_tokens` 400 |

**Hallazgos y lo que se hizo**
- **Hashes de las cuentas de prueba en el código**: eran SHA-256 de contraseñas débiles (se adivinaban en segundos con un diccionario). Ahora PBKDF2-SHA256 con 210 000 iteraciones y comparación en tiempo constante. Aun así, en modo demo **todo vive en el navegador**: quien edite su `localStorage` puede darse rol de administrador *en su propio navegador* (no afecta a nadie más porque no hay datos compartidos). La protección real llega con la API.
- **`/api/placas` puede ser llamada por un script que falsifique `Origin`** (los navegadores no lo permiten, `curl` sí). Mientras no exista sesión en el servidor:
  1. En la consola de Anthropic, crea un **workspace solo para esta app** y ponle un **límite de gasto mensual** (p. ej. 5–10 USD); usa una llave de ese workspace.
  2. Cuando exista la API, exigir sesión de guardia y límite por usuario con almacenamiento compartido (Redis/KV), no en memoria.
- **Datos personales en `localStorage` (demo)**: nombres, teléfonos, comprobantes y secretos TOTP de prueba. Aceptable solo para demostración; en producción viven en el servidor y el navegador no guarda nada sensible.

### 7h. Funcionamiento sin internet y sincronización

**Cómo funciona en la app** (`src/shared/red/`):
- El service worker guarda código, estilos, iconos e imágenes: la app abre sin internet.
- Barra "Sin internet" bajo el encabezado; al reconectar avisa y dice cuántos cambios se enviaron.
- **Cola de cambios** (IndexedDB, incluye fotos): entradas, salidas, paquetes entregados, cancelación de pases, comprobantes, respuestas a anuncios y revisión de pagos se guardan si no hay red, se ven de inmediato en pantalla y se envían **en orden** al volver la conexión (evento `online`, al volver a la app y cada 30 s).
- **Copia de consultas** (IndexedDB): la última respuesta de cada consulta se usa sin red, hasta 7 días, solo para la misma persona; se borra al cerrar sesión.
- La caseta descarga los **pases vigentes** y valida QR sin red; un pase de un solo uso registrado sin red ya no se acepta otra vez en ese dispositivo.
- Sin red **no** se puede: crear pases (la caseta debe recibirlo), leer placas con IA (pasa a captura manual), ni acciones del Directorio (contraseñas, suspensiones).

**Entrar sin internet** (`src/features/auth/accesoSinConexion.ts`):
- Solo en un **dispositivo de confianza**: uno donde la persona ya entró con internet pasando contraseña **y** código 2FA. Ahí se guarda una huella PBKDF2-SHA256 (310 000 iteraciones, sal aleatoria de 16 bytes) de la contraseña; **nunca la contraseña ni el secreto TOTP**.
- Sin internet se entra con la contraseña; el segundo factor es el dispositivo (posesión). El código de la app autenticadora no se puede revisar sin servidor y su secreto no se copia al dispositivo.
- Vence a los **7 días** de la última entrada con internet; **5 intentos fallidos lo borran** (además del bloqueo de 30 s de la pantalla de login); se actualiza al cambiar la contraseña; se puede quitar desde *Mi perfil*.
- **No aplica a Administración.**
- La sesión iniciada sin internet no existe en el servidor: al reconectar se pide entrar de nuevo (contraseña + código) y entonces se envía lo pendiente; si la cuenta fue suspendida mientras tanto, el servidor rechaza esos cambios.
- Riesgo aceptado: alguien con el dispositivo desbloqueado y la contraseña puede entrar sin internet hasta 7 días después de una suspensión; no puede enviar nada al servidor sin pasar de nuevo por contraseña + código.
- La copia de datos de caseta (pases vigentes, accesos del día) se conserva entre turnos para que el siguiente guardia pueda validar sin red; solo la lee una sesión de GUARDIA.

**Lo que la API debe cumplir para que sea seguro:**
- **`Idempotency-Key`** en todo POST/PUT/PATCH/DELETE: guardar la clave con su respuesta ≥ 48 h y, si llega repetida, devolver la misma respuesta sin repetir el cambio (si la conexión se corta a mitad del envío, la app reintenta con la misma clave).
- Aceptar el **`id` UUID generado por el cliente** en altas de accesos (para que la salida hecha sin red apunte al registro correcto); rechazar si ya existe con otro dueño.
- Tratar los cambios atrasados con la **hora del servidor** para auditoría y guardar también la hora del dispositivo como dato informativo; resolver conflictos (p. ej. pago ya revisado por otra persona) con **409**: la app lo quita de la cola y avisa qué no se guardó.
- `GET /api/caseta/pases/vigentes`: solo GUARDIA, solo pases de hoy y mañana, mínimo de datos. Una entrada validada sin red se vuelve a validar en el servidor al llegar; si el pase ya no era válido, la entrada se registra marcada para revisión.
- Sesión sin red: la pestaña conserva solo el usuario (sin tokens); al reconectar, el servidor revalida la cookie y un 401 saca a la persona. Los cambios de la cola se envían **solo con la sesión de quien los hizo**.

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
