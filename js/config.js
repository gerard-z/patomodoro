/* ==========================================================================
   CONFIGURACIÓN VISUAL Y RAZAS DE PATOS (solo datos, sin lógica)
   - VISUAL_THEMES: colores del lago para cada tema del selector.
   - DUCK_BREEDS: colores de cada parte del pato por raza (y su nombre en el Diario).
   Para añadir un tema: una entrada aquí, un <option> en index.html y un bloque
   body[data-theme="…"] en css/app.css. Para añadir una raza: una entrada en
   DUCK_BREEDS (aparece sola en el lago y en la colección del Diario).
   ========================================================================== */

export const VISUAL_THEMES = {
  cozyDay: {
    waterTop: '#2b7a78',
    waterBottom: '#17252a',
    waterBreakTint: 'rgba(15, 23, 42, 0.38)',
    rippleColor: 'rgba(222, 242, 241, 0.45)',
    lilyPadColor: '#52b788',
    lilyFlowerColor: '#ffb5a7',
    particleColor: 'rgba(254, 240, 138, 0.75)'
  },
  sunsetGhibli: {
    waterTop: '#c96480',
    waterBottom: '#2d3142',
    waterBreakTint: 'rgba(20, 14, 38, 0.45)',
    rippleColor: 'rgba(255, 229, 217, 0.45)',
    lilyPadColor: '#4a7c59',
    lilyFlowerColor: '#ffd166',
    particleColor: 'rgba(255, 209, 102, 0.85)'
  },
  matchaMinimal: {
    waterTop: '#6b9080',
    waterBottom: '#344e41',
    waterBreakTint: 'rgba(22, 34, 28, 0.42)',
    rippleColor: 'rgba(234, 244, 244, 0.4)',
    lilyPadColor: '#a3b18a',
    lilyFlowerColor: '#f6bd60',
    particleColor: 'rgba(246, 189, 96, 0.8)'
  }
};

// Catálogo modular de colorcitos / razas de patos
export const DUCK_BREEDS = {
  whitePekin: {
    name: 'Blanco Nube',
    body: '#ffffff',
    head: '#ffffff',
    wing: '#e2e8f0',
    beak: '#f97316',
    cheek: 'rgba(244, 114, 182, 0.42)',
    neckRing: null,
    chest: null
  },
  classicYellow: {
    name: 'Amarillo Sol',
    body: '#fde047',
    head: '#fde047',
    wing: '#facc15',
    beak: '#fb923c',
    cheek: 'rgba(251, 113, 133, 0.45)',
    neckRing: null,
    chest: null
  },
  mallard: {
    name: 'Ánade Real',
    body: '#cbd5e1',
    head: '#15803d', // Cabeza verde esmeralda clásica
    wing: '#94a3b8',
    beak: '#eab308',
    cheek: 'rgba(134, 239, 172, 0.35)',
    neckRing: '#ffffff', // Collar blanco
    chest: '#9a3412'     // Pecho castaño
  },
  pinkSakura: {
    name: 'Rosado Sakura',
    body: '#fbcfe8',
    head: '#fbcfe8',
    wing: '#f472b6',
    beak: '#fb923c',
    cheek: 'rgba(225, 29, 72, 0.35)',
    neckRing: null,
    chest: null
  },
  cinnamon: {
    name: 'Canela Cappuccino',
    body: '#d97706',
    head: '#b45309',
    wing: '#fde68a',
    beak: '#fb923c',
    cheek: 'rgba(254, 215, 170, 0.45)',
    neckRing: '#fef3c7',
    chest: null
  },
  skyBlue: {
    name: 'Celeste Cielo',
    body: '#bae6fd',
    head: '#bae6fd',
    wing: '#7dd3fc',
    beak: '#f59e0b',
    cheek: 'rgba(244, 114, 182, 0.4)',
    neckRing: null,
    chest: null
  },
  peposaca: {
    name: 'Negro Picazo',
    body: '#000060',
    head: '#000060',
    wing: '#ccc',
    beak: '#ff0000',
    cheek: 'rgba(134, 239, 172, 0.35)',
    neckRing: null,
    chest: null
  }
};

export const DUCK_BREED_KEYS = Object.keys(DUCK_BREEDS);
