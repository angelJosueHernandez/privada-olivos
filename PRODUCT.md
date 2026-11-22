# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Residentes:** crean códigos QR para que sus visitas pasen por la caseta y suben comprobantes de pago de cuotas.
- **Guardias de caseta:** escanean el código QR de la visita para validar su acceso.
- **Administración de la privada:** revisa y aprueba o rechaza los comprobantes de pago de los residentes.

Se usa por igual en celular y en computadora (PWA instalable).

## Product Purpose

Gestionar el acceso y la administración de una privada residencial: visitas con QR, validación en caseta y control de pagos de cuotas. Éxito: la visita pasa rápido y con seguridad, y la administración sabe quién está al corriente.

## Positioning

Producto ("Mi Privada") pensado para varias privadas; Los Olivos es la primera. El nombre de la privada aparece como marca del cliente dentro de la app.

## Operating Context

- Tres roles con su propia pantalla de inicio: `/residente`, `/guardia`, `/admin`.
- Inicio de sesión con correo y contraseña, más un código de 6 dígitos de app de autenticación (2FA).
- La sesión vive solo en memoria; la seguridad real la aplica la API (.NET, pendiente).

## Capabilities and Constraints

- Stack existente: React 18 + Vite + Tailwind 3 + react-router, PWA con vite-plugin-pwa, despliegue en Vercel.
- Hoy el servicio de autenticación usa usuarios de demostración.
- Pendiente: iconos de la PWA (192 y 512), la API real, las funciones de QR, escaneo y pagos (las pantallas tienen estados vacíos).
- Idioma: español (México).

## Brand Commitments

- Nombre de la privada del cliente: "Los Olivos". Nombre del producto: "Mi Privada".
- Al ser multi-privada, la identidad de cada privada (nombre, posiblemente color) debe poder cambiar sin rediseñar.
- Preferencia del cliente (fijada el 2026-11-22): lenguaje de diseño inspirado en Apple, orientado a este proyecto. No debe sentirse genérico de plantilla ni frío/tecnológico.

## Evidence on Hand

- No hay logo, fotografías ni testimonios. No inventarlos.
- Datos de demostración en `src/features/auth/authService.ts`.

## Product Principles

1. La tarea de cada rol primero: crear un QR, escanear, aprobar un pago, en el menor número de pasos.
2. Confianza y seguridad visibles sin fricción innecesaria.
3. Funciona igual de bien en un celular a la mano que en una computadora de escritorio.
4. La marca de cada privada se adapta; la estructura del producto es la misma.
