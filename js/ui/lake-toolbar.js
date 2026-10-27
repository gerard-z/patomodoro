/* ==========================================================================
   PÍLDORA DE HERRAMIENTAS DEL LAGO (cabecera)
   🐣 nace un patito · 🪽 llega o se va uno volando · selector de tema · chip de fps
   ========================================================================== */
import { VISUAL_THEMES } from '../config.js';

export function setupLakeToolbar({ world, audio, renderer, store, showToast }) {
  const settings = store.settings;
  const spawnDucklingBtn = document.getElementById('spawnDucklingBtn');
  const flyTestBtn = document.getElementById('flyTestBtn');
  const themeSelector = document.getElementById('themeSelector');
  const btnFps = document.getElementById('btnFps');

  spawnDucklingBtn.addEventListener('click', () => {
    audio.initIfNeeded();
    world.spawnBabyDuckling();
  });

  flyTestBtn.addEventListener('click', () => {
    audio.initIfNeeded();
    world.triggerFlightShowcase();
  });

  // Tema: el renderer pinta el agua, data-theme cambia el acento de la interfaz (CSS)
  // y la barra del sistema (app instalada) toma el color del agua
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (themeKey) => {
    const theme = VISUAL_THEMES[themeKey];
    renderer.setTheme(themeKey);
    document.body.dataset.theme = themeKey;
    themeColorMeta.setAttribute('content', theme.waterTop);
    document.documentElement.style.setProperty('--lake-top', theme.waterTop);
    document.documentElement.style.setProperty('--lake-bottom', theme.waterBottom);
  };
  themeSelector.value = settings.theme;
  applyTheme(settings.theme);

  themeSelector.addEventListener('change', (e) => {
    applyTheme(e.target.value);
    store.updateSettings({ theme: e.target.value });
  });

  // Mini selector de fps: alterna 30 (por defecto, cuida la batería) y 60
  const refreshFpsChip = () => {
    btnFps.textContent = `${store.settings.fps} fps`;
  };
  refreshFpsChip();
  btnFps.addEventListener('click', () => {
    store.updateSettings({ fps: store.settings.fps === 30 ? 60 : 30 });
    refreshFpsChip();
    showToast(store.settings.fps === 30
      ? '🔋 30 fps · animación tranquila que cuida la batería'
      : '✨ 60 fps · animación más fluida', { urgent: true });
  });
}
