// El cliente de red. Un chorro de eventos que entra y peticiones POST que
// salen, y nada mas (como en el billar): es lo unico que sobrevive a la wifi
// del instituto.
//
// IDENTIDAD POR PESTAÑA. El "yo" va en sessionStorage: recargar la pagina te
// devuelve a tu sitio, y dos pestañas en el mismo ordenador son dos jugadores
// distintos (util para probar). El nombre si va en localStorage.

/**
 * Cuando subas el servidor a Render, pon aqui su direccion, por ejemplo
 * 'https://impostor-xxxx.onrender.com'. Asi el boton "Jugar online" de la
 * version de GitHub Pages te lleva directamente alli.
 */
export const SERVIDOR_ONLINE = '';

const CLAVE_YO = 'impostor.yo';
const CLAVE_NOMBRE = 'impostor.nombre';

export function miId() {
  let v = null;
  try { v = sessionStorage.getItem(CLAVE_YO); } catch { /* modo privado */ }
  if (!v) {
    v = 'j' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { sessionStorage.setItem(CLAVE_YO, v); } catch { /* da igual */ }
  }
  return v;
}

export function miNombre() {
  try { return localStorage.getItem(CLAVE_NOMBRE) || ''; } catch { return ''; }
}

export function guardarNombre(n) {
  try { localStorage.setItem(CLAVE_NOMBRE, n); } catch { /* da igual */ }
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
export function escuchar(sala, nombre, manejadores) {
  const url = `/api/eventos?sala=${encodeURIComponent(sala)}` +
    `&yo=${encodeURIComponent(miId())}&nombre=${encodeURIComponent(nombre || '')}`;
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
