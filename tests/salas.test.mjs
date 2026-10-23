// Las salas online. Lo importante es que el servidor mande de verdad: que
// nadie vea la carta de otro, que no se pueda votar dos veces y que la
// partida acabe cuando tiene que acabar.

import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSalas, aciertaPalabra, limpiarAjustes, DURACION, MIN_JUGADORES, REINICIO_PUBLICA_MS, CADUCA_MS } from '../online/salas.js';
import { cargarBanco } from '../online/banco.js';

const banco = cargarBanco();

/** Salas con reloj y azar de mentira, para poder probar el tiempo. */
function conReloj(semilla = 7) {
  let t = 1_000_000;
  let n = semilla;
  const azar = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
  const S = crearSalas({ ahora: () => t, azar, banco });
  return { S, avanzar: (ms) => { t += ms; return S.tick(); }, mover: (ms) => { t += ms; } };
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

/** Vota cada uno lo que diga `que` (id -> lista) y deja que se acabe el tiempo. */
function votarYContar(S, sala, avanzar, que) {
  for (const [id, voto] of Object.entries(que)) {
    const r = S.votar(sala.codigo, id, voto);
    assert.ok(!r.error, `${id} no ha podido votar: ${r.error}`);
  }
  avanzar(sala.ajustes.tiempoDebate * 1000);
  assert.equal(sala.fase, 'resultado');
}

const todosA = (sala, objetivo, menos = []) => Object.fromEntries(
  sala.ronda.participantes.filter((id) => sala.ronda.vivos.has(id) && !menos.includes(id))
    .map((id) => [id, id === objetivo ? ['saltar'] : [objetivo]]));

test('se debate y se vota a la vez: al acabar el tiempo sale el mas votado', () => {
  const { S, sala, ids, avanzar } = partida({ tiempoDebate: 120 });
  todosListos(S, sala, ids);
  assert.equal(sala.fase, 'debate');
  const [imp] = impostoresDe(sala);
  S.votar(sala.codigo, 'a', [imp === 'a' ? 'b' : imp]);
  // Mientras se vota se sabe quien ha votado, pero no a quien
  const v = S.vista(sala, 'c');
  assert.deepEqual(v.ronda.votaron, ['a']);
  assert.equal(v.ronda.ultimoVoto, null);
  // Aunque voten todos, se espera al reloj (por defecto)
  for (const [id, voto] of Object.entries(todosA(sala, imp))) S.votar(sala.codigo, id, voto);
  assert.equal(sala.fase, 'debate');
  avanzar(119_000);
  assert.equal(sala.fase, 'debate');
  avanzar(1_000);
  assert.equal(sala.fase, 'resultado');
  assert.deepEqual(sala.ronda.ultimoVoto.expulsados, [imp]);
});

test('se puede cambiar el voto hasta el final (o no, segun el ajuste)', () => {
  const a = partida();
  todosListos(a.S, a.sala, a.ids);
  a.S.votar(a.sala.codigo, 'a', ['b']);
  assert.ok(!a.S.votar(a.sala.codigo, 'a', ['c']).error);
  assert.deepEqual(a.sala.ronda.votos.a, ['c']);

  const b = partida({ cambiarVoto: false });
  todosListos(b.S, b.sala, b.ids);
  b.S.votar(b.sala.codigo, 'a', ['b']);
  assert.ok(b.S.votar(b.sala.codigo, 'a', ['c']).error);
});

test('nadie se vota a si mismo ni vota a mas gente de la cuenta', () => {
  const { S, sala, ids } = partida({ expulsados: 2 });
  todosListos(S, sala, ids);
  assert.ok(S.votar(sala.codigo, 'a', ['a']).error);
  assert.ok(S.votar(sala.codigo, 'a', ['b', 'c', 'd']).error);
  assert.ok(!S.votar(sala.codigo, 'a', ['b', 'c']).error);
});

test('si todos han votado se puede acabar antes (ajuste)', () => {
  const { S, sala, ids } = partida({ acabarSiTodosVotan: true });
  todosListos(S, sala, ids);
  ids.forEach((id) => S.votar(sala.codigo, id, id === 'b' ? ['saltar'] : ['b']));
  assert.equal(sala.fase, 'resultado');
});

test('expulsado el impostor: dice que lo era y el pillado intenta adivinar', () => {
  const { S, sala, ids, avanzar } = partida();
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  votarYContar(S, sala, avanzar, todosA(sala, imp));
  avanzar(DURACION.resultado);
  assert.equal(sala.fase, 'expulsion');
  assert.match(sala.ronda.expulsion.textos[0], /era el impostor/);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'adivinar');
  S.adivinar(sala.codigo, imp, 'nada que ver');
  assert.equal(sala.ronda.resultado.ganan, 'inocentes');
  const votante = ids.find((id) => id !== imp);
  assert.equal(sala.puntos[votante], 2, 'inocente +1 y +1 por votar al impostor');
});

test('el impostor que adivina la palabra roba la victoria', () => {
  const { S, sala, ids, avanzar } = partida();
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  votarYContar(S, sala, avanzar, todosA(sala, imp));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  S.adivinar(sala.codigo, imp, sala.ronda.palabra.toUpperCase());
  assert.equal(sala.ronda.resultado.ganan, 'impostores');
  assert.equal(sala.puntos[imp], 3);
});

test('roles ocultos: no se sabe si el expulsado era impostor hasta el final', () => {
  const { S, sala, ids, avanzar } = partida({ mostrarRol: false, adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  const inocente = ids.find((id) => id !== imp);
  votarYContar(S, sala, avanzar, todosA(sala, inocente));
  avanzar(DURACION.resultado);
  const v = S.vista(sala, 'c');
  const texto = v.ronda.expulsion.textos.join(' ');
  assert.match(texto, /ha sido expulsado/);
  assert.ok(!/era (el|un)|Queda/.test(texto), texto);
  assert.deepEqual(v.ronda.expulsion.roles, {});
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'debate');
  // Al final si se ve todo
  votarYContar(S, sala, avanzar, todosA(sala, imp));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'final');
  const f = S.vista(sala, 'c').ronda.final;
  assert.deepEqual(f.impostores, [imp]);
  assert.equal(f.historialExpulsiones.length, 2);
});

test('varios expulsados por turno: salen los mas votados', () => {
  const { S, sala, ids, avanzar } = partida({ expulsados: 2, impostores: 2, adivinar: false }, 11);
  todosListos(S, sala, ids);
  // a, b y c votan a d y e; d y e votan a a y b
  votarYContar(S, sala, avanzar, { a: ['d', 'e'], b: ['d', 'e'], c: ['d', 'e'], d: ['a', 'b'], e: ['a', 'b'] });
  assert.deepEqual(sala.ronda.ultimoVoto.expulsados.sort(), ['d', 'e']);
});

test('empate en el ultimo hueco: no sale ninguno de los empatados', () => {
  const { S, sala, ids, avanzar } = partida({ expulsados: 2, adivinar: false });
  todosListos(S, sala, ids);
  // d con 3 votos sale; b y c empatan a 2 por el segundo hueco: no sale ninguno
  votarYContar(S, sala, avanzar, { a: ['d', 'b'], b: ['d', 'c'], c: ['d', 'b'], d: ['c'], e: ['saltar'] });
  assert.deepEqual(sala.ronda.ultimoVoto.expulsados, ['d']);
});

test('si gana el saltar, no sale nadie', () => {
  const { S, sala, ids, avanzar } = partida();
  todosListos(S, sala, ids);
  votarYContar(S, sala, avanzar, { a: ['saltar'], b: ['saltar'], c: ['saltar'], d: ['a'], e: ['b'] });
  assert.deepEqual(sala.ronda.ultimoVoto.expulsados, []);
  avanzar(DURACION.resultado);
  assert.match(sala.ronda.expulsion.textos[0], /Nadie/);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'debate');
  assert.equal(sala.ronda.numDebate, 2);
});

test('si los impostores son la mitad, ganan directamente', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  const inocentes = ids.filter((id) => id !== imp);
  // 5 jugadores, 1 impostor: hay que echar a 3 inocentes para que queden 1 contra 1
  for (let vuelta = 0; vuelta < 3 && sala.fase !== 'final'; vuelta++) {
    votarYContar(S, sala, avanzar, todosA(sala, inocentes[vuelta]));
    avanzar(DURACION.resultado);
    avanzar(DURACION.expulsion);
  }
  assert.equal(sala.fase, 'final');
  assert.equal(sala.ronda.resultado.ganan, 'impostores');
  assert.equal(sala.ronda.vivos.size, 2);
});

test('nunca se echa a tanta gente que no quede partida', () => {
  const { S, sala, ids, avanzar } = partida({ expulsados: 3, adivinar: false });
  todosListos(S, sala, ids);
  // con 5 vivos, como mucho 3; con 3 vivos, como mucho 1
  assert.equal(S.vista(sala, 'a').ronda.huecos, 3);
  const [imp] = impostoresDe(sala);
  const inocentes = ids.filter((id) => id !== imp);
  votarYContar(S, sala, avanzar, Object.fromEntries(ids.map((id) => [id, inocentes.filter((x) => x !== id).slice(0, 2)])));
  avanzar(DURACION.resultado);
  if (sala.fase === 'expulsion') avanzar(DURACION.expulsion);
  if (sala.fase === 'debate') assert.ok(S.vista(sala, imp).ronda.huecos <= sala.ronda.vivos.size - 2);
});

test('los expulsados no votan', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  const victima = ids.find((id) => id !== imp);
  votarYContar(S, sala, avanzar, todosA(sala, victima));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.ok(S.votar(sala.codigo, victima, [imp]).error);
});

test('el anfitrion puede cerrar la votacion antes de tiempo', () => {
  const { S, sala, ids } = partida();
  todosListos(S, sala, ids);
  S.votar(sala.codigo, 'b', ['c']);
  assert.ok(S.forzar(sala.codigo, 'b').error, 'no es anfitrion');
  S.forzar(sala.codigo, 'a');
  assert.equal(sala.fase, 'resultado');
});

test('votos anonimos: se ve cuantos, no quien', () => {
  const { S, sala, ids, avanzar } = partida({ votosAnonimos: true });
  todosListos(S, sala, ids);
  votarYContar(S, sala, avanzar, todosA(sala, 'b'));
  const det = S.vista(sala, 'c').ronda.ultimoVoto.detalle;
  assert.equal(det.b.length, 4);
  assert.ok(det.b.every((x) => x === null));
});

test('ronda trampa sin impostor: votar "no hay impostor" da puntos a todos', () => {
  for (let semilla = 1; semilla < 400; semilla++) {
    const { S, sala, ids, avanzar } = partida({ trampa: true, probTrampa: 50 }, semilla);
    if (sala.ronda.trampa !== 'ninguno') continue;
    todosListos(S, sala, ids);
    votarYContar(S, sala, avanzar, Object.fromEntries(ids.map((id) => [id, ['nadie']])));
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
  assert.ok(S.votar(sala.codigo, 'a', ['nadie']).error);
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
  const a = limpiarAjustes({ modo: 'hackeo', tiempoDebate: 999999, expulsados: 9, impostores: -3, categorias: ['Comida', 'Inventada'] },
    undefined, ['Comida']);
  assert.equal(a.modo, 'clasico');
  assert.equal(a.tiempoDebate, 900);
  assert.equal(a.expulsados, 3);
  assert.equal(a.impostores, 0);
  assert.deepEqual(a.categorias, ['Comida']);
});

test('otra ronda con los mismos jugadores', () => {
  const { S, sala, ids, avanzar } = partida({ adivinar: false });
  todosListos(S, sala, ids);
  const [imp] = impostoresDe(sala);
  votarYContar(S, sala, avanzar, todosA(sala, imp));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'final');
  const palabra = sala.ronda.palabra;
  assert.ok(!S.empezar(sala.codigo, 'a').error);
  assert.equal(sala.fase, 'reparto');
  assert.equal(sala.ronda.num, 2);
  assert.notEqual(sala.ronda.palabra, palabra);
});

// ------------------------------------------------------------------ perfiles

const FOTO = 'data:image/jpeg;base64,' + Buffer.from('foto de mentira').toString('base64');

test('cada uno entra con su color favorito si esta libre', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a', 'lima');
  S.entrar(sala.codigo, 'b', 'Bea', 'lima');
  S.entrar(sala.codigo, 'c', 'Cris', 'morado');
  const colores = Object.fromEntries(sala.jugadores.map((j) => [j.id, j.color]));
  assert.equal(colores.a, 'lima');
  assert.notEqual(colores.b, 'lima', 'dos con el mismo color');
  assert.equal(colores.c, 'morado');
});

test('la foto se guarda, pero en el estado solo va su version', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  assert.ok(!S.perfil(sala.codigo, 'a', { foto: FOTO }).error);
  const v = S.vista(sala, 'a');
  assert.equal(typeof v.jugadores[0].foto, 'number');
  assert.ok(!JSON.stringify(v).includes('base64'), 'la foto entera va en cada actualizacion');
  assert.equal(S.fotoDe(sala.codigo, 'a').tipo, 'image/jpeg');
});

test('no se aceptan fotos raras ni enormes', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  assert.ok(S.perfil(sala.codigo, 'a', { foto: 'javascript:alert(1)' }).error);
  assert.ok(S.perfil(sala.codigo, 'a', { foto: 'data:image/svg+xml;base64,PHN2Zz4=' }).error);
  assert.ok(S.perfil(sala.codigo, 'a', { foto: 'data:image/jpeg;base64,' + 'A'.repeat(70000) }).error);
});

test('cambiar nombre y color desde el perfil', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a', 'rojo');
  S.entrar(sala.codigo, 'b', 'Bea', 'azul');
  S.perfil(sala.codigo, 'a', { nombre: 'Anita', color: 'azul' });
  const a = sala.jugadores.find((j) => j.id === 'a');
  assert.equal(a.nombre, 'Anita');
  assert.equal(a.color, 'rojo', 'le ha quitado el color a otro');
  S.perfil(sala.codigo, 'a', { color: 'verde' });
  assert.equal(a.color, 'verde');
});

test('el anfitrion puede quitarle la foto a alguien', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.entrar(sala.codigo, 'b', 'Bea');
  S.perfil(sala.codigo, 'b', { foto: FOTO });
  assert.ok(S.quitarFoto(sala.codigo, 'b', 'b').error, 'no es anfitrion');
  S.quitarFoto(sala.codigo, 'a', 'b');
  assert.equal(S.fotoDe(sala.codigo, 'b'), null);
});

// ------------------------------------------------------------------ salas publicas

test('siempre hay tres salas publicas y salen en la lista', () => {
  const { S } = conReloj();
  const lista = S.publicas();
  assert.deepEqual(lista.map((p) => p.nombre), ['Sala 1', 'Sala 2', 'Sala 3']);
  assert.ok(lista.every((p) => p.jugadores === 0 && p.fase === 'sala'));
});

test('en una sala publica manda el primero que entra', () => {
  const { S } = conReloj();
  S.entrar('UNO', 'a', 'Ana');
  S.entrar('uno', 'b', 'Bea');
  const sala = S.salas.get('UNO');
  assert.equal(S.vista(sala, 'b').anfitrion, 'a');
  assert.equal(S.publicas()[0].jugadores, 2);
  assert.deepEqual(S.publicas()[0].quienes.map((q) => q.nombre), ['Ana', 'Bea']);
});

test('una sala publica vacia vuelve a empezar, pero no se borra', () => {
  const { S, mover } = conReloj();
  ['a', 'b', 'c'].forEach((id) => S.entrar('DOS', id, id.toUpperCase()));
  S.empezar('DOS', 'a');
  const sala = S.salas.get('DOS');
  assert.equal(sala.fase, 'reparto');
  ['a', 'b', 'c'].forEach((id) => S.salir('DOS', id));
  // Si todos bloquean el movil un momento, la partida sigue ahi
  mover(60_000);
  S.limpiar();
  assert.equal(sala.fase, 'reparto');
  mover(REINICIO_PUBLICA_MS);
  S.limpiar();
  assert.equal(sala.fase, 'sala');
  assert.equal(sala.jugadores.length, 0);
  mover(CADUCA_MS * 2);
  S.limpiar();
  assert.ok(S.salas.has('DOS'), 'se ha borrado una sala publica');
});

test('las salas privadas siguen caducando', () => {
  const { S, mover } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.salir(sala.codigo, 'a');
  mover(CADUCA_MS + 1);
  S.limpiar();
  assert.ok(!S.salas.has(sala.codigo));
});

// ------------------------------------------------------------------ espectadores

test('los espectadores no juegan la ronda y lo ven todo', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  ['b', 'c'].forEach((id) => S.entrar(sala.codigo, id, id.toUpperCase()));
  S.entrar(sala.codigo, 'x', 'Mirón', null, true);
  S.empezar(sala.codigo, 'a');
  assert.ok(!sala.ronda.participantes.includes('x'));
  const v = S.vista(sala, 'x');
  assert.equal(v.yo.participante, false);
  assert.deepEqual(v.espectador.impostores, [...sala.ronda.impostores]);
  assert.equal(v.espectador.palabra, sala.ronda.palabra);
  assert.equal(Object.keys(v.espectador.cartas).length, 3);
  // Los jugadores no reciben nada de eso
  assert.equal(S.vista(sala, 'a').espectador, undefined);
});

test('los espectadores no cuentan para el minimo de jugadores', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  S.entrar(sala.codigo, 'b', 'Bea');
  S.entrar(sala.codigo, 'x', 'Mirón', null, true);
  assert.ok(S.empezar(sala.codigo, 'a').error);
});

test('quien llega con la ronda en marcha la mira entera y juega la siguiente', () => {
  const { S, sala, avanzar } = partida();
  S.entrar(sala.codigo, 'z', 'Zoe');
  const v = S.vista(sala, 'z');
  assert.equal(v.yo.participante, false);
  assert.ok(v.espectador && v.espectador.palabra);
  sala.fase = 'final';
  S.empezar(sala.codigo, 'a');
  assert.ok(sala.ronda.participantes.includes('z'));
});

test('un jugador no se puede pasar a espectador en mitad de la ronda', () => {
  const { S, sala } = partida();
  assert.ok(S.cambiarModo(sala.codigo, 'b', true).error);
  sala.fase = 'final';
  assert.ok(!S.cambiarModo(sala.codigo, 'b', true).error);
  assert.ok(!S.empezar(sala.codigo, 'a').error);
  assert.ok(!sala.ronda.participantes.includes('b'));
});

test('el anfitrion puede hacer que los espectadores no vean nada', () => {
  const { S } = conReloj();
  const sala = S.crear('Ana', 'a');
  ['b', 'c'].forEach((id) => S.entrar(sala.codigo, id, id.toUpperCase()));
  S.entrar(sala.codigo, 'x', 'Mirón', null, true);
  S.ajustar(sala.codigo, 'a', { espectadoresVenTodo: false });
  S.empezar(sala.codigo, 'a');
  assert.equal(S.vista(sala, 'x').espectador, undefined);
});

// ------------------------------------------------------------------ pistas escritas

test('pistas escritas: cada uno escribe su palabra en su turno y luego se vota', () => {
  const { S, sala, ids } = partida({ pistas: 'escritas', vueltasPistas: 1 });
  todosListos(S, sala, ids);
  assert.equal(sala.fase, 'pistas');
  const orden = [...sala.ronda.orden];
  assert.equal(S.vista(sala, 'a').ronda.turnoPista, orden[0]);
  // No se puede escribir fuera de turno ni votar todavia
  assert.ok(S.escribirPista(sala.codigo, orden[1], 'hola').error);
  assert.ok(S.votar(sala.codigo, 'a', ['b']).error);
  orden.forEach((id, i) => assert.ok(!S.escribirPista(sala.codigo, id, 'palabra' + i).error));
  assert.equal(sala.fase, 'debate');
  const v = S.vista(sala, 'c');
  assert.deepEqual(v.ronda.pistas.map((p) => p.texto), orden.map((_, i) => 'palabra' + i));
});

test('pistas escritas: si se acaba tu tiempo, se salta tu turno', () => {
  const { S, sala, ids, avanzar } = partida({ pistas: 'escritas', tiempoTurno: 20 });
  todosListos(S, sala, ids);
  const primero = sala.ronda.orden[0];
  avanzar(20_000);
  assert.equal(sala.ronda.pistas[0].id, primero);
  assert.equal(sala.ronda.pistas[0].saltado, true);
  assert.equal(S.vista(sala, 'a').ronda.turnoPista, sala.ronda.orden[1]);
});

test('pistas escritas: varias tandas y se salta a los desconectados', () => {
  const { S, sala, ids } = partida({ pistas: 'escritas', vueltasPistas: 2 });
  todosListos(S, sala, ids);
  const orden = [...sala.ronda.orden];
  S.salir(sala.codigo, orden[2]);
  for (let k = 0; k < 8; k++) {
    const turno = S.vista(sala, 'a').ronda.turnoPista;
    if (!turno) break;
    S.escribirPista(sala.codigo, turno, 'x');
  }
  assert.equal(sala.fase, 'debate');
  assert.equal(sala.ronda.pistas.length, 8, '4 conectados x 2 tandas');
  assert.ok(!sala.ronda.pistas.some((p) => p.id === orden[2]));
});

test('en el modo Preguntas no hay pistas escritas', () => {
  const { S, sala, ids } = partida({ pistas: 'escritas', modo: 'preguntas' });
  ids.forEach((id) => S.listo(sala.codigo, id, 'respuesta'));
  assert.equal(sala.fase, 'debate');
});

test('tras una expulsion se vuelve a escribir otra tanda', () => {
  const { S, sala, ids, avanzar } = partida({ pistas: 'escritas', adivinar: false });
  todosListos(S, sala, ids);
  sala.ronda.orden.forEach((id) => S.escribirPista(sala.codigo, id, 'uno'));
  const [imp] = impostoresDe(sala);
  const inocente = ids.find((id) => id !== imp);
  votarYContar(S, sala, avanzar, todosA(sala, inocente));
  avanzar(DURACION.resultado);
  avanzar(DURACION.expulsion);
  assert.equal(sala.fase, 'pistas');
  assert.ok(!sala.ronda.colaPistas.includes(inocente));
});
