# PatoPomodoro 🦆

Pomodoro cozy con un lago de patitos. Es una PWA: se instala en el celular y funciona sin internet.
Publicada en <https://patodoro.cathalifaud.dev>.

## Probarla en local

El JavaScript usa módulos ES, así que **no abre con doble clic** (`file://`): hace falta un servidor.
Desde la carpeta del proyecto, cualquiera de estos sirve:

```sh
npx http-server -p 8080        # o
python -m http.server 8080
```

Y abrir <http://localhost:8080>. En VS Code también sirve la extensión Live Server.

## Mapa de archivos

```
index.html                Solo la estructura (HTML) y los enlaces a CSS y JS
css/tailwind.css          Tailwind ya generado (reset + clases utilitarias). No editar a mano
css/app.css               Estilos propios: temas, vidrio, Modo Zen, Diario, diseño en horizontal
js/main.js                Punto de entrada: crea los módulos y los conecta. Empieza a leer aquí
js/config.js              Temas visuales y razas de patos (solo datos)
js/lake-renderer.js       Módulo 1 · Dibuja el lago en el canvas (no sabe de física)
js/audio-mixer.js         Módulo 2 · Sonido ambiente, cuacks y campana (Web Audio)
js/lake-world.js          Módulo 3 · Física y comportamiento de los patos, migas y ondas
js/pomodoro-timer.js      Módulo 4 · Temporizador sin deriva (no sabe del DOM)
js/journal-store.js       Módulo 5 · Ajustes y estadísticas en localStorage
js/focus-tracker.js       Cuenta los minutos reales de concentración
js/lake-loop.js           Bucle de animación (limitado a 30/60 fps)
js/pwa.js                 Registro del service worker y recarga al publicar una versión nueva
js/ui/timer-panel.js      Tarjeta del reloj y sus botones
js/ui/lake-toolbar.js     🐣, 🪽, selector de tema y chip de fps
js/ui/sound-panel.js      Panel "Ambiente": canales, silencio, plegar y ¡Cuack!
js/ui/journal-dialog.js   Diario del Lago (estadísticas y colección de razas)
js/ui/zen-mode.js         Modo Zen
js/ui/toasts.js           Avisos suaves bajo el reloj
js/ui/format.js           Formatos de tiempo y fecha
sw.js                     Service worker: guarda la app para abrirla sin internet
manifest.webmanifest      Nombre, colores e iconos de la app instalada
fonts/, icons/            Fuentes (licencia OFL) e iconos
tools/tailwind.input.css  Entrada para regenerar css/tailwind.css
```

## Cómo funciona

```
main.js
 ├─ LakeJournalStore  ← lee ajustes y estadísticas guardadas
 ├─ LakeRenderer + RelaxingAudioMixer + LakeWorld  ← el lago
 ├─ DriftFreePomodoro ──onTimerTick (cada 250 ms)──→ focus-tracker + timer-panel
 │                    └─onPhaseChange (fin de fase)─→ campana, aviso, estadísticas, patitos
 ├─ ui/*  ← cada panel conecta sus propios botones
 └─ lake-loop  ← cada fotograma: world.update (física) → world.render (dibujo)
```

Los módulos 1–5 no se conocen entre sí: solo comparten los datos de `config.js`.
`main.js` es el único que los conecta, y las reglas que los unen (qué pasa al terminar
un pomodoro, cuándo duermen los patos) están ahí.

## Cambios habituales

- **Nuevo tema visual**: una entrada en `VISUAL_THEMES` (`js/config.js`), un `<option>` en
  `index.html` y un bloque `body[data-theme="…"]` en `css/app.css`.
- **Nueva raza de pato**: una entrada en `DUCK_BREEDS` (`js/config.js`). Aparece sola en el lago
  y en el Diario.
- **Comportamiento de los patos** (velocidad, tope de patos, vida de las migas): constantes al
  inicio de `js/lake-world.js`.
- **Clases de Tailwind nuevas** en el HTML o en `js/`: regenerar el CSS con
  `npx tailwindcss@3.4.17 -i tools/tailwind.input.css -o css/tailwind.css --content "index.html,js/**/*.js" --minify`.
- **Archivo nuevo** (otro `.js`, `.css`, imagen…): añadirlo a `APP_SHELL` en `sw.js`, o la app no
  abrirá sin internet.
- **Publicar**: subir `CACHE_VERSION` en `sw.js` en cada publicación, para que los celulares
  descarguen la versión nueva.
