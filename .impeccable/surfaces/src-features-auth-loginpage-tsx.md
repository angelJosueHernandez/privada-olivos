---
version: 1
slug: "src-features-auth-loginpage-tsx"
primary_target: "src/features/auth/LoginPage.tsx"
related_targets: ["src/shared/ui/AppShell.tsx"]
---

# Login y shell de la app

Modo: Operate. Público: residentes, guardias de caseta y administración, en celular y computadora por igual.
Tarea: entrar rápido y seguro (correo, contraseña, 2FA) y llegar a la pantalla de su rol.
Restricciones: sin logo ni fotos reales; marca de la privada intercambiable; evitar lo genérico de plantilla y lo frío/tecnológico.

## Direction contract

THESIS: La app se siente como un producto de Apple: calma, precisión y una sola acción obvia por pantalla. Rechaza el panel SaaS de tarjetas métricas y el login con manchas de color difuminadas.
OWN-WORLD: Gris claro #F5F5F7 con superficies blancas (negro y #1C1C1E en oscuro); texto #1D1D1F; un solo acento verde olivo por privada, usado solo donde se puede actuar. Fuente del sistema de Apple (Inter como respaldo), títulos grandes con tracking negativo, campos agrupados al estilo Ajustes de iOS, botones en píldora, barra superior translúcida con desenfoque.
STORY: El usuario reconoce su privada, entiende qué correo usar, entra en dos pasos y aterriza en la tarea de su rol con un título grande y una acción clara.
FIRST VIEWPORT: Login centrado de 400px: ícono de app con rama de olivo, título grande, campos correo y contraseña en un solo grupo con etiquetas flotantes, botón píldora «Continuar» a todo lo ancho; debajo, lista agrupada de cuentas demo que llenan el formulario. En la app: barra translúcida fija con marca, rol, iniciales y cerrar sesión; título grande y estado vacío con acción en píldora.
FORM: Lenguaje de diseño de Apple, fijado por el usuario. seed: none (pinned) — «no puedes basarte en el diseño de la página de apple pero orientado a mi proyecto».
Signature: el grupo de campos se sacude ante un error, como en el inicio de sesión de Apple; cada paso entra con un desplazamiento suave.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
