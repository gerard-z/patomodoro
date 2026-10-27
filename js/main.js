/* ==========================================================================
   PUNTO DE ENTRADA (orquestador) — empieza a leer por aquí
   Crea cada módulo y los conecta; es el único archivo que los conoce a todos.

   Flujo de la app:
   - El temporizador avisa cada 250 ms (onTimerTick) y al terminar cada fase
     (onPhaseChange). Aquí se decide qué pasa en el lago y qué se guarda.
   - El lago se anima en su propio bucle (lake-loop.js).
   - Cada panel de la interfaz (ui/*.js) conecta sus propios botones.
   ========================================================================== */
import { DUCK_BREEDS } from './config.js';
import { LakeRenderer } from './lake-renderer.js';
import { RelaxingAudioMixer } from './audio-mixer.js';
import { LakeWorld } from './lake-world.js';
import { DriftFreePomodoro } from './pomodoro-timer.js';
import { LakeJournalStore } from './journal-store.js';
import { createFocusTracker } from './focus-tracker.js';
import { startLakeLoop } from './lake-loop.js';
import { registerServiceWorker } from './pwa.js';
import { createToaster } from './ui/toasts.js';
import { setupTimerPanel } from './ui/timer-panel.js';
import { setupLakeToolbar } from './ui/lake-toolbar.js';
import { setupSoundPanel } from './ui/sound-panel.js';
import { setupJournalDialog } from './ui/journal-dialog.js';
import { setupZenMode } from './ui/zen-mode.js';

// 1. Configuración y estadísticas guardadas, y avisos en pantalla
const store = new LakeJournalStore();
const settings = store.settings;
const showToast = createToaster(document.getElementById('toast'));

// 2. El lago: dibujo, sonido y física
const canvas = document.getElementById('lakeCanvas');
const duckCountBadge = document.getElementById('duckCountBadge');
const renderer = new LakeRenderer(canvas, settings.theme);
const audio = new RelaxingAudioMixer();
//audio.loadRealQuackSample('./cuack.mp3');
const world = new LakeWorld(
  canvas,
  renderer,
  audio,
  (newCount) => {
    duckCountBadge.textContent = newCount;
  },
  () => Object.keys(store.data.stats.breeds)
);

// Las 4 razas residentes iniciales quedan visibles en el Diario como "Residente 🏡" (0 visitas)
for (const duck of world.ducks) {
  store.registerBreed(duck.breedKey, false);
}

// 3. El temporizador y su panel
const focusTracker = createFocusTracker(store);
const pomodoro = new DriftFreePomodoro(onTimerTick, onPhaseChange);
const timerPanel = setupTimerPanel({ pomodoro, store, audio, showToast, focusTracker });
store.onExternalChange = timerPanel.refreshTodayBadge; // otra pestaña completó un pomodoro

// Cada 250 ms: contar minutos de foco, dormir o despertar a los patos y pintar el reloj
function onTimerTick(remainingSec, mode, isRunning) {
  focusTracker.track(remainingSec, mode, isRunning);
  world.isBreakMode = (mode === 'break');
  timerPanel.render(remainingSec, mode, isRunning);
}

// Registrar únicamente un patito nacido por completar un Pomodoro natural
function registerPomodoroDuck(duck) {
  if (!duck) return;
  const isNewBreed = store.registerBreed(duck.breedKey, true);
  if (isNewBreed) {
    showToast(`✨ ¡Nueva raza en tu lago: ${DUCK_BREEDS[duck.breedKey].name}!`);
  }
}

// Al terminar una fase: campana, aviso, estadísticas y lo que pasa en el lago.
// natural = el reloj llegó a 00:00 solo (no se saltó con ⏭)
function onPhaseChange(finishedMode, nextMode, _cycles, natural = false) {
  world.isBreakMode = (nextMode === 'break');
  audio.triggerCycleChime(nextMode === 'break');

  // Solo cuenta como pomodoro (y descubre nueva raza) si llegó a 00:00 naturalmente
  const finishedNaturally = finishedMode === 'work' && natural;
  if (finishedNaturally) {
    const todayCount = store.recordCompletedPomodoro();
    showToast(`🎉 ¡Buen trabajo! Hora de descansar · ${todayCount} hoy · +1 patito`, { urgent: true });
  } else {
    showToast(nextMode === 'break' ? '🌙 Hora de descansar' : '☀️ De vuelta a concentrarse', { urgent: true });
  }

  if (finishedMode === 'work') {
    // Al pasar a Descanso: solo nace un patito bebé (y si fue natural, puede descubrir raza)
    const baby = world.spawnBabyDuckling({ allowUndiscovered: finishedNaturally });
    if (finishedNaturally) {
      registerPomodoroDuck(baby);
    }
  } else {
    // Al volver a Concentración: los patos despiertan y uno llega o sale volando
    world.triggerFlightShowcase();
    setTimeout(() => world.triggerRandomDuckQuack(), 450);
  }
}

// 4. Paneles de la interfaz
setupLakeToolbar({ world, audio, renderer, store, showToast });
setupSoundPanel({ world, audio, store, showToast });
const journal = setupJournalDialog({ store });
setupZenMode({ showToast, isJournalOpen: journal.isOpen });

pomodoro.reset(); // Primer pintado del reloj, con la duración guardada

// 5. Guardar lo pendiente al ocultar o cerrar la app
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});
window.addEventListener('pagehide', () => store.flush());

// 6. PWA y animación del lago
registerServiceWorker({ store, showToast, isTimerRunning: () => pomodoro.isRunning });
startLakeLoop(world, store);
