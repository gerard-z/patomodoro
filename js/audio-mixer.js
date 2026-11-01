/* ==========================================================================
   MÓDULO 2: MOTOR DE AUDIO PROCEDURAL MULTICAPA (Web Audio API)
   Incluye síntesis de "¡Cuack!" estilo Stardew Valley (voz áspera con
   modulación AM + filtro de pico) + campana zen para cambios de ciclo.
   ========================================================================== */

export class RelaxingAudioMixer {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMutedAll = false;
    this.onAmbientQuackCallback = null;
    this.quackBuffer = null;      // Cuack real ya decodificado (opcional)
    this.pendingQuackData = null; // Cuack real descargado, pendiente de decodificar
    // El orquestador carga el sonido real con audio.loadRealQuackSample('./cuack.mp3').

    this.channels = {
      water: { enabled: true, volume: 0.45, gainNode: null },
      ducks: { enabled: true, volume: 0.65, gainNode: null },
      forest: { enabled: true, volume: 0.35, gainNode: null },
      music: { enabled: true, volume: 0.50, gainNode: null }
    };

    this.pentatonicNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
  }

  initIfNeeded() {
    if (this.isInitialized) {
      // 'suspended' (autoplay o segundo plano) o 'interrupted' (iOS tras una llamada o alarma)
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    Object.keys(this.channels).forEach(key => {
      const g = this.ctx.createGain();
      this.channels[key].gainNode = g;
      g.connect(this.masterGain);
    });
    
    this.isInitialized = true;
    this.setupWaterStream();
    this.setupForestBreeze();
    this.setupLoopTimers();
    this.updateAllGains();
    this.decodePendingQuack();
  }

  updateAllGains() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMutedAll ? 0 : 1, now, 0.1);

    Object.keys(this.channels).forEach(key => {
      const ch = this.channels[key];
      const target = ch.enabled ? ch.volume : 0;
      ch.gainNode.gain.setTargetAtTime(target, now, 0.15);
    });
  }

  setChannelState(channelName, enabled, volume) {
    this.initIfNeeded();
    const ch = this.channels[channelName];
    if (!ch) return;
    if (typeof enabled === 'boolean') ch.enabled = enabled;
    if (typeof volume === 'number') ch.volume = volume;
    this.updateAllGains();
  }

  toggleMasterMute() {
    this.initIfNeeded();
    this.isMutedAll = !this.isMutedAll;
    this.updateAllGains();
    return this.isMutedAll;
  }

  // 1. Corriente de agua relajante
  setupWaterStream() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 0.18;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    whiteNoise.connect(filter);
    filter.connect(this.channels.water.gainNode);

    whiteNoise.start(0);
    lfo.start(0);
  }

  // 2. Brisa en las hojas del bosque
  setupForestBreeze() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.04;
    }

    const breezeSource = this.ctx.createBufferSource();
    breezeSource.buffer = noiseBuffer;
    breezeSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 950;
    bandpass.Q.value = 2.5;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    breezeSource.connect(bandpass);
    bandpass.connect(this.channels.forest.gainNode);

    breezeSource.start(0);
    lfo.start(0);
  }

  // Sonido suave de aleteo / chapoteo al aterrizar o despegar
  triggerWingSplash() {
    if (!this.isInitialized || !this.channels.water.enabled || this.isMutedAll) return;
    const now = this.ctx.currentTime;
    const dur = 0.35;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.linearRampToValueAtTime(1200, now + dur);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.channels.water.gainNode);
    src.start(now);
  }

  // Campana Zen suave al cambiar automáticamente entre Concentración y Descanso
  triggerCycleChime(toBreak = true) {
    this.initIfNeeded();
    if (this.isMutedAll) return;
    const now = this.ctx.currentTime;
    const notes = toBreak ? [523.25, 659.25, 783.99] : [392.00, 523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      env.gain.setValueAtTime(0.001, now + idx * 0.14);
      env.gain.linearRampToValueAtTime(0.16, now + idx * 0.14 + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.14 + 1.8);

      osc.connect(env);
      env.connect(this.masterGain);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 1.85);
    });
  }

  // 4. Pajarito lejano del bosque
  triggerForestBird() {
    if (!this.isInitialized || !this.channels.forest.enabled || this.isMutedAll) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    const f1 = 1800 + Math.random() * 600;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f1 * 1.25, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(f1 * 0.9, now + 0.18);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.05, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(env);
    env.connect(this.channels.forest.gainNode);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 5. Nota musical ambiental (Kalimba / Piano suave)
  triggerMusicNote() {
    if (!this.isInitialized || !this.channels.music.enabled || this.isMutedAll) return;
    const now = this.ctx.currentTime;
    const freq = this.pentatonicNotes[Math.floor(Math.random() * this.pentatonicNotes.length)];

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0008, now + 2.6);

    osc.connect(env);
    subOsc.connect(env);
    env.connect(this.channels.music.gainNode);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 2.7);
    subOsc.stop(now + 2.7);
  }

  setupLoopTimers() {
    setInterval(() => {
      if (Math.random() < 0.78) this.triggerMusicNote();
    }, 2100);

    // Cuacks orgánicos vinculados visualmente a un patito del lago
    setInterval(() => {
      if (Math.random() < 0.42 && this.onAmbientQuackCallback) {
        this.onAmbientQuackCallback();
      }
      if (Math.random() < 0.38) {
        this.triggerForestBird();
      }
    }, 4200);
  }

  // Cuack real opcional. Solo descarga el archivo: se decodifica en initIfNeeded (al primer
  // toque) para no crear el AudioContext antes de tiempo. Si falla (archivo ausente o
  // página abierta con file://), se usa el sintetizador estilo Stardew.
  async loadRealQuackSample(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.pendingQuackData = await response.arrayBuffer();
      if (this.isInitialized) this.decodePendingQuack();
    } catch (e) {
      console.warn('Usando el sintetizador estilo Stardew como respaldo:', e);
    }
  }

  decodePendingQuack() {
    const data = this.pendingQuackData;
    if (!data) return;
    this.pendingQuackData = null;
    // Con callbacks: el Safari antiguo (webkitAudioContext) no devuelve promesa y sin ellos lanza error
    new Promise((resolve, reject) => {
      const promise = this.ctx.decodeAudioData(data, resolve, reject);
      if (promise) promise.catch(() => {}); // el error ya llega por reject
    })
      .then(buffer => {
        this.quackBuffer = this.trimSilence(buffer);
        console.log('🦆 Sample real de Cuack cargado con éxito');
      })
      .catch(e => console.warn('Usando el sintetizador estilo Stardew como respaldo:', e));
  }

  // Recorta el silencio antes y después del cuack (cuack.mp3 trae 0,39 s de silencio al
  // inicio): así suena justo cuando el pato abre el pico y el doble cuack no se retrasa.
  trimSilence(buffer) {
    const channels = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));

    let peak = 0;
    channels.forEach(data => data.forEach(v => { peak = Math.max(peak, Math.abs(v)); }));
    const threshold = peak * 0.03; // por debajo del 3 % del pico se considera silencio

    let first = buffer.length;
    let last = -1;
    channels.forEach(data => data.forEach((v, i) => {
      if (Math.abs(v) > threshold) {
        first = Math.min(first, i);
        last = Math.max(last, i);
      }
    }));
    if (last < first) return buffer; // archivo en silencio: se deja tal cual

    // 5 ms antes del ataque y 30 ms de cola para no cortar el sonido en seco
    const start = Math.max(0, first - Math.floor(buffer.sampleRate * 0.005));
    const end = Math.min(buffer.length, last + Math.floor(buffer.sampleRate * 0.03));
    const trimmed = this.ctx.createBuffer(buffer.numberOfChannels, end - start, buffer.sampleRate);
    channels.forEach((data, c) => trimmed.getChannelData(c).set(data.subarray(start, end)));
    return trimmed;
  }

  // Devuelve si el cuack fue doble ("¡Cuack, cuack!") para que la burbuja coincida.
  // pitchMultiplier > 1 = más agudo (los bebés usan 1.35).
  triggerQuack(pitchMultiplier = 1.0) {
    this.initIfNeeded();

    // Se decide antes de comprobar el silencio: con el sonido apagado, las burbujas siguen igual
    const isDouble = Math.random() < 0.45;
    const ducksChannel = this.channels.ducks;
    if (ducksChannel.volume <= 0.01 || !ducksChannel.enabled || this.isMutedAll) return isDouble;

    // MODO A: Si hay un archivo .mp3/.wav real cargado, usar técnica Stardew Valley (Pitch Shifting)
    if (this.quackBuffer) {
      // Variación orgánica entre 0.92x y 1.10x + el multiplicador del tipo de pato (bebé vs adulto)
      const rate = (0.92 + Math.random() * 0.18) * pitchMultiplier;
      const playSample = (delayOffset, playbackRate) => {
        const source = this.ctx.createBufferSource();
        source.buffer = this.quackBuffer;
        source.playbackRate.value = playbackRate;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.9;

        // Pasa por el canal de patos: respeta su volumen, el apagado y el silencio general
        source.connect(gain);
        gain.connect(ducksChannel.gainNode);
        source.start(this.ctx.currentTime + delayOffset);
      };
      playSample(0, rate);
      // El sample dura más que la sílaba sintetizada: el segundo cuack entra cuando el primero
      // ya casi termina (a los 0,19 s fijos se montaban uno encima del otro)
      if (isDouble) playSample((this.quackBuffer.duration / rate) * 0.85, rate * 1.06);
      return isDouble;
    }

    // MODO B: Síntesis DSP estilo Stardew Valley (Siringe con Flutter AM + Formante Nasal)
    const playSingleSyllable = (delayOffset, duration, baseFreq) => {
      const now = this.ctx.currentTime + delayOffset;

      // 1. Portadora: Onda compuesta con asimetría glotal
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      // Curva de pitch clásica de Stardew: ataque rápido hacia arriba y caída nasal
      osc.frequency.setValueAtTime(baseFreq * 0.78, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.32, now + duration * 0.22);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + duration * 0.65);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.70, now + duration);

      // 2. El secreto: Modulador AM de "Flutter" (rugosidad de la garganta del pato a ~45 Hz)
      const flutterOsc = this.ctx.createOscillator();
      flutterOsc.type = 'sine';
      flutterOsc.frequency.setValueAtTime(42 + Math.random() * 10, now);

      const flutterDepth = this.ctx.createGain();
      flutterDepth.gain.value = 0.38; // Profundidad del rasgueo

      const flutterModulatedGain = this.ctx.createGain();
      flutterModulatedGain.gain.value = 0.62;
      flutterOsc.connect(flutterDepth);
      flutterDepth.connect(flutterModulatedGain.gain);

      // 3. Ráfaga de aire en el pico (Noise Burst en el ataque)
      const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;

      // 4. Filtro Formante con barrido de apertura de pico (Wah-Quack)
      const billFilter = this.ctx.createBiquadFilter();
      billFilter.type = 'bandpass';
      billFilter.Q.value = 3.8; // Menos resonante = menos robótico, más orgánico
      billFilter.frequency.setValueAtTime(750 * pitchMultiplier, now);
      billFilter.frequency.exponentialRampToValueAtTime(1650 * pitchMultiplier, now + duration * 0.28);
      billFilter.frequency.exponentialRampToValueAtTime(920 * pitchMultiplier, now + duration);

      // 5. Filtro nasal secundario (cuerpo de madera/pato)
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = 'peaking';
      bodyFilter.frequency.value = 1150 * pitchMultiplier;
      bodyFilter.Q.value = 2.0;
      bodyFilter.gain.value = 8;

      // 6. Envolvente de amplitud percusiva y corta (Stardew style).
      //    El volumen del canal lo aplica su gainNode; aquí solo va la forma del sonido.
      const env = this.ctx.createGain();
      const peak = 0.48;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.015);
      env.gain.setValueAtTime(peak * 0.85, now + duration * 0.35);
      env.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Conexión del grafo DSP
      osc.connect(flutterModulatedGain);
      flutterModulatedGain.connect(billFilter);
      noise.connect(billFilter);
      billFilter.connect(bodyFilter);
      bodyFilter.connect(env);
      env.connect(ducksChannel.gainNode);

      osc.start(now);
      flutterOsc.start(now);
      noise.start(now);

      osc.stop(now + duration + 0.02);
      flutterOsc.stop(now + duration + 0.02);
      noise.stop(now + duration + 0.02);
    };

    const basePitch = (290 + Math.random() * 55) * pitchMultiplier;
    // Primer "¡Cuack!" corto y expresivo (160ms)
    playSingleSyllable(0, 0.16, basePitch);

    // 45% de probabilidad de segundo "¡Cuack!" rápido (decidido arriba en isDouble)
    if (isDouble) {
      playSingleSyllable(0.19, 0.14, basePitch * 1.06);
    }
    return isDouble;
  }
}
