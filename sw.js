/* ==========================================================================
   SERVICE WORKER DE PATOPOMODORO
   Guarda la app en el dispositivo para que abra sin internet.
   Al publicar cambios, sube CACHE_VERSION: así los celulares descartan la
   copia vieja y descargan la nueva.
   Si añades un archivo a la app (otro .js, .css, imagen…), añádelo también a
   APP_SHELL: si falta, la app no abrirá sin internet.
   ========================================================================== */
const CACHE_VERSION = 'patopomodoro-v5';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tailwind.css',
  './css/app.css',
  './js/main.js',
  './js/config.js',
  './js/lake-renderer.js',
  './js/audio-mixer.js',
  './js/lake-world.js',
  './js/pomodoro-timer.js',
  './js/journal-store.js',
  './js/focus-tracker.js',
  './js/lake-loop.js',
  './js/pwa.js',
  './js/ui/format.js',
  './js/ui/toasts.js',
  './js/ui/timer-panel.js',
  './js/ui/lake-toolbar.js',
  './js/ui/sound-panel.js',
  './js/ui/journal-dialog.js',
  './js/ui/zen-mode.js',
  './cuack.mp3',
  './fonts/fredoka.woff2',
  './fonts/quicksand.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// cache: 'reload' pide cada archivo a la red: sin él, la versión nueva podía guardar copias
// viejas que el navegador tenía en su propia caché HTTP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
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
