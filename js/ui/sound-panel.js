/* ==========================================================================
   PANEL "AMBIENTE SONORO" (pie de pantalla)
   4 canales (interruptor + volumen), silencio general, plegar el panel y el
   botón ¡Cuack!. Todo se guarda y se restaura al abrir la app.
   ========================================================================== */

// Canal de audio → [id del interruptor, id del slider]
const CHANNEL_CONTROLS = {
  water: ['toggleWater', 'volWater'],
  ducks: ['toggleDucks', 'volDucks'],
  forest: ['toggleForest', 'volForest'],
  music: ['toggleMusic', 'volMusic']
};

// Pinta la parte "llena" del slider (el CSS usa var(--fill) en un degradado)
const paintRangeFill = (sliderEl) => {
  sliderEl.style.setProperty('--fill', `${(parseFloat(sliderEl.value) * 100).toFixed(1)}%`);
};

export function setupSoundPanel({ world, audio, store, showToast }) {
  const settings = store.settings;
  const btnMuteAll = document.getElementById('btnMuteAll');
  const btnTestQuack = document.getElementById('btnTestQuack');
  const mixerPanel = document.getElementById('mixerPanel');
  const btnMixerToggle = document.getElementById('btnMixerToggle');

  const bindChannelControl = (channelKey, toggleId, sliderId) => {
    const toggleEl = document.getElementById(toggleId);
    const sliderEl = document.getElementById(sliderId);

    // Restaurar lo guardado sin crear todavía el AudioContext (initIfNeeded aplica estos valores)
    const saved = settings.channels[channelKey];
    audio.channels[channelKey].enabled = saved.enabled;
    audio.channels[channelKey].volume = saved.volume;
    toggleEl.checked = saved.enabled;
    sliderEl.value = saved.volume;
    paintRangeFill(sliderEl);

    const applyChannel = () => {
      const volume = parseFloat(sliderEl.value);
      audio.setChannelState(channelKey, toggleEl.checked, volume);
      store.updateChannel(channelKey, toggleEl.checked, volume);
      paintRangeFill(sliderEl);
    };
    toggleEl.addEventListener('change', applyChannel);
    sliderEl.addEventListener('input', applyChannel);
  };

  Object.entries(CHANNEL_CONTROLS).forEach(([channelKey, [toggleId, sliderId]]) => {
    bindChannelControl(channelKey, toggleId, sliderId);
  });

  const refreshMuteButton = (muted) => {
    btnMuteAll.textContent = muted ? '🔇 Silencio' : '🔊 Sonido';
    btnMuteAll.setAttribute('aria-pressed', String(muted));
  };
  // El silencio se recuerda: se aplica antes del primer toque (initIfNeeded lo respeta)
  audio.isMutedAll = settings.muted;
  refreshMuteButton(settings.muted);
  btnMuteAll.addEventListener('click', () => {
    const muted = audio.toggleMasterMute();
    refreshMuteButton(muted);
    store.updateSettings({ muted });
  });

  btnTestQuack.addEventListener('click', () => {
    audio.initIfNeeded();
    if (world.isBreakMode) {
      showToast('Shh… los patitos duermen 💤', { urgent: true }); // en Descanso nadie está despierto
      return;
    }
    world.triggerRandomDuckQuack();
  });

  const setMixerOpen = (open) => {
    mixerPanel.classList.toggle('is-collapsed', !open);
    btnMixerToggle.setAttribute('aria-expanded', String(open));
  };
  setMixerOpen(settings.mixerOpen);
  btnMixerToggle.addEventListener('click', () => {
    const open = btnMixerToggle.getAttribute('aria-expanded') !== 'true';
    setMixerOpen(open);
    store.updateSettings({ mixerOpen: open });
  });
}
