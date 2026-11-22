/*
  Avisos en el service worker (se carga dentro del sw.js que genera vite-plugin-pwa).
  - push: el servidor manda { titulo, cuerpo, url, etiqueta } y se muestra aunque la app esté cerrada.
  - notificationclick: al tocar el aviso se abre (o enfoca) la app en la pantalla indicada.
*/
self.addEventListener('push', (evento) => {
  let datos = {}
  try { datos = evento.data ? evento.data.json() : {} } catch (e) { datos = { cuerpo: evento.data && evento.data.text() } }
  const titulo = typeof datos.titulo === 'string' ? datos.titulo.slice(0, 120) : 'Mi Privada'
  // Solo rutas internas: nunca abrir un sitio externo desde un aviso
  const url = typeof datos.url === 'string' && /^\/[a-z]/.test(datos.url) ? datos.url : '/'
  evento.waitUntil(self.registration.showNotification(titulo, {
    body: typeof datos.cuerpo === 'string' ? datos.cuerpo.slice(0, 300) : undefined,
    tag: typeof datos.etiqueta === 'string' ? datos.etiqueta : undefined,
    icon: '/icono-192.png',
    badge: '/icono-192.png',
    data: { url },
    lang: 'es-MX',
  }))
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = (evento.notification.data && evento.notification.data.url) || '/'
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const v of ventanas) {
      if (new URL(v.url).origin === self.location.origin) { await v.focus(); return }
    }
    await self.clients.openWindow(url)
  })())
})
