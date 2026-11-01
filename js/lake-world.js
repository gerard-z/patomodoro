/* ==========================================================================
   MÓDULO 3: SIMULACIÓN FÍSICA DEL LAGO, COLORES Y VUELO DE PATOS
   Soporta estados: SWIMMING | DIPPING | SLEEPING | LANDING | TAKING_OFF
   ========================================================================== */
import { DUCK_BREED_KEYS } from './config.js';

// Zona donde nadan los patos (distancia al borde de la pantalla): toda la pantalla. Giran de
// vuelta cuando su centro cruza el borde, así que al girar pueden asomarse un poco por fuera.
// Las migas se colocan dentro de esta misma zona para que siempre sean alcanzables.
export const LAKE_BOUNDS = { side: 0, top: 0, bottom: 0 };
const LANDING_SPEED = 145;      // px/s de un pato que llega volando
const MAX_DUCKS_ON_WATER = 16;  // si se supera, el más antiguo se despide volando
const MAX_CRUMBS = 60;
const CRUMB_LIFETIME = 25;      // segundos antes de que una miga empiece a hundirse
const CRUMB_SINK_TIME = 2;      // segundos que tarda en desvanecerse

export class LakeWorld {
  constructor(canvas, renderer, audioMixer, onDuckCountChange, getDiscoveredBreeds = null) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.audio = audioMixer;
    this.onDuckCountChange = onDuckCountChange;
    this.getDiscoveredBreeds = getDiscoveredBreeds;
    this.isBreakMode = false;

    this.ducks = [];
    this.ripples = [];
    this.lilyPads = [];
    this.crumbs = [];
    this.fireflies = [];

    this.flightEventTimer = 22; // Cada cierto tiempo llega o se va un patito volando
    this.nextFlyActionIsArrival = true;

    // Conectar cuack ambiental para que un patito abra el pico en pantalla
    this.audio.onAmbientQuackCallback = () => {
      this.triggerRandomDuckQuack();
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initEntities();
    this.bindInteraction();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const oldWidth = this.width;
    const oldHeight = this.height;
    // Tamaño real del lienzo en pantalla (con viewport-fit=cover incluye notch y barra de estado;
    // window.innerHeight puede quedarse corto en la app instalada de iOS)
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Al girar el celular, todo se reubica en proporción (si no, nenúfares y patos
    // quedarían fuera de la pantalla). En la primera llamada aún no hay tamaño previo.
    if (oldWidth && oldHeight) {
      this.scaleEntities(this.width / oldWidth, this.height / oldHeight);
    }
  }

  scaleEntities(sx, sy) {
    if (sx === 1 && sy === 1) return;
    const scalePoint = (p) => {
      p.x *= sx;
      p.y *= sy;
    };
    this.lilyPads.forEach(scalePoint);
    this.ripples.forEach(scalePoint);
    this.crumbs.forEach(scalePoint);
    this.fireflies.forEach(scalePoint);
    for (const duck of this.ducks) {
      scalePoint(duck);
      if (duck.landingTarget) scalePoint(duck.landingTarget);
    }
  }

  // Punto más cercano dentro de la zona donde nadan los patos (a 6 px del borde como mínimo):
  // con la zona a pantalla completa, solo mueve las migas que caerían fuera de la pantalla
  clampToSwimZone(x, y) {
    const inset = 6;
    const minX = LAKE_BOUNDS.side + inset;
    const maxX = this.width - LAKE_BOUNDS.side - inset;
    const minY = LAKE_BOUNDS.top + inset;
    const maxY = this.height - LAKE_BOUNDS.bottom - inset;
    return {
      x: minX < maxX ? Math.min(maxX, Math.max(minX, x)) : this.width / 2,
      y: minY < maxY ? Math.min(maxY, Math.max(minY, y)) : this.height / 2
    };
  }

  // Si allowUndiscovered es false, elige solo entre las razas ya descubiertas en el Diario
  getRandomBreedKey(allowUndiscovered = false) {
    if (!allowUndiscovered && typeof this.getDiscoveredBreeds === 'function') {
      const discovered = this.getDiscoveredBreeds();
      if (Array.isArray(discovered) && discovered.length > 0) {
        return discovered[Math.floor(Math.random() * discovered.length)];
      }
    }
    return DUCK_BREED_KEYS[Math.floor(Math.random() * DUCK_BREED_KEYS.length)];
  }

  initEntities() {
    const padPositions = [
      { x: this.width * 0.16, y: this.height * 0.28, r: 28, flower: true },
      { x: this.width * 0.22, y: this.height * 0.35, r: 20, flower: false },
      { x: this.width * 0.82, y: this.height * 0.68, r: 32, flower: true },
      { x: this.width * 0.76, y: this.height * 0.75, r: 22, flower: false },
      { x: this.width * 0.18, y: this.height * 0.74, r: 25, flower: false }
    ];
    this.lilyPads = padPositions.map((p, idx) => ({
      x: p.x,
      y: p.y,
      radius: p.r,
      hasFlower: p.flower,
      rotation: idx * 1.1,
      seed: idx * 2.3
    }));

    // 4 Patitos iniciales de distintos colores para que el lago se vea lleno de vida
    this.ducks.push(this.createDuck(this.width * 0.30, this.height * 0.50, false, 'whitePekin'));
    this.ducks.push(this.createDuck(this.width * 0.68, this.height * 0.46, false, 'mallard'));
    this.ducks.push(this.createDuck(this.width * 0.24, this.height * 0.56, true, 'classicYellow'));
    this.ducks.push(this.createDuck(this.width * 0.62, this.height * 0.58, true, 'pinkSakura'));

    for (let i = 0; i < 18; i++) {
      this.fireflies.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        size: 1.5 + Math.random() * 2,
        seed: Math.random() * 10
      });
    }
  }

  createDuck(x, y, isBaby = false, breedKey = null) {
    return {
      x,
      y,
      z: 0, // Altura sobre el agua (0 = nadando, >0 = volando)
      angle: Math.random() * Math.PI * 2,
      targetAngle: Math.random() * Math.PI * 2,
      speed: isBaby ? 26 : 30,
      isBaby,
      breedKey: breedKey || this.getRandomBreedKey(),
      state: 'SWIMMING', // SWIMMING | DIPPING | SLEEPING | LANDING | TAKING_OFF
      stateTimer: 2 + Math.random() * 4,
      rippleTimer: 0,
      heartTimer: 0,
      quackTimer: 0,
      quackText: '¡Cuack!',
      landingTarget: null,
      seed: Math.random() * 10
    };
  }

  makeDuckQuack(duck) {
    if (!duck || duck.state === 'SLEEPING') return;
    const isDouble = this.audio.triggerQuack(duck.isBaby ? 1.35 : 1); // los bebés, más agudos
    duck.quackTimer = isDouble ? 0.62 : 0.42;
    duck.quackText = isDouble ? '¡Cuack, cuack!' : '¡Cuack!';
    this.addRipple(duck.x, duck.y, 34);
  }

  triggerRandomDuckQuack() {
    const awakeDucks = this.ducks.filter(d => d.state === 'SWIMMING' || d.state === 'DIPPING');
    if (awakeDucks.length === 0) return;
    const chosen = awakeDucks[Math.floor(Math.random() * awakeDucks.length)];
    this.makeDuckQuack(chosen);
  }

  // Nace un patito junto a una "madre" que esté en el agua y dentro de la pantalla
  spawnBabyDuckling({ allowUndiscovered = false } = {}) {
    const mother = this.ducks.find(d => d.z === 0 && d.state !== 'TAKING_OFF'
      && d.x >= 0 && d.x <= this.width && d.y >= 0 && d.y <= this.height);
    const x = mother ? mother.x - 30 : this.width * 0.5;
    const y = mother ? mother.y + 20 : this.height * 0.5;
    const baby = this.createDuck(x, y, true, this.getRandomBreedKey(allowUndiscovered));
    baby.heartTimer = 1.0;
    this.ducks.push(baby);
    this.makeDuckQuack(baby);
    this.enforceDuckLimit();
    if (this.onDuckCountChange) this.onDuckCountChange(this.ducks.length);
    return baby;
  }

  // Si hay más de MAX_DUCKS_ON_WATER patos (sin contar los que ya se van), el más antiguo
  // que esté en el agua se despide volando. El array está en orden de llegada.
  enforceDuckLimit() {
    let staying = this.ducks.filter(d => d.state !== 'TAKING_OFF').length;
    while (staying > MAX_DUCKS_ON_WATER) {
      const oldest = this.ducks.find(d =>
        d.state === 'SWIMMING' || d.state === 'DIPPING' || d.state === 'SLEEPING');
      if (!oldest) break;
      this.sendDuckFlying(oldest);
      staying -= 1;
    }
  }

  // Hace que un nuevo pato colorido llegue volando desde el cielo y acuatice en el lago
  spawnFlyingDuck(customBreedKey = null) {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -50 : this.width + 50;
    const targetX = this.width * (0.12 + Math.random() * 0.76);
    const targetY = this.height * (0.15 + Math.random() * 0.70);
    const startY = targetY - 30;

    const duck = this.createDuck(startX, startY, Math.random() < 0.35, customBreedKey || this.getRandomBreedKey());
    duck.z = 175 + Math.random() * 45;
    duck.state = 'LANDING';
    duck.landingTarget = { x: targetX, y: targetY };
    duck.angle = Math.atan2(targetY - startY, targetX - startX);
    duck.targetAngle = duck.angle;

    // Ritmo de descenso para tocar el agua justo al llegar (a 24 px del destino). Con el
    // ritmo fijo de 78 px/s, en pantallas angostas el viaje era corto y el pato caía de golpe.
    const travelTime = Math.max(0.4, (Math.hypot(targetX - startX, targetY - startY) - 24) / LANDING_SPEED);
    duck.descentRate = Math.max(78, duck.z / travelTime);

    this.ducks.push(duck);
    this.enforceDuckLimit();
    if (this.onDuckCountChange) this.onDuckCountChange(this.ducks.length);
    return duck;
  }

  // Hace que un pato del lago tome carrera, aletee y se vaya volando al cielo
  triggerDuckTakeoff() {
    const candidates = this.ducks.filter(d => d.state === 'SWIMMING' || d.state === 'DIPPING');
    // Mantener siempre al menos 2 patitos en el lago para que nunca quede vacío
    if (candidates.length <= 2) {
      return this.spawnFlyingDuck();
    }
    return this.sendDuckFlying(candidates[candidates.length - 1]);
  }

  sendDuckFlying(flyer) {
    flyer.state = 'TAKING_OFF';
    flyer.z = 0;
    const flyRight = Math.random() < 0.5;
    flyer.angle = flyRight ? -0.15 : Math.PI + 0.15;
    flyer.targetAngle = flyer.angle;
    if (!this.isBreakMode) this.makeDuckQuack(flyer); // en Descanso se va en silencio
    this.audio.triggerWingSplash();
    return flyer;
  }

  // Alterna llegada y salida en vuelo (para el botón de prueba o ciclos)
  triggerFlightShowcase() {
    if (this.ducks.length <= 3 || this.nextFlyActionIsArrival) {
      this.spawnFlyingDuck();
      this.nextFlyActionIsArrival = false;
    } else {
      this.triggerDuckTakeoff();
      this.nextFlyActionIsArrival = true;
    }
  }

  addRipple(x, y, maxRadius = 42) {
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius,
      alpha: 0.75
    });
  }

  bindInteraction() {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.audio.initIfNeeded();
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // ¿Tocó un patito? Del que se ve delante (dibujado encima) al de atrás
      const frontToBack = [...this.ducks].sort((a, b) => (b.y + b.z * 2) - (a.y + a.z * 2));
      for (const duck of frontToBack) {
        const dist = Math.hypot(duck.x - clickX, (duck.y - duck.z) - clickY);
        if (dist < (duck.isBaby ? 26 : 34)) {
          duck.heartTimer = 1.0;
          this.makeDuckQuack(duck);
          return;
        }
      }

      // Si tocó el agua: onda donde tocó y miguitas dentro de la zona donde nadan los patos
      this.addRipple(clickX, clickY, 55);
      for (let i = 0; i < 3; i++) {
        const pos = this.clampToSwimZone(
          clickX + (Math.random() - 0.5) * 22,
          clickY + (Math.random() - 0.5) * 22
        );
        this.crumbs.push({
          x: pos.x,
          y: pos.y,
          size: 2.5 + Math.random() * 1.5,
          age: 0,
          alpha: 1
        });
      }
      if (this.crumbs.length > MAX_CRUMBS) {
        this.crumbs.splice(0, this.crumbs.length - MAX_CRUMBS);
      }
    });
  }

  update(dt, timeSec) {
    // Eventos automáticos de patos que llegan o se van volando con el paso del tiempo
    this.flightEventTimer -= dt;
    if (this.flightEventTimer <= 0) {
      this.flightEventTimer = 25 + Math.random() * 20;
      if (!this.isBreakMode) {
        if (this.ducks.length < 7 && Math.random() < 0.65) {
          this.spawnFlyingDuck();
        } else if (this.ducks.length > 3) {
          this.triggerDuckTakeoff();
        }
      }
    }

    // Actualizar ondas en el agua
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += dt * 24;
      r.alpha -= dt * 0.45;
      // Las ondas pequeñas llegan a su radio máximo antes de desvanecerse: se apagan a la par
      const growth = (r.radius - 4) / (r.maxRadius - 4);
      r.alpha = Math.min(r.alpha, 0.75 * (1 - growth));
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    // Migas que nadie come: a los CRUMB_LIFETIME s se hunden poco a poco y desaparecen
    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      const c = this.crumbs[i];
      c.age += dt;
      c.alpha = 1 - Math.max(0, c.age - CRUMB_LIFETIME) / CRUMB_SINK_TIME;
      if (c.alpha <= 0) {
        this.crumbs.splice(i, 1);
      }
    }

    // Actualizar patitos (iteración inversa por si un pato se va volando fuera de pantalla)
    for (let i = this.ducks.length - 1; i >= 0; i--) {
      const duck = this.ducks[i];

      if (duck.heartTimer > 0) {
        duck.heartTimer = Math.max(0, duck.heartTimer - dt * 0.8);
      }
      if (duck.quackTimer > 0) {
        duck.quackTimer = Math.max(0, duck.quackTimer - dt);
      }

      // CASO A: Pato llegando en vuelo y descendiendo al agua (LANDING)
      if (duck.state === 'LANDING') {
        const tx = duck.landingTarget.x;
        const ty = duck.landingTarget.y;
        const dist = Math.hypot(tx - duck.x, ty - duck.y);
        duck.angle = Math.atan2(ty - duck.y, tx - duck.x);

        duck.x += Math.cos(duck.angle) * LANDING_SPEED * dt;
        duck.y += Math.sin(duck.angle) * LANDING_SPEED * dt;

        // Descenso gradual: descentRate se calculó para tocar el agua justo al llegar
        duck.z = Math.max(0, duck.z - dt * (duck.descentRate || 78));

        if (dist < 24 || duck.z <= 0) {
          duck.z = 0;
          duck.state = this.isBreakMode ? 'SLEEPING' : 'SWIMMING';
          duck.targetAngle = Math.cos(duck.angle) >= 0 ? 0.1 : Math.PI - 0.1;
          this.addRipple(duck.x, duck.y, 52);
          this.addRipple(duck.x + 12, duck.y + 4, 36);
          this.audio.triggerWingSplash();
          if (!this.isBreakMode) {
            this.makeDuckQuack(duck);
          }
        }
        continue;
      }

      // CASO B: Pato tomando vuelo y subiendo al cielo (TAKING_OFF)
      if (duck.state === 'TAKING_OFF') {
        const flySpeed = 160;
        duck.x += Math.cos(duck.angle) * flySpeed * dt;
        duck.y += Math.sin(duck.angle) * flySpeed * 0.35 * dt;
        duck.z += dt * 88;

        // Chapoteo en el agua mientras despega
        if (duck.z < 28) {
          duck.rippleTimer -= dt;
          if (duck.rippleTimer <= 0) {
            this.addRipple(duck.x, duck.y + 8, 34);
            duck.rippleTimer = 0.16;
          }
        }

        // Si ya salió de la pantalla por el cielo, retirarlo de la lista
        if (duck.x < -120 || duck.x > this.width + 120 || duck.z > 360) {
          this.ducks.splice(i, 1);
          if (this.onDuckCountChange) this.onDuckCountChange(this.ducks.length);
        }
        continue;
      }

      // CASO C: En modo Descanso los patitos en el agua duermen
      if (this.isBreakMode) {
        duck.state = 'SLEEPING';
        continue;
      } else if (duck.state === 'SLEEPING') {
        duck.state = 'SWIMMING';
      }

      // CASO D: Comportamiento normal en el lago (SWIMMING / DIPPING)
      duck.stateTimer -= dt;
      if (duck.stateTimer <= 0) {
        if (duck.state === 'SWIMMING' && Math.random() < 0.25) {
          duck.state = 'DIPPING';
          duck.stateTimer = 1.1;
          this.addRipple(duck.x + Math.cos(duck.angle) * 14, duck.y, 30);
        } else {
          duck.state = 'SWIMMING';
          duck.stateTimer = 2.5 + Math.random() * 4;
          duck.targetAngle += (Math.random() - 0.5) * 1.8;
        }
      }

      // Si hay miguitas de pan, nadar hacia la más cercana
      if (this.crumbs.length > 0) {
        let nearest = this.crumbs[0];
        let minDist = Math.hypot(nearest.x - duck.x, nearest.y - duck.y);
        for (const c of this.crumbs) {
          const d = Math.hypot(c.x - duck.x, c.y - duck.y);
          if (d < minDist) {
            minDist = d;
            nearest = c;
          }
        }
        duck.targetAngle = Math.atan2(nearest.y - duck.y, nearest.x - duck.x);
        if (minDist < 18) {
          const cIdx = this.crumbs.indexOf(nearest);
          if (cIdx !== -1) this.crumbs.splice(cIdx, 1);
          duck.heartTimer = 1.0;
          //this.makeDuckQuack(duck);
        }
      } else if (duck.isBaby && i > 0) {
        const leader = this.ducks[i - 1];
        if (leader && leader.z === 0) {
          const distToLeader = Math.hypot(leader.x - duck.x, leader.y - duck.y);
          if (distToLeader > 48) {
            duck.targetAngle = Math.atan2(leader.y - duck.y, leader.x - duck.x);
          }
        }
      }

      // Mantener dentro del lago (la misma zona en la que caen las migas)
      if (duck.x < LAKE_BOUNDS.side) duck.targetAngle = 0;
      if (duck.x > this.width - LAKE_BOUNDS.side) duck.targetAngle = Math.PI;
      if (duck.y < LAKE_BOUNDS.top) duck.targetAngle = Math.PI * 0.5;
      if (duck.y > this.height - LAKE_BOUNDS.bottom) duck.targetAngle = -Math.PI * 0.5;

      const diff = Math.atan2(
        Math.sin(duck.targetAngle - duck.angle),
        Math.cos(duck.targetAngle - duck.angle)
      );
      duck.angle += diff * dt * 2.5;

      if (duck.state === 'SWIMMING') {
        const currentSpeed = this.crumbs.length > 0 ? duck.speed * 1.45 : duck.speed;
        duck.x += Math.cos(duck.angle) * currentSpeed * dt;
        duck.y += Math.sin(duck.angle) * currentSpeed * dt;

        duck.rippleTimer -= dt;
        if (duck.rippleTimer <= 0) {
          this.addRipple(duck.x - Math.cos(duck.angle) * 10, duck.y + 6, 26);
          duck.rippleTimer = 0.65;
        }
      }
    }

    // Actualizar luciérnagas
    for (const p of this.fireflies) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  render(timeSec) {
    this.renderer.drawBackground(this.width, this.height, this.isBreakMode, timeSec);

    for (const r of this.ripples) {
      this.renderer.drawRipple(r);
    }
    for (const pad of this.lilyPads) {
      this.renderer.drawLilyPad(pad, timeSec);
    }
    for (const c of this.crumbs) {
      this.renderer.drawCrumb(c);
    }
    // Ordenar por profundidad Y (los patos en vuelo se dibujan encima)
    const sortedDucks = [...this.ducks].sort((a, b) => (a.y + a.z * 2) - (b.y + b.z * 2));
    for (const duck of sortedDucks) {
      this.renderer.drawDuck(duck, timeSec);
    }
    for (const p of this.fireflies) {
      this.renderer.drawFirefly(p, timeSec);
    }
  }
}
