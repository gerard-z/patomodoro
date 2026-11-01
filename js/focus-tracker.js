/* ==========================================================================
   MINUTOS REALES DE CONCENTRACIÓN
   Recibe cada tick del temporizador y suma al Diario lo que bajó el reloj
   desde el tick anterior. Aguanta pausas, saltos y pestañas en segundo plano.
   Solo cuenta entre dos ticks seguidos con el reloj en marcha: así no suman
   los saltos del reloj al ajustar ±min, ni una fase que arrancó sola.
   ========================================================================== */

export function createFocusTracker(store) {
  let lastTick = null;

  return {
    track(remainingSec, mode, isRunning) {
      if (isRunning && mode === 'work' && lastTick && lastTick.isRunning && lastTick.mode === 'work') {
        store.addFocusSeconds(Math.max(0, lastTick.remainingSec - remainingSec));
      }
      lastTick = { remainingSec, mode, isRunning };
    },

    // Tras un salto del reloj (±min) se empieza a medir de nuevo
    reset() {
      lastTick = null;
    }
  };
}
