/* ==========================================================================
   AVISOS SUAVES (toasts) bajo el reloj
   Se muestran de uno en uno, cada uno ~3,4 s. Hay una cola de hasta 3 avisos
   en espera (cambio de fase, nueva raza, pista del Modo Zen…).
   ========================================================================== */

// Devuelve showToast(mensaje, { urgent }) para un elemento #toast
export function createToaster(toastEl) {
  const toastQueue = [];
  let toastBusy = false;
  let toastTimer = null;
  let currentToast = null;
  let toastShownAt = 0;

  const playNextToast = () => {
    const message = toastQueue.shift();
    if (!message) {
      toastBusy = false;
      currentToast = null;
      return;
    }
    toastBusy = true;
    currentToast = message;
    toastShownAt = performance.now();
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      toastTimer = setTimeout(playNextToast, 450);
    }, 3400);
  };

  // urgent: cambio de fase o respuesta a algo que ella acaba de tocar → se muestra ya,
  // por delante de la cola. Si interrumpe un aviso que apenas se vio, ese vuelve a la cola.
  return function showToast(message, { urgent = false } = {}) {
    if (urgent) {
      clearTimeout(toastTimer);
      if (toastBusy && currentToast && performance.now() - toastShownAt < 1500) {
        toastQueue.unshift(currentToast);
      }
      toastQueue.unshift(message);
      playNextToast();
      return;
    }
    if (toastQueue.length < 3) toastQueue.push(message);
    if (!toastBusy) playNextToast();
  };
}
