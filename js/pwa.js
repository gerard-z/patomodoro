/* ==========================================================================
   PWA: registro del service worker (sw.js) y recarga al publicar una versión nueva
   El service worker guarda la app para abrirla sin internet (no funciona con file://).
   ========================================================================== */

export function registerServiceWorker({ store, showToast, isTimerRunning }) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('No se pudo registrar el service worker:', err);
  });

  // Al publicar una versión nueva, su service worker toma el control: se recarga una vez para
  // mostrarla ya (si no, el celular seguía con la versión vieja hasta reabrir la app dos veces).
  // Nunca a mitad de un pomodoro: en ese caso se aplica al reabrir.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadingForUpdate) return;
    if (isTimerRunning()) {
      showToast('✨ Hay una versión nueva: se verá al reabrir la app');
      return;
    }
    reloadingForUpdate = true;
    store.flush();
    location.reload();
  });
}
