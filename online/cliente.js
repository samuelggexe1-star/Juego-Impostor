// La parte del navegador del modo online. Aqui no se decide nada: el servidor
// manda una vista con lo que este jugador puede ver y esto solo la pinta.
// Las acciones (votar, estar listo…) se mandan y se espera a que el servidor
// conteste con el estado nuevo.

import {
  miId, cargarPerfil, guardarPerfil, ultimaSala, recordarSala, enviar, escuchar, escucharChat, hayServidor,
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

/** Anima la lista solo cuando cambia lo que hay en ella (no en cada repintado). */
function animarSiCambia(el, clave) {
  if (!el || el._clave === clave) return;
  el._clave = clave;
  el.classList.remove('animar');
  void el.offsetWidth;
  el.classList.add('animar');
  clearTimeout(el._tAnimar);
  el._tAnimar = setTimeout(() => el.classList.remove('animar'), 1000);
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
  if (j.foto) {
    const src = `/api/foto?sala=${encodeURIComponent(codigoActual)}&id=${encodeURIComponent(id)}&v=${j.foto}`;
    return `<span class="foto-perfil ${clases}" style="--c:${COLORES[j.color] || '#888'}"><img src="${src}" alt="" loading="lazy" /></span>`;
  }
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
  fin: () => { tono(784, 0.2, 0.12, 'square'); tono(523, 0.35, 0.12, 'square', 0.22); },
  voto: () => tono(520, 0.08, 0.1, 'triangle'),
  expulsion: () => { tono(180, 1.2, 0.08, 'sawtooth'); tono(120, 1.6, 0.06, 'sine', 0.3); },
  letra: () => tono(1200, 0.02, 0.03, 'square'),
  victoria: () => [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.25, 0.12, 'triangle', i * 0.14)),
  derrota: () => [392, 370, 349, 262].forEach((f, i) => tono(f, 0.3, 0.12, 'sawtooth', i * 0.2)),
  carta: () => tono(880, 0.06, 0.06)
};
const vibrar = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

// ------------------------------------------------------------------ arranque

let perfil = cargarPerfil();

async function arrancar() {
  pintarPerfil();
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
  pintarPublicas();
  abrirChatGeneral();
  if (!perfil.nombre) { abrirPerfil(true); return; }
  // Recargar la pagina en plena partida te devuelve a tu sitio
  if (deEnlace) unirse(deEnlace);
}

/** Sin nombre no se juega: abre el perfil para crearlo. */
function tengoPerfil() {
  if (perfil.nombre) return true;
  abrirPerfil(true);
  return false;
}

/** Lo que se manda al entrar: el color va aparte, la foto despues. */
async function subirFoto(codigo) {
  if (!perfil.foto) return;
  try { await enviar({ tipo: 'perfil', sala: codigo, perfil: { foto: perfil.foto } }); } catch { /* sin foto, da igual */ }
}

async function crear() {
  if (!tengoPerfil()) return;
  try {
    const r = await enviar({ tipo: 'crear', nombre: perfil.nombre, color: perfil.color });
    await subirFoto(r.codigo);
    conectar(r.codigo);
  } catch (e) { aviso(e.message); }
}

async function unirse(codigo, espectador = $('#chkEspectador').checked) {
  if (!tengoPerfil()) return;
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (c.length < 3) { aviso('El código tiene 4 letras'); return; }
  try {
    await enviar({ tipo: 'entrar', sala: c, nombre: perfil.nombre, color: perfil.color, espectador });
    await subirFoto(c);
    conectar(c, espectador);
  } catch (e) {
    aviso(e.message);
    if (c === ultimaSala()) { recordarSala(''); pintarTarjeta(); }
    history.replaceState(null, '', location.pathname);
  }
}

function conectar(codigo, espectador = false) {
  if (conexion) conexion.cerrar();
  codigoActual = codigo;
  recordarSala(codigo);
  history.replaceState(null, '', '?sala=' + codigo);
  conexion = escuchar(codigo, perfil.nombre, perfil.color, espectador, {
    estado: pintar,
    echado: () => {
      recordarSala('');
      salirDeSala();
      aviso('El anfitrión te ha echado de la sala');
    },
    abierto: () => $('#bannerRed').classList.add('oculto'),
    caido: () => $('#bannerRed').classList.remove('oculto')
  });
}

// El anfitrion termina la ronda sin salirse: se revela todo y nadie suma
$('#btnTerminar').addEventListener('click', async () => {
  if (!confirm('¿Terminar la partida para todos? Se verá quién era el impostor y nadie sumará puntos.')) return;
  const r = await mandar('terminar');
  if (r) aviso('⏹️ Partida terminada');
});

// El boton de la puerta: salir de la sala aunque la partida este en marcha
$('#btnSalirPartida').addEventListener('click', async () => {
  if (!codigoActual) return;
  const enMarcha = estado && !['sala', 'final'].includes(estado.fase) && estado.yo.participante && estado.yo.vivo;
  const pregunta = enMarcha
    ? '¿Salir de la partida? Dejarás de jugar esta ronda y no te llevarás puntos.'
    : '¿Salir de la sala?';
  if (!confirm(pregunta)) return;
  await mandar('irse');
  recordarSala('');
  salirDeSala();
  aviso('🚪 Has salido de la sala');
});

function salirDeSala() {
  if (conexion) conexion.cerrar();
  conexion = null;
  estado = null;
  codigoActual = '';
  faseAnterior = null;
  history.replaceState(null, '', location.pathname);
  $('#btnSalirPartida').classList.add('oculto');
  $('#btnTerminar').classList.add('oculto');
  pintarPerfil();
  irA('pEntrada');
  pintarPublicas();
}

async function mandar(tipo, datos = {}) {
  try {
    return await enviar({ tipo, sala: codigoActual, ...datos });
  } catch (e) {
    aviso(e.message);
    return null;
  }
}

// ------------------------------------------------------------------ salas publicas

const NOMBRES_MODO = { clasico: '🕵️ Clásico', undercover: '🎭 Undercover', preguntas: '💬 Preguntas' };

async function pintarPublicas() {
  if (codigoActual || !$('#pEntrada').classList.contains('activa')) return;
  let lista;
  try {
    const r = await fetch('/api/salas', { cache: 'no-store' });
    lista = (await r.json()).salas;
  } catch {
    $('#listaPublicas').innerHTML = '<p class="nota">No se han podido cargar las salas.</p>';
    return;
  }
  animarSiCambia($('#listaPublicas'), lista.map((s) => s.codigo + s.jugadores + s.fase).join());
  $('#listaPublicas').innerHTML = lista.map((s) => {
    const estadoSala = s.jugadores === 0 ? 'Vacía'
      : s.fase === 'sala' ? 'Esperando para empezar' : 'Jugando · entrarás en la siguiente ronda';
    const llena = s.jugadores >= s.max;
    const caras = s.quienes.map((q) => `<span class="trip mini" style="--c:${COLORES[q.color] || '#888'}" title="${esc(q.nombre)}"><i class="mochila"></i><i class="cuerpo"></i><i class="visor"></i></span>`).join('');
    return `<div class="sala-publica ${s.fase !== 'sala' ? 'jugando' : ''}">
      <div class="sala-publica-info">
        <b>${esc(s.nombre)}</b>
        <small>${s.jugadores}/${s.max}${s.espectadores ? ` (+${s.espectadores} 👀)` : ''} · ${esc(estadoSala)}${s.jugadores ? ` · ${NOMBRES_MODO[s.modo] || ''}` : ''}</small>
        ${caras ? `<span class="caras">${caras}</span>` : ''}
        ${s.quienes.length ? `<small class="nombres">${s.quienes.map((q) => esc(q.nombre)).join(', ')}</small>` : ''}
      </div>
      <div class="botones-publica">
        <button class="btn" data-publica="${esc(s.codigo)}" ${llena ? 'disabled' : ''}>${llena ? 'Llena' : 'Jugar'}</button>
        <button class="btn btn-secundario" data-mirar="${esc(s.codigo)}">👀 Mirar</button>
      </div>
    </div>`;
  }).join('');
  $$('[data-publica]').forEach((b) => b.addEventListener('click', () => unirse(b.dataset.publica, false)));
  $$('[data-mirar]').forEach((b) => b.addEventListener('click', () => unirse(b.dataset.mirar, true)));
}
setInterval(pintarPublicas, 4000);

// ------------------------------------------------------------------ chat general

let chatAbierto = false;
let chatNuevos = 0;
let chatFuente = null;

function abrirChatGeneral() {
  if (chatFuente) return;
  $('#btnChat').classList.remove('oculto');
  chatFuente = escucharChat({
    historial: ({ mensajes }) => {
      const cont = $('#chatMensajes');
      if (mensajes.length) cont.innerHTML = '';
      mensajes.forEach((m) => pintarMensaje(m, false));
      bajarChat();
    },
    mensaje: (m) => {
      pintarMensaje(m, true);
      if (m.autor === miId()) return;
      if (!chatAbierto) {
        chatNuevos++;
        const globo = $('#chatNuevos');
        globo.textContent = chatNuevos > 9 ? '9+' : chatNuevos;
        globo.classList.remove('oculto');
        const b = $('#btnChat');
        b.classList.remove('rebota'); void b.offsetWidth; b.classList.add('rebota');
      }
      tono(1046, 0.06, 0.05, 'sine');
    },
    gente: ({ n }) => { $('#chatGente').textContent = n === 1 ? 'Solo estás tú' : `${n} conectados`; },
    caido: () => { $('#chatGente').textContent = 'Reconectando…'; }
  });
}

function pintarMensaje(m, nuevo) {
  const cont = $('#chatMensajes');
  if (cont.querySelector('.nota')) cont.innerHTML = '';
  const mio = m.autor === miId();
  const hora = new Date(m.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = `mensaje ${mio ? 'mio' : ''} ${nuevo ? 'nuevo' : ''}`;
  div.style.setProperty('--c', COLORES[m.color] || '#64748b');
  div.innerHTML = `${mio ? '' : `<span class="inicial">${esc((m.nombre[0] || '?').toUpperCase())}</span>`}
    <div class="burbuja">
      ${mio ? '' : `<span class="mensaje-autor">${esc(m.nombre)}${m.donde ? ` <small>· ${esc(m.donde)}</small>` : ''}</span>`}
      <span class="mensaje-texto">${esc(m.texto)}</span>
      <small class="mensaje-hora">${hora}</small>
    </div>`;
  const abajo = cont.scrollHeight - cont.scrollTop - cont.clientHeight < 80;
  cont.appendChild(div);
  while (cont.children.length > 120) cont.firstElementChild.remove();
  if (abajo || mio) bajarChat();
}

function bajarChat() {
  const cont = $('#chatMensajes');
  cont.scrollTop = cont.scrollHeight;
}

function mostrarChat(abrir) {
  chatAbierto = abrir;
  $('#hojaChat').classList.toggle('abierta', abrir);
  $('#hojaChat').setAttribute('aria-hidden', String(!abrir));
  $('#btnChat').classList.toggle('activo', abrir);
  if (abrir) {
    chatNuevos = 0;
    $('#chatNuevos').classList.add('oculto');
    bajarChat();
    setTimeout(() => $('#inputChat').focus(), 250);
  }
}

$('#btnChat').addEventListener('click', () => mostrarChat(!chatAbierto));
$('#cerrarChat').addEventListener('click', () => mostrarChat(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chatAbierto) mostrarChat(false); });

$('#formChat').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!perfil.nombre) { abrirPerfil(true); return; }
  const input = $('#inputChat');
  const texto = input.value.trim();
  if (!texto) return;
  try {
    await enviar({ tipo: 'chat', sala: codigoActual, nombre: perfil.nombre, color: estado ? jugador(miId()).color : perfil.color, texto });
    input.value = '';
  } catch (err) { aviso(err.message); }
});

// ------------------------------------------------------------------ perfil

/** Mi muñequito o mi foto, sin depender de estar en una sala. */
function avatarPropio(clases = '') {
  if (perfil.foto) {
    return `<span class="foto-perfil ${clases}" style="--c:${COLORES[perfil.color] || '#888'}"><img src="${perfil.foto}" alt="" /></span>`;
  }
  return `<span class="trip ${clases}" style="--c:${COLORES[perfil.color] || COLORES.rojo}" aria-hidden="true">` +
    '<i class="mochila"></i><i class="cuerpo"></i><i class="visor"></i></span>';
}

function pintarPerfil() {
  $('#chipAvatar').innerHTML = avatarPropio('mini');
  $('#chipNombre').textContent = perfil.nombre || 'Crear perfil';
  pintarTarjeta();
}

function pintarTarjeta() {
  const s = perfil.stats || {};
  $('#tarjetaPerfil').innerHTML = perfil.nombre
    ? `${avatarPropio('grande')}
       <div class="tarjeta-texto"><b>Hola, ${esc(perfil.nombre)} 👋</b>
       <small>${s.partidas ? `${s.partidas} partidas · ${s.victorias || 0} victorias` : 'Todavía no has jugado online'}</small></div>
       <button class="texto-btn" id="btnEditarTarjeta">Editar</button>`
    : `<div class="tarjeta-texto"><b>¿Quién eres?</b><small>Crea tu perfil para jugar. Se queda guardado en este móvil.</small></div>
       <button class="btn" id="btnEditarTarjeta">Crear perfil</button>`;
  $('#btnEditarTarjeta').addEventListener('click', () => abrirPerfil());

  const ultima = ultimaSala();
  const boton = $('#btnVolverSalaUltima');
  boton.classList.toggle('oculto', !ultima || !!codigoActual);
  boton.textContent = `↩ Volver a la sala ${ultima}`;
}
$('#btnVolverSalaUltima').addEventListener('click', () => unirse(ultimaSala()));

let borradorPerfil = null;
let perfilObligatorio = false;

function abrirPerfil(obligatorio = false) {
  perfilObligatorio = obligatorio;
  borradorPerfil = { ...perfil, stats: { ...perfil.stats } };
  if (!borradorPerfil.color) borradorPerfil.color = Object.keys(COLORES)[Math.floor(Math.random() * 15)];
  $('#perfilNombre').value = perfil.nombre;
  pintarModalPerfil();
  $('#modalPerfil').classList.remove('oculto');
  if (obligatorio) setTimeout(() => $('#perfilNombre').focus(), 100);
}

function pintarModalPerfil() {
  const b = borradorPerfil;
  const color = COLORES[b.color] || '#888';
  $('#perfilVistaPrevia').innerHTML = b.foto
    ? `<span class="foto-perfil enorme" style="--c:${color}"><img src="${b.foto}" alt="Tu foto" /></span>`
    : `<span class="circulo-perfil" style="--c:${color}">${esc(($('#perfilNombre').value.trim()[0] || '?').toUpperCase())}</span>`;
  $('#btnQuitarFoto').classList.toggle('oculto', !b.foto);

  // En una sala, los colores que ya tienen otros salen tachados
  const ocupados = new Set((estado ? estado.jugadores : []).filter((j) => j.id !== miId()).map((j) => j.color));
  $('#perfilColores').innerHTML = Object.entries(COLORES).map(([idColor, hex]) => `
    <button class="muestra ${b.color === idColor ? 'sel' : ''} ${ocupados.has(idColor) ? 'ocupado' : ''}" data-color="${idColor}"
      title="${idColor}${ocupados.has(idColor) ? ' (lo tiene otro)' : ''}" aria-label="Color ${idColor}"
      style="--c:${hex}"></button>`).join('');
  $$('#perfilColores [data-color]').forEach((m) => m.addEventListener('click', () => {
    borradorPerfil.color = m.dataset.color;
    pintarModalPerfil();
  }));

  const s = b.stats || {};
  const pct = (a, t) => (t ? Math.round((a / t) * 100) + '%' : '—');
  $('#perfilStats').innerHTML = `
    <div><b>${s.partidas || 0}</b><small>partidas</small></div>
    <div><b>${s.victorias || 0}</b><small>victorias (${pct(s.victorias || 0, s.partidas)})</small></div>
    <div><b>${s.impostor || 0}</b><small>veces impostor</small></div>
    <div><b>${s.victoriasImpostor || 0}</b><small>ganadas de impostor</small></div>`;
}

/** Recorta la foto en cuadrado y la deja pequeña antes de guardarla. */
async function prepararFoto(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error('No se ha podido abrir esa imagen'));
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 192;
    const ctx = lienzo.getContext('2d');
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 192, 192);
    for (const calidad of [0.82, 0.7, 0.55, 0.4]) {
      const datos = lienzo.toDataURL('image/jpeg', calidad);
      if (datos.length < 58000) return datos;
    }
    throw new Error('La foto es demasiado grande');
  } finally {
    URL.revokeObjectURL(url);
  }
}

$('#inputFoto').addEventListener('change', async (e) => {
  const archivo = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    borradorPerfil.foto = await prepararFoto(archivo);
    pintarModalPerfil();
  } catch (err) { aviso(err.message); }
});
$('#btnQuitarFoto').addEventListener('click', () => { borradorPerfil.foto = null; pintarModalPerfil(); });

$('#btnGuardarPerfil').addEventListener('click', async () => {
  const nombreNuevo = $('#perfilNombre').value.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!nombreNuevo) { aviso('Ponte un nombre'); $('#perfilNombre').focus(); return; }
  const antes = perfil;
  perfil = { ...borradorPerfil, nombre: nombreNuevo };
  if (!guardarPerfil(perfil)) {
    // La foto es lo unico que puede no caber: se guarda sin ella
    perfil.foto = antes.foto;
    guardarPerfil(perfil);
    aviso('No se ha podido guardar la foto en este móvil');
  }
  $('#modalPerfil').classList.add('oculto');
  pintarPerfil();
  if (codigoActual) {
    const cambios = { nombre: perfil.nombre, color: perfil.color };
    if (perfil.foto !== antes.foto) cambios.foto = perfil.foto;
    await mandar('perfil', { perfil: cambios });
  } else if (perfilObligatorio && salaDelEnlace()) {
    unirse(salaDelEnlace());
  }
  aviso('✅ Perfil guardado');
});

$('#chipPerfil').addEventListener('click', () => abrirPerfil());
$('#cerrarPerfil').addEventListener('click', () => $('#modalPerfil').classList.add('oculto'));
$('#modalPerfil').addEventListener('click', (e) => { if (e.target.id === 'modalPerfil') $('#modalPerfil').classList.add('oculto'); });
// La inicial de la vista previa cambia mientras escribes el nombre
$('#perfilNombre').addEventListener('input', () => { if (borradorPerfil && !borradorPerfil.foto) pintarModalPerfil(); });
$('#perfilNombre').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnGuardarPerfil').click(); });

/** Al acabar cada ronda se apunta en las estadisticas de este movil. */
function apuntarEstadisticas() {
  const r = estado.ronda;
  if (!estado.yo.participante || !r.final) return;
  const s = perfil.stats || (perfil.stats = {});
  const clave = `${estado.codigo}-${r.num}`;
  if (s.ultima === clave) return;
  s.ultima = clave;
  const soyImpostor = r.final.impostores.includes(miId()) && r.final.trampa !== 'todos';
  const ganan = r.final.resultado.ganan;
  const gane = ganan === 'todos' || (ganan === 'impostores' && soyImpostor) || (ganan === 'inocentes' && !soyImpostor);
  s.partidas = (s.partidas || 0) + 1;
  if (gane) s.victorias = (s.victorias || 0) + 1;
  if (soyImpostor) s.impostor = (s.impostor || 0) + 1;
  if (soyImpostor && gane) s.victoriasImpostor = (s.victoriasImpostor || 0) + 1;
  guardarPerfil(perfil);
}

// ------------------------------------------------------------------ pintar

function pintar(v) {
  estado = v;
  desfase = v.ahora - Date.now();
  $('#btnSalirPartida').classList.remove('oculto');
  $('#btnTerminar').classList.toggle('oculto', !(v.anfitrion === miId() && !['sala', 'final'].includes(v.fase)));

  // En la sala, el chip de arriba enseña el color que te ha tocado de verdad
  $('#chipAvatar').innerHTML = avatar(miId(), 'mini');
  const cambio = v.fase !== faseAnterior;
  if (cambio) alCambiarDeFase(faseAnterior, v.fase);
  faseAnterior = v.fase;

  switch (v.fase) {
    case 'sala': pintarSala(); irA('pSala'); break;
    case 'reparto': pintarReparto(); irA('pReparto'); break;
    case 'pistas': pintarPistas(); irA('pPistas'); break;
    case 'debate': pintarDebate(); irA('pDebate'); break;
    case 'resultado': pintarRecuento(); irA('pVotacion'); break;
    case 'expulsion': pintarExpulsion(); irA('pExpulsion'); break;
    case 'adivinar': pintarAdivinar(); irA('pAdivinar'); break;
    case 'final': pintarFinal(cambio); irA('pFinal'); break;
    default: break;
  }
  pintarRelojes();
}

function alCambiarDeFase(antes, ahora) {
  if (ahora === 'pistas') { pistasVistas = estado.ronda.pistas.length; turnoAnterior = null; }
  if (antes === 'pistas' && ahora === 'debate') {
    aviso('🗳️ ¡Ya habéis escrito todos! A debatir y votar');
    tono(659, 0.15, 0.1, 'triangle'); tono(880, 0.2, 0.1, 'triangle', 0.15);
  }
  if (antes === 'debate' && ahora === 'resultado') {
    aviso('⏰ ¡Se acabó el tiempo! Contando votos…');
    sonidos.fin();
    vibrar([200, 100, 200]);
  }
  if (ahora === 'reparto') {
    claveCarta = '';
    $('#olRespuesta').value = '';
  }
  if (ahora === 'adivinar') $('#olAdivinanza').value = '';
}

/** Los contadores de tiempo se mueven solos entre estado y estado. */
let ultimoSegundo = null;
function pintarRelojes() {
  if (!estado) return;
  const s = segundosRestantes();
  const f = estado.fase;
  if (f === 'debate' && s != null) {
    const el = $('#olCrono');
    el.textContent = `⏱️ ${formatoTiempo(s)}`;
    el.classList.toggle('urgente', s <= 15);
    const total = estado.ajustes.tiempoDebate;
    $('#olCronoBarra').style.width = `${Math.min(100, (s / total) * 100)}%`;
    if (s <= 5 && s > 0 && s !== ultimoSegundo) tono(880, 0.07, 0.08);
    ultimoSegundo = s;
  }
  if (f === 'resultado') $('#votoTiempo').textContent = '';
  if (f === 'pistas' && s != null) {
    $('#turnoSegundos').textContent = s;
    const total = estado.ajustes.tiempoTurno;
    const largo = 2 * Math.PI * 19;
    $('#arcoTiempo').style.strokeDasharray = largo;
    $('#arcoTiempo').style.strokeDashoffset = largo * (1 - Math.min(1, s / total));
    $('#anilloTiempo').classList.toggle('urgente', s <= 5);
    if (s <= 5 && s > 0 && s !== ultimoSegundo && estado.ronda.turnoPista === miId()) tono(880, 0.07, 0.08);
    ultimoSegundo = s;
  }
  if (f === 'adivinar') $('#olCronoAdivinar').textContent = s != null ? `⏱️ ${s} s` : '';
}
setInterval(pintarRelojes, 250);

// ------------------------------------------------------------- sala de espera

function pintarSala() {
  const v = estado;
  const yo = miId();
  $('#codigoSala').textContent = v.codigo;
  $('#tituloSala').textContent = v.publica ? `${v.nombre} · sala pública` : 'Código de la sala';
  $('#btnCopiarCodigo').classList.toggle('oculto', v.publica);
  const jugando = v.jugadores.filter((j) => !j.espectador);
  const mirando = v.jugadores.filter((j) => j.espectador && j.conectado);
  animarSiCambia($('#listaSala'), jugando.map((j) => j.id).join());
  $('#numSala').textContent = jugando.filter((j) => j.conectado).length;

  $('#listaSala').innerHTML = jugando.map((j) => `
    <div class="fila-tripulante ${j.conectado ? '' : 'desconectado'}">
      ${avatar(j.id)}
      <span class="nom">${esc(j.nombre)}${j.id === yo ? ' <small>(tú)</small>' : ''}${j.id === v.anfitrion ? ' 👑' : ''}</span>
      ${v.puntos[j.id] ? `<span class="puntos-chip">★${v.puntos[j.id]}</span>` : ''}
      ${!j.conectado ? '<small class="nota">desconectado</small>' : ''}
      ${soyAnfitrion() && j.id !== yo && j.foto ? `<button class="chip-x" data-quitarfoto="${esc(j.id)}" title="Quitarle la foto" aria-label="Quitarle la foto">🚫</button>` : ''}
      ${soyAnfitrion() && j.id !== yo ? `<button class="chip-x" data-echar="${esc(j.id)}" aria-label="Echar">✕</button>` : ''}
    </div>`).join('');
  $('#espectadoresSala').innerHTML = mirando.length
    ? `<p class="nota">👀 Mirando:</p><div class="fila-avatares izquierda">${mirando.map((j) =>
      `<span class="espectador-chip">${avatar(j.id, 'mini')} ${esc(j.nombre)}${j.id === yo ? ' (tú)' : ''}${j.id === v.anfitrion ? ' 👑' : ''}</span>`).join('')}</div>`
    : '';
  $('#btnCambiarModo').textContent = v.yo.espectador ? '🎮 Pasar a jugar' : '👀 Pasar a espectador';

  $$('[data-quitarfoto]').forEach((b) => b.addEventListener('click', () => {
    if (confirm(`¿Quitarle la foto a ${nombre(b.dataset.quitarfoto)}?`)) mandar('quitarFoto', { quien: b.dataset.quitarfoto });
  }));
  $$('[data-echar]').forEach((b) => b.addEventListener('click', () => {
    if (confirm(`¿Echar a ${nombre(b.dataset.echar)}?`)) mandar('echar', { quien: b.dataset.echar });
  }));

  pintarAjustes();

  const conectados = jugando.filter((j) => j.conectado).length;
  const mando = soyAnfitrion();
  $('#btnEmpezar').classList.toggle('oculto', !mando);
  $('#btnEmpezar').disabled = conectados < 3;
  $('#notaEmpezar').textContent = mando
    ? (conectados < 3 ? `Faltan ${3 - conectados} jugador(es) para empezar. Pasa el código.` : '')
    : `Esperando a que ${nombre(v.anfitrion)} empiece la partida…`;
}

// ------------------------------------------------------------- ajustes

const minSeg = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)}${s % 60 ? ':' + String(s % 60).padStart(2, '0') : ''} min`);
const esEscritas = (a) => a.pistas === 'escritas' && a.modo !== 'preguntas';

/** Partidas ya preparadas: un toque y listo. */
const PRESETS = [
  { id: 'rapida', icono: '⚡', nombre: 'Rápida', desc: '90 s, hablando',
    ajustes: { pistas: 'habladas', tiempoDebate: 90, expulsados: 1, mostrarRol: true, trampa: false, cambiarVoto: true } },
  { id: 'escrita', icono: '✍️', nombre: 'Sin hablar', desc: 'Se escribe por turnos',
    ajustes: { pistas: 'escritas', vueltasPistas: 2, tiempoTurno: 30, tiempoDebate: 120, mostrarRol: true } },
  { id: 'misterio', icono: '🕵️', nombre: 'Misterio', desc: 'Roles ocultos',
    ajustes: { mostrarRol: false, votosAnonimos: true, cambiarVoto: false, tiempoDebate: 180 } },
  { id: 'caos', icono: '🤪', nombre: 'Caos', desc: 'Trampas y 2 fuera',
    ajustes: { trampa: true, probTrampa: 20, expulsados: 2, mostrarRol: false, modo: 'undercover' } }
];

const MODOS_OL = [
  ['clasico', '🕵️', 'Clásico', 'El impostor sabe que lo es'],
  ['undercover', '🎭', 'Undercover', 'Palabra parecida, no lo sabe'],
  ['preguntas', '💬', 'Preguntas', 'Cada uno responde una pregunta']
];

/**
 * Los ajustes, por secciones. Cada cosa sabe pintarse sola:
 *  - interruptor: si/no      - contador: − valor +      - opciones: botones
 */
const SECCIONES = [
  { id: 'juego', icono: '🎮', titulo: 'Juego', resumen: (a) => `${MODOS_OL.find((m) => m[0] === a.modo)[2]} · ${a.impostores ? a.impostores + ' impostor' + (a.impostores > 1 ? 'es' : '') : 'impostores auto'}`,
    cosas: [
      { tipo: 'modo' },
      { tipo: 'opciones', clave: 'pistas', titulo: 'Cómo dais las pistas', si: (a) => a.modo !== 'preguntas',
        opciones: [['habladas', '🗣️ Hablando'], ['escritas', '✍️ Escribiendo']] },
      { tipo: 'contador', clave: 'vueltasPistas', titulo: 'Palabras por persona', icono: '🔁', valores: [1, 2, 3], si: esEscritas },
      { tipo: 'contador', clave: 'tiempoTurno', titulo: 'Tiempo para escribir', icono: '⏳', valores: [15, 20, 30, 45, 60, 90], formato: minSeg, si: esEscritas },
      { tipo: 'contador', clave: 'impostores', titulo: 'Impostores', icono: '🔪', valores: [0, 1, 2, 3, 4], formato: (v) => (v ? v : 'Auto') },
      { tipo: 'opciones', clave: 'pista', titulo: 'Pista del impostor', si: (a) => a.modo === 'clasico',
        opciones: [['nada', 'Nada'], ['categoria', 'Categoría'], ['parecida', 'Parecida'], ['ambas', 'Las dos']] }
    ] },
  { id: 'categorias', icono: '🗂️', titulo: 'Categorías', si: (a) => a.modo !== 'preguntas',
    resumen: (a) => `${a.categorias.length} elegidas`, cosas: [{ tipo: 'categorias' }] },
  { id: 'votacion', icono: '🗳️', titulo: 'Votación', resumen: (a) => `${minSeg(a.tiempoDebate)} · ${a.expulsados} fuera por turno${a.mostrarRol ? '' : ' · roles ocultos'}`,
    cosas: [
      { tipo: 'contador', clave: 'tiempoDebate', titulo: 'Tiempo para debatir y votar', icono: '⏱️', valores: [60, 90, 120, 180, 240, 300, 420, 600], formato: minSeg },
      { tipo: 'contador', clave: 'expulsados', titulo: 'Expulsados por turno', icono: '🚀', valores: [1, 2, 3], formato: (v) => `${v}`, ayuda: (a) => `Cada uno vota a ${a.expulsados}` },
      { tipo: 'interruptor', clave: 'mostrarRol', icono: '🔍', titulo: 'Decir si el expulsado era impostor', desc: 'Si no, se descubre al final' },
      { tipo: 'interruptor', clave: 'cambiarVoto', icono: '🔄', titulo: 'Se puede cambiar el voto' },
      { tipo: 'interruptor', clave: 'acabarSiTodosVotan', icono: '⏩', titulo: 'Contar en cuanto voten todos' },
      { tipo: 'interruptor', clave: 'votosAnonimos', icono: '🎭', titulo: 'Votos anónimos' }
    ] },
  { id: 'extras', icono: '✨', titulo: 'Extras', resumen: (a) => [a.trampa && 'trampas', a.adivinar && 'robo final', a.modo === 'preguntas' && a.picante && 'picantes'].filter(Boolean).join(' · ') || 'nada especial',
    cosas: [
      { tipo: 'interruptor', clave: 'adivinar', icono: '🎯', titulo: 'Robo final', desc: 'El impostor pillado puede ganar adivinando la palabra', si: (a) => a.modo === 'clasico' },
      { tipo: 'interruptor', clave: 'noEmpieza', icono: '🚫', titulo: 'El impostor nunca empieza' },
      { tipo: 'interruptor', clave: 'trampa', icono: '🤡', titulo: 'Rondas trampa', desc: 'A veces no hay impostor, o lo son todos' },
      { tipo: 'interruptor', clave: 'picante', icono: '🌶️', titulo: 'Preguntas picantes', si: (a) => a.modo === 'preguntas' },
      { tipo: 'interruptor', clave: 'preguntasJugadores', icono: '👥', titulo: 'Preguntas sobre vosotros', si: (a) => a.modo === 'preguntas' },
      { tipo: 'interruptor', clave: 'espectadoresVenTodo', icono: '👀', titulo: 'Los espectadores lo ven todo' }
    ] }
];

const seccionesAbiertas = new Set(['juego']);
let claveAjustes = '';

function htmlCosa(c, a, mando) {
  const dis = mando ? '' : 'disabled';
  switch (c.tipo) {
    case 'modo':
      return `<div class="modos-ol">${MODOS_OL.map(([id, ic, nom, desc]) => `
        <button class="modo-ol ${a.modo === id ? 'sel' : ''}" data-aj="modo" data-valor="${id}" ${dis}>
          <span class="modo-ol-icono">${ic}</span><b>${nom}</b><small>${desc}</small></button>`).join('')}</div>`;
    case 'opciones':
      return `<div class="ajuste-fila columna"><span class="ajuste-titulo">${c.titulo}</span>
        <div class="pastillas">${c.opciones.map(([v, t]) => `
          <button class="pastilla ${a[c.clave] === v ? 'sel' : ''}" data-aj="${c.clave}" data-valor="${v}" ${dis}>${t}</button>`).join('')}</div></div>`;
    case 'contador': {
      const i = c.valores.indexOf(a[c.clave]);
      const fmt = c.formato || ((v) => v);
      return `<div class="ajuste-fila">
        <span class="ajuste-icono">${c.icono}</span>
        <span class="ajuste-texto"><span class="ajuste-titulo">${c.titulo}</span>${c.ayuda ? `<small>${c.ayuda(a)}</small>` : ''}</span>
        <span class="contador-mini">
          <button data-paso="-1" data-clave="${c.clave}" ${dis || (i <= 0 ? 'disabled' : '')} aria-label="Menos">−</button>
          <b class="valor-contador" data-valor-de="${c.clave}">${fmt(a[c.clave])}</b>
          <button data-paso="1" data-clave="${c.clave}" ${dis || (i >= c.valores.length - 1 ? 'disabled' : '')} aria-label="Más">+</button>
        </span></div>`;
    }
    case 'interruptor':
      return `<label class="ajuste-fila conmutable">
        <span class="ajuste-icono">${c.icono}</span>
        <span class="ajuste-texto"><span class="ajuste-titulo">${c.titulo}</span>${c.desc ? `<small>${c.desc}</small>` : ''}</span>
        <input type="checkbox" class="switch" data-switch="${c.clave}" ${a[c.clave] ? 'checked' : ''} ${dis} /></label>`;
    case 'categorias': {
      const nombres = Object.keys(CATEGORIAS_LOCALES);
      return `<div class="fila-mini derecha"><button class="texto-btn" data-todas ${dis}>${a.categorias.length === nombres.length ? 'Quitar todas' : 'Elegir todas'}</button></div>
        <div class="categorias compactas">${nombres.map((n) => `
          <button class="categoria-btn ${a.categorias.includes(n) ? 'selected' : ''}" data-cat="${esc(n)}" ${dis}>
            <span class="cat-icono">${CATEGORIAS_LOCALES[n].icono}</span><span class="cat-nombre">${esc(n)}</span></button>`).join('')}</div>`;
    }
    default: return '';
  }
}

function pintarAjustes() {
  const a = estado.ajustes;
  const mando = soyAnfitrion();
  const clave = JSON.stringify(a) + mando;
  $('#notaAjustes').textContent = mando ? 'Tú mandas 👑' : `Los elige ${nombre(estado.anfitrion)} 👑`;
  if (clave === claveAjustes) return;
  claveAjustes = clave;

  $('#presets').classList.toggle('oculto', !mando);
  $('#presets').innerHTML = PRESETS.map((p) => {
    const activo = Object.entries(p.ajustes).every(([k, v]) => a[k] === v);
    return `<button class="preset ${activo ? 'sel' : ''}" data-preset="${p.id}"><span>${p.icono}</span><b>${p.nombre}</b><small>${p.desc}</small></button>`;
  }).join('');

  $('#ajustesOnline').innerHTML = SECCIONES.filter((sec) => !sec.si || sec.si(a)).map((sec) => `
    <div class="seccion ${seccionesAbiertas.has(sec.id) ? 'abierta' : ''}" data-seccion="${sec.id}">
      <button class="seccion-cabecera" data-abrir-seccion="${sec.id}">
        <span class="seccion-icono">${sec.icono}</span>
        <span class="seccion-textos"><b>${sec.titulo}</b><small>${esc(sec.resumen(a))}</small></span>
        <span class="flecha">⌄</span>
      </button>
      <div class="seccion-cuerpo"><div class="seccion-interior">
        ${sec.cosas.filter((c) => !c.si || c.si(a)).map((c) => htmlCosa(c, a, mando)).join('')}
      </div></div>
    </div>`).join('');
}

function cambiarAjuste(cambios) {
  if (!soyAnfitrion()) return;
  sonidos.voto();
  mandar('ajustes', { ajustes: cambios });
}

// Un solo escuchador para todo el panel de ajustes
$('#panelAjustesOnline').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.abrirSeccion) {
    const id = b.dataset.abrirSeccion;
    if (seccionesAbiertas.has(id)) seccionesAbiertas.delete(id); else seccionesAbiertas.add(id);
    const sec = b.closest('.seccion');
    sec.classList.toggle('abierta');
    sec.classList.add('recien');
    setTimeout(() => sec.classList.remove('recien'), 700);
    return;
  }
  if (!soyAnfitrion()) return;
  const a = estado.ajustes;
  if (b.dataset.preset) {
    const p = PRESETS.find((x) => x.id === b.dataset.preset);
    cambiarAjuste(p.ajustes);
    aviso(`${p.icono} Partida ${p.nombre.toLowerCase()} lista`);
  } else if (b.dataset.aj) {
    cambiarAjuste({ [b.dataset.aj]: b.dataset.valor });
  } else if (b.dataset.paso) {
    const c = SECCIONES.flatMap((s) => s.cosas).find((x) => x.clave === b.dataset.clave);
    const i = c.valores.indexOf(a[c.clave]);
    const nuevo = c.valores[Math.min(c.valores.length - 1, Math.max(0, (i < 0 ? 0 : i) + Number(b.dataset.paso)))];
    const valorEl = b.parentElement.querySelector('.valor-contador');
    valorEl.classList.remove('salta'); void valorEl.offsetWidth; valorEl.classList.add('salta');
    cambiarAjuste({ [c.clave]: nuevo });
  } else if (b.dataset.cat) {
    const sel = new Set(a.categorias);
    if (sel.has(b.dataset.cat)) sel.delete(b.dataset.cat); else sel.add(b.dataset.cat);
    cambiarAjuste({ categorias: [...sel] });
  } else if ('todas' in b.dataset) {
    const todas = Object.keys(CATEGORIAS_LOCALES);
    cambiarAjuste({ categorias: a.categorias.length === todas.length ? [] : todas });
  }
});
$('#panelAjustesOnline').addEventListener('change', (e) => {
  const sw = e.target.closest('[data-switch]');
  if (sw) cambiarAjuste({ [sw.dataset.switch]: sw.checked });
});

$('#btnEmpezar').addEventListener('click', () => mandar('empezar'));
$('#btnCambiarModo').addEventListener('click', () => mandar('modo', { espectador: !estado.yo.espectador }));
$('#btnIrse').addEventListener('click', async () => {
  if (!confirm('¿Salir de la sala?')) return;
  await mandar('irse');
  recordarSala('');
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

// ------------------------------------------------------------------ espectador

/** El panel del que mira: roles, palabras, cartas, respuestas y votos de todos. */
function pintarEspectador(contenedor) {
  const v = estado;
  const e = v.espectador;
  const el = $(contenedor);
  if (v.yo.participante) { el.classList.add('oculto'); return; }
  el.classList.remove('oculto');
  if (!e) {
    el.innerHTML = '<h2>👀 Estás mirando</h2><p class="nota">En esta sala los espectadores no ven los roles.</p>';
    return;
  }
  const r = v.ronda;
  const esPregunta = e.modo === 'preguntas';
  const fase = v.fase;
  const quien = e.modo === 'undercover' ? 'UNDERCOVER' : 'IMPOSTOR';

  let cabecera = esPregunta
    ? `<div class="esp-clave"><small>Pregunta de todos</small><b>${esc(e.palabra)}</b></div>
       <div class="esp-clave impostor"><small>Pregunta del impostor</small><b>${esc(e.gemela)}</b></div>`
    : `<div class="esp-clave"><small>Palabra (${esc(e.categoria)})</small><b>${esc(e.palabra)}</b></div>
       ${e.modo === 'undercover' ? `<div class="esp-clave impostor"><small>Palabra del undercover</small><b>${esc(e.gemela)}</b></div>` : ''}`;
  if (e.trampa === 'ninguno') cabecera += '<p class="aviso-trampa">🤡 Ronda trampa: no hay ningún impostor</p>';
  if (e.trampa === 'todos') cabecera += '<p class="aviso-trampa">😂 Ronda trampa: todos son impostores</p>';

  const filas = r.participantes.map((id) => {
    const imp = e.impostores.includes(id);
    const carta = e.cartas[id];
    const vivo = r.vivos.includes(id);
    let detalle = '';
    if (carta) {
      if (carta.tipo === 'impostor') detalle = (carta.pistas || []).map((p) => `${esc(p.etiqueta)}: ${esc(p.texto)}`).join(' · ') || 'Sin pista';
      else detalle = esc(carta.texto);
    }
    let extra = '';
    if (fase === 'reparto') {
      extra = r.listos.includes(id) ? '<span class="ok">✔ listo</span>' : '<span class="nota">mirando su carta…</span>';
      if (esPregunta && e.respuestas[id]) extra += ` <span class="esp-respuesta">«${esc(e.respuestas[id])}»</span>`;
    }
    if (fase === 'debate' && vivo) {
      const voto = e.votos[id];
      extra = !voto ? '<span class="nota">sin votar</span>'
        : voto[0] === 'saltar' ? '🗳️ salta'
          : voto[0] === 'nadie' ? '🗳️ no hay impostor'
            : `🗳️ ${voto.map((x) => esc(nombre(x))).join(', ')}`;
    }
    return `<div class="esp-fila ${imp ? 'es-imp' : ''} ${vivo ? '' : 'fuera'}">
      ${avatar(id, vivo ? 'mini' : 'mini muerto')}
      <div class="esp-info"><b>${esc(nombre(id))} ${imp ? `<span class="etiqueta-rol">${quien}</span>` : ''}</b>
        <small>${detalle}</small>${extra ? `<small>${extra}</small>` : ''}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="panel-titulo"><h2>👀 Modo espectador</h2><span class="nota">Lo ves todo · no lo cuentes 🤫</span></div>
    ${cabecera}<div class="esp-lista">${filas}</div>`;
}

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
    $('#espectadorReparto').textContent = v.yo.espectador
      ? '👀 Estás de espectador.'
      : '👀 Has entrado con la ronda empezada: mírala y jugarás en la siguiente.';
  } else {
    $('#cartaOnline').classList.remove('oculto');
    $('#espectadorReparto').classList.add('oculto');
    const clave = JSON.stringify(yo.carta) + r.num;
    if (clave !== claveCarta) {
      claveCarta = clave;
      cartaVista = false;
      $('#cartaOnlineFrente').innerHTML = htmlCarta(yo.carta);
      $('#cartaOnlineFrente').classList.toggle('impostor', yo.carta && yo.carta.tipo === 'impostor');
      for (const sel of ['#cartaDebateFrente', '#cartaPistasFrente']) {
        $(sel).innerHTML = htmlCarta(yo.carta);
        $(sel).classList.toggle('impostor', yo.carta && yo.carta.tipo === 'impostor');
      }
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
  pintarEspectador('#espReparto');
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

// ------------------------------------------------------------------ pistas escritas

let pistasVistas = 0;     // para animar solo las palabras nuevas
let turnoAnterior = null;

/** El muro con las palabras que ha escrito cada uno, por vueltas. */
function htmlMuro(pistas, compacto = false) {
  if (!pistas.length) return '<p class="nota centrado">Todavía nadie ha escrito.</p>';
  const grupos = new Map();
  pistas.forEach((p, i) => {
    const k = p.vuelta;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push({ ...p, i });
  });
  const varias = grupos.size > 1;
  return [...grupos.entries()].map(([vuelta, lista]) => `
    ${varias ? `<p class="muro-vuelta">Vuelta ${vuelta}</p>` : ''}
    <div class="muro-fila">${lista.map((p) => `
      <div class="pista ${p.saltado ? 'saltada' : ''} ${!compacto && p.i >= pistasVistas ? 'nueva' : ''}" style="--c:${COLORES[jugador(p.id).color] || '#888'}">
        ${avatar(p.id, 'mini')}
        <span class="pista-textos"><small>${esc(nombre(p.id))}</small><b>${p.saltado ? '⏳ no escribió' : esc(p.texto)}</b></span>
      </div>`).join('')}</div>`).join('');
}

function pintarPistas() {
  const v = estado;
  const r = v.ronda;
  const turno = r.turnoPista;
  const miTurno = turno === miId();

  $('#pistasTanda').textContent = r.tandasPista > 1
    ? `Palabra ${r.tandaPista} de ${r.tandasPista} · turno ${r.posPista + 1}/${r.totalPistas}`
    : `Turno ${r.posPista + 1} de ${r.totalPistas}`;
  $('#turnoAvatar').innerHTML = `<span class="foco">${avatar(turno, 'enorme')}</span>`;
  $('#turnoTitulo').innerHTML = miTurno ? '¡Te toca escribir! ✍️' : `Escribe <span class="resalte">${esc(nombre(turno))}</span>`;
  $('#formPista').classList.toggle('oculto', !miTurno);
  $('#escribiendo').classList.toggle('oculto', miTurno);
  $('.panel-turno').classList.toggle('mi-turno', miTurno);

  if (turno !== turnoAnterior) {
    // Animacion de cambio de turno
    const foco = $('#turnoAvatar');
    foco.classList.remove('entra'); void foco.offsetWidth; foco.classList.add('entra');
    if (miTurno) {
      $('#inputPista').value = '';
      setTimeout(() => $('#inputPista').focus(), 150);
      vibrar([80, 60, 80]);
      tono(988, 0.12, 0.1, 'triangle'); tono(1318, 0.18, 0.1, 'triangle', 0.12);
    }
    turnoAnterior = turno;
  }

  $('#contadorPistas').textContent = r.pistas.filter((p) => !p.saltado).length;
  $('#muroPistas').innerHTML = htmlMuro(r.pistas);
  if (r.pistas.length > pistasVistas) sonidos.voto();
  pistasVistas = r.pistas.length;

  $('#panelCartaPistas').classList.toggle('oculto', !v.yo.participante);
  $('#btnSaltarPistas').classList.toggle('oculto', !soyAnfitrion());
  pintarEspectador('#espPistas');
}

$('#formPista').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = $('#inputPista').value.trim();
  if (!texto) { aviso('Escribe una palabra'); return; }
  if (texto.split(/\s+/).length > 3) { aviso('Mejor una palabra (o dos) 😉'); return; }
  const r = await mandar('pista', { texto });
  if (r) { $('#inputPista').blur(); vibrar(30); }
});
$('#btnSaltarPistas').addEventListener('click', () => {
  if (confirm('¿Saltar directamente a la votación?')) mandar('forzar');
});
prepararCarta($('#cartaPistas'));

// ------------------------------------------------------------------ debate + votacion

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
  $('#olOrden').innerHTML = r.orden.filter((id) => r.vivos.includes(id)).map((id, i) => `<span class="orden-item ${i === 0 ? 'primero' : ''}">
      ${avatar(id, 'mini')}<small>${i + 1}. ${esc(nombre(id))}</small></span>`).join('') +
    r.expulsados.map((id) => `<span class="orden-item fuera">
      ${avatar(id, 'mini muerto')}<small>${esc(nombre(id))}${(r.abandonos || []).includes(id) ? ' 🏃' : ''}</small></span>`).join('');

  let instr;
  if (r.modo === 'preguntas') instr = 'Estas son las respuestas. ¿Cuál no encaja con la pregunta?';
  else if (r.pistasEscritas) instr = 'Mirad lo que ha escrito cada uno: ¿quién no encaja? Debatid y votad antes de que se acabe el tiempo.';
  else if (r.numDebate === 1) instr = 'Por turnos, cada uno dice UNA palabra relacionada con la suya. Debatid y votad antes de que se acabe el tiempo.';
  else instr = 'Otra vuelta de palabras… ¡sin repetir! Y a votar otra vez.';
  if (r.expulsion && r.numDebate > 1) instr = `${r.expulsion.textos.join(' ')} ${instr}`;
  $('#olInstruccion').textContent = instr;

  $('#muroDebate').innerHTML = r.pistasEscritas && r.pistas.length
    ? `<p class="pasa">✍️ Lo que habéis escrito</p>${htmlMuro(r.pistas, true)}` : '';
  $('#olRespuestasDebate').innerHTML = r.modo === 'preguntas'
    ? `${htmlRespuestas()}<p class="pregunta-real">La pregunta de verdad era:<br><b>"${esc(r.pregunta)}"</b></p>`
    : '';

  $('#olFantasma').classList.toggle('oculto', !(v.yo.participante && !v.yo.vivo));
  $('#panelMiCarta').classList.toggle('oculto', !v.yo.participante);
  if (v.yo.participante && !$('#cartaDebateFrente').innerHTML) {
    for (const sel of ['#cartaDebateFrente', '#cartaPistasFrente']) {
      $(sel).innerHTML = htmlCarta(v.yo.carta);
      $(sel).classList.toggle('impostor', v.yo.carta && v.yo.carta.tipo === 'impostor');
    }
  }
  pintarPanelVoto();
  pintarEspectador('#espDebate');
}

/** Lo que llevo marcado en pantalla, antes de mandarlo. */
let borrador = [];
let claveVuelta = '';

const mismoVoto = (a, b) => a.length === (b || []).length && a.every((x) => (b || []).includes(x));

function pintarPanelVoto() {
  const v = estado;
  const r = v.ronda;
  const a = v.ajustes;
  const yo = miId();
  const puedeVotar = v.yo.participante && v.yo.vivo;
  const mio = v.yo.votos || null;
  const bloqueado = !!mio && !a.cambiarVoto;
  const huecos = r.huecos || 1;

  const clave = `${r.num}-${r.numDebate}`;
  if (clave !== claveVuelta) { claveVuelta = clave; borrador = mio ? [...mio] : []; }

  $('#panelVoto').classList.toggle('oculto', !v.yo.participante);
  const vivosConectados = r.vivos.filter((id) => jugador(id).conectado);
  $('#votoContador').textContent = `${r.votaron.length}/${vivosConectados.length} han votado`;
  $('#votoAyuda').textContent = (huecos === 1
    ? 'Elige a quién echar. Cuando se acabe el tiempo sale el más votado (si gana «saltar», no sale nadie).'
    : `Puedes votar hasta a ${huecos} personas. Cuando se acabe el tiempo salen los ${huecos} más votados.`)
    + (a.cambiarVoto ? ' Puedes cambiar el voto hasta el final.' : ' Ojo: una vez votas, no se puede cambiar.');

  const candidatos = r.vivos.filter((id) => id !== yo);
  animarSiCambia($('#listaVoto'), clave + candidatos.join());
  $('#listaVoto').innerHTML = candidatos.map((id) => {
    const marcado = borrador.includes(id);
    return `<button class="fila-voto ${marcado ? 'marcada' : ''}" data-votar="${esc(id)}" ${!puedeVotar || bloqueado ? 'disabled' : ''}>
      ${avatar(id)}<span class="nom">${esc(nombre(id))}</span>
      ${r.votaron.includes(id) ? '<span class="ya-voto" title="Ya ha votado">✔ votó</span>' : ''}
      <span class="casilla">${marcado ? '✔' : ''}</span></button>`;
  }).join('');

  const especiales = [['saltar', '⏭️ Saltar voto']];
  if (a.trampa) especiales.push(['nadie', '🤡 No hay impostor']);
  $('#votoEspeciales').innerHTML = especiales.map(([valor, texto]) =>
    `<button class="especial ${borrador[0] === valor ? 'marcada' : ''}" data-votar="${valor}" ${!puedeVotar || bloqueado ? 'disabled' : ''}>${texto}</button>`).join('');

  $$('[data-votar]').forEach((b) => b.addEventListener('click', () => {
    const valor = b.dataset.votar;
    if (valor === 'saltar' || valor === 'nadie') {
      borrador = borrador[0] === valor ? [] : [valor];
    } else {
      borrador = borrador.filter((x) => x !== 'saltar' && x !== 'nadie');
      if (borrador.includes(valor)) borrador = borrador.filter((x) => x !== valor);
      else if (huecos === 1) borrador = [valor];
      else if (borrador.length < huecos) borrador.push(valor);
      else aviso(`Solo puedes votar a ${huecos}`);
    }
    sonidos.voto();
    pintarPanelVoto();
  }));

  const boton = $('#btnVotar');
  boton.classList.toggle('oculto', !puedeVotar || bloqueado);
  boton.textContent = mio ? 'Cambiar mi voto' : (huecos > 1 && borrador.length ? `Votar (${borrador.length}/${huecos})` : 'Votar');
  boton.disabled = !borrador.length || mismoVoto(borrador, mio);

  let texto = '';
  if (!v.yo.participante) texto = '👀 Estás mirando esta ronda.';
  else if (!v.yo.vivo) texto = '👻 Los expulsados no votan.';
  else if (!mio) texto = 'Todavía no has votado.';
  else if (mio[0] === 'saltar') texto = 'Tu voto: saltar.';
  else if (mio[0] === 'nadie') texto = 'Tu voto: no hay impostor.';
  else texto = `Tu voto: <b>${mio.map((id) => esc(nombre(id))).join(', ')}</b>`;
  if (mio && !mismoVoto(borrador, mio) && !bloqueado) texto += ' <span class="nota">(no has guardado el cambio)</span>';
  $('#votoEstado').innerHTML = texto;

  $('#btnForzarVoto').classList.toggle('oculto', !soyAnfitrion());
}

$('#btnVotar').addEventListener('click', async () => {
  $('#btnVotar').disabled = true;
  const r = await mandar('votar', { votos: borrador });
  if (r) vibrar(40);
  else pintarPanelVoto();
});

$('#btnForzarVoto').addEventListener('click', () => {
  if (confirm('¿Terminar ya y contar los votos?')) mandar('forzar');
});

function pintarRecuento() {
  const v = estado;
  const r = v.ronda;
  const uv = r.ultimoVoto;
  $('#pVotacion').classList.add('modo-recuento');
  $('#votoTituloOl').textContent = 'Recuento de votos';
  const votantes = (lista) => (lista || []).map((id, i) =>
    `<span class="votante" style="animation-delay:${0.3 + i * 0.2}s">${id ? avatar(id, 'mini') : '<span class="trip-anonimo"></span>'}</span>`).join('');

  const enJuego = r.participantes.filter((id) => r.vivos.includes(id) || uv.expulsados.includes(id));
  animarSiCambia($('#placas'), `${r.num}-${r.numDebate}`);
  $('#placas').innerHTML = enJuego.map((id) => `<div class="placa ${uv.expulsados.includes(id) ? 'expulsada' : ''}">
      ${avatar(id)}
      <span class="placa-info"><span class="placa-nombre">${esc(nombre(id))}</span>
      <span class="votantes">${votantes(uv.detalle[id])}</span></span>
      <span class="num-votos">${(uv.detalle[id] || []).length || ''}</span>
    </div>`).join('');

  let pie = `<div class="fila-recuento"><b>SALTARON:</b> <span class="votantes">${votantes(uv.detalle.saltar) || '—'}</span></div>`;
  if (uv.detalle.nadie) pie += `<div class="fila-recuento"><b>🤡 NO HAY IMPOSTOR:</b> <span class="votantes">${votantes(uv.detalle.nadie)}</span></div>`;
  if (uv.noVotaron.length) pie += `<div class="fila-recuento nota">No votaron: ${uv.noVotaron.map((id) => esc(nombre(id))).join(', ')}</div>`;
  $('#filaSaltar').innerHTML = pie;
  $('#miVoto').innerHTML = uv.huecos > 1 ? `Se podían echar hasta ${uv.huecos}.` : '';
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
  flotante.innerHTML = e.expulsados.map((id, i) =>
    `<span class="volador" style="animation-delay:${i * 0.9}s;top:${i * 70}px">${avatar(id, 'enorme')}</span>`).join('');
  flotante.classList.remove('vuela');
  void flotante.offsetWidth; // reinicia la animacion
  if (e.expulsados.length) flotante.classList.add('vuela');
  sonidos.expulsion();

  $('#textoExpulsion2').textContent = '';
  escribirLento($('#textoExpulsion1'), e.textos[0] || '', 900, () => {
    escribirLento($('#textoExpulsion2'), e.textos.slice(1).join(' '), 300);
  });
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
  if (f.historialExpulsiones && f.historialExpulsiones.length) {
    const filas = f.historialExpulsiones.map((h) => `<div class="fila-historial"><span class="nota">Vuelta ${h.vuelta}</span>
      ${h.ids.map((id) => `<span class="expulsado-final ${f.impostores.includes(id) ? 'era-impostor' : ''}">${avatar(id, 'mini')} ${esc(nombre(id))}
        <small>${f.impostores.includes(id) ? '🔪 impostor' : '😇 inocente'}</small></span>`).join('')}</div>`).join('');
    cajas.push(`<div><small>Expulsados</small>${filas}</div>`);
  }
  if (r.abandonos && r.abandonos.length) {
    cajas.push(`<div><small>Se fueron a mitad 🏃</small><b class="con-avatares">${r.abandonos.map((id) => `${avatar(id, 'mini')} ${esc(nombre(id))}`).join('  ')}</b></div>`);
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

  apuntarEstadisticas();
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
