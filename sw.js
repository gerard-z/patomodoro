/* ==========================================================================
   SERVICE WORKER DE PATOPOMODORO
   Guarda la app en el dispositivo para que abra sin internet.
   Al publicar cambios, sube CACHE_VERSION: así los celulares descartan la
   copia vieja y descargan la nueva.
   ========================================================================== */
const CACHE_VERSION = 'patopomodoro-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tailwind.css',
  './fonts/fredoka.woff2',
  './fonts/quicksand.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Borra las cachés de versiones anteriores y toma el control de las pestañas abiertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Responde al instante desde la caché y la actualiza en segundo plano (stale-while-revalidate).
// Sin caché ni red, el navegador muestra su error habitual.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const networkUpdate = caches.open(CACHE_VERSION).then((cache) =>
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
  event.waitUntil(networkUpdate.catch(() => {}));
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || networkUpdate)
  );
});
