/* ==========================================================================
   PANEL DEL RELOJ
   - render(): pinta el estado del temporizador en pantalla (reloj, botón
     Iniciar/Pausar, barra de progreso, modo, encabezado y título de la pestaña).
   - Conecta los botones de la tarjeta: Iniciar/Pausar, ⏭, ↺, Concentración/
     Descanso, ±min y el interruptor de ciclo automático.
   No decide qué pasa al terminar una fase: eso lo hace main.js.
   ========================================================================== */
import { formatTime } from './format.js';

const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.5"/><rect x="13.5" y="5" width="4" height="14" rx="1.5"/></svg>'
};
const MODE_LABELS = { work: '🌱 Concentración', break: '💤 Descanso' };

export function setupTimerPanel({ pomodoro, store, audio, showToast, focusTracker }) {
  const settings = store.settings;
  const timerDisplay = document.getElementById('timerDisplay');
  const phaseProgress = document.getElementById('phaseProgress');
  const durationLabel = document.getElementById('durationLabel');
  const zenModeLabel = document.getElementById('zenModeLabel');
  const btnStartPause = document.getElementById('btnStartPause');
  const startPauseIcon = document.getElementById('startPauseIcon');
  const startPauseText = document.getElementById('startPauseText');
  const btnSkipPhase = document.getElementById('btnSkipPhase');
  const btnReset = document.getElementById('btnReset');
  const btnModeWork = document.getElementById('btnModeWork');
  const btnModeBreak = document.getElementById('btnModeBreak');
  const toggleAutoCycle = document.getElementById('toggleAutoCycle');
  const autoBadge = document.getElementById('autoBadge');
  const cycleCounterBadge = document.getElementById('cycleCounterBadge');
  const modeEmoji = document.getElementById('modeEmoji');
  const statusSubtitle = document.getElementById('statusSubtitle');

  const popTimerDigits = () => {
    timerDisplay.classList.remove('is-popping');
    void timerDisplay.offsetWidth; // Reinicia la animación
    timerDisplay.classList.add('is-popping');
  };

  const refreshDurationLabel = () => {
    durationLabel.textContent = Math.round(pomodoro.durations[pomodoro.mode] / 60);
  };

  // Insignia del encabezado: los mismos pomodoros completos de hoy que muestra el Diario
  const refreshTodayBadge = () => {
    cycleCounterBadge.textContent = `🍅 ${store.todayPomodoros()} hoy`;
  };

  const refreshAutoBadge = () => {
    const enabled = toggleAutoCycle.checked;
    autoBadge.dataset.state = enabled ? 'on' : 'off';
    autoBadge.innerHTML = enabled ? '<span>🔄</span> Auto-ciclo activo' : '<span>⏸</span> Cambio manual';
  };

  const render = (remainingSec, mode, isRunning) => {
    timerDisplay.textContent = formatTime(remainingSec);
    const iconKey = isRunning ? 'pause' : 'play';
    if (startPauseIcon.dataset.icon !== iconKey) {
      startPauseIcon.dataset.icon = iconKey;
      startPauseIcon.innerHTML = ICONS[iconKey];
    }
    startPauseText.textContent = isRunning ? 'Pausar' : 'Iniciar';
    refreshTodayBadge();

    // Cambiar data-mode dispara las transiciones CSS crema ↔ lavanda
    if (document.body.dataset.mode !== mode) {
      document.body.dataset.mode = mode;
      popTimerDigits();
    }
    document.body.dataset.running = String(isRunning);
    btnModeWork.setAttribute('aria-pressed', String(mode === 'work'));
    btnModeBreak.setAttribute('aria-pressed', String(mode === 'break'));
    zenModeLabel.textContent = MODE_LABELS[mode];
    refreshDurationLabel();

    const phaseEndHint = pomodoro.autoTransition
      ? (mode === 'work' ? 'Pasa sola a Descanso al terminar' : 'Volverá sola a Concentración')
      : 'Sonará la campana al terminar';
    if (mode === 'work') {
      modeEmoji.textContent = '🦆';
      statusSubtitle.textContent = isRunning
        ? `Concentración activa · ${phaseEndHint}`
        : 'Toca el agua para dar miguitas o a un pato para oír su ¡Cuack!';
    } else {
      modeEmoji.textContent = '💤';
      statusSubtitle.textContent = isRunning
        ? `Descanso en curso · ${phaseEndHint}`
        : 'Tiempo de descanso · Los patitos duermen en el lago';
    }

    const totalSec = pomodoro.durations[mode];
    const progress = Math.min(1, Math.max(0, 1 - remainingSec / totalSec));
    phaseProgress.style.transform = `scaleX(${progress})`;

    document.title = isRunning
      ? `${formatTime(remainingSec)} · ${mode === 'work' ? '🌱' : '💤'} PatoPomodoro`
      : 'PatoPomodoro';
  };

  // Restaurar la configuración favorita guardada (el primer pintado lo hace main.js con reset())
  pomodoro.durations.work = settings.workMin * 60;
  pomodoro.durations.break = settings.breakMin * 60;
  toggleAutoCycle.checked = settings.autoCycle;
  pomodoro.setAutoTransition(settings.autoCycle);
  refreshAutoBadge();

  // Volvió después de que también terminara la fase siguiente: el reloj espera en pausa
  pomodoro.onCatchUpPause = () => {
    showToast('👋 ¡Hola de nuevo! Pulsa Iniciar cuando quieras');
  };

  // Eventos de Botones del Reloj
  btnStartPause.addEventListener('click', () => {
    audio.initIfNeeded();
    if (pomodoro.isRunning) {
      pomodoro.pause();
    } else {
      pomodoro.start();
    }
  });

  // Botón para saltar de fase inmediatamente y ver la transición automática
  btnSkipPhase.addEventListener('click', () => {
    audio.initIfNeeded();
    pomodoro.completeCurrentPhase();
  });

  btnReset.addEventListener('click', () => pomodoro.reset());
  btnModeWork.addEventListener('click', () => pomodoro.setMode('work', false));
  btnModeBreak.addEventListener('click', () => pomodoro.setMode('break', false));

  toggleAutoCycle.addEventListener('change', (e) => {
    pomodoro.setAutoTransition(e.target.checked);
    refreshAutoBadge();
    store.updateSettings({ autoCycle: e.target.checked });
  });

  document.querySelectorAll('.time-adj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.getAttribute('data-adjust'), 10);
      focusTracker.reset(); // el salto del reloj no debe contarse como minutos de foco
      pomodoro.adjustMinutes(delta);
      refreshDurationLabel();
      store.updateSettings({
        workMin: Math.round(pomodoro.durations.work / 60),
        breakMin: Math.round(pomodoro.durations.break / 60)
      });
      if (pomodoro.isRunning) {
        const sign = delta > 0 ? '+' : '−';
        showToast(`⏱ ${sign}${Math.abs(delta)} min · quedan ${formatTime(pomodoro.remainingSec)}`, { urgent: true });
      }
    });
  });

  return { render, refreshTodayBadge };
}
