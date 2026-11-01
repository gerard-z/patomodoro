/* ==========================================================================
   FORMATOS DE TEXTO compartidos por la interfaz
   ========================================================================== */

// 1499 → "24:59"
export const formatTime = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// 5700 → "1 h 35 min", 2700 → "45 min"
export const formatDuration = (seconds) => {
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

// "2026-10-19" → "19 oct" (fecha local, sin pasar por UTC)
export const formatShortDate = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
};
