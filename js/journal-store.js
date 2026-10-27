/* ==========================================================================
   MÓDULO 5: PERSISTENCIA Y DIARIO DEL LAGO (localStorage)
   Recuerda la configuración favorita y las estadísticas cozy: pomodoros de
   hoy, minutos de concentración, patitos criados y razas coleccionadas.
   Si localStorage no está disponible (modo privado), todo sigue en memoria.
   Con la app abierta en dos sitios, las estadísticas se suman (no se pisan).
   ========================================================================== */
import { VISUAL_THEMES, DUCK_BREEDS, DUCK_BREED_KEYS } from './config.js';

export class LakeJournalStore {
  constructor(storageKey = 'patopomodoro:v1') {
    this.storageKey = storageKey;
    this.saveTimer = null;
    this.saveDueAt = 0;
    this.pending = LakeJournalStore.emptyPending(); // estadísticas de esta pestaña sin guardar
    this.onExternalChange = null;                    // aviso: otra pestaña guardó datos
    this.data = this.load() || LakeJournalStore.defaults();

    // Otra pestaña guardó: recargar sus datos y volver a sumar lo propio aún sin guardar
    window.addEventListener('storage', (e) => {
      if (e.key !== this.storageKey && e.key !== null) return;
      const fresh = this.load();
      if (!fresh) return;
      this.applyPending(fresh.stats);
      this.replaceData(fresh);
      if (this.onExternalChange) this.onExternalChange();
    });
  }

  static emptyPending() {
    return { focusSecondsByDay: {}, pomodorosByDay: {}, ducklingsRaised: 0, breeds: {} };
  }

  // Clave de día en hora local (YYYY-MM-DD) para que "hoy" coincida con su reloj
  static dateKey(date = new Date()) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  static defaults() {
    return {
      version: 1,
      settings: {
        workMin: 25,
        breakMin: 5,
        theme: 'cozyDay',
        autoCycle: true,
        mixerOpen: true,
        muted: false,
        fps: 30,
        channels: {
          water: { enabled: true, volume: 0.45 },
          ducks: { enabled: true, volume: 0.65 },
          forest: { enabled: true, volume: 0.35 },
          music: { enabled: true, volume: 0.50 }
        }
      },
      stats: {
        focusSecondsByDay: {},
        pomodorosByDay: {},
        ducklingsRaised: 0,
        breeds: {}
      }
    };
  }

  // Fusiona lo guardado con los valores por defecto, validando cada campo.
  // Devuelve null si localStorage no se puede leer (bloqueado o modo privado).
  load() {
    let raw;
    try {
      raw = localStorage.getItem(this.storageKey);
    } catch (_) {
      return null;
    }
    const data = LakeJournalStore.defaults();
    let saved = null;
    try {
      saved = JSON.parse(raw);
    } catch (_) {}
    if (!saved || typeof saved !== 'object') return data;

    const s = saved.settings || {};
    const clampMinutes = (value, fallback) =>
      Number.isFinite(value) ? Math.min(120, Math.max(1, Math.round(value))) : fallback;
    data.settings.workMin = clampMinutes(s.workMin, data.settings.workMin);
    data.settings.breakMin = clampMinutes(s.breakMin, data.settings.breakMin);
    if (VISUAL_THEMES[s.theme]) data.settings.theme = s.theme;
    if (typeof s.autoCycle === 'boolean') data.settings.autoCycle = s.autoCycle;
    if (typeof s.mixerOpen === 'boolean') data.settings.mixerOpen = s.mixerOpen;
    if (typeof s.muted === 'boolean') data.settings.muted = s.muted;
    if (s.fps === 30 || s.fps === 60) data.settings.fps = s.fps;
    Object.keys(data.settings.channels).forEach(key => {
      const ch = (s.channels || {})[key] || {};
      if (typeof ch.enabled === 'boolean') data.settings.channels[key].enabled = ch.enabled;
      if (Number.isFinite(ch.volume)) data.settings.channels[key].volume = Math.min(1, Math.max(0, ch.volume));
    });

    // Solo se conservan los últimos 60 días de historial diario
    const st = saved.stats || {};
    const oldestKey = LakeJournalStore.dateKey(new Date(Date.now() - 60 * 24 * 3600 * 1000));
    const keepRecentDays = (map) => {
      const result = {};
      Object.entries(map || {}).forEach(([key, value]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && key >= oldestKey && Number.isFinite(value) && value > 0) {
          result[key] = value;
        }
      });
      return result;
    };
    data.stats.focusSecondsByDay = keepRecentDays(st.focusSecondsByDay);
    data.stats.pomodorosByDay = keepRecentDays(st.pomodorosByDay);
    if (Number.isFinite(st.ducklingsRaised)) {
      data.stats.ducklingsRaised = Math.max(0, Math.floor(st.ducklingsRaised));
    }
    Object.keys(st.breeds || {}).forEach(key => {
      if (!DUCK_BREEDS[key]) return;
      const b = st.breeds[key] || {};
      data.stats.breeds[key] = {
        visits: Number.isFinite(b.visits) ? Math.max(0, Math.floor(b.visits)) : 0,
        firstSeen: typeof b.firstSeen === 'string' ? b.firstSeen : LakeJournalStore.dateKey()
      };
    });
    return data;
  }

  // Relee lo guardado (quizá por otra pestaña) y le suma lo propio, en vez de pisarlo.
  // Los ajustes se resuelven con "gana el último que escribe".
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const stored = this.load();
    if (!stored) return; // sin localStorage: todo sigue en memoria
    stored.settings = this.data.settings;
    this.applyPending(stored.stats);
    this.replaceData(stored);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      this.pending = LakeJournalStore.emptyPending(); // solo si se guardó de verdad
    } catch (_) {}
  }

  applyPending(stats) {
    const p = this.pending;
    const addByDay = (target, source) => {
      Object.entries(source).forEach(([day, value]) => {
        target[day] = (target[day] || 0) + value;
      });
    };
    addByDay(stats.focusSecondsByDay, p.focusSecondsByDay);
    addByDay(stats.pomodorosByDay, p.pomodorosByDay);
    stats.ducklingsRaised += p.ducklingsRaised;
    Object.entries(p.breeds).forEach(([key, b]) => {
      if (!stats.breeds[key]) stats.breeds[key] = { visits: 0, firstSeen: b.firstSeen };
      stats.breeds[key].visits += b.visits;
    });
  }

  // Sustituye los datos en memoria conservando el mismo objeto de ajustes
  replaceData(fresh) {
    Object.assign(this.data.settings, fresh.settings);
    this.data.stats = fresh.stats;
    this.data.version = fresh.version;
  }

  // Agrupa escrituras: si ya hay un guardado pendiente que llega antes, no se reprograma
  scheduleSave(delayMs = 300) {
    const dueAt = Date.now() + delayMs;
    if (this.saveTimer && this.saveDueAt <= dueAt) return;
    clearTimeout(this.saveTimer);
    this.saveDueAt = dueAt;
    this.saveTimer = setTimeout(() => this.save(), delayMs);
  }

  flush() {
    if (this.saveTimer) this.save();
  }

  get settings() {
    return this.data.settings;
  }

  updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    this.scheduleSave();
  }

  updateChannel(channelKey, enabled, volume) {
    const ch = this.data.settings.channels[channelKey];
    if (!ch) return;
    ch.enabled = enabled;
    ch.volume = volume;
    this.scheduleSave();
  }

  // Suma a "hoy" en los datos en memoria y en lo pendiente de guardar
  addToday(field, amount) {
    const today = LakeJournalStore.dateKey();
    this.data.stats[field][today] = (this.data.stats[field][today] || 0) + amount;
    this.pending[field][today] = (this.pending[field][today] || 0) + amount;
  }

  addFocusSeconds(seconds) {
    if (!(seconds > 0)) return;
    this.addToday('focusSecondsByDay', seconds);
    this.scheduleSave(5000);
  }

  // Un pomodoro completo = +1 en el día de hoy y +1 patito criado (devuelve los de hoy)
  recordCompletedPomodoro() {
    this.addToday('pomodorosByDay', 1);
    this.data.stats.ducklingsRaised += 1;
    this.pending.ducklingsRaised += 1;
    this.save();
    return this.todayPomodoros();
  }

  // Devuelve true si es la primera vez que esta raza aparece en el lago
  registerBreed(breedKey, countVisit = true) {
    if (!DUCK_BREEDS[breedKey]) return false;
    const breeds = this.data.stats.breeds;
    const isNew = !breeds[breedKey];
    if (isNew) {
      breeds[breedKey] = { visits: 0, firstSeen: LakeJournalStore.dateKey() };
    }
    if (isNew || countVisit) {
      const pendingBreed = this.pending.breeds[breedKey]
        || (this.pending.breeds[breedKey] = { visits: 0, firstSeen: breeds[breedKey].firstSeen });
      if (countVisit) {
        breeds[breedKey].visits += 1;
        pendingBreed.visits += 1;
      }
      this.scheduleSave();
    }
    return isNew;
  }

  todayPomodoros() {
    return this.data.stats.pomodorosByDay[LakeJournalStore.dateKey()] || 0;
  }

  ducklingsRaised() {
    return this.data.stats.ducklingsRaised;
  }

  // Semana actual de lunes a domingo
  weekFocus() {
    const now = new Date();
    const todayKey = LakeJournalStore.dateKey(now);
    const mondayOffset = (now.getDay() + 6) % 7;
    const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return labels.map((label, i) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + i);
      const key = LakeJournalStore.dateKey(day);
      return {
        key,
        label,
        name: names[i],
        seconds: this.data.stats.focusSecondsByDay[key] || 0,
        isToday: key === todayKey,
        isFuture: key > todayKey
      };
    });
  }

  breedCollection() {
    const breeds = this.data.stats.breeds;
    return DUCK_BREED_KEYS.map(key => ({
      key,
      name: DUCK_BREEDS[key].name,
      discovered: Boolean(breeds[key]),
      visits: breeds[key] ? breeds[key].visits : 0,
      firstSeen: breeds[key] ? breeds[key].firstSeen : null
    }));
  }
}
