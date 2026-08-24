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
  const v = document.getElementById('simbiosisSlideVideo');
  if (!v) return;
  const startAt = 3;
  const seek = () => { try { v.currentTime = startAt; } catch (e) { /* aún no listo */ } };
  if (v.readyState >= 1) seek(); // metadata ya cargada
  else v.addEventListener('loadedmetadata', seek, { once: true });
})();

const carousel = document.getElementById('carousel');
const track = document.getElementById('track');

if (carousel && track) {
  // duplica las diapositivas una vez para el bucle infinito sin cortes
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

  // arrastre directo (ratón o dedo)
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
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
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

  // contenido de ejemplo por pista — sustituir por capturas reales
  // de Logic Pro X en cuanto estén disponibles
  const PROCESS_DATA = [
    {
      title: 'Deriva',
      subtitle: 'Ambient — Simbiosis, Col.01 OLAS',
      steps: [
        ['Initial session', 'Sketch of the piece in Logic Pro X: pad layers and a base texture recorded with modular synthesis, designed to accompany the visual pieces of Simbiosis.'],
        ['Automation', 'Volume and filter automation curves so the ambience breathes alongside the video, without peaks competing with the image.'],
        ['Final mix', 'Shared reverb bus between the layers and gentle compression on the master to keep the piece discreet and in the background.'],
      ],
    },
    {
      title: 'Campo abierto',
      subtitle: 'Ambient — Simbiosis, Col.02 CAMPO',
      steps: [
        ['Field recording', 'Starting point with recorded and processed textures, designed as a counterpoint to Rosa Naranjo\'s piece.'],
        ['Harmonic layers', 'Added a harmonic bed in Logic Pro X to give melodic continuity without being intrusive.'],
        ['Final mix', 'Equalization to make room for the video\'s vocal mid frequencies, if any, and light mastering.'],
      ],
    },
    {
      title: 'Estudio 01',
      subtitle: 'Original composition',
      steps: [
        ['Rhythmic sketch', 'First percussion and bass idea in Logic Pro X, as a base for the rest of the composition.'],
        ['Melodic development', 'Synth layers added progressively, with filter automation to generate movement.'],
        ['Final mix', 'Level balance between tracks and final mastering of the track.'],
      ],
    },
    {
      title: 'Estudio 02',
      subtitle: 'Original composition',
      steps: [
        ['Rhythmic sketch', 'Starting point in Logic Pro X with a more pronounced rhythmic base than in Estudio 01.'],
        ['Melodic development', 'Melodic layers and countermelodies added, aiming for denser development toward the end of the track.'],
        ['Final mix', 'Overall mix automation and mastering.'],
      ],
    },
  ];

  function openProcess(index) {
    const data = PROCESS_DATA[index] || PROCESS_DATA[0];
    const stepsHtml = data.steps.map(([label, text]) => `
      <div class="process-step">
        <div class="ph-block"></div>
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
        button.textContent = '▶';
        stopVisualizer(button);
        return;
      }

      // había otra pista sonando: pararla y devolverle su icono
      if (currentButton && currentButton !== button) {
        currentAudio.pause();
        currentButton.textContent = '▶';
        stopVisualizer(currentButton);
      }

      if (currentButton !== button || !currentAudio) {
        currentAudio = new Audio(src);
        currentAudio.addEventListener('ended', () => {
          currentAudio.currentTime = 0;
          button.textContent = '▶';
          stopVisualizer(button);
        });
        currentAudio.addEventListener('error', () => {
          console.error('No se pudo cargar el audio:', src);
        });
      }

      currentButton = button;
      currentAudio.play().catch((err) => console.error('Reproducción bloqueada:', err));
      button.textContent = '⏸';
      animateBars(currentAudio, bars);
    });
  });
})();
