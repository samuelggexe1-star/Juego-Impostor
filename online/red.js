// El cliente de red. Un chorro de eventos que entra y peticiones POST que
// salen, y nada mas (como en el billar): es lo unico que sobrevive a la wifi
// del instituto.
//
// EL PERFIL VIVE EN EL MOVIL. El "yo", el nombre, el color y la foto se
// guardan en localStorage: mañana abres el juego y sigues siendo tu, sin
// cuentas ni contraseñas. Si se borran los datos del navegador, se pierde.

/**
 * Cuando subas el servidor a Render, pon aqui su direccion, por ejemplo
 * 'https://impostor-xxxx.onrender.com'. Asi el boton "Jugar online" de la
 * version de GitHub Pages te lleva directamente alli.
 */
export const SERVIDOR_ONLINE = 'https://impostor-sd7s.onrender.com';

const CLAVE_YO = 'impostor.id';
const CLAVE_PERFIL = 'impostor.perfil';
const CLAVE_SALA = 'impostor.ultimaSala';

let idEnMemoria = null; // por si el navegador no deja guardar (modo privado)

export function miId() {
  if (idEnMemoria) return idEnMemoria;
  let v = null;
  try { v = localStorage.getItem(CLAVE_YO); } catch { /* modo privado */ }
  if (!v) {
    v = 'j' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(CLAVE_YO, v); } catch { /* da igual */ }
  }
  idEnMemoria = v;
  return v;
}

/** { nombre, color, foto (data URL o null), stats } */
export function cargarPerfil() {
  const vacio = { nombre: '', color: '', foto: null, stats: {} };
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PERFIL));
    if (p && typeof p === 'object') return { ...vacio, ...p, stats: { ...(p.stats || {}) } };
    // Los que ya habian jugado tenian guardado solo el nombre
    const viejo = localStorage.getItem('impostor.nombre');
    if (viejo) return { ...vacio, nombre: viejo };
  } catch { /* nada guardado */ }
  return vacio;
}

/** Devuelve false si no se ha podido guardar (por ejemplo, memoria llena). */
export function guardarPerfil(perfil) {
  try { localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil)); return true; } catch { return false; }
}

export function ultimaSala() {
  try { return localStorage.getItem(CLAVE_SALA) || ''; } catch { return ''; }
}

export function recordarSala(codigo) {
  try {
    if (codigo) localStorage.setItem(CLAVE_SALA, codigo); else localStorage.removeItem(CLAVE_SALA);
  } catch { /* da igual */ }
}

/** Manda algo al servidor. Devuelve lo que conteste, o lanza con el motivo. */
export async function enviar(datos) {
  let r;
  try {
    r = await fetch('/api/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yo: miId(), ...datos })
    });
  } catch {
    throw new Error('Sin conexión con el servidor');
  }
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || 'El servidor ha dicho que no');
  return cuerpo;
}

/**
 * Se engancha al chorro de eventos de una sala. EventSource reconecta solo, y
 * el servidor manda el estado entero en cuanto alguien se engancha, asi que
 * volver de un bloqueo de pantalla no necesita nada especial.
 */
export function escuchar(sala, nombre, color, espectador, manejadores) {
  const url = `/api/eventos?sala=${encodeURIComponent(sala)}` +
    `&yo=${encodeURIComponent(miId())}&nombre=${encodeURIComponent(nombre || '')}&color=${encodeURIComponent(color || '')}` +
    (espectador ? '&espectador=1' : '');
  const fuente = new EventSource(url);
  for (const [tipo, fn] of Object.entries(manejadores)) {
    if (tipo === 'abierto' || tipo === 'caido') continue;
    fuente.addEventListener(tipo, (ev) => {
      let datos = null;
      try { datos = JSON.parse(ev.data); } catch { return; }
      fn(datos);
    });
  }
  fuente.onopen = () => manejadores.abierto && manejadores.abierto();
  fuente.onerror = () => manejadores.caido && manejadores.caido();
  return { cerrar: () => fuente.close(), fuente };
}

/** El chat general: un chorro aparte, para todo el mundo. */
export function escucharChat(manejadores) {
  const fuente = new EventSource('/api/chat');
  for (const [tipo, fn] of Object.entries(manejadores)) {
    if (tipo === 'abierto' || tipo === 'caido') continue;
    fuente.addEventListener(tipo, (ev) => {
      let datos = null;
      try { datos = JSON.parse(ev.data); } catch { return; }
      fn(datos);
    });
  }
  fuente.onopen = () => manejadores.abierto && manejadores.abierto();
  fuente.onerror = () => manejadores.caido && manejadores.caido();
  return fuente;
}

/** ¿Hay un servidor del impostor detras de esta pagina? (en GitHub Pages no) */
export async function hayServidor(tope = 3000) {
  try {
    const corte = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(tope) : undefined;
    const r = await fetch('/api/ping', { cache: 'no-store', signal: corte });
    if (!r.ok) return false;
    const cuerpo = await r.json();
    return !!cuerpo && cuerpo.juego === 'impostor';
  } catch {
    return false;
  }
}

export function enlaceDeSala(codigo) {
  const u = new URL(location.href);
  u.search = '?sala=' + codigo;
  u.hash = '';
  return u.toString();
}

export function salaDelEnlace() {
  const s = new URL(location.href).searchParams.get('sala');
  return s ? s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) : '';
}
