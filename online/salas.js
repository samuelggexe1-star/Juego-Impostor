// Las salas del modo online. Logica pura: ni HTTP ni SSE ni setInterval, solo
// el estado de las partidas y lo que pasa con cada cosa que llega. Asi se
// puede probar entera desde Node sin levantar nada (igual que en el billar).
//
// EL SERVIDOR MANDA. Quien es impostor, la palabra y los votos viven aqui y
// solo aqui. A cada movil se le manda una vista hecha para el: su carta y lo
// que es publico, nada mas. Si se mandara todo a todos, cualquiera podria abrir
// las herramientas del navegador y ver quien es el impostor.
//
// LOS TIEMPOS. Nada de temporizadores dentro: cada fase con limite guarda en
// `fin` cuando se acaba, y el servidor llama a tick() a menudo. Con un reloj de
// mentira las pruebas pueden saltarse un minuto de votacion en un momento.

/** Sin I ni O, que se confunden con 1 y 0. */
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const LARGO_CODIGO = 4;
export const MIN_JUGADORES = 3;
export const MAX_JUGADORES = 15;
/** Ademas de los jugadores, pueden mirar unos cuantos mas. */
export const MAX_ESPECTADORES = 10;
/** Una sala sin nadie conectado muere pasado este rato. */
export const CADUCA_MS = 2 * 60 * 60 * 1000;
/**
 * Una sala publica vacia vuelve a empezar de cero pasado este rato. No es
 * al instante porque al bloquear el movil se corta la conexion: si todos
 * bloquean a la vez, no se puede borrar la partida.
 */
export const REINICIO_PUBLICA_MS = 3 * 60 * 1000;

/** Las salas publicas que hay siempre. El codigo es su nombre en letras. */
export const SALAS_PUBLICAS = [
  { codigo: 'UNO', nombre: 'Sala 1' },
  { codigo: 'DOS', nombre: 'Sala 2' },
  { codigo: 'TRES', nombre: 'Sala 3' }
];

/** Cuanto se queda en pantalla cada cosa antes de seguir sola. */
export const DURACION = {
  resultado: 5000,   // el recuento de votos
  expulsion: 7500,   // la animacion de "X era el impostor"
  adivinar: 40000    // el impostor pillado intenta adivinar la palabra
};

/** Los colores de los tripulantes. */
export const COLORES = [
  { id: 'rojo', hex: '#c51111' }, { id: 'azul', hex: '#132ed1' }, { id: 'verde', hex: '#117f2d' },
  { id: 'rosa', hex: '#ed54ba' }, { id: 'naranja', hex: '#ef7d0e' }, { id: 'amarillo', hex: '#f5f557' },
  { id: 'negro', hex: '#3f474e' }, { id: 'blanco', hex: '#d6e0f0' }, { id: 'morado', hex: '#6b2fbb' },
  { id: 'marron', hex: '#71491e' }, { id: 'cian', hex: '#38fedc' }, { id: 'lima', hex: '#50ef39' },
  { id: 'granate', hex: '#6b2b3c' }, { id: 'coral', hex: '#d76464' }, { id: 'gris', hex: '#758593' }
];

export const AJUSTES_DEFECTO = {
  modo: 'clasico',          // clasico | undercover | preguntas
  categorias: ['Comida', 'Animales', 'Videojuegos', 'Lugares Locales', 'Vosotros'],
  impostores: 0,            // 0 = automatico segun jugadores
  pista: 'categoria',       // nada | categoria | parecida | ambas
  tiempoDebate: 180,        // segundos para debatir y votar a la vez
  expulsados: 1,            // cuantos se echan por turno (y a cuantos vota cada uno)
  votosAnonimos: false,     // en el recuento no se ve quien voto a quien
  mostrarRol: true,         // al expulsar se dice si era el impostor (si no, se sabe al final)
  cambiarVoto: true,        // se puede cambiar el voto hasta que se acabe el tiempo
  acabarSiTodosVotan: false, // si todos han votado, no se espera al reloj
  espectadoresVenTodo: true, // los espectadores ven roles, palabras y votos
  trampa: false,            // a veces no hay impostor, o lo son todos
  probTrampa: 10,
  adivinar: true,           // el impostor pillado puede robar la victoria
  noEmpieza: true,          // el impostor nunca habla el primero
  picante: true,            // modo Preguntas: preguntas picantes
  preguntasJugadores: true  // modo Preguntas: preguntas con los nombres
};

const PISTAS = ['nada', 'categoria', 'parecida', 'ambas'];

/** Tope de una foto de perfil ya recortada (en caracteres de base64, unos 45 KB). */
export const TOPE_FOTO = 60000;

/**
 * Comprueba la foto que manda un movil. Solo se aceptan imagenes pequeñas en
 * base64: el movil ya la recorta y la comprime antes de mandarla.
 */
export function validarFoto(datos) {
  if (datos == null) return { foto: null };
  const m = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(datos));
  if (!m) return { error: 'Esa foto no vale' };
  if (m[2].length > TOPE_FOTO) return { error: 'La foto es demasiado grande' };
  return { foto: { tipo: 'image/' + m[1], base64: m[2] } };
}
const MODOS = ['clasico', 'undercover', 'preguntas'];

// ----------------------------------------------------------------- utilidades

export function limpiarNombre(n) {
  const limpio = String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return limpio || 'Jugador';
}

const limpiarTexto = (t, largo) => String(t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, largo);

/** Para comparar lo que escribe el impostor con la palabra: sin tildes ni mayusculas. */
export function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** ¿Ha acertado la palabra? Vale escribirla sin tildes, o casi entera. */
export function aciertaPalabra(intento, palabra) {
  const a = normalizar(intento);
  const b = normalizar(palabra);
  if (!a || !b) return false;
  if (a === b) return true;
  // "Tortilla" para "Tortilla de patatas", o "La tortilla de patatas"
  if (a.length >= 4 && b.includes(a) && a.length >= b.length * 0.4) return true;
  if (b.length >= 4 && a.includes(b) && b.length >= a.length * 0.6) return true;
  return false;
}

export function impostoresRecomendados(n) {
  if (n >= 10) return 3;
  if (n >= 6) return 2;
  return 1;
}

export function maxImpostores(n) {
  return Math.max(1, Math.floor((n - 1) / 2));
}

export function limpiarAjustes(entrada = {}, anteriores = AJUSTES_DEFECTO, categoriasValidas = null) {
  const a = { ...anteriores };
  const num = (v, min, max, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  if (MODOS.includes(entrada.modo)) a.modo = entrada.modo;
  if (PISTAS.includes(entrada.pista)) a.pista = entrada.pista;
  if (Array.isArray(entrada.categorias)) {
    const vistas = new Set();
    a.categorias = entrada.categorias
      .map((c) => String(c).slice(0, 40))
      .filter((c) => (!categoriasValidas || categoriasValidas.includes(c)) && !vistas.has(c) && vistas.add(c))
      .slice(0, 100);
  }
  if ('impostores' in entrada) a.impostores = num(entrada.impostores, 0, 7, a.impostores);
  if ('tiempoDebate' in entrada) a.tiempoDebate = num(entrada.tiempoDebate, 30, 900, a.tiempoDebate);
  if ('expulsados' in entrada) a.expulsados = num(entrada.expulsados, 1, 3, a.expulsados);
  if ('probTrampa' in entrada) a.probTrampa = num(entrada.probTrampa, 1, 50, a.probTrampa);
  for (const clave of ['votosAnonimos', 'mostrarRol', 'cambiarVoto', 'acabarSiTodosVotan', 'espectadoresVenTodo', 'trampa', 'adivinar', 'noEmpieza', 'picante', 'preguntasJugadores']) {
    if (clave in entrada) a[clave] = !!entrada[clave];
  }
  return a;
}

// ------------------------------------------------------------------ las salas

export function crearSalas({ ahora = () => Date.now(), azar = Math.random, banco } = {}) {
  if (!banco) throw new Error('faltan las palabras (banco)');
  const salas = new Map();
  const categoriasValidas = Object.keys(banco.CATEGORIAS);

  const alAzar = (lista) => lista[Math.floor(azar() * lista.length)];
  const mezclar = (lista) => {
    const c = [...lista];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  };

  const codigoLibre = () => {
    for (let intento = 0; intento < 500; intento++) {
      let c = '';
      for (let i = 0; i < LARGO_CODIGO; i++) c += LETRAS[Math.floor(azar() * LETRAS.length)];
      if (!salas.has(c)) return c;
    }
    throw new Error('no queda ningun codigo de sala libre');
  };

  const buscar = (codigo) => salas.get(String(codigo || '').toUpperCase());
  const jugadorDe = (sala, id) => sala.jugadores.find((j) => j.id === id);
  const nombreDe = (sala, id) => (jugadorDe(sala, id) || { nombre: '¿?' }).nombre;
  const tocar = (sala) => { sala.tocada = ahora(); };

  /** Si el anfitrion se va, pasa el mando al siguiente que siga conectado. */
  const repasarAnfitrion = (sala) => {
    const a = jugadorDe(sala, sala.anfitrion);
    if (a && a.conectado) return;
    const otro = sala.jugadores.find((j) => j.conectado);
    if (otro) sala.anfitrion = otro.id;
  };

  const esAnfitrion = (sala, id) => {
    repasarAnfitrion(sala);
    return sala.anfitrion === id;
  };

  /** El color que prefiere, si esta libre; si no, el primero que quede. */
  const colorLibre = (sala, preferido = null, id = null) => {
    const usados = new Set(sala.jugadores.filter((j) => j.id !== id).map((j) => j.color));
    if (preferido && COLORES.some((c) => c.id === preferido) && !usados.has(preferido)) return preferido;
    return (COLORES.find((c) => !usados.has(c.id)) || COLORES[0]).id;
  };

  const nombreLibre = (sala, nombre, id) => {
    let n = nombre;
    let k = 2;
    while (sala.jugadores.some((j) => j.id !== id && j.nombre.toLowerCase() === n.toLowerCase())) {
      n = `${nombre.slice(0, 13)} ${k++}`;
    }
    return n;
  };

  // ------------------------------------------------------------- las rondas

  const separar = (entrada) => {
    const [palabra, gemela] = entrada.split(' / ').map((t) => t.trim());
    return { palabra, gemela: gemela || '' };
  };

  const conJugadores = (texto, j1, j2) => texto.replace(/\{J2\}/g, j2).replace(/\{J\}/g, j1);

  const elegirPalabra = (sala, nombres) => {
    const pares = [];
    for (const cat of sala.ajustes.categorias) {
      const info = banco.CATEGORIAS[cat];
      if (!info) continue;
      for (const p of info.palabras) pares.push({ cat, ...separar(p) });
    }
    if (!pares.length) return null;
    let candidatas = pares.filter((p) => !sala.usadas.has(p.cat + '|' + p.palabra));
    if (!candidatas.length) {
      for (const p of pares) sala.usadas.delete(p.cat + '|' + p.palabra);
      candidatas = pares;
    }
    const e = { ...alAzar(candidatas) };
    sala.usadas.add(e.cat + '|' + e.palabra);

    if (e.palabra.includes('{J')) {
      const [j1, j2] = mezclar(nombres);
      const plantilla = e.gemela || e.palabra.replace(/\{J\}/g, '{J2}');
      e.palabra = conJugadores(e.palabra, j1, j2 || j1);
      e.gemela = conJugadores(plantilla, j1, j2 || j1);
      if (e.gemela === e.palabra) e.gemela = e.cat;
      return e;
    }
    if (!e.gemela) {
      const otras = pares.filter((p) => p.cat === e.cat && p.palabra !== e.palabra && !p.palabra.includes('{J'));
      e.gemela = otras.length ? alAzar(otras).palabra : e.cat;
    }
    return e;
  };

  const elegirPregunta = (sala, nombres) => {
    let lista = banco.PREGUNTAS.map((p) => [...p, 'Preguntas']);
    if (sala.ajustes.picante) lista = lista.concat(banco.PREGUNTAS_PICANTES.map((p) => [...p, 'Preguntas picantes 🌶️']));
    if (sala.ajustes.preguntasJugadores) lista = lista.concat(banco.PREGUNTAS_JUGADORES.map((p) => [...p, 'Preguntas sobre vosotros 👥']));
    let candidatas = lista.filter((p) => !sala.usadas.has('P|' + p[0]));
    if (!candidatas.length) {
      for (const p of lista) sala.usadas.delete('P|' + p[0]);
      candidatas = lista;
    }
    const [normal, otra, tipo] = alAzar(candidatas);
    sala.usadas.add('P|' + normal);
    const [j1, j2] = mezclar(nombres);
    return { palabra: conJugadores(normal, j1, j2 || j1), gemela: conJugadores(otra, j1, j2 || j1), cat: tipo };
  };

  const nuevaRonda = (sala) => {
    const participantes = sala.jugadores.filter((j) => j.conectado && !j.espectador).map((j) => j.id);
    const nombres = participantes.map((id) => nombreDe(sala, id));
    const a = sala.ajustes;

    const elegida = a.modo === 'preguntas' ? elegirPregunta(sala, nombres) : elegirPalabra(sala, nombres);
    if (!elegida) return { error: 'Elegid al menos una categoría' };

    const n = participantes.length;
    const cantidad = Math.min(a.impostores || impostoresRecomendados(n), maxImpostores(n));
    let impostores = new Set(mezclar(participantes).slice(0, cantidad));

    let trampa = null;
    if (a.trampa && azar() * 100 < a.probTrampa) {
      if (azar() < 0.5) { trampa = 'ninguno'; impostores = new Set(); }
      else { trampa = 'todos'; impostores = new Set(participantes); }
    }

    sala.numRonda++;
    sala.ronda = {
      num: sala.numRonda,
      modo: a.modo,
      pista: a.pista,
      participantes,
      vivos: new Set(participantes),
      impostores,
      trampa,
      palabra: elegida.palabra,
      gemela: elegida.gemela,
      categoria: elegida.cat,
      respuestas: {},
      listos: new Set(),
      votos: {},
      numDebate: 0,
      empieza: null,
      orden: [],
      horario: true,
      ultimoVoto: null,
      historialExpulsiones: [],
      expulsion: null,
      acertantes: new Set(),
      adivina: null,
      adivinanza: null,
      resultado: null
    };
    sala.fase = 'reparto';
    sala.fin = null;
    return { sala };
  };

  /** Lo que ve un jugador en su carta. Nunca se manda a nadie mas. */
  const cartaDe = (sala, id) => {
    const r = sala.ronda;
    if (!r || !r.participantes.includes(id)) return null;
    const esImpostor = r.impostores.has(id);

    if (r.modo === 'preguntas') {
      return { tipo: 'pregunta', texto: esImpostor ? r.gemela : r.palabra };
    }
    if (r.modo === 'undercover') {
      return { tipo: 'palabra', texto: esImpostor ? r.gemela : r.palabra };
    }
    if (!esImpostor) return { tipo: 'palabra', texto: r.palabra };

    const pistas = [];
    if (r.pista === 'categoria' || r.pista === 'ambas') pistas.push({ etiqueta: 'Categoría', texto: r.categoria });
    if (r.pista === 'parecida' || r.pista === 'ambas') pistas.push({ etiqueta: 'Palabra parecida', texto: r.gemela });
    const compinches = r.trampa === 'todos'
      ? []
      : [...r.impostores].filter((x) => x !== id).map((x) => nombreDe(sala, x));
    return { tipo: 'impostor', texto: 'IMPOSTOR', pistas, compinches };
  };

  const empezarDebate = (sala) => {
    const r = sala.ronda;
    const vivos = r.participantes.filter((id) => r.vivos.has(id));
    let candidatos = vivos;
    if (sala.ajustes.noEmpieza) {
      const sinImpostor = vivos.filter((id) => !r.impostores.has(id));
      if (sinImpostor.length) candidatos = sinImpostor;
    }
    r.empieza = alAzar(candidatos);
    r.horario = azar() < 0.5;
    let orden = [...vivos];
    if (!r.horario) orden.reverse();
    const pos = orden.indexOf(r.empieza);
    r.orden = orden.slice(pos).concat(orden.slice(0, pos));
    r.numDebate++;
    r.votos = {};
    // Se debate y se vota a la vez: cuando se acaba el tiempo, se cuenta.
    sala.fase = 'debate';
    sala.fin = ahora() + sala.ajustes.tiempoDebate * 1000;
  };

  const vivosConectados = (sala) => sala.ronda.participantes
    .filter((id) => sala.ronda.vivos.has(id) && (jugadorDe(sala, id) || {}).conectado);

  const comprobarReparto = (sala) => {
    if (sala.fase !== 'reparto') return false;
    const r = sala.ronda;
    const conectados = r.participantes.filter((id) => (jugadorDe(sala, id) || {}).conectado);
    if (conectados.length && conectados.every((id) => r.listos.has(id))) {
      empezarDebate(sala);
      return true;
    }
    return false;
  };

  /** Con el ajuste de "acabar si todos han votado", no se espera al reloj. */
  const comprobarVotos = (sala) => {
    if (sala.fase !== 'debate' || !sala.ajustes.acabarSiTodosVotan) return false;
    const vivos = vivosConectados(sala);
    if (vivos.length && vivos.every((id) => id in sala.ronda.votos)) { cerrarVotacion(sala); return true; }
    return false;
  };

  /** Cuantos se pueden echar esta vez: nunca tantos que no quede partida. */
  const expulsablesAhora = (sala) => {
    const vivos = sala.ronda.vivos.size;
    return Math.max(1, Math.min(sala.ajustes.expulsados, vivos - 2));
  };

  /**
   * El recuento. Cada uno ha votado hasta N personas, o ha saltado.
   * Salen los N mas votados, siempre que tengan mas votos que los que han
   * saltado. Si hay empate justo en el ultimo hueco, no sale ninguno de los
   * empatados (no se echa a nadie a suertes).
   */
  const cerrarVotacion = (sala) => {
    const r = sala.ronda;
    const huecos = expulsablesAhora(sala);
    const porJugador = {};
    let saltos = 0;
    let nadie = 0;
    for (const voto of Object.values(r.votos)) {
      if (voto[0] === 'saltar') saltos++;
      else if (voto[0] === 'nadie') nadie++;
      else for (const id of voto) porJugador[id] = (porJugador[id] || 0) + 1;
    }

    const detalle = {};
    for (const [votante, voto] of Object.entries(r.votos)) {
      for (const objetivo of voto) {
        (detalle[objetivo] = detalle[objetivo] || []).push(sala.ajustes.votosAnonimos ? null : votante);
      }
    }
    const noVotaron = vivosConectados(sala).filter((id) => !(id in r.votos));
    const maxJugador = Math.max(0, ...Object.values(porJugador));

    let expulsados = [];
    let motivo;
    if (nadie > 0 && nadie > maxJugador && nadie > saltos) {
      motivo = 'noHayImpostor';
    } else {
      const candidatos = Object.entries(porJugador)
        .filter(([, n]) => n > saltos)
        .sort((a, b) => b[1] - a[1]);
      let i = 0;
      while (i < candidatos.length && expulsados.length < huecos) {
        const n = candidatos[i][1];
        const grupo = candidatos.filter(([, m]) => m === n).map(([id]) => id);
        if (expulsados.length + grupo.length > huecos) break; // empate en el ultimo hueco
        expulsados = expulsados.concat(grupo);
        i += grupo.length;
      }
      if (expulsados.length) motivo = 'expulsado';
      else if (!Object.keys(r.votos).length) motivo = 'nadieVoto';
      else if (saltos >= maxJugador) motivo = 'saltado';
      else motivo = 'empate';
    }

    for (const [votante, voto] of Object.entries(r.votos)) {
      if (voto.some((id) => expulsados.includes(id) && r.impostores.has(id))) r.acertantes.add(votante);
    }
    r.ultimoVoto = { detalle, expulsados, motivo, noVotaron, huecos, saltos };
    sala.fase = 'resultado';
    sala.fin = ahora() + DURACION.resultado;
  };

  /** Despues del recuento: quien sale, que se dice y que pasa luego. */
  const aplicarExpulsion = (sala) => {
    const r = sala.ronda;
    const { expulsados, motivo } = r.ultimoVoto;
    const textos = [];
    const roles = {};   // solo se rellena si se dice el rol al expulsar
    let siguiente = 'debate';
    let resultado = null;
    const mostrar = sala.ajustes.mostrarRol;
    const quien = r.modo === 'undercover' ? 'el undercover' : 'el impostor';
    const lista = (ids) => {
      const n = ids.map((id) => nombreDe(sala, id));
      return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0];
    };

    if (motivo === 'noHayImpostor') {
      textos.push('Habéis votado que no hay ningún impostor…');
      resultado = r.trampa === 'ninguno' ? 'trampaAcertada' : 'impostor';
      siguiente = 'final';
    } else if (!expulsados.length) {
      textos.push(motivo === 'empate' ? 'Nadie ha sido expulsado. (Empate)'
        : motivo === 'nadieVoto' ? 'Nadie ha votado. Nadie sale.' : 'Nadie ha sido expulsado. (Se ha saltado)');
    } else {
      for (const id of expulsados) r.vivos.delete(id);
      r.historialExpulsiones.push({ vuelta: r.numDebate, ids: [...expulsados] });

      if (r.trampa === 'ninguno') {
        siguiente = 'final'; resultado = 'trampaFallada';
      } else if (r.trampa === 'todos') {
        siguiente = 'final'; resultado = 'todos';
      }

      if (mostrar && !r.trampa) {
        for (const id of expulsados) {
          roles[id] = r.impostores.has(id);
          textos.push(roles[id] ? `${nombreDe(sala, id)} era ${quien}.` : `${nombreDe(sala, id)} no era ${quien}.`);
        }
      } else {
        textos.push(expulsados.length > 1 ? `${lista(expulsados)} han sido expulsados.` : `${lista(expulsados)} ha sido expulsado.`);
        if (!mostrar && !resultado) textos.push('Lo que eran… lo sabréis al final 🤫');
      }
    }

    if (!resultado && siguiente !== 'final') {
      const impVivos = [...r.impostores].filter((id) => r.vivos.has(id)).length;
      const inoVivos = r.vivos.size - impVivos;
      if (impVivos === 0) {
        const pillado = expulsados.find((id) => r.impostores.has(id));
        if (sala.ajustes.adivinar && r.modo === 'clasico' && pillado) { siguiente = 'adivinar'; r.adivina = pillado; }
        else { siguiente = 'final'; resultado = 'inocentes'; }
      } else if (impVivos >= inoVivos) {
        // Los impostores ya son la mitad: ganan directamente
        siguiente = 'final'; resultado = 'impostor';
      } else if (mostrar) {
        textos.push(impVivos === 1 ? 'Queda 1 impostor.' : `Quedan ${impVivos} impostores.`);
      }
    }

    r.expulsion = { expulsados: [...expulsados], roles, textos, siguiente, resultado };
    sala.fase = 'expulsion';
    sala.fin = ahora() + DURACION.expulsion;
  };

  const trasExpulsion = (sala) => {
    const { siguiente, resultado } = sala.ronda.expulsion;
    if (siguiente === 'final') terminar(sala, resultado);
    else if (siguiente === 'adivinar') { sala.fase = 'adivinar'; sala.fin = ahora() + DURACION.adivinar; }
    else empezarDebate(sala);
  };

  const terminar = (sala, tipo, extra = {}) => {
    const r = sala.ronda;
    const delta = {};
    const sumar = (id, n) => { delta[id] = (delta[id] || 0) + n; };
    const inocentes = r.participantes.filter((id) => !r.impostores.has(id));
    const impostores = [...r.impostores];
    const varios = impostores.length > 1;
    let titulo; let subtitulo; let ganan;

    switch (tipo) {
      case 'inocentes':
        titulo = '¡Ganan los inocentes!'; ganan = 'inocentes';
        subtitulo = varios ? 'Habéis pillado a todos los impostores.' : 'Habéis pillado al impostor.';
        if (extra.fallo) subtitulo += ' Y no adivinó la palabra.';
        inocentes.forEach((id) => sumar(id, 1));
        r.acertantes.forEach((id) => { if (!r.impostores.has(id)) sumar(id, 1); });
        break;
      case 'impostor':
        titulo = varios ? '¡Ganan los impostores!' : '¡Gana el impostor!'; ganan = 'impostores';
        subtitulo = extra.robo ? 'Lo pillasteis… ¡pero adivinó la palabra!' : 'Se os ha colado bien.';
        impostores.forEach((id) => sumar(id, 3));
        break;
      case 'trampaAcertada':
        titulo = '¡Bien visto!'; ganan = 'todos';
        subtitulo = 'No había ningún impostor. Todos sumáis 1 punto.';
        r.participantes.forEach((id) => sumar(id, 1));
        break;
      case 'trampaFallada':
        titulo = '¡No había impostor!'; ganan = 'nadie';
        subtitulo = 'Os habéis estado acusando entre inocentes 🤡';
        break;
      case 'todos':
        titulo = '¡Erais TODOS impostores!'; ganan = 'nadie';
        subtitulo = 'Nadie tenía la palabra 😂';
        break;
      default:
        titulo = 'Ronda terminada'; ganan = 'nadie'; subtitulo = '';
    }
    for (const [id, n] of Object.entries(delta)) sala.puntos[id] = (sala.puntos[id] || 0) + n;
    r.resultado = { tipo, titulo, subtitulo, ganan, delta };
    sala.fase = 'final';
    sala.fin = null;
  };

  // ------------------------------------------------------------- la vista

  /** Todo lo de la ronda, para los espectadores. */
  const vistaEspectador = (sala) => {
    const r = sala.ronda;
    const cartas = {};
    for (const id of r.participantes) cartas[id] = cartaDe(sala, id);
    return {
      palabra: r.palabra,
      gemela: r.gemela,
      categoria: r.categoria,
      modo: r.modo,
      impostores: [...r.impostores],
      trampa: r.trampa,
      cartas,
      respuestas: r.respuestas,
      votos: sala.fase === 'debate' ? r.votos : {}
    };
  };

  /** Lo que ve un jugador concreto. Nunca se manda el estado interno tal cual. */
  const vista = (sala, paraId = null) => {
    repasarAnfitrion(sala);
    const v = {
      codigo: sala.codigo,
      nombre: sala.nombre || null,
      publica: !!sala.publica,
      fase: sala.fase,
      anfitrion: sala.anfitrion,
      // La foto no va aqui (se mandaria en cada cambio): solo su version, y el
      // movil la pide aparte una vez por /api/foto.
      jugadores: sala.jugadores.map((j) => ({
        id: j.id, nombre: j.nombre, color: j.color, conectado: j.conectado, foto: j.foto ? j.foto.v : null,
        espectador: !!j.espectador
      })),
      ajustes: sala.ajustes,
      puntos: sala.puntos,
      fin: sala.fin,
      ahora: ahora(),
      ronda: null,
      yo: { id: paraId, espectador: !!(jugadorDe(sala, paraId) || {}).espectador }
    };
    const r = sala.ronda;
    if (!r || sala.fase === 'sala') return v;

    const fase = sala.fase;
    const pasadoReparto = fase !== 'reparto';
    v.ronda = {
      num: r.num,
      modo: r.modo,
      participantes: r.participantes,
      vivos: r.participantes.filter((id) => r.vivos.has(id)),
      listos: [...r.listos],
      numDebate: r.numDebate,
      empieza: r.empieza,
      orden: r.orden,
      horario: r.horario,
      // Mientras se vota solo se sabe QUIEN ha votado, no a quien.
      votaron: fase === 'debate' ? Object.keys(r.votos) : [],
      huecos: fase === 'debate' ? expulsablesAhora(sala) : null,
      ultimoVoto: fase === 'debate' && !r.expulsion ? null : r.ultimoVoto,
      expulsion: r.expulsion && fase !== 'resultado'
        ? { expulsados: r.expulsion.expulsados, roles: r.expulsion.roles, textos: r.expulsion.textos }
        : null,
      expulsados: r.participantes.filter((id) => !r.vivos.has(id)),
      // Las respuestas y la pregunta de verdad se ven cuando ya ha contestado todo el mundo.
      respuestas: pasadoReparto && r.modo === 'preguntas' ? r.respuestas : null,
      pregunta: pasadoReparto && r.modo === 'preguntas' ? r.palabra : null,
      adivina: r.adivina,
      final: null
    };

    if (fase === 'final') {
      v.ronda.final = {
        palabra: r.palabra,
        gemela: r.gemela,
        categoria: r.categoria,
        impostores: [...r.impostores],
        trampa: r.trampa,
        resultado: r.resultado,
        adivinanza: r.adivinanza,
        acertantes: [...r.acertantes],
        historialExpulsiones: r.historialExpulsiones
      };
    }

    if (paraId && r.participantes.includes(paraId)) {
      v.yo = {
        id: paraId,
        participante: true,
        vivo: r.vivos.has(paraId),
        carta: cartaDe(sala, paraId),
        listo: r.listos.has(paraId),
        respuesta: r.respuestas[paraId] || null,
        votos: fase === 'debate' ? (r.votos[paraId] || null) : null,
        // El impostor de verdad (no el de una ronda trampa de todos) sabe que lo es.
        // En Undercover y Preguntas no lo sabe: no se le dice.
        soyImpostor: r.modo === 'clasico' ? r.impostores.has(paraId) : null
      };
    } else {
      const j = jugadorDe(sala, paraId);
      v.yo = { id: paraId, participante: false, espectador: !!(j && j.espectador) };
      // Quien no juega esta ronda (espectador, o llegado con la ronda en marcha)
      // lo ve todo, si la sala lo permite.
      if (j && sala.ajustes.espectadoresVenTodo) v.espectador = vistaEspectador(sala);
    }
    return v;
  };

  // ------------------------------------------------------------ las acciones

  const faseEs = (sala, ...fases) => fases.includes(sala.fase);
  const participanteVivo = (sala, id) => sala.ronda && sala.ronda.participantes.includes(id) && sala.ronda.vivos.has(id);

  const salaNueva = (codigo, anfitrion) => ({
    codigo,
    anfitrion,
    jugadores: [],
    ajustes: { ...AJUSTES_DEFECTO, categorias: [...AJUSTES_DEFECTO.categorias] },
    fase: 'sala',
    ronda: null,
    numRonda: 0,
    puntos: {},
    usadas: new Set(),
    fin: null,
    tocada: ahora()
  });

  /** Deja una sala publica como recien abierta. */
  const vaciar = (sala) => {
    const limpia = salaNueva(sala.codigo, null);
    Object.assign(sala, limpia, { publica: true, nombre: sala.nombre });
  };

  for (const { codigo, nombre } of SALAS_PUBLICAS) {
    salas.set(codigo, { ...salaNueva(codigo, null), publica: true, nombre });
  }

  return {
    salas,
    vista,

    crear(nombre, id, color) {
      const codigo = codigoLibre();
      const sala = salaNueva(codigo, id);
      sala.jugadores.push({ id, nombre: limpiarNombre(nombre), color: colorLibre(sala, color), conectado: true, foto: null });
      salas.set(codigo, sala);
      return sala;
    },

    entrar(codigo, id, nombre, color, espectador = false) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe. Revisa el código.' };
      tocar(sala);
      const ya = jugadorDe(sala, id);
      if (ya) {
        ya.conectado = true;
        if (nombre) ya.nombre = nombreLibre(sala, limpiarNombre(nombre), id);
        return { sala };
      }
      // En la sala de espera, los que se fueron ya no guardan sitio ni nombre
      if (sala.fase === 'sala') sala.jugadores = sala.jugadores.filter((j) => j.conectado);
      const jugando = sala.jugadores.filter((j) => !j.espectador).length;
      const mirando = sala.jugadores.length - jugando;
      if (!espectador && jugando >= MAX_JUGADORES) return { error: 'La sala está llena de jugadores. Puedes entrar como espectador.' };
      if (espectador && mirando >= MAX_ESPECTADORES) return { error: 'Ya hay demasiados espectadores' };
      sala.jugadores.push({
        id,
        nombre: nombreLibre(sala, limpiarNombre(nombre), id),
        color: colorLibre(sala, color),
        conectado: true,
        espectador: !!espectador,
        foto: null
      });
      repasarAnfitrion(sala);
      return { sala };
    },

    salir(codigo, id) {
      const sala = buscar(codigo);
      if (!sala) return null;
      const j = jugadorDe(sala, id);
      if (j) j.conectado = false;
      tocar(sala);
      repasarAnfitrion(sala);
      // Si era el ultimo que faltaba, la partida no se queda esperandole.
      if (sala.ronda) { comprobarReparto(sala); comprobarVotos(sala); }
      return sala;
    },

    /** Irse de verdad desde la sala de espera (no solo cerrar la pestaña). */
    irse(codigo, id) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (sala.fase === 'sala' || !(sala.ronda && sala.ronda.participantes.includes(id))) {
        sala.jugadores = sala.jugadores.filter((j) => j.id !== id);
      } else {
        const j = jugadorDe(sala, id);
        if (j) j.conectado = false;
      }
      repasarAnfitrion(sala);
      if (sala.ronda) { comprobarReparto(sala); comprobarVotos(sala); }
      return { sala };
    },

    /** Cambiar tu nombre, tu color o tu foto desde el perfil. */
    perfil(codigo, id, datos = {}) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      const j = jugadorDe(sala, id);
      if (!j) return { error: 'No estás en esta sala' };
      if (datos.nombre) j.nombre = nombreLibre(sala, limpiarNombre(datos.nombre), id);
      if (datos.color) j.color = colorLibre(sala, datos.color, id);
      if ('foto' in datos) {
        const f = validarFoto(datos.foto);
        if (f.error) return { error: f.error };
        j.foto = f.foto ? { ...f.foto, v: ahora() } : null;
      }
      tocar(sala);
      return { sala };
    },

    /**
     * Pasar a mirar o a jugar. Quien esta jugando la ronda en marcha no puede
     * pasarse a espectador hasta que acabe: si no, veria quien es el impostor.
     */
    cambiarModo(codigo, id, espectador) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      const j = jugadorDe(sala, id);
      if (!j) return { error: 'No estás en esta sala' };
      const enRonda = sala.ronda && !faseEs(sala, 'sala', 'final') && sala.ronda.participantes.includes(id);
      if (espectador && enRonda) return { error: 'Espera a que acabe la ronda para pasar a espectador' };
      if (!espectador && sala.jugadores.filter((x) => !x.espectador).length >= MAX_JUGADORES) {
        return { error: 'Ya hay 15 jugadores' };
      }
      j.espectador = !!espectador;
      tocar(sala);
      return { sala };
    },

    /** El anfitrion le quita la foto a alguien (por si alguien se pasa de gracioso). */
    quitarFoto(codigo, id, quien) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión puede hacer eso' };
      const j = jugadorDe(sala, quien);
      if (!j) return { error: 'Ese jugador no está' };
      j.foto = null;
      tocar(sala);
      return { sala };
    },

    /** La foto de un jugador, para servirla como imagen. */
    fotoDe(codigo, id) {
      const sala = buscar(codigo);
      const j = sala && jugadorDe(sala, id);
      return j && j.foto ? j.foto : null;
    },

    echar(codigo, id, quien) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión puede echar a alguien' };
      if (!faseEs(sala, 'sala', 'final')) return { error: 'No se puede echar a nadie con la ronda en marcha' };
      if (quien === id) return { error: 'No te puedes echar a ti mismo' };
      sala.jugadores = sala.jugadores.filter((j) => j.id !== quien);
      tocar(sala);
      return { sala, echado: quien };
    },

    ajustar(codigo, id, ajustes) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión cambia los ajustes' };
      if (!faseEs(sala, 'sala', 'final')) return { error: 'Los ajustes se cambian entre rondas' };
      sala.ajustes = limpiarAjustes(ajustes, sala.ajustes, categoriasValidas);
      tocar(sala);
      return { sala };
    },

    empezar(codigo, id) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión puede empezar' };
      if (!faseEs(sala, 'sala', 'final')) return { error: 'La ronda ya está en marcha' };
      const conectados = sala.jugadores.filter((j) => j.conectado && !j.espectador).length;
      if (conectados < MIN_JUGADORES) return { error: `Hacen falta al menos ${MIN_JUGADORES} jugadores (sin contar espectadores)` };
      if (sala.ajustes.modo !== 'preguntas' && !sala.ajustes.categorias.length) return { error: 'Elegid al menos una categoría' };
      tocar(sala);
      return nuevaRonda(sala);
    },

    volverASala(codigo, id) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión puede hacer eso' };
      sala.fase = 'sala';
      sala.ronda = null;
      sala.fin = null;
      // Los que se fueron durante la partida ya no estan esperando.
      sala.jugadores = sala.jugadores.filter((j) => j.conectado);
      tocar(sala);
      return { sala };
    },

    listo(codigo, id, respuesta) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (sala.fase !== 'reparto') return { error: 'Ahora no toca' };
      const r = sala.ronda;
      if (!r.participantes.includes(id)) return { error: 'No estás en esta ronda' };
      if (r.modo === 'preguntas') {
        const texto = limpiarTexto(respuesta, 80);
        if (!texto) return { error: 'Escribe tu respuesta' };
        r.respuestas[id] = texto;
      }
      r.listos.add(id);
      tocar(sala);
      comprobarReparto(sala);
      return { sala };
    },

    /** El anfitrion no espera mas: a los que no contestan, o al reloj del debate. */
    forzar(codigo, id) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (!esAnfitrion(sala, id)) return { error: 'Solo el anfitrión puede hacer eso' };
      if (sala.fase === 'reparto') empezarDebate(sala);
      else if (sala.fase === 'debate') cerrarVotacion(sala);
      else return { error: 'Ahora no hace falta' };
      tocar(sala);
      return { sala };
    },

    /**
     * Votar mientras se debate. `votos` es una lista: hasta N jugadores (N =
     * expulsados por turno), o ['saltar'], o ['nadie'] (no hay impostor).
     * Una lista vacia quita el voto.
     */
    votar(codigo, id, votos) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (sala.fase !== 'debate') return { error: 'Ahora no se vota' };
      const r = sala.ronda;
      if (!participanteVivo(sala, id)) return { error: 'Los expulsados no votan 👻' };
      if (id in r.votos && !sala.ajustes.cambiarVoto) return { error: 'Ya has votado y en esta sala no se puede cambiar' };
      const lista = Array.isArray(votos) ? [...new Set(votos.map(String))] : [];

      if (!lista.length) {
        if (!sala.ajustes.cambiarVoto) return { error: 'Elige a alguien' };
        delete r.votos[id];
        tocar(sala);
        return { sala };
      }
      if (lista.length === 1 && lista[0] === 'saltar') r.votos[id] = ['saltar'];
      else if (lista.length === 1 && lista[0] === 'nadie') {
        if (!sala.ajustes.trampa) return { error: 'Ese voto no vale' };
        r.votos[id] = ['nadie'];
      } else {
        const huecos = expulsablesAhora(sala);
        if (lista.length > huecos) return { error: huecos === 1 ? 'Solo puedes votar a 1 persona' : `Solo puedes votar a ${huecos} personas` };
        if (lista.includes(id)) return { error: 'No te puedes votar a ti mismo' };
        if (!lista.every((x) => r.participantes.includes(x) && r.vivos.has(x))) return { error: 'Ese voto no vale' };
        r.votos[id] = lista;
      }
      tocar(sala);
      comprobarVotos(sala);
      return { sala };
    },

    adivinar(codigo, id, texto) {
      const sala = buscar(codigo);
      if (!sala) return { error: 'Esa sala no existe' };
      if (sala.fase !== 'adivinar') return { error: 'Ahora no toca adivinar' };
      const r = sala.ronda;
      if (r.adivina !== id) return { error: 'No te toca a ti adivinar' };
      const intento = limpiarTexto(texto, 60);
      if (!intento) return { error: 'Escribe la palabra' };
      const acierto = aciertaPalabra(intento, r.palabra);
      r.adivinanza = { texto: intento, acierto };
      terminar(sala, acierto ? 'impostor' : 'inocentes', acierto ? { robo: true } : { fallo: true });
      tocar(sala);
      return { sala };
    },

    /** Pasa de fase lo que haya llegado a su hora. Devuelve las salas que han cambiado. */
    tick() {
      const t = ahora();
      const cambiadas = [];
      for (const sala of salas.values()) {
        if (sala.fin == null || t < sala.fin) continue;
        switch (sala.fase) {
          case 'debate': cerrarVotacion(sala); break;
          case 'resultado': aplicarExpulsion(sala); break;
          case 'expulsion': trasExpulsion(sala); break;
          case 'adivinar':
            sala.ronda.adivinanza = { texto: null, acierto: false };
            terminar(sala, 'inocentes', { fallo: true });
            break;
          default: sala.fin = null;
        }
        cambiadas.push(sala);
      }
      return cambiadas;
    },

    /** Tira las salas paradas sin nadie dentro. */
    limpiar() {
      const t = ahora();
      let n = 0;
      for (const [codigo, sala] of salas) {
        const alguien = sala.jugadores.some((j) => j.conectado);
        if (alguien) continue;
        if (sala.publica) {
          // Las publicas no se borran: se vacian para el siguiente grupo
          if (t - sala.tocada > REINICIO_PUBLICA_MS && (sala.jugadores.length || sala.ronda)) {
            vaciar(sala);
            n++;
          }
        } else if (t - sala.tocada > CADUCA_MS) {
          salas.delete(codigo);
          n++;
        }
      }
      return n;
    },

    /** Lo que se ve en la entrada: las salas publicas y cuanta gente hay. */
    publicas() {
      return SALAS_PUBLICAS.map(({ codigo }) => {
        const sala = salas.get(codigo);
        const dentro = sala.jugadores.filter((j) => j.conectado);
        return {
          codigo,
          nombre: sala.nombre,
          jugadores: dentro.filter((j) => !j.espectador).length,
          espectadores: dentro.filter((j) => j.espectador).length,
          max: MAX_JUGADORES,
          fase: sala.fase,
          modo: sala.ajustes.modo,
          // Solo nombre y color: para ver de un vistazo si estan tus amigos
          quienes: dentro.filter((j) => !j.espectador).slice(0, 8).map((j) => ({ nombre: j.nombre, color: j.color }))
        };
      });
    }
  };
}
