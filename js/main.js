/* ============================================================
   PORTFOLIO — interacciones
   1. Entrada/salida de página (fundido sutil) + pantalla de
      carga inicial en la home (nombre + escritura letra a letra)
   2. Home: galería continua fluida — deriva automática constante
      más impulso de la rueda/trackpad o el arrastre, todo en un
      único bucle de requestAnimationFrame (nada de CSS keyframes,
      así que la aceleración manual se integra sin saltos)
   3. Archive: visor a pantalla completa
   ============================================================ */

/* ---------- 1. Entrada de página / pantalla de carga ---------- */
(function () {
  const preloader = document.getElementById('preloader');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealPage() {
    document.body.classList.remove('is-loading');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.body.classList.add('is-ready'));
    });
  }

  // detecta si esta carga es un refresco real (F5 / botón de
  // recargar), a diferencia de haber llegado aquí navegando por un
  // enlace — la API del navegador distingue ambos casos de verdad,
  // no hace falta adivinarlo
  function isRealReload() {
    try {
      const entry = performance.getEntriesByType('navigation')[0];
      if (entry) return entry.type === 'reload';
    } catch (e) { /* API no disponible: se asume que no es un refresco */ }
    return false;
  }

  // sin pantalla de carga en esta página, o (ya se vio en esta
  // sesión Y no es un refresco real): se revela todo directamente.
  // Un refresco siempre vuelve a reproducir la animación, aunque ya
  // se hubiera visto antes en la misma sesión; navegar por un
  // enlace (como el logo) sigue sin repetirla si ya se vio.
  if (!preloader || (sessionStorage.getItem('alfonso-preloaded') && !isRealReload()) || reduceMotion) {
    if (preloader) preloader.remove();
    revealPage();
    return;
  }
  sessionStorage.setItem('alfonso-preloaded', '1');
  // bloquea cualquier clic mientras dura la animación, y marca que
  // la carga está sucediendo de verdad — la nav solo se desliza
  // hacia abajo cuando esto ocurre, no cada vez que se llega a la
  // home navegando por un enlace (ver CSS: .preload-nav .nav)
  document.body.classList.add('is-loading', 'preload-nav');

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // calcula el tamaño de letra exacto para que el nombre llegue
  // justo al margen del contenedor, sea cual sea el ancho de
  // coloca el bloque justo debajo de donde cae la navbar real de
  // la página (mismo hueco que separa la nav del carrusel), en
  // vez de dejarlo centrado en toda la pantalla
  function positionPreloaderTop() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    const navStyles = getComputedStyle(nav);
    const marginBottom = parseFloat(navStyles.marginBottom) || 0;
    const top = rect.bottom + marginBottom;
    document.documentElement.style.setProperty('--preloader-top', `${top}px`);
  }

  // pantalla — mide el ancho real del texto a un tamaño de
  // referencia (100px) y escala en proporción directa
  function fitPreloaderName() {
    const nameEl = document.getElementById('preloaderName');
    const container = nameEl.closest('.preloader__inner');
    if (!nameEl || !container) return;
    nameEl.style.fontSize = '100px';
    const naturalWidth = nameEl.scrollWidth;
    if (naturalWidth <= 0) return;
    // box-sizing es border-box: el ancho disponible para el texto
    // es el del contenedor MENOS su propio padding lateral, no el
    // clientWidth entero (que ya incluye ese padding)
    const styles = getComputedStyle(container);
    const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    // llena el 100% de su contenedor (que ahora es más estrecho
    // que la pantalla, ver .preloader__inner en el CSS) — así el
    // nombre y las palabras de abajo comparten siempre el mismo
    // límite, en vez de que uno llegue más lejos que el otro
    const targetWidth = container.clientWidth - paddingX;
    // sin techo artificial: en pantallas anchas el texto necesita
    // un tamaño mayor para llegar de verdad al borde — el límite
    // de 260px de antes era el motivo de que se quedara corto
    const size = 100 * (targetWidth / naturalWidth);
    nameEl.style.fontSize = `${size}px`;
  }

  // mide el ancho final de cada palabra y lo fija de antemano: así
  // la caja no cambia de tamaño mientras el texto crece dentro, y
  // el resto de palabras (con justify-content: space-between) no
  // se desplazan cuando a una le toca escribirse
  function freezeTaglineWidths() {
    document.querySelectorAll('#preloaderTagline span').forEach((span) => {
      const word = span.dataset.word || '';
      span.textContent = word;
      const finalWidth = span.getBoundingClientRect().width;
      span.textContent = '';
      span.style.width = `${finalWidth}px`;
    });
  }

  // escribe una palabra letra a letra dentro de un <span>
  function typeWord(el, speed) {
    const text = el.dataset.word || '';
    el.classList.add('is-typing');
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        i += 1;
        el.textContent = text.slice(0, i);
        if (i < text.length) {
          setTimeout(tick, speed);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  async function runPreloader() {
    const nameEl = document.getElementById('preloaderName');
    const words = document.querySelectorAll('#preloaderTagline span');

    // si la fuente propia (Diatype) todavía no ha terminado de
    // cargar, la de reserva del sistema tiene métricas distintas
    // (otra altura de línea) — medir o animar antes de que cargue
    // provocaría justo el salto que se ve al aparecer el texto.
    // document.fonts.ready espera a que la fuente activa esté lista de verdad
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* seguir de todos modos */ }
    }

    fitPreloaderName();
    positionPreloaderTop();
    freezeTaglineWidths();
    await wait(250);
    nameEl.classList.add('is-in');
    await wait(650);
    // ya ha terminado de aparecer: le quito su propia transición
    // por completo, así es imposible que anime nada por su cuenta
    // más adelante — el único movimiento que le queda es el del
    // bloque entero (.preloader__inner) al salir, exactamente a
    // la vez que las palabras, sin ninguna posibilidad de que algo
    // suyo se dispare antes o después
    nameEl.style.transition = 'none';

    for (const word of words) {
      await typeWord(word, 42);
      await wait(90);
    }

    await wait(450);
    preloader.classList.add('is-hidden'); // el texto empieza a subir y desvanecerse
    await wait(300); // la entrada arranca a los 300ms — la salida (0.9s) sigue terminando de desvanecerse por su cuenta de fondo, no hace falta esperarla entera
    revealPage(); // ahora entra la home (nav + carrusel)
    setTimeout(() => preloader.remove(), 900);
  }

  // si el evento "load" ya se disparó antes de llegar aquí (muy
  // probable con los archivos en caché, que es justo el caso al
  // probar la web varias veces seguidas), escucharlo ahora ya no
  // sirve de nada — se comprueba el estado directamente en vez de
  // depender de un evento que quizá ya ha pasado
  if (document.readyState === 'complete') {
    runPreloader();
  } else {
    window.addEventListener('load', runPreloader);
  }
  window.addEventListener('resize', () => {
    if (!preloader.classList.contains('is-hidden')) fitPreloaderName();
  });
})();

// bandera compartida: en cuanto se empieza a salir de la página,
// el bucle del carrusel (más abajo) deja de mover la pista, para
// no competir por fotogramas con la transición justo cuando la
// nav (con mix-blend-mode) tiene que recomponerse sobre ella
let isLeavingPage = false;

document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || a.target === '_blank') return;
  if (!href.endsWith('.html')) return;

  e.preventDefault();
  isLeavingPage = true;
  document.body.classList.add('page-leave');
  // los vídeos en reproducción siguen consumiendo CPU/GPU aunque
  // la pista deje de moverse; los pauso durante la transición
  document.querySelectorAll('video').forEach((v) => v.pause());
  setTimeout(() => { window.location.href = href; }, 300);
}, false);

/* ---------- 2. Galería continua (home) ---------- */
(function () {
  // cada vídeo de portada empieza un poco avanzado en vez de
  // desde el fotograma cero — un punto de arranque distinto por
  // vídeo, ya que no todos duran lo mismo
  const START_TIMES = {
    'simbiosis-hero': 3,
    'outpaced-hero': 3,
  };
  const seekOne = (v) => {
    const startAt = START_TIMES[v.dataset.video];
    if (startAt == null) return;
    const seek = () => { try { v.currentTime = startAt; } catch (e) { /* aún no listo */ } };
    if (v.readyState >= 1) seek(); // metadata ya cargada
    else v.addEventListener('loadedmetadata', seek, { once: true });
  };
  // aplica a los originales Y a cualquier copia que se clone
  // después (las filas de móvil, por ejemplo) — por eso se expone
  // la función en vez de ejecutarla una sola vez aquí mismo
  window.seekHeroVideo = seekOne;
  document.querySelectorAll('[data-video]').forEach(seekOne);
})();

const carousel = document.getElementById('carousel');
const track = document.getElementById('track');
const mobileRows = document.getElementById('mobileRows');
const isMobileCarousel = () => window.matchMedia('(max-width: 680px)').matches;

if (mobileRows && track && isMobileCarousel()) {
  // MÓVIL: en vez de un carrusel horizontal (poco natural con el
  // dedo), tres franjas que se mueven solas por su cuenta, cada
  // una en su sentido — puro CSS (@keyframes), sin necesidad de
  // JS en cada fotograma. Aquí solo se reparten los 7 proyectos
  // en las tres filas y se duplica cada una para que el bucle sea
  // perfecto (la animación va de -50% a 0%, así que necesita el
  // contenido dos veces seguidas).
  const slides = Array.from(track.children);
  // reparto explícito (no por turnos) para que, justo al entrar,
  // la primera pieza visible de cada fila sea siempre la misma:
  // arriba Simbiosis, en medio Primal, abajo Outpaced
  const rowAssignment = [
    [1, 4, 0],    // fila de arriba: Specimen, LCA, Simbiosis
    [2, 3, 5, 6], // fila de abajo: Outpaced, Primal, Oakley Neptune, Percepta Wines
  ];
  const rows = rowAssignment.map((indices) => indices.map((i) => slides[i]));

  rows.forEach((rowSlides, i) => {
    const row = document.createElement('div');
    row.className = `mobile-rows__row mobile-rows__row--${i + 1}`;
    const rowTrack = document.createElement('div');
    rowTrack.className = 'mobile-rows__track';
    // el contenido se repite dos veces seguidas para el bucle
    [...rowSlides, ...rowSlides].forEach((slide) => {
      const clone = slide.cloneNode(true);
      const media = clone.querySelector('img, video');
      if (media) media.removeAttribute('loading');
      const heroVideo = clone.querySelector('[data-video]');
      if (heroVideo && window.seekHeroVideo) window.seekHeroVideo(heroVideo);
      rowTrack.appendChild(clone);
    });
    row.appendChild(rowTrack);
    mobileRows.appendChild(row);
  });
} else if (carousel && track) {
  // ESCRITORIO: galería continua duplicada por JS, movida con
  // requestAnimationFrame (deriva lenta + impulso de la rueda o el
  // arrastre). La página no hace scroll: solo se mueve esto. Los
  // nombres aparecen al pasar el cursor.
  // (en móvil no hace falta nada de esto: los proyectos se apilan
  // en vertical con el scroll normal de la página, ver CSS)
  const originals = Array.from(track.children);
  originals.forEach((el) => track.appendChild(el.cloneNode(true)));

  const BASE_SPEED = -0.03;   // px/ms — deriva lenta, siempre activa
  const BOOST_MAX = 3.2;      // techo de velocidad añadida
  const BOOST_DECAY = 0.92;   // cuánto se desvanece el impulso cada ~16ms

  let x = 0;                  // posición actual (translateX)
  let boost = 0;               // impulso temporal por rueda/trackpad
  let halfWidth = 0;
  let lastTime = null;
  let dragging = false;
  let moved = false;

  function measure() { halfWidth = track.scrollWidth / 2; }
  measure();
  window.addEventListener('resize', measure);

  // el ancho real de la pista cambia según van cargando los vídeos
  // (sin metadata, un <video> no tiene proporción real todavía) o si
  // alguna imagen falla; ResizeObserver detecta cualquiera de esos
  // cambios y vuelve a medir, así el punto de "vuelta al principio"
  // del bucle nunca queda desincronizado (evita el salto/tirón)
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
  }

  function frame(now) {
    if (lastTime == null) lastTime = now;
    const dt = Math.min(now - lastTime, 48);
    lastTime = now;

    if (!dragging && !isLeavingPage) {
      x += (BASE_SPEED + boost) * dt;
      boost *= Math.pow(BOOST_DECAY, dt / 16);
    }

    if (halfWidth > 0) {
      if (-x >= halfWidth) x += halfWidth;
      if (x > 0) x -= halfWidth;
    }

    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // rueda / trackpad: añade velocidad de forma fluida, sin saltos;
  // el impulso se integra con la deriva base y se apaga solo.
  // Scroll hacia arriba => la galería avanza de derecha a izquierda
  // (mismo sentido que la deriva automática), por eso se resta.
  carousel.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    boost -= delta * 0.0026;
    boost = Math.max(Math.min(boost, BOOST_MAX), -BOOST_MAX);
  }, { passive: false });

  // arrastre directo (ratón)
  let isPressed = false;
  let dragLocked = false;
  let startX = 0, startY = 0, startXAt = 0;

  carousel.addEventListener('pointerdown', (e) => {
    isPressed = true;
    dragLocked = false;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startXAt = x;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isPressed) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragLocked) {
      const threshold = Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy);
      if (threshold) {
        dragLocked = true;
        dragging = true;
        carousel.classList.add('is-dragging');
      } else if (Math.abs(dy) > 6) {
        isPressed = false;
        return;
      }
    }

    if (dragLocked) {
      e.preventDefault();
      moved = true;
      x = startXAt + dx;
    }
  }, { passive: false });

  window.addEventListener('pointerup', () => {
    isPressed = false;
    dragLocked = false;
    dragging = false;
    carousel.classList.remove('is-dragging');
  });

  carousel.addEventListener('click', (e) => {
    if (moved) e.preventDefault();
  }, true);
}

/* ---------- 3. Archive: visor a pantalla completa ---------- */
const stripItems = document.querySelectorAll('.archive-grid__item');

if (stripItems.length) {
  const items = Array.from(stripItems);

  // ---- revelación suave por pieza, en cuanto cada imagen o vídeo
  // termina de cargar de verdad (evita el "chispazo" de que cada
  // archivo remoto aparezca de golpe en un instante distinto) ----
  items.forEach((el) => {
    const media = el.querySelector('img, video');
    if (!media) { el.classList.add('is-loaded'); return; }
    const reveal = () => el.classList.add('is-loaded');
    if (media.tagName === 'IMG') {
      if (media.complete) reveal();
      else media.addEventListener('load', reveal, { once: true });
    } else {
      if (media.readyState >= 2) reveal();
      else media.addEventListener('loadeddata', reveal, { once: true });
    }
  });
  // red de seguridad: si algo tarda demasiado o falla, se revela
  // igualmente pasado un tiempo, para no dejar huecos en blanco
  setTimeout(() => items.forEach((el) => el.classList.add('is-loaded')), 4000);

  const lightbox = document.getElementById('lightbox');
  const viewport = document.getElementById('lightboxViewport');
  const slide = document.getElementById('lightboxSlide');
  const counter = document.getElementById('lightboxCounter');
  const titleEl = document.getElementById('lightboxTitle');
  const btnClose = document.getElementById('lightboxClose');
  const peekPrev = document.getElementById('lightboxPeekPrev');
  const peekNext = document.getElementById('lightboxPeekNext');
  let current = 0;

  function ratioFor(el) {
    const map = {
      'ar-1': '1 / 1', 'ar-2': '3 / 4', 'ar-3': '4 / 3',
      'ar-4': '2 / 3', 'ar-5': '16 / 9', 'ar-6': '9 / 16',
    };
    for (const cls in map) {
      if (el.classList.contains(cls)) return map[cls];
    }
    return '1 / 1';
  }

  function placeholderFor(el) {
    const ph = document.createElement('div');
    ph.className = 'lightbox__placeholder';
    ph.style.aspectRatio = ratioFor(el);
    return ph;
  }

  // rellena la pieza principal; si es vídeo se reproduce de verdad
  function fillSlide(index) {
    const el = items[index];
    const media = el.querySelector('img, video');
    const prevVideo = slide.querySelector('video');
    if (prevVideo) prevVideo.pause();
    slide.innerHTML = '';
    if (!media) { slide.appendChild(placeholderFor(el)); return; }
    const clone = media.cloneNode(true);
    slide.appendChild(clone);
    if (clone.tagName === 'VIDEO') {
      clone.muted = true;
      clone.loop = true;
      clone.playsInline = true;
      // el atributo autoplay no siempre basta en un nodo clonado
      // e insertado dinámicamente; se llama a play() explícitamente
      const p = clone.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // miniaturas laterales: siempre fotograma fijo, pausadas y sin
  // sonido, para no tener varios vídeos sonando/reproduciéndose
  // a la vez sin que quede claro cuál es la pieza activa
  function fillPeek(container, index) {
    const el = items[index];
    const media = el.querySelector('img, video');
    container.innerHTML = '';
    if (!media) { container.appendChild(placeholderFor(el)); return; }
    const clone = media.cloneNode(true);
    if (clone.tagName === 'VIDEO') {
      clone.removeAttribute('autoplay');
      clone.muted = true;
      clone.pause();
    }
    container.appendChild(clone);
  }

  function updatePeeks() {
    const prevIdx = (current - 1 + items.length) % items.length;
    const nextIdx = (current + 1) % items.length;
    fillPeek(peekPrev, prevIdx);
    fillPeek(peekNext, nextIdx);
  }

  function updateCounter() {
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    titleEl.textContent = items[current].dataset.title || '';
  }

  // cambio instantáneo, sin animación
  function render() {
    fillSlide(current);
    updateCounter();
    updatePeeks();
  }

  function openLightbox(index) {
    current = index;
    render();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    const v = slide.querySelector('video');
    if (v) v.pause();
  }
  function next() { current = (current + 1) % items.length; render(); }
  function prev() { current = (current - 1 + items.length) % items.length; render(); }

  items.forEach((el, i) => el.addEventListener('click', () => openLightbox(i)));
  btnClose.addEventListener('click', closeLightbox);
  peekPrev.addEventListener('click', prev);
  peekNext.addEventListener('click', next);

  // clic en la mitad izquierda de la imagen = anterior;
  // en la mitad derecha = siguiente
  viewport.addEventListener('click', (e) => {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) prev(); else next();
  });

  // clic en la zona blanca de fuera (el fondo del visor, no la
  // imagen ni ningún control): también navega, respetando el
  // lado igual que la imagen — izquierda retrocede, derecha avanza
  lightbox.addEventListener('click', (e) => {
    if (e.target !== lightbox) return;
    if (e.clientX < window.innerWidth / 2) prev(); else next();
  });

  window.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });
}

/* ---------- 4. Interruptor de modo claro/oscuro ---------- */
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem(
      'theme',
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
  });
}

/* ---------- 5. Ventana de proceso (Sound) ---------- */
const processButtons = document.querySelectorAll('.sound-track__process');
const processModal = document.getElementById('processModal');

if (processButtons.length && processModal) {
  const processBody = document.getElementById('processModalBody');
  const processClose = document.getElementById('processModalClose');

  // contenido real del proceso, tomado del propio TFG (apartado 06.2.7)
  const PROCESS_DATA = [
    {
      title: 'Olas',
      subtitle: 'SIMBIOSIS_MAR.logicx · A major, 80 BPM, 4/4',
      steps: [
        ['Concept', 'Built around Olas, a painting by Paz Alonso: the sense of standing before something immense that brings quiet rather than anguish, the sea as both force and rest at once.'],
        ['Field recordings', 'Real ocean recordings sit underneath the piece. Looped constantly they buried the melody, so their volume is automated to rise with each wave and fall in between, the same intermittent presence the real sea has.', ['img/olas-process-1.png']],
        ['Low strings & pads', 'A low string bass gives the piece its weight, inspired by David García Díaz\'s score for the game RIME. Slow-attack pads (Classic Analog, Sun Glitters) build the atmosphere gradually, the way light spreads across the painting, with Ethereal Mallets adding high-frequency detail without breaking the continuity.', ['img/olas-process-2.png']],
        ['Space', 'A wide hall reverb lets every element take its time to fade, and tempo-synced delays let notes repeat before disappearing, reinforcing the sense of something that lingers without a clear end.', ['img/olas-process-3.png', 'img/olas-process-4.png']],
      ],
    },
    {
      title: 'Campo',
      subtitle: 'SIMBIOSIS_Rosa.logicx · C major, 68 BPM, 4/4',
      steps: [
        ['Concept', 'Built around Campo, a painting Rosa Martínez described as something born from a dream: a happy but hazy nostalgia, where things are recognisable but never quite sharp.'],
        ['Electric piano', 'A Rhodes-style electric piano (Classic Suitcase Mk IV) carries the piece: warm, intimate and already sounding like a memory before any processing is applied.', ['img/campo-process-1.png']],
        ['Fragmented texture', 'A Beat Breaker effect fragments and redistributes the piano in real time, so the music stutters slightly, as if the memory were repeating itself in pieces before completing.', ['img/campo-process-2.png']],
        ['Guitar & grand piano', 'Classical guitar floats loose notes over the harmony, each one dissolved by delay before the next arrives, echoing the drifting grass in the 3D visual. A Studio Grand piano adds depth underneath, with its own distinct fragmentation pattern so the texture never feels identical.', ['img/campo-process-3.png', 'img/campo-process-4.png']],
      ],
    },
  ];

  function openProcess(index) {
    const data = PROCESS_DATA[index] || PROCESS_DATA[0];
    const stepsHtml = data.steps.map(([label, text, images]) => `
      <div class="process-step">
        ${images && images.length ? `
          <div class="process-step__imgs">
            ${images.map((src) => `<img src="${src}" alt="" loading="lazy" />`).join('')}
          </div>
        ` : ''}
        <span class="step-num">${label}</span>
        <p>${text}</p>
      </div>
    `).join('');

    processBody.innerHTML = `
      <p class="process-modal__title">${data.title}</p>
      <p class="process-modal__subtitle">${data.subtitle}</p>
      ${stepsHtml}
    `;
    processModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeProcess() {
    processModal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  processButtons.forEach((btn) => {
    btn.addEventListener('click', () => openProcess(Number(btn.dataset.process)));
  });
  processClose.addEventListener('click', closeProcess);
  processModal.addEventListener('click', (e) => {
    if (e.target === processModal) closeProcess();
  });
  window.addEventListener('keydown', (e) => {
    if (processModal.classList.contains('is-open') && e.key === 'Escape') closeProcess();
  });
}

/* ---------- 6. Miniatura dinámica en "Más proyectos" ---------- */
const moreRows = document.querySelectorAll('.more__row');
const moreThumb = document.querySelector('.more__thumb');

if (moreRows.length && moreThumb) {
  moreRows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      const url = row.dataset.thumb;
      const type = row.dataset.thumbType;
      if (!url) return;
      moreThumb.innerHTML = '';
      if (type === 'video') {
        const v = document.createElement('video');
        v.src = url;
        v.autoplay = true;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        moreThumb.appendChild(v);
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.loading = 'lazy';
        moreThumb.appendChild(img);
      }
      moreThumb.classList.add('is-visible');
    });
    row.addEventListener('mouseleave', () => {
      moreThumb.classList.remove('is-visible');
    });
  });
}

/* ---------- 7. Info: tarjetas de premios fijas ---------- */
const awards = document.getElementById('awards');

if (awards) {
  // por debajo de este ancho, el CSS ya convierte las tarjetas en
  // bloques normales dentro del flujo (ver @media en el CSS) — el
  // sistema de "fixed" + acople es cosa solo de escritorio; si se
  // dejara actuar en móvil, la clase .is-docked (position:absolute)
  // pisaría al CSS responsive y descolocaría las tarjetas
  const isDesktopAwards = () => window.matchMedia('(min-width: 901px)').matches;

  // altura inicial: coincide con donde están las fotos al cargar
  // la página (no se recalcula al hacer scroll, porque al ser
  // "fixed" debe quedarse clavada en ese punto de la pantalla)
  function syncAwardsTop() {
    // la foto de la derecha (la vertical) es la referencia: las
    // tarjetas quedan pegadas justo a su borde superior
    const tallPhoto = document.querySelector('.studio__photos .ph-block.tall')
      || document.querySelector('.studio__photos .ph-block');
    if (!tallPhoto) return;
    const top = tallPhoto.getBoundingClientRect().top;
    document.documentElement.style.setProperty('--awards-top', `${top}px`);
  }

  // se sueltan (dejan de estar "fixed") justo en el momento en que
  // el borde inferior de las fotos llega a su altura, y se anclan
  // ahí mismo — así quedan apoyadas exactamente en esa línea, y de
  // paso nunca llegan a alcanzar el footer más abajo, porque a
  // partir de ese punto ya se desplazan con el resto de la página
  const photosSection = document.querySelector('.studio__photos');
  function syncAwardsDock() {
    if (!isDesktopAwards()) {
      // en móvil, cualquier estilo en línea que hubiera quedado de
      // una visita anterior en escritorio se limpia por completo
      awards.classList.remove('is-docked');
      awards.style.top = '';
      return;
    }
    if (!photosSection) return;
    const photosRect = photosSection.getBoundingClientRect();
    const awardsHeight = awards.offsetHeight;
    const awardsTopPx = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--awards-top')
    ) || 0;
    const awardsBottomPx = awardsTopPx + awardsHeight;

    if (photosRect.bottom <= awardsBottomPx) {
      const photosBottomInDocument = photosSection.offsetTop + photosSection.offsetHeight;
      awards.classList.add('is-docked');
      awards.style.top = `${photosBottomInDocument - awardsHeight}px`;
    } else {
      awards.classList.remove('is-docked');
      awards.style.top = '';
    }
  }

  function syncAwards() {
    if (isDesktopAwards()) syncAwardsTop();
    syncAwardsDock();
  }

  syncAwards();
  window.addEventListener('resize', syncAwards);
  window.addEventListener('scroll', syncAwardsDock, { passive: true });
}

/* ---------- 8. Info: fundido escalonado de las tarjetas ---------- */
(function () {
  const cards = document.querySelectorAll('#awards .award-card');
  if (!cards.length) return;
  // cada tarjeta aparece por separado, con su propio retraso —
  // animación exclusiva de estas dos, ajena al resto de la página
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('is-in'), 200 + i * 180);
  });
})();

/* ---------- 9. Revelado al hacer scroll (Works + imágenes de proyecto) ---------- */
(function () {
  const targets = document.querySelectorAll('.card, .project-media .ph-block, .studio__photos .ph-block');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    // sin soporte: se muestran directamente, sin animación
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // ya reveladas, no hace falta seguir vigilando
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
})();

/* ---------- 10. Sound: reproducción real + barras reactivas ---------- */
(function () {
  const playButtons = document.querySelectorAll('.sound-track__play[data-audio]');
  if (!playButtons.length) return;

  let currentButton = null;
  let currentAudio = null;
  let currentRaf = null;

  function stopVisualizer(button) {
    if (currentRaf) cancelAnimationFrame(currentRaf);
    currentRaf = null;
    if (button) {
      const bars = button.closest('.sound-track').querySelectorAll('.sound-track__wave span');
      bars.forEach((bar) => {
        const original = bar.dataset.originalHeight;
        if (original) bar.style.height = original;
      });
    }
  }

  // anima las barras mientras el audio suena — ligado al propio
  // avance de la reproducción (no a un análisis de frecuencias, que
  // con la Web Audio API falla en muchos navegadores al abrir la
  // página directamente desde un archivo local en vez de un
  // servidor). Cada barra tiene su propia fase, así no se mueven
  // todas exactamente igual y da sensación de reaccionar de verdad.
  function animateBars(audio, bars) {
    const phases = Array.from(bars).map(() => Math.random() * Math.PI * 2);
    function tick() {
      const t = audio.currentTime * 6; // velocidad del movimiento
      bars.forEach((bar, i) => {
        const wobble = (Math.sin(t + phases[i]) + 1) / 2; // 0–1
        const height = 3 + wobble * 26; // mismo rango que las alturas originales (3–26px)
        bar.style.height = `${height}px`;
      });
      currentRaf = requestAnimationFrame(tick);
    }
    tick();
  }

  playButtons.forEach((button) => {
    // guarda la altura original de cada barra para poder
    // restaurarla en cuanto la pista deja de sonar
    const bars = button.closest('.sound-track').querySelectorAll('.sound-track__wave span');
    bars.forEach((bar) => {
      bar.dataset.originalHeight = bar.style.height;
    });

    button.addEventListener('click', () => {
      const src = button.dataset.audio;

      // ya estaba sonando esta misma pista: pausar
      if (currentButton === button && currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        button.classList.remove('is-playing');
        stopVisualizer(button);
        return;
      }

      // había otra pista sonando: pararla y devolverle su icono
      if (currentButton && currentButton !== button) {
        currentAudio.pause();
        currentButton.classList.remove('is-playing');
        stopVisualizer(currentButton);
      }

      if (currentButton !== button || !currentAudio) {
        currentAudio = new Audio(src);
        currentAudio.addEventListener('ended', () => {
          currentAudio.currentTime = 0;
          button.classList.remove('is-playing');
          stopVisualizer(button);
        });
        currentAudio.addEventListener('error', () => {
          console.error('No se pudo cargar el audio:', src);
        });
      }

      currentButton = button;
      currentAudio.play().catch((err) => console.error('Reproducción bloqueada:', err));
      button.classList.add('is-playing');
      animateBars(currentAudio, bars);
    });
  });
})();

/* ---------- 11. Menú hamburguesa (móvil) ---------- */
(function () {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  if (!burger || !menu) return;

  // "congela" la página en su sitio exacto (no solo impide
  // desplazarse más, como hacía overflow:hidden por sí solo) —
  // evita cualquier comportamiento raro de la nav (position:sticky
  // en las páginas que no son la home) al abrir el menú después de
  // haber hecho scroll
  let savedScrollY = 0;

  function closeMenu() {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }
  function openMenu() {
    savedScrollY = window.scrollY;
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  }

  burger.addEventListener('click', () => {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMenu(); else openMenu();
  });

  // clic fuera del menú lo cierra
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (menu.contains(e.target) || burger.contains(e.target)) return;
    closeMenu();
  });

  // Escape lo cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

/* ---------- 12. Arreglo del bucle de vídeo en Safari ---------- */
/* Safari tiene un fallo conocido con este tipo de vídeos (sobre
   todo servidos desde otro dominio, como los de ImageKit en este
   sitio): se queda congelado en el último fotograma en vez de
   volver a empezar. video.load() lo arregla de verdad, pero tarda
   un instante en completarse — para que ese instante no se note,
   capturo el último fotograma en un lienzo fijo y lo superpongo
   mientras se recarga, así nunca se ve ni el fondo gris de la
   pieza ni un hueco en blanco. (Se probó también a duplicar el
   vídeo para tener siempre una copia lista de antemano, pero
   interfería con el cálculo de tamaño del carrusel — se descartó
   por dar más problemas de los que resolvía.) */
document.querySelectorAll('video[loop]').forEach((video) => {
  video.loop = false; // el bucle pasa a estar controlado enteramente por este código
  const REWIND_MARGIN = 0.15; // segundos antes del final en los que se reinicia

  // el fotograma congelado que se superpone durante la recarga
  // necesita que su contenedor sea un punto de referencia de
  // posición — en el carrusel ya lo es, pero en Works, Archive y
  // las páginas de proyecto no, así que se lo añadimos si hace falta
  const parent = video.parentElement;
  if (parent && getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  let restarting = false;

  function restart() {
    if (restarting) return; // evita que se dispare más de una vez a la vez
    restarting = true;

    // video.load() resetea el vídeo momentáneamente sin
    // dimensiones (hasta que vuelve a leer sus metadatos) — si el
    // ancho de esta pieza depende de su tamaño real (como en el
    // carrusel), ese instante sin tamaño hace que todo se
    // recalcule y salte. Fijamos el ancho actual justo antes de
    // recargar, así no cambia nada visualmente mientras tanto
    const width = video.getBoundingClientRect().width;
    if (width > 0) video.style.width = `${width}px`;
    video.addEventListener('loadedmetadata', () => {
      video.style.width = '';
    }, { once: true });

    // mientras se recarga, el vídeo deja de pintar nada durante un
    // instante y se asoma el fondo gris de la pieza — para taparlo,
    // capturo el último fotograma en un lienzo fijo y lo superpongo
    let freezeFrame = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; pointer-events:none;';
      video.insertAdjacentElement('afterend', canvas);
      freezeFrame = canvas;
    } catch (e) {
      // si el navegador no deja capturar el fotograma (p. ej. por
      // origen cruzado), seguimos sin el fotograma congelado
    }
    function removeFreezeFrame() {
      if (freezeFrame && freezeFrame.parentElement) freezeFrame.remove();
      restarting = false;
    }

    video.load();
    video.play()
      .then(removeFreezeFrame)
      .catch(removeFreezeFrame);
    // red de seguridad: si "play" no llega a resolver ni fallar
    // por lo que sea, el fotograma congelado no se queda para siempre
    setTimeout(removeFreezeFrame, 1500);
  }

  video.addEventListener('timeupdate', () => {
    if (video.duration && video.currentTime >= video.duration - REWIND_MARGIN) {
      restart();
    }
  });
  video.addEventListener('ended', restart);

  // vigilante: si el vídeo debería estar reproduciéndose pero su
  // posición lleva más de 1 segundo sin avanzar (señal de que se
  // ha quedado atascado de verdad, en vez de simplemente en pausa),
  // se fuerza el reinicio
  let lastTime = -1;
  let stuckSince = null;
  setInterval(() => {
    if (video.paused || video.seeking) { stuckSince = null; return; }
    if (video.currentTime === lastTime) {
      if (stuckSince === null) stuckSince = Date.now();
      else if (Date.now() - stuckSince > 1000) {
        stuckSince = null;
        restart();
      }
    } else {
      stuckSince = null;
    }
    lastTime = video.currentTime;
  }, 500);
});

/* ---------- 13. Vídeos con música dentro de un proyecto (estilo Vimeo) ---------- */
/* a diferencia de los vídeos silenciosos del sitio (que arrancan
   solos, en bucle y sin sonido), estos llevan su propia banda
   sonora y se reproducen solos desde el principio, sin que haga
   falta pulsar nada — los controles (pausa, volumen y barra de
   progreso) solo aparecen al pasar el ratón por encima, igual que
   en Vimeo.

   Para que el sonido nunca se solape entre varios vídeos a la vez:
   1) solo puede sonar uno cada vez — en cuanto uno empieza a
      reproducirse, cualquier otro que estuviera sonando se pausa;
   2) en cuanto un vídeo deja de verse en pantalla (al hacer
      scroll), se pausa solo; si vuelve a aparecer más tarde, se
      reanuda solo — así nunca queda uno sonando "a tus espaldas"
      mientras miras otra cosa más abajo.

   Sobre el sonido al arrancar: los navegadores no permiten que un
   vídeo empiece a sonar automáticamente sin que la persona haya
   interactuado antes con la página — es una restricción de
   seguridad del propio navegador, no algo que se pueda saltar
   desde el código. Así que el vídeo intenta arrancar CON sonido
   de entrada; si el navegador lo bloquea, arranca en silencio
   igualmente (para que el movimiento nunca se detenga) y basta con
   pulsar el botón de volumen para activarlo a mano. */
(function () {
  const items = Array.from(document.querySelectorAll('.media-vimeo'));
  if (!items.length) return;

  let currentlyPlaying = null; // solo un vídeo suena a la vez

  items.forEach((item) => {
    const video = item.querySelector('video');
    const toggle = item.querySelector('.media-vimeo__toggle');
    const volumeBtn = item.querySelector('.media-vimeo__volume');
    const bar = item.querySelector('.media-vimeo__bar');
    const fill = item.querySelector('.media-vimeo__fill');
    if (!video || !toggle || !bar || !fill || !volumeBtn) return;

    let userPaused = false; // true si la persona lo paró a propósito (no por scroll)
    let hasAttemptedSound = false;

    function attemptPlay() {
      if (!hasAttemptedSound) {
        // primer intento de verdad, y solo una vez: con sonido
        hasAttemptedSound = true;
        video.muted = false;
        video.play().catch(() => {
          // el navegador lo ha bloqueado por no haber interacción
          // previa: arranca en silencio para que al menos se mueva
          video.muted = true;
          video.play().catch(() => { /* algunos navegadores bloquean incluso el autoplay silencioso */ });
        });
      } else {
        // las siguientes veces (al volver a aparecer en pantalla)
        // se respeta el estado de silencio que ya tuviera
        video.play().catch(() => {});
      }
    }
    // ojo: no se llama aquí todavía — solo arranca cuando el vídeo
    // entra de verdad en la pantalla (ver el IntersectionObserver
    // más abajo), para que los que están más abajo en la página no
    // empiecen a sonar antes de que llegues a verlos

    function syncClasses() {
      item.classList.toggle('is-paused', video.paused);
      item.classList.toggle('is-muted', video.muted);
    }
    video.addEventListener('play', () => {
      syncClasses();
      // que suene este pausa cualquier otro que estuviera sonando
      if (currentlyPlaying && currentlyPlaying !== video) {
        currentlyPlaying.pause();
      }
      currentlyPlaying = video;
    });
    video.addEventListener('pause', syncClasses);
    video.addEventListener('volumechange', syncClasses);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userPaused = !video.paused;
      if (video.paused) video.play(); else video.pause();
    });
    video.addEventListener('click', () => {
      userPaused = !video.paused;
      if (video.paused) video.play(); else video.pause();
    });
    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
    });

    video.addEventListener('timeupdate', () => {
      if (video.duration) fill.style.width = `${(video.currentTime / video.duration) * 100}%`;
    });

    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!video.duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * video.duration;
    });

    // bucle simple: al llegar al final, vuelve a empezar (estos son
    // mucho más largos que los vídeos cortos del resto del sitio,
    // así que aunque se diera el mismo fallo de Safari con el
    // bucle, se notaría con mucha menos frecuencia)
    video.addEventListener('ended', () => {
      video.currentTime = 0;
      video.play().catch(() => { /* el navegador puede bloquear el play si aún no hay interacción */ });
    });

    // se pausa solo al salir de la pantalla, y se reanuda solo al
    // volver a aparecer — pero solo si nadie lo había pausado a mano
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!userPaused) attemptPlay();
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    observer.observe(item);
  });
})();
