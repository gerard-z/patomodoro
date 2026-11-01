/* ==========================================================================
   DIARIO DEL LAGO (modal <dialog>)
   Estadísticas de hoy y de la semana, gráfico de minutos por día y la
   colección de razas (cada retrato se dibuja con el mismo LakeRenderer del lago).
   Se regenera cada vez que se abre, a partir de journal-store.js.
   ========================================================================== */
import { LakeRenderer } from '../lake-renderer.js';
import { formatDuration, formatShortDate } from './format.js';

// Tamaño del retrato de cada raza (px CSS) y escala del pato dentro de él
const PORTRAIT = { width: 72, height: 52, scale: 1.1 };

const drawBreedPortrait = (portraitCanvas) => {
  const dpr = window.devicePixelRatio || 1;
  portraitCanvas.width = PORTRAIT.width * dpr;
  portraitCanvas.height = PORTRAIT.height * dpr;
  const portraitRenderer = new LakeRenderer(portraitCanvas);
  portraitRenderer.ctx.setTransform(dpr * PORTRAIT.scale, 0, 0, dpr * PORTRAIT.scale, 0, 0);
  portraitRenderer.drawDuck({
    x: PORTRAIT.width / 2 / PORTRAIT.scale - 1,
    y: PORTRAIT.height / 2 / PORTRAIT.scale - 1.5,
    z: 0,
    angle: 0,
    isBaby: false,
    breedKey: portraitCanvas.dataset.breed,
    state: 'SWIMMING',
    quackTimer: 0,
    heartTimer: 0,
    seed: 0
  }, 0);
};

// Devuelve { isOpen } para que otros módulos sepan si el Diario está abierto
export function setupJournalDialog({ store }) {
  const journalDialog = document.getElementById('journalDialog');
  const btnJournal = document.getElementById('btnJournal');
  const btnJournalClose = document.getElementById('btnJournalClose');
  const statToday = document.getElementById('statToday');
  const statWeek = document.getElementById('statWeek');
  const statDucklings = document.getElementById('statDucklings');
  const weekBars = document.getElementById('weekBars');
  const weekCaption = document.getElementById('weekCaption');
  const breedGrid = document.getElementById('breedGrid');
  const breedCount = document.getElementById('breedCount');

  let weekDays = [];
  const todayIndex = () => weekDays.findIndex(day => day.isToday);

  const selectWeekDay = (idx) => {
    const day = weekDays[idx];
    if (!day || day.isFuture) return;
    weekBars.querySelectorAll('.week-col').forEach((col, i) => {
      col.classList.toggle('is-selected', i === idx);
    });
    weekCaption.textContent = `${day.isToday ? 'Hoy' : day.name} · ${formatDuration(day.seconds)}`;
  };

  const renderWeek = () => {
    weekDays = store.weekFocus();
    const weekSeconds = weekDays.reduce((sum, day) => sum + day.seconds, 0);
    statWeek.textContent = Math.floor(weekSeconds / 60);

    // Escala mínima de 30 min para que un día corto no llene toda la barra
    const maxSeconds = Math.max(30 * 60, ...weekDays.map(day => day.seconds));
    weekBars.innerHTML = weekDays.map((day, i) => {
      const pct = day.seconds > 0 ? Math.max(4, (day.seconds / maxSeconds) * 100) : 0;
      return `
        <button type="button" class="week-col${day.isToday ? ' is-today' : ''}" data-idx="${i}"
          aria-label="${day.name}: ${formatDuration(day.seconds)}"${day.isFuture ? ' disabled' : ''}>
          <span class="week-bar-area"><span class="week-bar" style="height: ${pct.toFixed(1)}%; --i: ${i}"></span></span>
          <span class="week-day" aria-hidden="true">${day.label}</span>
        </button>`;
    }).join('');
    selectWeekDay(todayIndex());
  };

  // Un solo listener por evento en el contenedor (las barras se regeneran en cada apertura)
  weekBars.addEventListener('click', (e) => {
    const col = e.target.closest('.week-col');
    if (col) selectWeekDay(Number(col.dataset.idx));
  });
  weekBars.addEventListener('pointerover', (e) => {
    const col = e.target.closest('.week-col');
    if (col && e.pointerType === 'mouse') selectWeekDay(Number(col.dataset.idx));
  });
  weekBars.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') selectWeekDay(todayIndex());
  });
  weekBars.addEventListener('focusin', (e) => {
    const col = e.target.closest('.week-col');
    if (col) selectWeekDay(Number(col.dataset.idx));
  });

  const renderBreeds = () => {
    const collection = store.breedCollection();
    const discovered = collection.filter(breed => breed.discovered).length;
    breedCount.textContent = `${discovered}/${collection.length}`;
    breedGrid.innerHTML = collection.map(breed => {
      let meta = 'Aún no ha visitado';
      let since = '';
      if (breed.discovered) {
        meta = breed.visits > 0
          ? `×${breed.visits} ${breed.visits === 1 ? 'visita' : 'visitas'}`
          : 'Residente 🏡';
        since = `<div class="breed-since">desde el ${formatShortDate(breed.firstSeen)}</div>`;
      }
      return `
        <div class="breed-card${breed.discovered ? '' : ' is-locked'}">
          <canvas class="breed-canvas" data-breed="${breed.key}" aria-hidden="true"></canvas>
          <div class="breed-name">${breed.discovered ? breed.name : '???'}</div>
          <div class="breed-meta">${meta}</div>
          ${since}
        </div>`;
    }).join('');
    breedGrid.querySelectorAll('.breed-canvas').forEach(drawBreedPortrait);
  };

  btnJournal.addEventListener('click', () => {
    statToday.textContent = store.todayPomodoros();
    statDucklings.textContent = store.ducklingsRaised();
    renderWeek();
    renderBreeds();
    journalDialog.showModal();
  });
  btnJournalClose.addEventListener('click', () => journalDialog.close());
  journalDialog.addEventListener('click', (e) => {
    if (e.target === journalDialog) journalDialog.close(); // Toque fuera de la tarjeta
  });

  return { isOpen: () => journalDialog.open };
}
