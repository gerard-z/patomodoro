/* ==========================================================================
   BUCLE DE ANIMACIÓN DEL LAGO
   En cada fotograma: world.update (física) y world.render (dibujo).
   Limitado a store.settings.fps (30 por defecto, para cuidar la batería).
   requestAnimationFrame se pausa solo cuando la app está en segundo plano.
   ========================================================================== */

export function startLakeLoop(world, store) {
  let lastTime = performance.now();
  let loopErrorLogged = false;

  const loop = (now) => {
    requestAnimationFrame(loop); // Se programa primero: un error en el fotograma no detiene el lago

    // Margen de 2 ms: los fotogramas de la pantalla no llegan con precisión exacta
    if (now - lastTime < 1000 / store.settings.fps - 2) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const timeSec = now / 1000;

    try {
      world.update(dt, timeSec);
      world.render(timeSec);
    } catch (err) {
      if (!loopErrorLogged) {
        loopErrorLogged = true;
        console.error('Error en el bucle del lago (se sigue animando):', err);
      }
    }
  };
  requestAnimationFrame(loop);
}
