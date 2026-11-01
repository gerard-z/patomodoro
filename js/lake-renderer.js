/* ==========================================================================
   MÓDULO 1: RENDERER DEL LAGO (canvas 2D)
   Solo dibuja lo que le pasan (agua, ondas, nenúfares, migas, patos y
   luciérnagas); no sabe nada de física ni del temporizador. Por eso también
   sirve para los retratos de las razas en el Diario.
   ========================================================================== */
import { VISUAL_THEMES, DUCK_BREEDS } from './config.js';

export class LakeRenderer {
  constructor(canvas, initialThemeKey = 'cozyDay') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = VISUAL_THEMES[initialThemeKey] || VISUAL_THEMES.cozyDay;
  }

  setTheme(themeKey) {
    if (VISUAL_THEMES[themeKey]) {
      this.theme = VISUAL_THEMES[themeKey];
    }
  }

  drawBackground(width, height, isBreakMode, timeSec) {
    const { ctx, theme } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.waterTop);
    grad.addColorStop(1, theme.waterBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ondas de luz suaves en el agua
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = (height * 0.15) + i * (height * 0.14) + Math.sin(timeSec * 0.8 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        width * 0.33, y + Math.cos(timeSec + i) * 18,
        width * 0.66, y - Math.sin(timeSec + i) * 18,
        width, y
      );
      ctx.stroke();
    }
    ctx.restore();

    if (isBreakMode) {
      ctx.fillStyle = theme.waterBreakTint;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawRipple(ripple) {
    const { ctx, theme } = this;
    ctx.save();
    ctx.strokeStyle = theme.rippleColor;
    ctx.globalAlpha = Math.max(0, ripple.alpha);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawLilyPad(pad, timeSec) {
    const { ctx, theme } = this;
    const swayX = Math.sin(timeSec * 0.9 + pad.seed) * 3;
    const swayY = Math.cos(timeSec * 0.7 + pad.seed) * 2;

    ctx.save();
    ctx.translate(pad.x + swayX, pad.y + swayY);
    ctx.rotate(pad.rotation + Math.sin(timeSec * 0.4 + pad.seed) * 0.05);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.arc(3, 5, pad.radius, 0.25, Math.PI * 2 - 0.25);
    ctx.lineTo(3, 5);
    ctx.fill();

    ctx.fillStyle = theme.lilyPadColor;
    ctx.beginPath();
    ctx.arc(0, 0, pad.radius, 0.22, Math.PI * 2 - 0.22);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    if (pad.hasFlower) {
      ctx.fillStyle = theme.lilyFlowerColor;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const angle = (i * Math.PI * 2) / 5;
        ctx.ellipse(
          Math.cos(angle) * 5,
          Math.sin(angle) * 5,
          6, 3.2, angle, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCrumb(crumb) {
    const { ctx } = this;
    ctx.save();
    // Las migas que nadie come se hunden y se desvanecen (alpha lo calcula LakeWorld)
    ctx.globalAlpha = Math.min(1, Math.max(0, crumb.alpha ?? 1));
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(crumb.x, crumb.y, crumb.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     RENDERIZADO DE PATITO (Soporta colores/razas, vuelo en altura Z y ¡Cuack!)
     ------------------------------------------------------------------------ */
  drawDuck(duck, timeSec) {
    const { ctx } = this;
    const breed = DUCK_BREEDS[duck.breedKey] || DUCK_BREEDS.classicYellow;
    const isBaby = duck.isBaby;
    const baseScale = isBaby ? 0.68 : 1.0;
    const isFlying = duck.z > 1 || duck.state === 'LANDING' || duck.state === 'TAKING_OFF';
    const bobOffset = isFlying ? 0 : Math.sin(timeSec * 4 + duck.seed) * 2.2;
    const facingRight = Math.cos(duck.angle) >= 0;

    // 1. Sombra proyectada sobre el agua (se achica cuando el pato vuela alto)
    const shadowScale = baseScale * Math.max(0.32, 1 - duck.z / 260);
    const shadowAlpha = Math.max(0.08, 0.22 - (duck.z / 900));
    ctx.save();
    ctx.translate(duck.x, duck.y + 12);
    ctx.scale(shadowScale, shadowScale);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Cuerpo del patito (elevado en -duck.z cuando va volando)
    ctx.save();
    ctx.translate(duck.x, duck.y - duck.z + bobOffset);
    ctx.scale(baseScale, baseScale);

    if (!facingRight) {
      ctx.scale(-1, 1);
    }

    // Inclinación sutil al despegar o aterrizar
    if (duck.state === 'TAKING_OFF') {
      ctx.rotate(-0.18);
    } else if (duck.state === 'LANDING' && duck.z > 8) {
      ctx.rotate(0.14);
    }

    // Ala trasera cuando está aleteando en vuelo
    if (isFlying) {
      const flap = Math.sin(timeSec * 32 + duck.seed) * 11;
      ctx.fillStyle = breed.wing;
      ctx.beginPath();
      ctx.ellipse(2, -6 + flap * 0.7, 13, 6, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cuerpo redondeado
    ctx.fillStyle = breed.body;
    ctx.beginPath();
    ctx.ellipse(-2, 4, 20, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pecho de color (ej. Ánade Real / Mallard)
    if (breed.chest) {
      ctx.fillStyle = breed.chest;
      ctx.beginPath();
      ctx.ellipse(10, 4, 9, 10, 0.2, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.fill();
    }

    // Colita levantada
    ctx.fillStyle = breed.body;
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(-27, -5);
    ctx.lineTo(-16, -5);
    ctx.closePath();
    ctx.fill();

    // Ala principal (aletea rápido en vuelo; nadando queda plegada)
    const wingFlapY = isFlying ? Math.sin(timeSec * 32 + duck.seed) * 10 : 0;
    const wingAngle = isFlying ? -0.35 + Math.sin(timeSec * 32 + duck.seed) * 0.45 : -0.15;
    ctx.fillStyle = breed.wing;
    ctx.beginPath();
    ctx.ellipse(-3, 4 - Math.abs(wingFlapY * 0.35), 11.5, 6.8, wingAngle, 0, Math.PI * 2);
    ctx.fill();

    const dipOffset = duck.state === 'DIPPING' ? 7 : 0;

    // Cabeza
    ctx.fillStyle = breed.head;
    ctx.beginPath();
    ctx.arc(12, -8 + dipOffset, 11, 0, Math.PI * 2);
    ctx.fill();

    // Collar si la raza lo incluye: arco en la base de la cabeza, del lado del cuerpo.
    // Va después de la cabeza; si se dibuja antes, el círculo de la cabeza lo tapa entero.
    if (breed.neckRing) {
      ctx.strokeStyle = breed.neckRing;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(12, -8 + dipOffset, 9.7, Math.PI * 0.4, Math.PI * 0.95);
      ctx.stroke();
    }

    // Pico (se abre en dos mitades cuando hace ¡Cuack!)
    ctx.fillStyle = breed.beak;
    if (duck.quackTimer > 0) {
      // Pico superior abierto
      ctx.beginPath();
      ctx.ellipse(22, -9.2 + dipOffset, 6.5, 2.7, -0.18, 0, Math.PI * 2);
      ctx.fill();
      // Pico inferior abierto
      ctx.beginPath();
      ctx.ellipse(21.5, -4.5 + dipOffset, 5.8, 2.4, 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(22, -7 + dipOffset, 6.5, 3.8, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ojo
    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#1e293b';
    if (duck.state === 'SLEEPING') {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(15, -9 + dipOffset, 2.5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(15, -10 + dipOffset, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(15.8, -10.8 + dipOffset, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mejilla sonrojada
    ctx.fillStyle = breed.cheek;
    ctx.beginPath();
    ctx.ellipse(12, -5 + dipOffset, 3.2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Efectos flotantes sobre el patito ("Zzz", "💛" o burbuja "¡Cuack!")
    const topY = duck.y - duck.z;
    if (duck.quackTimer > 0) {
      ctx.save();
      const floatUp = (0.55 - duck.quackTimer) * 18;
      ctx.font = 'bold 12px Fredoka, sans-serif';
      const text = duck.quackText || '¡Cuack!';
      const textWidth = ctx.measureText(text).width;
      const bx = duck.x - textWidth / 2 - 7;
      const by = topY - 40 - floatUp;

      // Burbujita cómic redondeada
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, textWidth + 14, 20, 10);
      } else {
        ctx.rect(bx, by, textWidth + 14, 20); // Navegadores sin roundRect (iOS < 16)
      }
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillText(text, bx + 7, by + 14);
      ctx.restore();
    } else if (duck.heartTimer > 0) {
      ctx.save();
      ctx.font = '16px sans-serif';
      ctx.fillText('💛', duck.x - 8, topY - 28 - (1 - duck.heartTimer) * 15);
      ctx.restore();
    } else if (duck.state === 'SLEEPING') {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 13px Quicksand, sans-serif';
      const zFloat = (timeSec * 15 + duck.seed * 10) % 24;
      ctx.globalAlpha = 1 - zFloat / 24;
      ctx.fillText('Zzz', duck.x + 10, topY - 20 - zFloat);
      ctx.restore();
    }
  }

  drawFirefly(particle, timeSec) {
    const { ctx, theme } = this;
    const pulse = 0.4 + 0.6 * Math.sin(timeSec * 3 + particle.seed);
    ctx.save();
    ctx.fillStyle = theme.particleColor;
    // pulse va de -0.2 a 1; canvas ignora un globalAlpha negativo (dejaría 1 = destello)
    ctx.globalAlpha = Math.max(0, pulse);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
