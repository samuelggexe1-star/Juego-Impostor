// La parte del navegador del modo online. Aqui no se decide nada: el servidor
// manda una vista con lo que este jugador puede ver y esto solo la pinta.
// Las acciones (votar, estar listo…) se mandan y se espera a que el servidor
// conteste con el estado nuevo.

import {
  miId, miNombre, guardarNombre, enviar, escuchar, hayServidor,
  enlaceDeSala, salaDelEnlace, SERVIDOR_ONLINE
} from './red.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const COLORES = {
  rojo: '#c51111', azul: '#132ed1', verde: '#117f2d', rosa: '#ed54ba', naranja: '#ef7d0e',
  amarillo: '#f5f557', negro: '#3f474e', blanco: '#d6e0f0', morado: '#6b2fbb', marron: '#71491e',
  cian: '#38fedc', lima: '#50ef39', granate: '#6b2b3c', coral: '#d76464', gris: '#758593'
};

const CATEGORIAS_LOCALES = typeof CATEGORIAS !== 'undefined' ? CATEGORIAS : {}; // de palabras.js

let estado = null;      // la ultima vista que ha mandado el servidor
let conexion = null;
let codigoActual = '';
let desfase = 0;        // reloj del servidor - reloj de este movil
let faseAnterior = null;
let claveCarta = '';
let seleccion = null;   // a quien estoy a punto de votar
let claveExpulsion = '';

// ------------------------------------------------------------------ utilidades

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let temporizadorAviso = null;
function aviso(texto, ms = 2800) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.remove('oculto');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.add('oculto'), ms);
}

function irA(id) {
  $$('.pantalla').forEach((p) => p.classList.toggle('activa', p.id === id));
}

const jugador = (id) => (estado && estado.jugadores.find((j) => j.id === id)) || { id, nombre: '¿?', color: 'gris', conectado: false };
const nombre = (id) => jugador(id).nombre;
const soyAnfitrion = () => estado && estado.anfitrion === miId();

/** El muñequito. */
function avatar(id, clases = '') {
  const j = jugador(id);
  return `<span class="trip ${clases}" style="--c:${COLORES[j.color] || '#888'}" aria-hidden="true">` +
    '<i class="mochila"></i><i class="cuerpo"></i><i class="visor"></i></span>';
}

function segundosRestantes() {
  if (!estado || !estado.fin) return null;
  return Math.max(0, Math.ceil((estado.fin - (Date.now() + desfase)) / 1000));
}

function formatoTiempo(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ sonido

let audio = null;
function tono(f, dur = 0.15, vol = 0.12, tipo = 'sine', retraso = 0) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime + retraso;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur);
  } catch { /* sin audio */ }
}
const sonidos = {
  alarma: () => { for (let i = 0; i < 3; i++) { tono(880, 0.22, 0.12, 'square', i * 0.45); tono(660, 0.22, 0.12, 'square', i * 0.45 + 0.22); } },
  voto: () => tono(520, 0.08, 0.1, 'triangle'),
  expulsion: () => { tono(180, 1.2, 0.08, 'sawtooth'); tono(120, 1.6, 0.06, 'sine', 0.3); },
  letra: () => tono(1200, 0.02, 0.03, 'square'),
  victoria: () => [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.25, 0.12, 'triangle', i * 0.14)),
  derrota: () => [392, 370, 349, 262].forEach((f, i) => tono(f, 0.3, 0.12, 'sawtooth', i * 0.2)),
  carta: () => tono(880, 0.06, 0.06)
};
const vibrar = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

// ------------------------------------------------------------------ arranque

async function arrancar() {
  $('#nombre').value = miNombre();
  const deEnlace = salaDelEnlace();
  if (deEnlace) $('#codigoUnirse').value = deEnlace;

  if (!(await hayServidor())) {
    if (SERVIDOR_ONLINE && !location.href.startsWith(SERVIDOR_ONLINE)) {
      location.href = SERVIDOR_ONLINE.replace(/\/$/, '') + '/online.html' + location.search;
      return;
    }
    irA('pSinServidor');
    return;
  }
  irA('pEntrada');
  if (deEnlace && miNombre()) unirse(deEnlace);
}

function pedirNombre() {
  const n = $('#nombre').value.trim();
  if (!n) { aviso('Escribe tu nombre primero'); $('#nombre').focus(); return null; }
  guardarNombre(n);
  return n;
}

async function crear() {
  const n = pedirNombre();
  if (!n) return;
  try {
    const r = await enviar({ tipo: 'crear', nombre: n });
    conectar(r.codigo, n);
  } catch (e) { aviso(e.message); }
}

async function unirse(codigo) {
  const n = pedirNombre();
  if (!n) return;
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (c.length !== 4) { aviso('El código tiene 4 letras'); return; }
  try {
    await enviar({ tipo: 'entrar', sala: c, nombre: n });
    conectar(c, n);
  } catch (e) { aviso(e.message); }
}

function conectar(codigo, n) {
  if (conexion) conexion.cerrar();
  codigoActual = codigo;
  history.replaceState(null, '', '?sala=' + codigo);
  conexion = escuchar(codigo, n, {
    estado: pintar,
    echado: () => {
      salirDeSala();
      aviso('El anfitrión te ha echado de la sala');
    },
    abierto: () => $('#bannerRed').classList.add('oculto'),
    caido: () => $('#bannerRed').classList.remove('oculto')
  });
}

function salirDeSala() {
  if (conexion) conexion.cerrar();
  conexion = null;
  estado = null;
  codigoActual = '';
  faseAnterior = null;
  history.replaceState(null, '', location.pathname);
  $('#codigoCabecera').classList.add('oculto');
  irA('pEntrada');
}

async function mandar(tipo, datos = {}) {
  try {
    return await enviar({ tipo, sala: codigoActual, ...datos });
  } catch (e) {
    aviso(e.message);
    return null;
  }
}

// ------------------------------------------------------------------ pintar

function pintar(v) {
  estado = v;
  desfase = v.ahora - Date.now();
  $('#codigoCabecera').textContent = v.codigo;
  $('#codigoCabecera').classList.remove('oculto');

  const cambio = v.fase !== faseAnterior;
  if (cambio) alCambiarDeFase(faseAnterior, v.fase);
  faseAnterior = v.fase;

  switch (v.fase) {
    case 'sala': pintarSala(); irA('pSala'); break;
    case 'reparto': pintarReparto(); irA('pReparto'); break;
    case 'debate': pintarDebate(); irA('pDebate'); break;
    case 'votacion': pintarVotacion(); irA('pVotacion'); break;
    case 'resultado': pintarRecuento(); irA('pVotacion'); break;
    case 'expulsion': pintarExpulsion(); irA('pExpulsion'); break;
    case 'adivinar': pintarAdivinar(); irA('pAdivinar'); break;
    case 'final': pintarFinal(cambio); irA('pFinal'); break;
    default: break;
  }
  pintarRelojes();
}

function alCambiarDeFase(antes, ahora) {
  if (ahora === 'votacion') {
    seleccion = null;
    const r = estado.ronda;
    const esReunion = r.motivoVoto === 'reunion';
    $('#alarmaIcono').textContent = esReunion ? '🚨' : '⏰';
    $('#alarmaTexto').textContent = esReunion ? '¡REUNIÓN DE EMERGENCIA!' : '¡SE ACABÓ EL DEBATE!';
    $('#alarmaQuien').innerHTML = esReunion && r.convocante
      ? `${avatar(r.convocante, 'grande')}<span>${esc(nombre(r.convocante))} ha pulsado el botón</span>`
      : '<span>Toca votar</span>';
    const caja = $('#alarma');
    caja.classList.remove('oculto');
    sonidos.alarma();
    vibrar([200, 100, 200, 100, 200]);
    setTimeout(() => caja.classList.add('oculto'), 2200);
  }
  if (ahora === 'reparto') {
    claveCarta = '';
    $('#olRespuesta').value = '';
  }
  if (ahora === 'adivinar') $('#olAdivinanza').value = '';
}

/** Los contadores de tiempo se mueven solos entre estado y estado. */
function pintarRelojes() {
  if (!estado) return;
  const s = segundosRestantes();
  const f = estado.fase;
  if (f === 'debate') {
    const el = $('#olCrono');
    el.classList.toggle('oculto', s == null);
    if (s != null) {
      el.textContent = `⏱️ ${formatoTiempo(s)}`;
      el.classList.toggle('urgente', s <= 10);
    }
  }
  if (f === 'votacion') {
    $('#votoTiempo').textContent = s != null ? `La votación termina en ${s} s` : '';
    $('#votoTiempo').classList.toggle('urgente', s != null && s <= 10);
  }
  if (f === 'resultado') $('#votoTiempo').textContent = '';
  if (f === 'adivinar') $('#olCronoAdivinar').textContent = s != null ? `⏱️ ${s} s` : '';
}
setInterval(pintarRelojes, 250);

// ------------------------------------------------------------- sala de espera

const AJUSTE_CASILLAS = {
  olMostrarRol: 'mostrarRol', olVotosAnonimos: 'votosAnonimos', olAdivinar: 'adivinar',
  olNoEmpieza: 'noEmpieza', olTrampa: 'trampa', olPicante: 'picante', olPregJugadores: 'preguntasJugadores'
};
const AJUSTE_SELECTS = {
  olImpostores: 'impostores', olPista: 'pista', olTiempoDebate: 'tiempoDebate', olTiempoVoto: 'tiempoVoto'
};

function pintarSala() {
  const v = estado;
  const yo = miId();
  $('#codigoSala').textContent = v.codigo;
  $('#numSala').textContent = v.jugadores.filter((j) => j.conectado).length;

  $('#listaSala').innerHTML = v.jugadores.map((j) => `
    <div class="fila-tripulante ${j.conectado ? '' : 'desconectado'}">
      ${avatar(j.id)}
      <span class="nom">${esc(j.nombre)}${j.id === yo ? ' <small>(tú)</small>' : ''}${j.id === v.anfitrion ? ' 👑' : ''}</span>
      ${v.puntos[j.id] ? `<span class="puntos-chip">★${v.puntos[j.id]}</span>` : ''}
      ${!j.conectado ? '<small class="nota">desconectado</small>' : ''}
      ${soyAnfitrion() && j.id !== yo ? `<button class="chip-x" data-echar="${esc(j.id)}" aria-label="Echar">✕</button>` : ''}
    </div>`).join('');
  $$('[data-echar]').forEach((b) => b.addEventListener('click', () => {
    if (confirm(`¿Echar a ${nombre(b.dataset.echar)}?`)) mandar('echar', { quien: b.dataset.echar });
  }));

  pintarAjustes();

  const conectados = v.jugadores.filter((j) => j.conectado).length;
  const mando = soyAnfitrion();
  $('#btnEmpezar').classList.toggle('oculto', !mando);
  $('#btnEmpezar').disabled = conectados < 3;
  $('#notaEmpezar').textContent = mando
    ? (conectados < 3 ? `Faltan ${3 - conectados} jugador(es) para empezar. Pasa el código.` : '')
    : `Esperando a que ${nombre(v.anfitrion)} empiece la partida…`;
}

function pintarAjustes() {
  const a = estado.ajustes;
  const mando = soyAnfitrion();
  $('#panelAjustesOnline').classList.toggle('solo-lectura', !mando);
  $('#notaAjustes').textContent = mando ? 'Los cambias tú (anfitrión)' : 'Los elige el anfitrión';

  $$('#olModo button').forEach((b) => b.classList.toggle('sel', b.dataset.valor === a.modo));
  $('#grupoCategorias').classList.toggle('oculto', a.modo === 'preguntas');
  $('#grupoPista').classList.toggle('oculto', a.modo !== 'clasico');
  $('#grupoPreguntas').classList.toggle('oculto', a.modo !== 'preguntas');

  const cont = $('#olCategorias');
  const nombres = Object.keys(CATEGORIAS_LOCALES);
  if (cont.childElementCount !== nombres.length) {
    cont.innerHTML = nombres.map((n) => `<button class="categoria-btn" data-cat="${esc(n)}">
      <span class="cat-icono">${CATEGORIAS_LOCALES[n].icono}</span><span class="cat-nombre">${esc(n)}</span></button>`).join('');
    $$('#olCategorias [data-cat]').forEach((b) => b.addEventListener('click', () => {
      if (!soyAnfitrion()) return;
      const sel = new Set(estado.ajustes.categorias);
      if (sel.has(b.dataset.cat)) sel.delete(b.dataset.cat); else sel.add(b.dataset.cat);
      mandar('ajustes', { ajustes: { categorias: [...sel] } });
    }));
  }
  $$('#olCategorias [data-cat]').forEach((b) => b.classList.toggle('selected', a.categorias.includes(b.dataset.cat)));
  $('#olNumCategorias').textContent = a.categorias.length;
  $('#olTodas').textContent = a.categorias.length === nombres.length ? 'Ninguna' : 'Todas';

  for (const [idEl, clave] of Object.entries(AJUSTE_SELECTS)) {
    const el = $('#' + idEl);
    el.value = String(a[clave]);
    el.disabled = !mando;
  }
  for (const [idEl, clave] of Object.entries(AJUSTE_CASILLAS)) {
    const el = $('#' + idEl);
    el.checked = !!a[clave];
    el.disabled = !mando;
  }
}

$$('#olModo button').forEach((b) => b.addEventListener('click', () => {
  if (soyAnfitrion()) mandar('ajustes', { ajustes: { modo: b.dataset.valor } });
}));
$('#olTodas').addEventListener('click', () => {
  if (!soyAnfitrion()) return;
  const todas = Object.keys(CATEGORIAS_LOCALES);
  mandar('ajustes', { ajustes: { categorias: estado.ajustes.categorias.length === todas.length ? [] : todas } });
});
for (const [idEl, clave] of Object.entries(AJUSTE_SELECTS)) {
  $('#' + idEl).addEventListener('change', (e) => {
    const valor = clave === 'pista' ? e.target.value : Number(e.target.value);
    mandar('ajustes', { ajustes: { [clave]: valor } });
  });
}
for (const [idEl, clave] of Object.entries(AJUSTE_CASILLAS)) {
  $('#' + idEl).addEventListener('change', (e) => mandar('ajustes', { ajustes: { [clave]: e.target.checked } }));
}

$('#btnEmpezar').addEventListener('click', () => mandar('empezar'));
$('#btnIrse').addEventListener('click', async () => {
  if (!confirm('¿Salir de la sala?')) return;
  await mandar('irse');
  salirDeSala();
});
$('#btnCompartir').addEventListener('click', async () => {
  const enlace = enlaceDeSala(codigoActual);
  const texto = `¡Vente a jugar al Impostor! Sala ${codigoActual}`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Impostor', text: texto, url: enlace }); return; }
  } catch { return; }
  copiar(enlace, 'Enlace copiado');
});
$('#btnCopiarCodigo').addEventListener('click', () => copiar(codigoActual, 'Código copiado'));

async function copiar(texto, mensaje) {
  try { await navigator.clipboard.writeText(texto); aviso('📋 ' + mensaje); } catch { aviso(texto, 5000); }
}

// ------------------------------------------------------------------ cartas

function htmlCarta(carta) {
  if (!carta) return '';
  if (carta.tipo === 'pregunta') {
    return `<span class="rol">Tu pregunta</span><span class="pregunta">${esc(carta.texto)}</span>
      <span class="extra">Escribe tu respuesta abajo 🤫</span>`;
  }
  if (carta.tipo === 'palabra') {
    return `<span class="rol">Tu palabra</span><span class="palabra">${esc(carta.texto)}</span>`;
  }
  let extra = (carta.pistas || []).map((p) => `<span class="extra">${esc(p.etiqueta)}: <b>${esc(p.texto)}</b></span>`).join('');
  if (carta.compinches && carta.compinches.length) {
    extra += `<span class="extra">Tu compinche: <b>${esc(carta.compinches.join(', '))}</b></span>`;
  }
  if (!extra) extra = '<span class="extra">Escucha a los demás y disimula 😏</span>';
  return `<span class="rol">Eres el</span><span class="palabra">IMPOSTOR 🔪</span>${extra}`;
}

/** La carta se ve mientras se mantiene pulsada. */
function prepararCarta(carta, alVer) {
  const mostrar = (e) => {
    if (e) e.preventDefault();
    if (carta.classList.contains('girada')) return;
    carta.classList.add('girada');
    if (alVer) alVer();
  };
  const ocultar = () => carta.classList.remove('girada');
  carta.addEventListener('pointerdown', (e) => {
    try { carta.setPointerCapture(e.pointerId); } catch { /* nada */ }
    mostrar(e);
  });
  carta.addEventListener('pointerup', ocultar);
  carta.addEventListener('pointercancel', ocultar);
  carta.addEventListener('lostpointercapture', ocultar);
  carta.addEventListener('contextmenu', (e) => e.preventDefault());
  carta.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') mostrar(e); });
  carta.addEventListener('keyup', ocultar);
  carta.addEventListener('blur', ocultar);
}

let cartaVista = false;
prepararCarta($('#cartaOnline'), () => {
  cartaVista = true;
  const carta = estado && estado.yo.carta;
  if (carta && carta.tipo === 'impostor') vibrar([60, 40, 60]); else vibrar(30);
  sonidos.carta();
  actualizarBotonListo();
});
prepararCarta($('#cartaDebate'));

// ------------------------------------------------------------------ reparto

function pintarReparto() {
  const v = estado;
  const r = v.ronda;
  const yo = v.yo;
  $('#repartoRonda').textContent = `Ronda ${r.num}`;
  const esPregunta = r.modo === 'preguntas';

  if (!yo.participante) {
    $('#cartaOnline').classList.add('oculto');
    $('#btnListo').classList.add('oculto');
    $('#olZonaRespuesta').classList.add('oculto');
    $('#espectadorReparto').classList.remove('oculto');
  } else {
    $('#cartaOnline').classList.remove('oculto');
    $('#espectadorReparto').classList.add('oculto');
    const clave = JSON.stringify(yo.carta) + r.num;
    if (clave !== claveCarta) {
      claveCarta = clave;
      cartaVista = false;
      $('#cartaOnlineFrente').innerHTML = htmlCarta(yo.carta);
      $('#cartaOnlineFrente').classList.toggle('impostor', yo.carta && yo.carta.tipo === 'impostor');
      $('#cartaDebateFrente').innerHTML = htmlCarta(yo.carta);
      $('#cartaDebateFrente').classList.toggle('impostor', yo.carta && yo.carta.tipo === 'impostor');
    }
    $('#btnListo').classList.toggle('oculto', yo.listo);
    $('#olZonaRespuesta').classList.toggle('oculto', !esPregunta || yo.listo || !cartaVista);
    $('#btnListo').textContent = esPregunta ? 'Enviar respuesta ✔' : 'Listo ✔';
    actualizarBotonListo();
  }

  const conectados = r.participantes.filter((id) => jugador(id).conectado);
  const listos = r.listos.length;
  const espera = $('#esperaReparto');
  espera.classList.toggle('oculto', !(yo.listo || !yo.participante));
  espera.innerHTML = `<p>${yo.listo ? '✔ ¡Listo! ' : ''}Esperando a los demás: <b>${listos}/${conectados.length}</b></p>
    <div class="fila-avatares">${r.participantes.map((id) => avatar(id, r.listos.includes(id) ? '' : 'apagado')).join('')}</div>
    ${yo.respuesta ? `<p class="nota">Tu respuesta: <b>${esc(yo.respuesta)}</b></p>` : ''}`;
  $('#btnForzarReparto').classList.toggle('oculto', !(soyAnfitrion() && yo.listo && listos < r.participantes.length));
}

function actualizarBotonListo() {
  if (!estado || estado.fase !== 'reparto') return;
  const esPregunta = estado.ronda.modo === 'preguntas';
  if (esPregunta && cartaVista && !estado.yo.listo) $('#olZonaRespuesta').classList.remove('oculto');
  $('#btnListo').disabled = !cartaVista || (esPregunta && !$('#olRespuesta').value.trim());
}

$('#olRespuesta').addEventListener('input', actualizarBotonListo);
$('#olRespuesta').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#btnListo').disabled) $('#btnListo').click(); });
$('#btnListo').addEventListener('click', async () => {
  $('#btnListo').disabled = true;
  const r = await mandar('listo', { respuesta: $('#olRespuesta').value });
  if (!r) actualizarBotonListo();
  $('#olRespuesta').blur();
});
$('#btnForzarReparto').addEventListener('click', () => {
  if (confirm('¿Empezar sin esperar a los que faltan?')) mandar('forzar');
});

// ------------------------------------------------------------------ debate

function htmlRespuestas(marcarImpostores = []) {
  const r = estado.ronda;
  if (!r.respuestas) return '';
  return `<div class="respuestas">${r.participantes.map((id, i) => `
    <div class="respuesta ${r.vivos.includes(id) || estado.fase === 'final' ? '' : 'fuera'} ${marcarImpostores.includes(id) ? 'es-impostor' : ''}" style="animation-delay:${i * 0.1}s">
      ${avatar(id, 'mini')}<b>${esc(nombre(id))}</b><span>${esc(r.respuestas[id] || '—')}</span></div>`).join('')}</div>`;
}

function pintarDebate() {
  const v = estado;
  const r = v.ronda;
  $('#debateRondaOl').textContent = r.numDebate > 1 ? `Ronda ${r.num} · Vuelta ${r.numDebate}` : `Ronda ${r.num}`;
  $('#olEmpieza').innerHTML = `${avatar(r.empieza, 'mini')} ${esc(nombre(r.empieza))}`;
  $('#olSentido').textContent = r.horario ? 'Sentido de las agujas del reloj ⟳' : 'Sentido contrario a las agujas del reloj ⟲';
  $('#olOrden').innerHTML = r.orden.map((id, i) => `<span class="orden-item ${i === 0 ? 'primero' : ''}">
      ${avatar(id, 'mini')}<small>${i + 1}. ${esc(nombre(id))}</small></span>`).join('') +
    r.participantes.filter((id) => !r.vivos.includes(id)).map((id) => `<span class="orden-item fuera">
      ${avatar(id, 'mini muerto')}<small>${esc(nombre(id))}</small></span>`).join('');

  let instr;
  if (r.modo === 'preguntas') instr = 'Estas son las respuestas. ¿Cuál no encaja con la pregunta?';
  else if (r.numDebate === 1) instr = 'Por turnos, cada uno dice UNA palabra relacionada con la suya. Cuando lo tengáis claro, ¡botón rojo!';
  else instr = 'El impostor sigue suelto. Otra vuelta de palabras… ¡sin repetir!';
  if (r.expulsion && r.numDebate > 1) instr = `${r.expulsion.textos.join(' ')} ${instr}`;
  $('#olInstruccion').textContent = instr;

  $('#olRespuestasDebate').innerHTML = r.modo === 'preguntas'
    ? `${htmlRespuestas()}<p class="pregunta-real">La pregunta de verdad era:<br><b>"${esc(r.pregunta)}"</b></p>`
    : '';

  const vivo = v.yo.participante && v.yo.vivo;
  $('#zonaEmergencia').classList.toggle('oculto', !vivo);
  $('#olFantasma').classList.toggle('oculto', !(v.yo.participante && !v.yo.vivo));
  $('#panelMiCarta').classList.toggle('oculto', !v.yo.participante);
  if (v.yo.participante && !$('#cartaDebateFrente').innerHTML) {
    $('#cartaDebateFrente').innerHTML = htmlCarta(v.yo.carta);
    $('#cartaDebateFrente').classList.toggle('impostor', v.yo.carta && v.yo.carta.tipo === 'impostor');
  }
}

$('#btnEmergencia').addEventListener('click', () => {
  $('#btnEmergencia').classList.add('pulsado');
  setTimeout(() => $('#btnEmergencia').classList.remove('pulsado'), 300);
  mandar('reunion');
});

// ------------------------------------------------------------------ votacion

function puedoVotar() {
  const v = estado;
  return v.fase === 'votacion' && v.yo.participante && v.yo.vivo && v.yo.voto == null;
}

function pintarVotacion() {
  const v = estado;
  const r = v.ronda;
  $('#votoTituloOl').textContent = '¿Quién es el impostor?';
  $('#pVotacion').classList.remove('modo-recuento');

  $('#placas').innerHTML = r.participantes.map((id) => {
    const muerto = !r.vivos.includes(id);
    const haVotado = r.votaron.includes(id);
    const sel = seleccion === id;
    return `<div class="placa ${muerto ? 'muerta' : ''} ${sel ? 'seleccionada' : ''} ${puedoVotar() && !muerto ? 'votable' : ''}" data-placa="${esc(id)}">
      ${avatar(id, muerto ? 'muerto' : '')}
      <span class="placa-info"><span class="placa-nombre">${esc(nombre(id))}${id === miId() ? ' <small>(tú)</small>' : ''}</span></span>
      ${haVotado ? '<span class="sello">HA VOTADO</span>' : ''}
      ${muerto ? '<span class="calavera">💀</span>' : ''}
      ${sel ? `<span class="confirmar"><button data-si="${esc(id)}" aria-label="Confirmar">✔</button><button data-no aria-label="Cancelar">✖</button></span>` : ''}
    </div>`;
  }).join('');

  const opciones = [['saltar', '⏭️ SALTAR VOTO']];
  if (v.ajustes.trampa) opciones.push(['nadie', '🤡 NO HAY IMPOSTOR']);
  $('#filaSaltar').innerHTML = puedoVotar()
    ? opciones.map(([valor, texto]) => seleccion === valor
      ? `<span class="saltar seleccionada">${texto}<span class="confirmar"><button data-si="${valor}">✔</button><button data-no>✖</button></span></span>`
      : `<button class="saltar" data-especial="${valor}">${texto}</button>`).join('')
    : '';

  let miVoto = '';
  if (!v.yo.participante) miVoto = '👀 Estás mirando esta ronda.';
  else if (!v.yo.vivo) miVoto = '👻 Los expulsados no votan.';
  else if (v.yo.voto === 'saltar') miVoto = 'Has saltado tu voto.';
  else if (v.yo.voto === 'nadie') miVoto = 'Has votado que no hay impostor.';
  else if (v.yo.voto) miVoto = `Has votado a <b>${esc(nombre(v.yo.voto))}</b>.`;
  else miVoto = 'Toca a quien quieras expulsar.';
  const faltan = r.vivos.filter((id) => jugador(id).conectado && !r.votaron.includes(id)).length;
  $('#miVoto').innerHTML = `${miVoto} <span class="nota">· Faltan ${faltan} por votar</span>`;
  $('#btnForzarVoto').classList.toggle('oculto', !(soyAnfitrion() && faltan > 0 && v.yo.voto != null));

  $$('#placas .placa.votable').forEach((p) => p.addEventListener('click', (e) => {
    if (e.target.closest('.confirmar')) return;
    seleccion = p.dataset.placa;
    sonidos.voto();
    pintarVotacion();
  }));
  $$('[data-especial]').forEach((b) => b.addEventListener('click', () => {
    seleccion = b.dataset.especial;
    sonidos.voto();
    pintarVotacion();
  }));
  $$('[data-no]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    seleccion = null;
    pintarVotacion();
  }));
  $$('[data-si]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const voto = b.dataset.si;
    seleccion = null;
    vibrar(40);
    await mandar('votar', { voto });
  }));
}

$('#btnForzarVoto').addEventListener('click', () => {
  if (confirm('¿Cerrar la votación sin esperar a los que faltan?')) mandar('forzar');
});

function pintarRecuento() {
  const v = estado;
  const r = v.ronda;
  const uv = r.ultimoVoto;
  $('#pVotacion').classList.add('modo-recuento');
  $('#votoTituloOl').textContent = 'Recuento de votos';
  const votantes = (lista) => (lista || []).map((id, i) =>
    `<span class="votante" style="animation-delay:${0.3 + i * 0.25}s">${id ? avatar(id, 'mini') : '<span class="trip-anonimo"></span>'}</span>`).join('');

  $('#placas').innerHTML = r.participantes.map((id) => {
    const muerto = !r.vivos.includes(id);
    return `<div class="placa ${muerto ? 'muerta' : ''} ${uv.expulsado === id ? 'expulsada' : ''}">
      ${avatar(id, muerto ? 'muerto' : '')}
      <span class="placa-info"><span class="placa-nombre">${esc(nombre(id))}</span>
      <span class="votantes">${votantes(uv.detalle[id])}</span></span>
    </div>`;
  }).join('');

  let pie = `<div class="fila-recuento"><b>SALTARON:</b> <span class="votantes">${votantes(uv.detalle.saltar)}</span></div>`;
  if (uv.detalle.nadie) pie += `<div class="fila-recuento"><b>🤡 NO HAY IMPOSTOR:</b> <span class="votantes">${votantes(uv.detalle.nadie)}</span></div>`;
  if (uv.noVotaron.length) pie += `<div class="fila-recuento nota">No votaron: ${uv.noVotaron.map((id) => esc(nombre(id))).join(', ')}</div>`;
  $('#filaSaltar').innerHTML = pie;
  $('#miVoto').innerHTML = '';
  $('#btnForzarVoto').classList.add('oculto');
}

// ------------------------------------------------------------------ expulsion

function pintarExpulsion() {
  const r = estado.ronda;
  const e = r.expulsion;
  if (!e) return;
  const clave = `${r.num}-${r.numDebate}-${e.textos.join('|')}`;
  if (clave === claveExpulsion) return;
  claveExpulsion = clave;

  const flotante = $('#flotante');
  flotante.innerHTML = e.expulsado ? avatar(e.expulsado, 'enorme') : '';
  flotante.classList.remove('vuela');
  void flotante.offsetWidth; // reinicia la animacion
  if (e.expulsado) flotante.classList.add('vuela');
  sonidos.expulsion();

  escribirLento($('#textoExpulsion1'), e.textos[0] || '', 900, () => {
    escribirLento($('#textoExpulsion2'), e.textos.slice(1).join(' '), 300);
  });
  $('#textoExpulsion2').textContent = '';
}

/** Escribe letra a letra, como en Among Us. */
function escribirLento(el, texto, retraso = 0, alAcabar) {
  el.textContent = '';
  const clave = Symbol('escritura');
  el._escritura = clave;
  setTimeout(() => {
    let i = 0;
    const paso = () => {
      if (el._escritura !== clave) return;
      el.textContent = texto.slice(0, ++i);
      if (i % 2) sonidos.letra();
      if (i < texto.length) setTimeout(paso, 55);
      else if (alAcabar) setTimeout(alAcabar, 250);
    };
    if (texto) paso(); else if (alAcabar) alAcabar();
  }, retraso);
}

// ------------------------------------------------------------------ adivinar

function pintarAdivinar() {
  const r = estado.ronda;
  const soyYo = r.adivina === miId();
  $('#adivinaAvatar').innerHTML = avatar(r.adivina, 'grande');
  $('#adivinaTitulo').textContent = soyYo ? '¡Te han pillado!' : `${nombre(r.adivina)} era el impostor`;
  $('#adivinaTexto').textContent = soyYo
    ? 'Última oportunidad: si aciertas la palabra, ganas tú igualmente.'
    : 'Está intentando adivinar la palabra para robaros la victoria… 😬';
  $('#formAdivinar').classList.toggle('oculto', !soyYo);
}

$('#formAdivinar').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = $('#olAdivinanza').value.trim();
  if (!texto) return;
  mandar('adivinar', { texto });
});

// ------------------------------------------------------------------ final

function pintarFinal(recienLlegado) {
  const v = estado;
  const r = v.ronda;
  const f = r.final;
  const res = f.resultado;
  const yo = miId();
  const soyImpostor = f.impostores.includes(yo);

  let banner = 'FIN DE LA RONDA';
  let clase = 'neutro';
  if (v.yo.participante) {
    if (res.ganan === 'inocentes') { banner = soyImpostor ? 'DERROTA' : 'VICTORIA'; clase = soyImpostor ? 'derrota' : 'victoria'; }
    else if (res.ganan === 'impostores') { banner = soyImpostor ? 'VICTORIA' : 'DERROTA'; clase = soyImpostor ? 'victoria' : 'derrota'; }
    else if (res.ganan === 'todos') { banner = 'VICTORIA'; clase = 'victoria'; }
  }
  $('#bannerFinal').className = `banner-final ${clase}`;
  $('#bannerTexto').textContent = banner;
  const ganadores = res.ganan === 'impostores' ? f.impostores
    : res.ganan === 'inocentes' ? r.participantes.filter((id) => !f.impostores.includes(id))
      : res.ganan === 'todos' ? r.participantes : [];
  $('#bannerEquipo').innerHTML = ganadores.map((id) => `<span class="ganador">${avatar(id, 'grande')}<small>${esc(nombre(id))}</small></span>`).join('');

  $('#olFinalTitulo').textContent = res.titulo;
  $('#olFinalSubtitulo').textContent = res.subtitulo;

  const esPregunta = r.modo === 'preguntas';
  const cajas = [];
  cajas.push(`<div><small>${esPregunta ? 'La pregunta era' : `La palabra era (${esc(f.categoria)})`}</small><b>${esc(f.palabra)}</b></div>`);
  if ((r.modo === 'undercover' || esPregunta) && f.trampa !== 'ninguno') {
    cajas.push(`<div><small>${esPregunta ? 'La pregunta del impostor era' : 'El undercover tenía'}</small><b>${esc(f.gemela)}</b></div>`);
  }
  const quienes = f.trampa === 'ninguno' ? 'Nadie 🤡' : f.trampa === 'todos' ? 'Todos 😂'
    : f.impostores.map((id) => `${avatar(id, 'mini')} ${esc(nombre(id))}`).join('  ');
  cajas.push(`<div><small>Impostor(es)</small><b class="con-avatares">${quienes}</b></div>`);
  if (f.adivinanza) {
    cajas.push(`<div><small>Intentó adivinar</small><b>${f.adivinanza.texto ? `"${esc(f.adivinanza.texto)}"` : 'No le dio tiempo'} ${f.adivinanza.acierto ? '✅' : '❌'}</b></div>`);
  }
  if (esPregunta && r.respuestas) cajas.push(`<div><small>Respuestas</small>${htmlRespuestas(f.impostores)}</div>`);
  $('#olRevelacion').innerHTML = cajas.join('');

  // Marcador de la sala
  const delta = res.delta || {};
  const filas = v.jugadores.map((j) => ({ id: j.id, p: v.puntos[j.id] || 0 })).sort((a, b) => b.p - a.p);
  const medallas = ['🥇', '🥈', '🥉'];
  $('#olMarcador').innerHTML = filas.map((fi, i) => `<div class="marcador-fila">
      <span class="pos">${fi.p > 0 && medallas[i] ? medallas[i] : i + 1}</span>
      ${avatar(fi.id, 'mini')}<span class="nom">${esc(nombre(fi.id))}</span>
      <span class="pts">${fi.p}${delta[fi.id] ? `<span class="suma">+${delta[fi.id]}</span>` : ''}</span></div>`).join('');

  const mando = soyAnfitrion();
  $('#btnOtraOl').classList.toggle('oculto', !mando);
  $('#btnVolverSala').classList.toggle('oculto', !mando);
  $('#notaFinal').textContent = mando ? '' : `Esperando a que ${nombre(v.anfitrion)} empiece otra ronda…`;

  if (recienLlegado) {
    if (clase === 'victoria') sonidos.victoria();
    else if (clase === 'derrota') sonidos.derrota();
  }
}

$('#btnOtraOl').addEventListener('click', () => mandar('empezar'));
$('#btnVolverSala').addEventListener('click', () => mandar('volver'));

// ------------------------------------------------------------------ entrada

$('#btnCrear').addEventListener('click', crear);
$('#formUnirse').addEventListener('submit', (e) => {
  e.preventDefault();
  unirse($('#codigoUnirse').value);
});
$('#codigoUnirse').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});

arrancar();
