// Servidor del modo online. Sirve la web y lleva las salas.
// Esta hecho igual que el del billar:
//
// TRANSPORTE. Solo dos cosas, y a proposito:
//   GET  /api/eventos?sala=ABCD&yo=...   chorro de eventos (SSE)
//   POST /api/enviar                     todo lo que manda un jugador
//
// Nada de websockets: la wifi del instituto los bloquea. SSE y POST son HTTPS
// normal y corriente y ningun filtro los distingue de cargar una pagina.
//
// DIFERENCIA CON EL BILLAR. Aqui no se puede mandar lo mismo a todos: cada
// movil recibe su propia vista, con SU carta y nada mas. Por eso cada chorro
// abierto recuerda de quien es.
//
// Sin dependencias: solo Node.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearSalas, limpiarNombre } from './online/salas.js';
import { cargarBanco } from './online/banco.js';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

/** Lo que no se sirve aunque este en la carpeta. */
const PRIVADO = new Set(['/server.js', '/package.json', '/render.yaml']);

const Salas = crearSalas({ banco: cargarBanco() });

/** Quien esta escuchando cada sala: codigo -> Set de { res, yo }. */
const oyentes = new Map();

function escribir(res, tipo, datos) {
  try { res.write(`event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`); return true; } catch { return false; }
}

/** A cada uno, su vista. */
function repartirEstado(sala) {
  const conjunto = oyentes.get(sala.codigo);
  if (!conjunto) return;
  for (const oyente of conjunto) {
    if (!escribir(oyente.res, 'estado', Salas.vista(sala, oyente.yo))) conjunto.delete(oyente);
  }
}

/** Avisos sueltos (por ejemplo "te han echado"). */
function avisar(codigo, yo, tipo, datos) {
  const conjunto = oyentes.get(codigo);
  if (!conjunto) return;
  for (const oyente of conjunto) if (oyente.yo === yo) escribir(oyente.res, tipo, datos);
}

// ------------------------------------------------------------------ utilidades

const json = (res, codigo, cuerpo) => {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
};

/** Nunca servir nada de fuera de la carpeta del proyecto. */
function rutaSegura(url) {
  let limpia;
  try { limpia = decodeURIComponent(url.split('?')[0]); } catch { return null; }
  if (PRIVADO.has(limpia) || limpia.includes('/.') || limpia.startsWith('/tests')) return null;
  const destino = path.normalize(path.join(RAIZ, limpia === '/' ? '/index.html' : limpia));
  return destino.startsWith(RAIZ + path.sep) ? destino : null;
}

/** Lee el cuerpo de un POST con tope, que viene de fuera. */
function leerCuerpo(req, tope = 16 * 1024) {
  return new Promise((ok, mal) => {
    let datos = '';
    req.on('data', (trozo) => {
      datos += trozo;
      if (datos.length > tope) { mal(new Error('cuerpo demasiado grande')); req.destroy(); }
    });
    req.on('end', () => {
      try { ok(datos ? JSON.parse(datos) : {}); } catch { mal(new Error('json malo')); }
    });
    req.on('error', mal);
  });
}

const id = (v) => String(v || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
const codigoDe = (v) => String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);

// --------------------------------------------------------------- el chorro SSE

function abrirEventos(req, res, url) {
  const codigo = codigoDe(url.searchParams.get('sala'));
  const yo = id(url.searchParams.get('yo'));
  const nombre = url.searchParams.get('nombre') ? limpiarNombre(url.searchParams.get('nombre')) : '';
  if (!codigo || !yo) return json(res, 400, { error: 'faltan sala o yo' });

  const r = Salas.entrar(codigo, yo, nombre);
  if (r.error) return json(res, 404, r);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': hola\n\n');

  const oyente = { res, yo };
  if (!oyentes.has(codigo)) oyentes.set(codigo, new Set());
  oyentes.get(codigo).add(oyente);
  repartirEstado(r.sala);

  // Latido: sin trafico, los proxys cortan la conexion a los 30-60 segundos.
  const latido = setInterval(() => {
    try { res.write(': lat\n\n'); } catch { /* ya esta cerrada */ }
  }, 20000);

  req.on('close', () => {
    clearInterval(latido);
    const conjunto = oyentes.get(codigo);
    if (conjunto) {
      conjunto.delete(oyente);
      if (!conjunto.size) oyentes.delete(codigo);
    }
    // Solo cuenta como desconectado si no le queda otra pestaña abierta.
    const sigue = [...(oyentes.get(codigo) || [])].some((o) => o.yo === yo);
    if (sigue) return;
    const sala = Salas.salir(codigo, yo);
    if (sala) repartirEstado(sala);
  });
}

// ------------------------------------------------------------------ el POST

const ACCIONES = {
  entrar: (c, yo, cu) => Salas.entrar(c, yo, cu.nombre),
  irse: (c, yo) => Salas.irse(c, yo),
  echar: (c, yo, cu) => Salas.echar(c, yo, id(cu.quien)),
  ajustes: (c, yo, cu) => Salas.ajustar(c, yo, cu.ajustes || {}),
  empezar: (c, yo) => Salas.empezar(c, yo),
  volver: (c, yo) => Salas.volverASala(c, yo),
  listo: (c, yo, cu) => Salas.listo(c, yo, cu.respuesta),
  forzar: (c, yo) => Salas.forzar(c, yo),
  reunion: (c, yo) => Salas.reunion(c, yo),
  votar: (c, yo, cu) => Salas.votar(c, yo, cu.voto === 'saltar' || cu.voto === 'nadie' ? cu.voto : id(cu.voto)),
  adivinar: (c, yo, cu) => Salas.adivinar(c, yo, cu.texto)
};

async function recibir(req, res) {
  let cuerpo;
  try { cuerpo = await leerCuerpo(req); } catch (e) { return json(res, 400, { error: e.message }); }

  const yo = id(cuerpo.yo);
  const codigo = codigoDe(cuerpo.sala);
  if (!yo) return json(res, 400, { error: 'falta yo' });

  if (cuerpo.tipo === 'crear') {
    const sala = Salas.crear(cuerpo.nombre, yo);
    return json(res, 200, { codigo: sala.codigo });
  }

  const accion = ACCIONES[cuerpo.tipo];
  if (!accion) return json(res, 400, { error: 'no sé qué es "' + String(cuerpo.tipo).slice(0, 20) + '"' });

  const r = accion(codigo, yo, cuerpo);
  if (r.error) return json(res, 400, { error: r.error });
  if (r.echado) avisar(codigo, r.echado, 'echado', {});
  repartirEstado(r.sala);
  return json(res, 200, { ok: true });
}

// ------------------------------------------------------------------ el servidor

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/api/ping') {
    return json(res, 200, { ok: true, juego: 'impostor', salas: Salas.salas.size });
  }
  if (url.pathname === '/api/eventos' && req.method === 'GET') return abrirEventos(req, res, url);
  if (url.pathname === '/api/enviar' && req.method === 'POST') return recibir(req, res);
  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'no existe' });

  const archivo = rutaSegura(req.url);
  if (!archivo) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No está');
    return;
  }
  fs.readFile(archivo, (err, datos) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No está');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(datos);
  });
});

// Los tiempos de cada fase (debate, votacion, expulsion…) los pasa este reloj.
setInterval(() => {
  for (const sala of Salas.tick()) repartirEstado(sala);
}, 250).unref();

setInterval(() => {
  const n = Salas.limpiar();
  if (n) console.log(`Se han tirado ${n} salas paradas`);
}, 10 * 60 * 1000).unref();

servidor.listen(PUERTO, HOST, () => {
  console.log(`Impostor en marcha: http://localhost:${PUERTO}`);
});
