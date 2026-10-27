/* ==========================================================================
   MÓDULO 4: TEMPORIZADOR POMODORO SIN DERIVA CON AUTO-TRANSICIÓN
   Pasa automáticamente de Concentración a Descanso y viceversa sin detenerse.
   ========================================================================== */

export class DriftFreePomodoro {
  constructor(onTick, onPhaseChange) {
    this.durations = { work: 25 * 60, break: 5 * 60 };
    this.mode = 'work'; // 'work' | 'break'
    this.remainingSec = this.durations.work;
    this.isRunning = false;
    this.autoTransition = true;
    this.completedWorkCycles = 0;
    this.targetTimestamp = null;
    this.intervalId = null;
    this.wakeLock = null;
    this.wakeLockRequestId = 0;

    this.onTick = onTick;
    this.onPhaseChange = onPhaseChange;
    this.onCatchUpPause = null; // aviso opcional: la fase siguiente también pasó mientras no estaba

    // El navegador suelta el Wake Lock al ocultar la página: al volver, se pide de nuevo
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isRunning) {
        this.requestWakeLock();
      }
    });
  }

  setAutoTransition(enabled) {
    this.autoTransition = enabled;
  }

  setMode(newMode, autoStart = false) {
    this.pause();
    this.mode = newMode;
    this.remainingSec = this.durations[newMode];
    this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);
    if (autoStart) {
      this.start();
    }
  }

  // Cambia la duración favorita del modo actual. Si el reloj corre, también la fase en curso
  // (sin dejar nunca menos de 1 minuto, ni alargar una fase a la que le queda menos).
  adjustMinutes(deltaMinutes) {
    const currentMins = Math.round(this.durations[this.mode] / 60);
    const nextMins = Math.min(120, Math.max(1, currentMins + deltaMinutes));
    this.durations[this.mode] = nextMins * 60;
    if (this.isRunning) {
      const appliedMs = (nextMins - currentMins) * 60 * 1000;
      const floor = Math.min(this.targetTimestamp, Date.now() + 60 * 1000);
      this.targetTimestamp = Math.max(this.targetTimestamp + appliedMs, floor);
      this.remainingSec = Math.max(0, Math.ceil((this.targetTimestamp - Date.now()) / 1000));
    } else {
      this.remainingSec = this.durations[this.mode];
    }
    this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);
  }

  async requestWakeLock() {
    if (!('wakeLock' in navigator) || this.wakeLock) return;
    const requestId = ++this.wakeLockRequestId;
    try {
      const lock = await navigator.wakeLock.request('screen');
      // Si mientras tanto se pausó (o hubo otro pedido), este candado ya no hace falta
      if (!this.isRunning || requestId !== this.wakeLockRequestId) {
        lock.release().catch(() => {});
        return;
      }
      lock.addEventListener('release', () => {
        if (this.wakeLock === lock) this.wakeLock = null;
      });
      this.wakeLock = lock;
    } catch (_) {}
  }

  releaseWakeLock() {
    this.wakeLockRequestId += 1; // invalida cualquier pedido que siga en curso
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  // natural = la fase llegó a 0 sola (no con ⏭). Entonces la siguiente cuenta desde el momento
  // exacto en que terminó, aunque la app estuviera en segundo plano o el celular bloqueado.
  completeCurrentPhase(natural = false) {
    const finishedMode = this.mode;
    const phaseEndedAt = natural && this.targetTimestamp ? this.targetTimestamp : Date.now();
    if (finishedMode === 'work') {
      this.completedWorkCycles += 1;
    }
    const nextMode = finishedMode === 'work' ? 'break' : 'work';

    if (this.onPhaseChange) {
      this.onPhaseChange(finishedMode, nextMode, this.completedWorkCycles, natural);
    }

    if (!this.autoTransition) {
      this.setMode(nextMode, false);
      return;
    }

    const nextTarget = phaseEndedAt + this.durations[nextMode] * 1000;
    if (nextTarget > Date.now()) {
      this.setMode(nextMode, false);
      this.start(nextTarget);
    } else {
      // La fase siguiente también pasó mientras no estaba: espera en pausa al inicio de
      // la próxima Concentración, sin sumar pomodoros que no hizo
      this.setMode('work', false);
      if (this.onCatchUpPause) this.onCatchUpPause();
    }
  }

  // targetTimestamp opcional: para que la fase termine a una hora ya calculada
  start(targetTimestamp = null) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.targetTimestamp = targetTimestamp ?? Date.now() + this.remainingSec * 1000;
    this.remainingSec = Math.max(0, Math.ceil((this.targetTimestamp - Date.now()) / 1000));
    this.requestWakeLock();

    this.intervalId = setInterval(() => {
      const diffMs = this.targetTimestamp - Date.now();
      this.remainingSec = Math.max(0, Math.ceil(diffMs / 1000));
      this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);

      if (this.remainingSec <= 0) {
        this.completeCurrentPhase(true);
      }
    }, 250);

    this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.releaseWakeLock();
    this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);
  }

  reset() {
    this.pause();
    this.remainingSec = this.durations[this.mode];
    this.onTick(this.remainingSec, this.mode, this.isRunning, this.completedWorkCycles);
  }
}
