---
name: Mi Privada
description: Acceso de visitas, caseta y pagos de cuota, con el lenguaje de diseño de Apple.
colors:
  acento-olivo: "#267048"
  acento-texto: "#FFFFFF"
  fondo-gris: "#F5F5F7"
  panel: "#FFFFFF"
  borde: "#D2D2D7"
  separador: "#E5E5EA"
  texto: "#1D1D1F"
  suave: "#6A6A70"
  ok: "#248A3D"
  alerta: "#B25000"
  peligro: "#D70015"
typography:
  titulo-grande:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  titulo-seccion:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  cuerpo:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  nota:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
rounded:
  campo: "16px"
  icono: "20px"
  tarjeta: "28px"
  pildora: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.acento-olivo}"
    textColor: "{colors.acento-texto}"
    typography: "{typography.cuerpo}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "rgba(29, 29, 31, 0.06)"
    textColor: "{colors.texto}"
    rounded: "{rounded.pildora}"
    height: "48px"
  field-group:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.campo}"
    height: "58px"
  empty-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.tarjeta}"
    padding: "56px 24px"
---

# Design System: Mi Privada

## Overview

Mi Privada usa el lenguaje de diseño de Apple, aplicado a la operación diaria de una privada residencial: calma, precisión y una sola acción obvia por pantalla. Gris claro de fondo, superficies blancas, títulos grandes con tracking negativo y un único color de acción, el de cada privada (verde olivo para Los Olivos). Siempre en modo claro: el fondo del login es blanco.

No debe sentirse como plantilla genérica ni como panel técnico frío. La marca de cada privada vive en un solo token (`--acento`) y en su ícono; la estructura es la misma para todas.

## Colors

Estrategia restringida: neutros de Apple y un acento que solo aparece donde se puede actuar.

### Primary
- **Acento olivo** (`#267048`): botones principales, enlaces, foco, cursor de texto y el ícono de la app. Se define en `--acento` y `--acento-texto` en `src/index.css`; cambiarlos rebrandea la app completa.

### Neutral
- **Fondo gris** `#F5F5F7`: fondo de las pantallas internas y del panel izquierdo del login.
- **Panel** `#FFFFFF`: fondo del login, campos agrupados y tarjetas.
- **Texto** `#1D1D1F`; **suave** `#6A6A70` (contraste 4.9:1 sobre el fondo) para texto de apoyo.
- **Borde** `#D2D2D7` y **separador** `#E5E5EA`: líneas de 1px entre filas agrupadas.

### Named Rules
- **La regla de un acento:** el verde solo marca lo que se puede tocar. Nunca como decoración ni como fondo de sección.
- Los estados (ok, alerta, peligro) solo aparecen donde tienen significado.

## Typography

Fuente del sistema de Apple (SF Pro en dispositivos Apple); Inter Variable como respaldo en Windows y Android. Todos los tamaños en `rem` para respetar el tamaño de letra del usuario.

### Hierarchy
Escala usada en rem: 0.8125 · 0.875 · 0.9375 · 1 · 1.0625 · 1.25 · 1.75 · 2.125/2.5 (título) · 2.75 (titular del panel de computadora).

- **Título grande** (2.125rem, 2.5rem desde `sm`, 700, tracking -0.025em): uno por pantalla, arriba a la izquierda (centrado en el login).
- **Título de sección** (1.375rem, 600): títulos de estados vacíos.
- **Cuerpo** (1.0625rem / 17px, como el cuerpo de iOS): textos, campos y botones.
- **Nota** (0.9375rem): enlaces secundarios y casillas.

## Layout

Ancho máximo de 64rem (`max-w-5xl`) con márgenes laterales de 20px. El login es una columna centrada de 400px. Se respetan las áreas seguras del celular (`env(safe-area-inset-*)`). Más espacio arriba de un título que debajo.

## Elevation & Depth

Profundidad sutil, al estilo Apple:
- **Tarjeta**: `0 1px 2px rgb(0 0 0 / .04), 0 8px 24px -12px rgb(0 0 0 / .12)`.
- **Material**: la barra superior es translúcida (`saturate(180%) blur(20px)`) y el contenido pasa por debajo; se vuelve sólida con "reducir transparencia".

## Shapes

Esquinas generosas y continuas: campos 16px, íconos 20px, tarjetas 28px, botones en píldora.

## Components

### Buttons
- **Primario:** píldora de 48px, acento con texto blanco, 17px semibold. Se encoge a 0.97 al presionar (160ms, ease-out fuerte).
- **Secundario:** píldora gris translúcida para acciones de menor peso (Cerrar sesión, Usar otra cuenta). En el celular, Cerrar sesión se reduce a un ícono de 44px.

### Inputs / Fields
- **Campos separados con ícono, estilo relleno de iOS:** fondo gris `#F5F5F7` sin borde, 56px de alto y esquinas de 14px; al enfocarlo se vuelve blanco con borde de acento de 1.5px (sin halo ni animación, porque el foco suele llegar con el teclado). Ícono a la izquierda que se vuelve verde, etiqueta flotante que sube al 80% de su tamaño. Solo el campo con el problema se marca en rojo.
- **Casilla:** propia, de 22px con esquinas de 7px; verde con palomita al marcarla.
- **Código 2FA:** un campo grande con cifras tabulares y espaciado amplio.

### Cards / Containers
- **Estado vacío:** tarjeta de 28px con un ícono en cuadro tintado de acento, título, texto de apoyo y la acción principal en píldora.

### Navigation
- **Barra superior translúcida** fija: ícono de app, nombre de la privada, rol y casa, iniciales del usuario y Cerrar sesión.

### Signature: el login de Apple
Diseñado primero para celular y tableta, siempre sobre fondo blanco y sin fotografías:
- **Celular:** ícono y "Mi Privada" arriba, "Inicia sesión", los dos campos separados con ícono, "Continuar", la nota de cuenta protegida, cómo pedir acceso y, debajo de una línea, las tres funciones de la app.
- **Tableta:** la misma columna más ancha (560px) y las funciones en tres columnas.
- **Computadora:** pantalla dividida; a la izquierda un panel gris con "Tu privada, más simple." y las funciones; a la derecha el formulario.

Si los datos son incorrectos, los campos se sacuden (300ms) y el error aparece debajo con `role="alert"`.

## Do's and Don'ts

### Do:
- Usar el acento solo en lo accionable: botón, enlaces, foco y casilla marcada. Íconos informativos en gris neutro.
- Notas de apoyo como texto discreto, sin cajas.
- Un título grande por pantalla y una acción principal clara.
- Responder al presionar (`:active`), no solo al soltar.
- Tamaños de texto en `rem`, animaciones de `transform` y `opacity` por debajo de 300ms.
- Ofrecer una alternativa con "reducir movimiento" (fundido) y con "reducir transparencia" (superficie sólida).

### Don't:
- Gradientes de texto, manchas de color difuminadas ni tarjetas métricas genéricas.
- Desactivar el botón principal hasta que los campos estén llenos (rompe el autocompletado); validar al enviar.
- Volver a montar campos para reiniciar animaciones (se pierde el foco).
- Mostrar credenciales de prueba en la interfaz.
