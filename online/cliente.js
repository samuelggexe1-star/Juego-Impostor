// La parte del navegador del modo online. Aqui no se decide nada: el servidor
// manda una vista con lo que este jugador puede ver y esto solo la pinta.
// Las acciones (votar, estar listo…) se mandan y se espera a que el servidor
// conteste con el estado nuevo.

import {
  miId, cargarPerfil, guardarPerfil, ultimaSala, recordarSala, enviar, escuchar, hayServidor,
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

async function unirse(codigo) {
  if (!tengoPerfil()) return;
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (c.length !== 4) { aviso('El código tiene 4 letras'); return; }
  try {
    await enviar({ tipo: 'entrar', sala: c, nombre: perfil.nombre, color: perfil.color });
    await subirFoto(c);
    conectar(c);
  } catch (e) {
    aviso(e.message);
    if (c === ultimaSala()) { recordarSala(''); pintarTarjeta(); }
    history.replaceState(null, '', location.pathname);
  }
}

function conectar(codigo) {
  if (conexion) conexion.cerrar();
  codigoActual = codigo;
  recordarSala(codigo);
  history.replaceState(null, '', '?sala=' + codigo);
  conexion = escuchar(codigo, perfil.nombre, perfil.color, {
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

function salirDeSala() {
  if (conexion) conexion.cerrar();
  conexion = null;
  estado = null;
  codigoActual = '';
  faseAnterior = null;
  history.replaceState(null, '', location.pathname);
  pintarPerfil();
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
    : `<span class="trip enorme" style="--c:${color}"><i class="mochila"></i><i class="cuerpo"></i><i class="visor"></i></span>`;
  $('#btnQuitarFoto').classList.toggle('oculto', !b.foto);

  // En una sala, los colores que ya tienen otros salen tachados
  const ocupados = new Set((estado ? estado.jugadores : []).filter((j) => j.id !== miId()).map((j) => j.color));
  $('#perfilColores').innerHTML = Object.entries(COLORES).map(([idColor, hex]) => `
    <button class="muestra ${b.color === idColor ? 'sel' : ''} ${ocupados.has(idColor) ? 'ocupado' : ''}" data-color="${idColor}"
      title="${idColor}${ocupados.has(idColor) ? ' (lo tiene otro)' : ''}">
      <span class="trip mini" style="--c:${hex}"><i class="mochila"></i><i class="cuerpo"></i><i class="visor"></i></span>
    </button>`).join('');
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

  // En la sala, el chip de arriba enseña el color que te ha tocado de verdad
  $('#chipAvatar').innerHTML = avatar(miId(), 'mini');
  const cambio = v.fase !== faseAnterior;
  if (cambio) alCambiarDeFase(faseAnterior, v.fase);
  faseAnterior = v.fase;

  switch (v.fase) {
    case 'sala': pintarSala(); irA('pSala'); break;
    case 'reparto': pintarReparto(); irA('pReparto'); break;
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
  if (f === 'adivinar') $('#olCronoAdivinar').textContent = s != null ? `⏱️ ${s} s` : '';
}
setInterval(pintarRelojes, 250);

// ------------------------------------------------------------- sala de espera

const AJUSTE_CASILLAS = {
  olMostrarRol: 'mostrarRol', olVotosAnonimos: 'votosAnonimos', olAdivinar: 'adivinar',
  olCambiarVoto: 'cambiarVoto', olAcabarTodos: 'acabarSiTodosVotan',
  olNoEmpieza: 'noEmpieza', olTrampa: 'trampa', olPicante: 'picante', olPregJugadores: 'preguntasJugadores'
};
const AJUSTE_SELECTS = {
  olImpostores: 'impostores', olPista: 'pista', olTiempoDebate: 'tiempoDebate', olExpulsados: 'expulsados'
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
      ${soyAnfitrion() && j.id !== yo && j.foto ? `<button class="chip-x" data-quitarfoto="${esc(j.id)}" title="Quitarle la foto" aria-label="Quitarle la foto">🚫</button>` : ''}
      ${soyAnfitrion() && j.id !== yo ? `<button class="chip-x" data-echar="${esc(j.id)}" aria-label="Echar">✕</button>` : ''}
    </div>`).join('');
  $$('[data-quitarfoto]').forEach((b) => b.addEventListener('click', () => {
    if (confirm(`¿Quitarle la foto a ${nombre(b.dataset.quitarfoto)}?`)) mandar('quitarFoto', { quien: b.dataset.quitarfoto });
  }));
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
  $('#olOrden').innerHTML = r.orden.map((id, i) => `<span class="orden-item ${i === 0 ? 'primero' : ''}">
      ${avatar(id, 'mini')}<small>${i + 1}. ${esc(nombre(id))}</small></span>`).join('') +
    r.expulsados.map((id) => `<span class="orden-item fuera">
      ${avatar(id, 'mini muerto')}<small>${esc(nombre(id))}</small></span>`).join('');

  let instr;
  if (r.modo === 'preguntas') instr = 'Estas son las respuestas. ¿Cuál no encaja con la pregunta?';
  else if (r.numDebate === 1) instr = 'Por turnos, cada uno dice UNA palabra relacionada con la suya. Debatid y votad antes de que se acabe el tiempo.';
  else instr = 'Otra vuelta de palabras… ¡sin repetir! Y a votar otra vez.';
  if (r.expulsion && r.numDebate > 1) instr = `${r.expulsion.textos.join(' ')} ${instr}`;
  $('#olInstruccion').textContent = instr;

  $('#olRespuestasDebate').innerHTML = r.modo === 'preguntas'
    ? `${htmlRespuestas()}<p class="pregunta-real">La pregunta de verdad era:<br><b>"${esc(r.pregunta)}"</b></p>`
    : '';

  $('#olFantasma').classList.toggle('oculto', !(v.yo.participante && !v.yo.vivo));
  $('#panelMiCarta').classList.toggle('oculto', !v.yo.participante);
  if (v.yo.participante && !$('#cartaDebateFrente').innerHTML) {
    $('#cartaDebateFrente').innerHTML = htmlCarta(v.yo.carta);
    $('#cartaDebateFrente').classList.toggle('impostor', v.yo.carta && v.yo.carta.tipo === 'impostor');
  }
  pintarPanelVoto();
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

  $('#panelVoto').classList.toggle('oculto', !v.yo.participante && !r.vivos.length);
  const vivosConectados = r.vivos.filter((id) => jugador(id).conectado);
  $('#votoContador').textContent = `${r.votaron.length}/${vivosConectados.length} han votado`;
  $('#votoAyuda').textContent = (huecos === 1
    ? 'Elige a quién echar. Cuando se acabe el tiempo sale el más votado (si gana «saltar», no sale nadie).'
    : `Puedes votar hasta a ${huecos} personas. Cuando se acabe el tiempo salen los ${huecos} más votados.`)
    + (a.cambiarVoto ? ' Puedes cambiar el voto hasta el final.' : ' Ojo: una vez votas, no se puede cambiar.');

  const candidatos = r.vivos.filter((id) => id !== yo);
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
