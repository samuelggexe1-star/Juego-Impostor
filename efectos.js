/* =========================================================
   EFECTOS — animaciones compartidas por el modo local y el online
   ---------------------------------------------------------
   Todo es opcional: si el móvil tiene activado "reducir movimiento",
   cada efecto se convierte en nada y el juego funciona igual.
   Solo se animan transform y opacity (lo que el móvil mueve gratis),
   con la API de animaciones del navegador (element.animate).
   ========================================================= */
(function () {
  const quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverReal = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SALIDA = 'cubic-bezier(0.23, 1, 0.32, 1)';      // ease-out "quint": entra rápido y frena suave
  const REBOTE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';   // un pelín de rebote
  const azar = (a, b) => a + Math.random() * (b - a);

  /* ---------- Cambio de pantalla con View Transitions ---------- */
  function cambio(actualizar) {
    if (quieto || !document.startViewTransition) { actualizar(); return; }
    try { document.startViewTransition(actualizar); } catch (e) { actualizar(); }
  }

  /* ---------- Onda al pulsar (como en Android) ---------- */
  const SELECTOR_ONDA = '.btn, .preset, .modo, .modo-ol, .pastilla, .categoria-btn, .fila-voto, .voto-btn, .especial, .segmentado button, .seccion-cabecera, .sala-publica .btn';
  document.addEventListener('pointerdown', (e) => {
    if (quieto) return;
    const el = e.target.closest(SELECTOR_ONDA);
    if (!el || el.disabled) return;
    const caja = el.getBoundingClientRect();
    const lado = Math.max(caja.width, caja.height) * 2.2;
    const onda = document.createElement('span');
    onda.className = 'onda';
    onda.style.cssText = `width:${lado}px;height:${lado}px;left:${e.clientX - caja.left - lado / 2}px;top:${e.clientY - caja.top - lado / 2}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('con-onda');
    el.appendChild(onda);
    onda.animate([{ transform: 'scale(0)', opacity: 0.35 }, { transform: 'scale(1)', opacity: 0 }],
      { duration: 550, easing: SALIDA }).onfinish = () => onda.remove();
  }, { passive: true });

  /* ---------- Estallido de partículas (confeti, emojis, chispas) ---------- */
  const COLORES = ['#22c1c3', '#6ee7b7', '#fbbf24', '#fb7185', '#a78bfa', '#ffffff', '#60a5fa'];
  function centroDe(origen) {
    if (origen && origen.getBoundingClientRect) {
      const c = origen.getBoundingClientRect();
      return [c.left + c.width / 2, c.top + c.height / 2];
    }
    if (Array.isArray(origen)) return origen;
    return [innerWidth / 2, innerHeight / 2];
  }
  function estallido(origen, { emojis = null, n = 18, fuerza = 1, gravedad = 1 } = {}) {
    if (quieto) return;
    const [x, y] = centroDe(origen);
    const capa = document.getElementById('capaEfectos') || crearCapa();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'particula';
      if (emojis) {
        p.textContent = emojis[i % emojis.length];
        p.style.fontSize = `${azar(14, 26)}px`;
      } else {
        p.classList.add('chispa');
        p.style.background = COLORES[i % COLORES.length];
        p.style.width = `${azar(5, 10)}px`;
        p.style.height = `${azar(8, 14)}px`;
        p.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      }
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      capa.appendChild(p);
      const ang = azar(0, Math.PI * 2);
      const dist = azar(50, 140) * fuerza;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - azar(20, 70) * fuerza;
      const giro = azar(-360, 360);
      p.animate([
        { transform: 'translate(-50%, -50%) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${giro / 2}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 90 * gravedad}px)) scale(.8) rotate(${giro}deg)`, opacity: 0 }
      ], { duration: azar(800, 1300), easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
    }
  }

  /** Lluvia de confeti desde arriba (para ganar). */
  function confeti(n = 90) {
    if (quieto) return;
    const capa = document.getElementById('capaEfectos') || crearCapa();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'particula chispa';
      p.style.background = COLORES[i % COLORES.length];
      p.style.width = `${azar(6, 11)}px`;
      p.style.height = `${azar(10, 16)}px`;
      p.style.left = `${azar(0, innerWidth)}px`;
      p.style.top = '-20px';
      capa.appendChild(p);
      const deriva = azar(-80, 80);
      p.animate([
        { transform: 'translateY(0) rotate(0deg) rotateY(0deg)', opacity: 1 },
        { transform: `translate(${deriva}px, ${innerHeight + 40}px) rotate(${azar(360, 900)}deg) rotateY(${azar(360, 1080)}deg)`, opacity: 0.9 }
      ], { duration: azar(2200, 3800), delay: azar(0, 600), easing: 'cubic-bezier(.3,.1,.5,1)' }).onfinish = () => p.remove();
    }
  }

  /* ---------- Texto que se "descifra" letra a letra ---------- */
  const SIGNOS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ#%&?!*';
  function descifrar(el, texto, duracion = 700) {
    if (!el) return;
    if (quieto) { el.textContent = texto; return; }
    const total = texto.length;
    const inicio = performance.now();
    el._descifrando = (el._descifrando || 0) + 1;
    const mio = el._descifrando;
    const paso = (ahora) => {
      if (el._descifrando !== mio) return;
      const t = Math.min(1, (ahora - inicio) / duracion);
      const fijas = Math.floor(t * total);
      let s = texto.slice(0, fijas);
      for (let i = fijas; i < total; i++) s += texto[i] === ' ' ? ' ' : SIGNOS[(Math.random() * SIGNOS.length) | 0];
      el.textContent = s;
      if (t < 1) requestAnimationFrame(paso); else el.textContent = texto;
    };
    requestAnimationFrame(paso);
  }

  /* ---------- Números que cuentan hasta su valor ---------- */
  function contar(el, hasta, { desde = 0, duracion = 900, sufijo = '' } = {}) {
    if (!el) return;
    if (quieto || hasta === desde) { el.textContent = hasta + sufijo; return; }
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(desde + (hasta - desde) * suave) + sufijo;
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ---------- Sacudir, latir y destellos ---------- */
  function sacudir(el = document.querySelector('.app'), fuerza = 8) {
    if (quieto || !el) return;
    el.animate([0, -1, 1, -1, 1, -0.5, 0.5, 0].map((k) => ({ transform: `translateX(${k * fuerza}px)` })),
      { duration: 420, easing: 'ease-out' });
  }
  function latido(el, escala = 1.12) {
    if (quieto || !el) return;
    el.animate([{ transform: 'scale(1)' }, { transform: `scale(${escala})` }, { transform: 'scale(1)' }],
      { duration: 380, easing: REBOTE });
  }
  function destello(color = 'rgba(110,231,183,.35)') {
    if (quieto) return;
    const capa = document.getElementById('capaEfectos') || crearCapa();
    const d = document.createElement('div');
    d.className = 'destello-pantalla';
    d.style.background = `radial-gradient(circle at 50% 40%, ${color}, transparent 70%)`;
    capa.appendChild(d);
    d.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => d.remove();
  }

  /** Un ✔ que se dibuja (para "Listo" y para confirmar el voto). */
  function check(origen) {
    if (quieto) return;
    const [x, y] = centroDe(origen);
    const capa = document.getElementById('capaEfectos') || crearCapa();
    const caja = document.createElement('div');
    caja.className = 'check-dibujo';
    caja.style.left = `${x}px`;
    caja.style.top = `${y}px`;
    caja.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27 l8 8 l15 -17"/></svg>';
    capa.appendChild(caja);
    caja.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.7)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.2 },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.75 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.15)' }],
    { duration: 1100, easing: SALIDA }).onfinish = () => caja.remove();
  }

  function crearCapa() {
    const capa = document.createElement('div');
    capa.id = 'capaEfectos';
    document.body.appendChild(capa);
    return capa;
  }

  /* ---------- Cartas con inclinación 3D y brillo al mover el dedo/ratón ---------- */
  document.addEventListener('pointermove', (e) => {
    if (quieto || !hoverReal) return;
    const carta = e.target.closest('.carta, .preset, .modo-ol, .sala-publica');
    document.querySelectorAll('.inclinada').forEach((c) => { if (c !== carta) { c.classList.remove('inclinada'); c.style.transform = ''; } });
    if (!carta || carta.classList.contains('carta-mini')) return;
    const r = carta.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const fuerte = carta.classList.contains('carta') ? 10 : 5;
    carta.classList.add('inclinada');
    carta.style.setProperty('--brillo-x', `${(px + 0.5) * 100}%`);
    carta.style.setProperty('--brillo-y', `${(py + 0.5) * 100}%`);
    if (!carta.classList.contains('carta')) carta.style.transform = `perspective(700px) rotateX(${-py * fuerte}deg) rotateY(${px * fuerte}deg) translateY(-2px)`;
  }, { passive: true });

  /* ---------- Botones grandes "magnéticos" (solo con ratón) ---------- */
  document.addEventListener('pointermove', (e) => {
    if (quieto || !hoverReal) return;
    const b = e.target.closest('.btn-grande');
    document.querySelectorAll('.btn-grande.iman').forEach((x) => { if (x !== b) { x.classList.remove('iman'); x.style.translate = ''; } });
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    b.classList.add('iman');
    b.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 8}px ${((e.clientY - r.top) / r.height - 0.5) * 6}px`;
  }, { passive: true });

  /* ---------- Fondo de partículas que flotan ---------- */
  function fondo() {
    if (quieto) return;
    const lienzo = document.createElement('canvas');
    lienzo.id = 'fondoParticulas';
    document.body.prepend(lienzo);
    const ctx = lienzo.getContext('2d');
    let w = 0; let h = 0; let dpr = 1;
    const puntos = [];
    let mx = 0; let my = 0;
    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      lienzo.width = w * dpr; lienzo.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    addEventListener('resize', medir);
    const cuantos = Math.round(Math.min(60, (innerWidth * innerHeight) / 18000));
    for (let i = 0; i < cuantos; i++) {
      puntos.push({ x: Math.random() * w, y: Math.random() * h, r: azar(0.6, 2.2), v: azar(0.08, 0.35), f: azar(0, 6.28), c: Math.random() < 0.2 ? '110,231,183' : '255,255,255' });
    }
    addEventListener('pointermove', (e) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; }, { passive: true });
    let ultimo = 0;
    const dibujar = (t) => {
      requestAnimationFrame(dibujar);
      if (document.hidden || t - ultimo < 33) return; // unos 30 fps de sobra
      ultimo = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of puntos) {
        p.y -= p.v; p.f += 0.01;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        const x = p.x + Math.sin(p.f) * 6 + mx * p.r * 10;
        const y = p.y + my * p.r * 10;
        const brillo = 0.25 + Math.sin(p.f * 2) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(${p.c},${brillo})`;
        ctx.fill();
      }
    };
    requestAnimationFrame(dibujar);
  }

  /* ---------- El título entra letra a letra ---------- */
  function tituloAnimado() {
    if (quieto) return;
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const nodo = h1.firstChild;
    if (!nodo || nodo.nodeType !== 3) return;
    const texto = nodo.textContent;
    const trozo = document.createElement('span');
    trozo.className = 'letras';
    trozo.innerHTML = [...texto].map((l) => (l.trim() ? `<span>${l}</span>` : l)).join('');
    h1.replaceChild(trozo, nodo);
  }

  /* ---------- Un cambio de texto que entra deslizando ---------- */
  function cambiarTexto(el, texto) {
    if (!el || el.textContent === texto) return;
    el.textContent = texto;
    if (quieto) return;
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: SALIDA });
  }

  window.Efectos = { cambio, estallido, confeti, descifrar, contar, sacudir, latido, destello, check, cambiarTexto, quieto };

  document.addEventListener('DOMContentLoaded', () => { fondo(); tituloAnimado(); });
})();
