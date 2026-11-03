/* Service worker: permite abrir la app sin conexión.
 * - Páginas (HTML): red primero (siempre la versión más nueva) y, si no hay red, la última copia guardada.
 * - /_astro/ (archivos con hash en el nombre, no cambian): caché primero.
 * - Resto del mismo origen (iconos, etc.): caché con revalidación en segundo plano.
 * Lo que va a otros sitios (Firebase, Google) no se toca: Firestore tiene su propia caché offline. */
const CACHE = 'brigido-v1';
const MAX_ASSETS = 120; // tope de archivos con hash guardados, para que no crezca con cada despliegue
const ESPERA_RED_MS = 4000; // con red lenta se usa la copia guardada en vez de esperar

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Navegaciones, peticiones que piden HTML y direcciones de página (terminan en «/» o «.html»): p. ej. la comprobación de actualizaciones. */
const esPagina = (peticion) =>
  peticion.mode === 'navigate' ||
  (peticion.headers.get('accept') || '').includes('text/html') ||
  /\/$|\.html$/.test(new URL(peticion.url).pathname);

async function recortar(cache) {
  const claves = await cache.keys();
  const assets = claves.filter((c) => c.url.includes('/_astro/'));
  for (const clave of assets.slice(0, Math.max(0, assets.length - MAX_ASSETS))) await cache.delete(clave);
}

async function paginaRedPrimero(peticion) {
  const cache = await caches.open(CACHE);
  const red = fetch(peticion).then((respuesta) => {
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  });
  try {
    const limite = new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('lenta')), ESPERA_RED_MS));
    return await Promise.race([red, limite]);
  } catch {
    const guardada = (await cache.match(peticion, { ignoreSearch: true })) || (await cache.match(self.registration.scope));
    if (guardada) return guardada;
    return red; // sin copia guardada no hay alternativa: se espera a la red (o falla)
  }
}

async function cachePrimero(peticion) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok) {
    await cache.put(peticion, respuesta.clone());
    await recortar(cache);
  }
  return respuesta;
}

async function revalidar(peticion) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion);
  const red = fetch(peticion)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(peticion, respuesta.clone());
      return respuesta;
    })
    .catch(() => guardada);
  return guardada || red;
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (esPagina(peticion)) evento.respondWith(paginaRedPrimero(peticion));
  else if (url.pathname.includes('/_astro/')) evento.respondWith(cachePrimero(peticion));
  else evento.respondWith(revalidar(peticion));
});
