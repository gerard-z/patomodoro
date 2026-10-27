/* ==========================================================================
   MODO ZEN: solo el reloj minimalista flotando sobre el lago
   El efecto visual lo hace el CSS con la clase body.zen (css/app.css, Capa 3).
   Entrar/salir: botón 👁️, doble toque en una esquina, tecla Z; salir también con ✕ o Esc.
   ========================================================================== */

export function setupZenMode({ showToast, isJournalOpen }) {
  const btnZen = document.getElementById('btnZen');
  const zenExitBtn = document.getElementById('zenExitBtn');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  let zenHintShown = false;

  const isZen = () => document.body.classList.contains('zen');

  const setZen = (enabled) => {
    if (isZen() === enabled) return;
    document.body.classList.toggle('zen', enabled);
    btnZen.setAttribute('aria-pressed', String(enabled));

    if (enabled) {
      zenExitBtn.focus({ preventScroll: true });
      // En el celular, pantalla completa para que solo se vea el lago
      if (isTouchDevice && document.fullscreenEnabled && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (!zenHintShown) {
        zenHintShown = true;
        showToast('👁️ Modo Zen · doble toque en una esquina para volver', { urgent: true });
      }
    } else {
      btnZen.focus({ preventScroll: true });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  btnZen.addEventListener('click', () => setZen(true));
  zenExitBtn.addEventListener('click', () => setZen(false));

  // Doble toque suave en cualquier esquina para entrar o salir del Modo Zen
  let lastCornerTap = { corner: null, time: 0 };
  const getCorner = (x, y) => {
    const zone = Math.min(90, window.innerWidth * 0.18);
    const horizontal = x < zone ? 'l' : (x > window.innerWidth - zone ? 'r' : null);
    const vertical = y < zone ? 't' : (y > window.innerHeight - zone ? 'b' : null);
    return horizontal && vertical ? vertical + horizontal : null; // 'tl', 'tr', 'bl', 'br' o null
  };

  // capture: lo ve antes que el lago; no llama a preventDefault, así el lago también recibe el toque
  window.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest('button, input, select, label, dialog')) return;
    const corner = getCorner(e.clientX, e.clientY);
    const now = performance.now();
    if (corner && corner === lastCornerTap.corner && now - lastCornerTap.time < 380) {
      lastCornerTap = { corner: null, time: 0 };
      setZen(!isZen());
    } else {
      lastCornerTap = { corner, time: now };
    }
  }, { capture: true });

  window.addEventListener('keydown', (e) => {
    if (isJournalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
    if (e.key === 'z' || e.key === 'Z') {
      setZen(!isZen());
    } else if (e.key === 'Escape') {
      setZen(false);
    }
  });
}
