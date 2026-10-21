// Las salas online. Lo importante es que el servidor mande de verdad: que
// nadie vea la carta de otro, que no se pueda votar dos veces y que la
// partida acabe cuando tiene que acabar.

import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSalas, aciertaPalabra, limpiarAjustes, DURACION, MIN_JUGADORES } from '../online/salas.js';
import { cargarBanco } from '../online/banco.js';

const banco = cargarBanco();

/** Salas con reloj y azar de mentira, para poder probar el tiempo. */
function conReloj(semilla = 7) {
  let t = 1_000_000;
  let n = semilla;
  const azar = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
  const S = crearSalas({ ahora: () => t, azar, banco });
  return { S, avanzar: (ms) => { t += ms; return S.tick(); } };
}

/** Una sala con cinco jugadores ya repartida. */
function partida(ajustes = {}, semilla = 7) {
  const { S, avanzar } = conReloj(semilla);
  const sala = S.crear('Ana', 'a');
  for (const [id, nombre] of [['b', 'Bea'], ['c', 'Cris'], ['d', 'Dani'], ['e', 'Eva']]) S.entrar(sala.codigo, id, nombre);
  S.ajustar(sala.codigo, 'a', { impostores: 1, ...ajustes });
  const r = S.empezar(sala.codigo, 'a');
  assert.ok(!r.error, r.error);
  return { S, sala, avanzar, ids: ['a', 'b', 'c', 'd', 'e'] };
}

const impostoresDe = (sala) => [...sala.ronda.impostores];
const todosListos = (S, sala, ids) => ids.forEach((id) => S.listo(sala.codigo, id, 'algo'));

test('cada uno tiene un color distinto', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  for (let i = 0; i < 12; i++) S.entrar(sala.codigo, 'x' + i, 'J' + i);
  const colores = sala.jugadores.map((j) => j.color);
  assert.equal(new Set(colores).size, colores.length);
});

test('dos con el mismo nombre no se confunden', () => {
  const { S } = conReloj();
  const sala = S.crear('Samuel', 'a');
  S.entrar(sala.codigo, 'b', 'samuel');
  assert.notEqual(sala.jugadores[0].nombre.toLowerCase(), sala.jugadores[1].nombre.toLowerCase());
});

test('no se empieza con menos de tres', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.entrar(sala.codigo, 'b', 'Bea');
  assert.match(S.empezar(sala.codigo, 'a').error, new RegExp(String(MIN_JUGADORES)));
});

test('solo el anfitrion empieza y cambia ajustes', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.entrar(sala.codigo, 'b', 'Bea');
  S.entrar(sala.codigo, 'c', 'Cris');
  assert.ok(S.empezar(sala.codigo, 'b').error);
  assert.ok(S.ajustar(sala.codigo, 'b', { modo: 'preguntas' }).error);
});

test('si el anfitrion se va, manda el siguiente', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.entrar(sala.codigo, 'b', 'Bea');
  S.salir(sala.codigo, 'a');
  assert.equal(S.vista(sala, 'b').anfitrion, 'b');
});

test('nadie ve la carta de otro ni quien es el impostor', () => {
  const { S, sala, ids } = partida({ modo: 'undercover' });
  const [imp] = impostoresDe(sala);
  const inocente = ids.find((id) => id !== imp);
  const v = JSON.stringify(S.vista(sala, inocente));
  assert.ok(!v.includes(sala.ronda.gemela), 'un inocente ha recibido la palabra del undercover');
  assert.equal(S.vista(sala, inocente).ronda.final, null, 'se ha mandado la lista de impostores');
  assert.ok(!v.includes(`"${imp}":true`) && !v.includes('"soyImpostor":true'));
  const vi = S.vista(sala, imp);
  assert.equal(vi.yo.carta.texto, sala.ronda.gemela);
  assert.ok(!JSON.stringify(vi).includes(`"texto":"${sala.ronda.palabra}"`));
});

test('en clasico el impostor no recibe la palabra', () => {
  const { S, sala } = partida({ modo: 'clasico', pista: 'categoria' });
  const [imp] = impostoresDe(sala);
  const v = S.vista(sala, imp);
  assert.equal(v.yo.carta.tipo, 'impostor');
  assert.ok(!JSON.stringify(v).includes(sala.ronda.palabra));
  assert.equal(v.yo.carta.pistas[0].texto, sala.ronda.categoria);
});

test('modo preguntas: las respuestas no se ven hasta que contesta todo el mundo', () => {
  const { S, sala, ids } = partida({ modo: 'preguntas' });
  assert.ok(S.listo(sala.codigo, 'a', '').error, 'deja seguir sin respuesta');
  S.listo(sala.codigo, 'a', 'Siete');
  assert.equal(S.vista(sala, 'b').ronda.respuestas, null);
  assert.equal(S.vista(sala, 'b').ronda.pregunta, null);
  ids.slice(1).forEach((id) => S.listo(sala.codigo, id, 'Respuesta de ' + id));
  assert.equal(sala.fase, 'debate');
  const v = S.vista(sala, 'b');
  assert.equal(v.ronda.respuestas.a, 'Siete');
  assert.equal(v.ronda.pregunta, sala.ronda.palabra);
});

test('el reparto no espera a los que se han desconectado', () => {
  const { S, sala, ids } = partida();
  S.salir(sala.codigo, 'e');
  todosListos(S, sala, ids.slice(0, 4));
  assert.equal(sala.fase, 'debate');
});

test('reunion de emergencia y votacion estilo Among Us', () => {
  const { S, sala, ids, avanzar } = partida();
  todosListos(S, sala, ids);
  assert.ok(!S.reunion(sala.codigo, 'b').error);
  assert.equal(sala.fase, 'votacion');
  assert.equal(S.vista(sala, 'a').ronda.convocante, 'b');

  const [imp] = impostoresDe(sala);
  S.votar(sala.codigo, 'a', imp);
  assert.ok(S.votar(sala.codigo, 'a', 'saltar').error, 'deja votar dos veces');
  // Mientras se vota se sabe quien ha votado, pero no a quien
  const v = S.vista(sala, 'c');
  assert.deepEqual(v.ronda.votaron, ['a']);
  assert.ok(!JSON.stringify(v).includes(`"a":"${imp}"`));

  ids.filter((id) => id !== 'a').forEach((id) => S.votar(sala.codigo, id, id === imp ? 'saltar' : imp));
  assert.equal(sala.fase, 'resultado', 'con todos votados se cierra sola');
  assert.equal(sala.ronda.ultimoVoto.expulsado, imp);

  avanzar(DURACION.resultado);
  assert.equal(sala.fase, 'expulsion');
  assert.match(sala.ronda.expulsion.textos[0], /era el impostor/);
  avanzar(DURACION.expulsion);
  // En clasico, el impostor pillado tiene su ultima oportunidad
  assert.equal(sala.fase, 'adivinar');
  assert.ok(S.adivinar(sala.codigo, 'a', 'x').error || imp === 'a');
  S.adivinar(sala.codigo, imp, 'nada que ver');
  assert.equal(sala.fase, 'final');
  assert.equal(sala.ronda.resultado.ganan, 'inocentes');
  // Inocentes +1, y +1 extra por haber votado al impostor
  assert.equal(sala.puntos.a, imp === 'a' ? undefined : 2);
});

test('el impostor que adivina la palabra roba la victoria', () => {
  const { S, sala, ids, avanzar } = partida();
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  const [imp] = impostoresDe(sala);
  ids.forEach((id) => S.votar(sala.codigo, id, imp));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  S.adivinar(sala.codigo, imp, sala.ronda.palabra.toUpperCase());
  assert.equal(sala.ronda.resultado.ganan, 'impostores');
  assert.equal(sala.puntos[imp], 3);
});

test('empate: no se expulsa a nadie y se sigue', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  S.votar(sala.codigo, 'a', 'b');
  S.votar(sala.codigo, 'b', 'a');
  S.votar(sala.codigo, 'c', 'saltar');
  S.votar(sala.codigo, 'd', 'saltar');
  S.votar(sala.codigo, 'e', 'c');
  assert.equal(sala.ronda.ultimoVoto.expulsado, null);
  avanzar(DURACION.resultado);
  assert.match(sala.ronda.expulsion.textos[0], /Nadie/);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'debate');
  assert.equal(sala.ronda.numDebate, 2);
});

test('expulsar inocentes hasta que los impostores son tantos como ellos', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  const inocentes = ids.filter((id) => id !== imp);
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    S.reunion(sala.codigo, imp);
    const victima = inocentes[vuelta];
    sala.ronda.participantes.filter((id) => sala.ronda.vivos.has(id)).forEach((id) => S.votar(sala.codigo, id, victima));
    avanzar(DURACION.resultado);
    avanzar(DURACION.expulsion);
    if (sala.fase === 'final') break;
  }
  assert.equal(sala.fase, 'final');
  assert.equal(sala.ronda.resultado.ganan, 'impostores');
});

test('los expulsados ni votan ni convocan', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  const victima = ids.find((id) => id !== imp);
  S.reunion(sala.codigo, 'a' === victima ? 'b' : 'a');
  ids.forEach((id) => S.votar(sala.codigo, id, victima));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.ok(S.reunion(sala.codigo, victima).error);
});

test('se acaba el tiempo de debate y empieza la votacion sola', () => {
  const { S, sala, ids, avanzar } = partida({ tiempoDebate: 60 });
  todosListos(S, sala, ids);
  avanzar(59_000);
  assert.equal(sala.fase, 'debate');
  avanzar(1_000);
  assert.equal(sala.fase, 'votacion');
  assert.equal(sala.ronda.motivoVoto, 'tiempo');
});

test('se acaba el tiempo de votar: los que no votan no cuentan', () => {
  const { S, sala, ids, avanzar } = partida({ tiempoVoto: 30 });
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  S.votar(sala.codigo, 'a', 'b');
  avanzar(30_000);
  assert.equal(sala.fase, 'resultado');
  assert.equal(sala.ronda.ultimoVoto.expulsado, 'b');
  assert.equal(sala.ronda.ultimoVoto.noVotaron.length, 4);
});

test('votos anonimos: se ve cuantos, no quien', () => {
  const { S, sala, ids } = partida({ votosAnonimos: true });
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  ids.forEach((id) => S.votar(sala.codigo, id, 'b'));
  const det = S.vista(sala, 'c').ronda.ultimoVoto.detalle;
  assert.equal(det.b.length, 5);
  assert.ok(det.b.every((x) => x === null));
});

test('ronda trampa sin impostor: votar "no hay impostor" da puntos a todos', () => {
  // Se busca una semilla que saque la trampa de "ninguno"
  for (let semilla = 1; semilla < 400; semilla++) {
    const { S, sala, ids, avanzar } = partida({ trampa: true, probTrampa: 50 }, semilla);
    if (sala.ronda.trampa !== 'ninguno') continue;
    todosListos(S, sala, ids);
    S.reunion(sala.codigo, 'a');
    ids.forEach((id) => S.votar(sala.codigo, id, 'nadie'));
    avanzar(DURACION.resultado);
    avanzar(DURACION.expulsion);
    assert.equal(sala.ronda.resultado.tipo, 'trampaAcertada');
    ids.forEach((id) => assert.equal(sala.puntos[id], 1));
    return;
  }
  assert.fail('ninguna semilla ha sacado la ronda trampa');
});

test('"no hay impostor" no se puede votar sin rondas trampa', () => {
  const { S, sala, ids } = partida({ trampa: false });
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  assert.ok(S.votar(sala.codigo, 'a', 'nadie').error);
});

test('las palabras con jugadores usan los nombres de la sala', () => {
  const { S, sala } = partida({ categorias: ['Vosotros'] });
  const nombres = ['Ana', 'Bea', 'Cris', 'Dani', 'Eva'];
  assert.ok(nombres.some((n) => sala.ronda.palabra.includes(n)), sala.ronda.palabra);
  assert.ok(!sala.ronda.palabra.includes('{J'));
  assert.notEqual(sala.ronda.palabra, sala.ronda.gemela);
});

test('acertar la palabra perdona tildes y mayusculas', () => {
  assert.ok(aciertaPalabra('tiburon', 'Tiburón'));
  assert.ok(aciertaPalabra('TORTILLA', 'Tortilla de patatas'));
  assert.ok(aciertaPalabra('la paella', 'Paella'));
  assert.ok(!aciertaPalabra('pez', 'Tiburón'));
  assert.ok(!aciertaPalabra('', 'Tiburón'));
});

test('los ajustes que vienen de fuera se limpian', () => {
  const a = limpiarAjustes({ modo: 'hackeo', tiempoVoto: 999999, impostores: -3, categorias: ['Comida', 'Inventada'] },
    undefined, ['Comida']);
  assert.equal(a.modo, 'clasico');
  assert.equal(a.tiempoVoto, 300);
  assert.equal(a.impostores, 0);
  assert.deepEqual(a.categorias, ['Comida']);
});

test('otra ronda con los mismos jugadores', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  S.reunion(sala.codigo, 'a');
  const [imp] = impostoresDe(sala);
  ids.forEach((id) => S.votar(sala.codigo, id, imp));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'final');
  const palabra = sala.ronda.palabra;
  assert.ok(!S.empezar(sala.codigo, 'a').error);
  assert.equal(sala.fase, 'reparto');
  assert.equal(sala.ronda.num, 2);
  assert.notEqual(sala.ronda.palabra, palabra);
});
