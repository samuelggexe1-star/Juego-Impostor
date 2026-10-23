/* =========================================================
   IMPOSTOR — lógica del juego
   Las palabras están en palabras.js (CATEGORIAS y PREGUNTAS)
   ========================================================= */

/* ---------------- Utilidades ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function azar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Mezcla de Fisher-Yates (la de sort(() => Math.random() - 0.5) no es justa)
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function listaNombres(nombres) {
  if (nombres.length <= 1) return nombres.join("");
  return nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1];
}

let temporizadorAviso = null;
function aviso(texto, ms = 2600) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.remove("oculto");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.add("oculto"), ms);
}

/* ---------------- Guardado ---------------- */
const CLAVE = "impostor-v2";

const AJUSTES_DEFECTO = {
  pista: "categoria",      // nada | categoria | parecida | ambas
  eliminacion: true,       // si se expulsa a un inocente se sigue jugando
  adivinar: true,          // el impostor pillado puede robar la victoria
  noEmpieza: true,         // el impostor no empieza a hablar
  seConocen: false,        // varios impostores se conocen entre ellos
  votoSecreto: false,
  trampa: false,
  probTrampa: 10,
  tiempo: false,
  minutos: 3,
  noRepetir: true,
  sonido: true,
  vibracion: true,
  picante: true,           // modo Preguntas: preguntas arriesgadas 🌶️
  preguntasJugadores: true, // modo Preguntas: preguntas con nombres de los jugadores
  escritas: false,         // cada uno escribe su palabra en el iPad por turnos
  vueltasEscritas: 1       // cuantas palabras escribe cada uno
};

function cargar() {
  let guardado = {};
  try {
    guardado = JSON.parse(localStorage.getItem(CLAVE)) || {};
  } catch (e) { /* sin guardado */ }
  return {
    jugadores: guardado.jugadores || [],
    modo: guardado.modo || "clasico",
    categorias: guardado.categorias || ["Comida", "Animales", "Videojuegos", "Lugares Locales"],
    numImpostores: guardado.numImpostores || 1,
    autoImpostores: guardado.autoImpostores !== false,
    ajustes: { ...AJUSTES_DEFECTO, ...(guardado.ajustes || {}) },
    puntos: guardado.puntos || {},
    usadas: guardado.usadas || [],
    propias: guardado.propias || {},
    historial: guardado.historial || []
  };
}

const datos = cargar();

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (e) { /* almacenamiento lleno o bloqueado: el juego sigue funcionando */ }
}

/* ---------------- Sonido y vibración ---------------- */
let audio = null;
function pitido(frecuencia = 660, duracion = 0.12, volumen = 0.15) {
  if (!datos.ajustes.sonido) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gan = audio.createGain();
    osc.frequency.value = frecuencia;
    osc.type = "sine";
    gan.gain.setValueAtTime(volumen, audio.currentTime);
    gan.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duracion);
    osc.connect(gan).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duracion);
  } catch (e) { /* sin audio */ }
}

function melodia(notas) {
  notas.forEach(([f, t], i) => setTimeout(() => pitido(f, 0.18), t ?? i * 140));
}

function vibrar(patron) {
  if (datos.ajustes.vibracion && navigator.vibrate) navigator.vibrate(patron);
}

/* ---------------- Palabras ---------------- */
function todasLasCategorias() {
  const propias = {};
  Object.entries(datos.propias).forEach(([nombre, palabras]) => {
    propias[nombre] = { icono: "✏️", palabras, propia: true };
  });
  return { ...CATEGORIAS, ...propias };
}

// Cambia {J} y {J2} por jugadores de la partida (distintos entre sí)
function conJugadores(texto, j1, j2) {
  return texto.replace(/\{J2\}/g, j2).replace(/\{J\}/g, j1);
}

function dosJugadoresAlAzar() {
  const [a, b] = mezclar(datos.jugadores);
  return [a, b || a];
}

function separar(entrada) {
  const [palabra, gemela] = entrada.split(" / ").map((t) => t.trim());
  return { palabra, gemela: gemela || "" };
}

function elegirPalabra() {
  const cats = todasLasCategorias();
  const pares = [];
  datos.categorias.forEach((cat) => {
    if (!cats[cat]) return;
    cats[cat].palabras.forEach((p) => pares.push({ cat, ...separar(p) }));
  });
  if (pares.length === 0) return null;

  let candidatas = pares;
  if (datos.ajustes.noRepetir) {
    const usadas = new Set(datos.usadas);
    candidatas = pares.filter((p) => !usadas.has(p.cat + "|" + p.palabra));
    if (candidatas.length === 0) {
      // Se acabaron: olvidamos las de estas categorías y volvemos a empezar
      const claves = new Set(pares.map((p) => p.cat + "|" + p.palabra));
      datos.usadas = datos.usadas.filter((u) => !claves.has(u));
      candidatas = pares;
      aviso("🔄 Ya habían salido todas las palabras de estas categorías. ¡Empezamos de nuevo!");
    }
  }

  const elegida = azar(candidatas);
  datos.usadas.push(elegida.cat + "|" + elegida.palabra);
  if (datos.usadas.length > 3000) datos.usadas = datos.usadas.slice(-3000);

  // Palabras con jugadores: "El móvil de {J}" → "El móvil de Mateo"
  // La gemela es la misma frase con otro jugador ("El móvil de Diego")
  if (elegida.palabra.includes("{J")) {
    const [j1, j2] = dosJugadoresAlAzar();
    const plantillaGemela = elegida.gemela || elegida.palabra.replace(/\{J\}/g, "{J2}");
    elegida.palabra = conJugadores(elegida.palabra, j1, j2);
    elegida.gemela = conJugadores(plantillaGemela, j1, j2);
    if (elegida.gemela === elegida.palabra) elegida.gemela = elegida.cat;
    return elegida;
  }

  // Si no tiene gemela, cogemos otra palabra de su misma categoría
  if (!elegida.gemela) {
    const otras = pares.filter((p) => p.cat === elegida.cat && p.palabra !== elegida.palabra);
    elegida.gemela = otras.length ? azar(otras).palabra : elegida.cat;
  }
  return elegida;
}

function elegirPregunta() {
  let lista = PREGUNTAS.map((p) => [...p, "Preguntas"]);
  if (datos.ajustes.picante) lista = lista.concat(PREGUNTAS_PICANTES.map((p) => [...p, "Preguntas picantes 🌶️"]));
  if (datos.ajustes.preguntasJugadores) lista = lista.concat(PREGUNTAS_JUGADORES.map((p) => [...p, "Preguntas sobre vosotros 👥"]));

  let candidatas = lista;
  if (datos.ajustes.noRepetir) {
    const usadas = new Set(datos.usadas);
    candidatas = lista.filter((p) => !usadas.has("P|" + p[0]));
    if (!candidatas.length) {
      const claves = new Set(lista.map((p) => "P|" + p[0]));
      datos.usadas = datos.usadas.filter((u) => !claves.has(u));
      candidatas = lista;
      aviso("🔄 Ya habían salido todas las preguntas. ¡Empezamos de nuevo!");
    }
  }
  const elegida = azar(candidatas);
  datos.usadas.push("P|" + elegida[0]);
  return elegida;
}

/* ---------------- Impostores ---------------- */
function impostoresRecomendados(n) {
  if (n >= 10) return 3;
  if (n >= 6) return 2;
  return 1;
}

function maxImpostores(n) {
  return Math.max(1, Math.floor((n - 1) / 2));
}

function numImpostoresActual() {
  const n = datos.jugadores.length;
  if (datos.autoImpostores) return impostoresRecomendados(n);
  return Math.min(datos.numImpostores, maxImpostores(n));
}

/* =========================================================
   PANTALLA DE INICIO
   ========================================================= */
/** Que la pantalla no se apague mientras se juega (si el móvil lo permite). */
let bloqueoPantalla = null;
async function mantenerPantalla(activar) {
  try {
    if (activar && "wakeLock" in navigator && !document.hidden && !bloqueoPantalla) {
      bloqueoPantalla = await navigator.wakeLock.request("screen");
      bloqueoPantalla.addEventListener("release", () => { bloqueoPantalla = null; });
    } else if (!activar && bloqueoPantalla) {
      await bloqueoPantalla.release();
      bloqueoPantalla = null;
    }
  } catch (e) { /* no se puede, da igual */ }
}

/** Fuera del menu y del final, hay una partida en marcha. */
const enPartida = () => ronda && !["pInicio", "pFinal"].includes(($(".pantalla.activa") || {}).id);

document.addEventListener("visibilitychange", () => { if (!document.hidden && enPartida()) mantenerPantalla(true); });
window.addEventListener("beforeunload", (e) => {
  if (enPartida()) { e.preventDefault(); e.returnValue = ""; }
});

function irA(id) {
  mantenerPantalla(id !== "pInicio");
  $$(".pantalla").forEach((p) => p.classList.toggle("activa", p.id === id));
  document.body.classList.remove("modo-impostor-visto");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Anima la lista solo cuando cambia lo que hay en ella. */
function animarSiCambia(el, clave) {
  if (!el || el._clave === clave) return;
  el._clave = clave;
  el.classList.remove("animar");
  void el.offsetWidth;
  el.classList.add("animar");
  clearTimeout(el._tAnimar);
  el._tAnimar = setTimeout(() => el.classList.remove("animar"), 1000);
}

function pintarJugadores() {
  const cont = $("#listaJugadores");
  animarSiCambia(cont, datos.jugadores.join("|"));
  cont.innerHTML = "";
  datos.jugadores.forEach((nombre, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    const pts = datos.puntos[nombre] || 0;
    chip.innerHTML = `${esc(nombre)}${pts ? ` <span class="puntos-chip">★${pts}</span>` : ""}
      <button aria-label="Quitar ${esc(nombre)}">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      datos.jugadores.splice(i, 1);
      guardar();
      pintarInicio();
    });
    cont.appendChild(chip);
  });
  $("#numJugadores").textContent = datos.jugadores.length;
  const falta = 3 - datos.jugadores.length;
  $("#notaJugadores").textContent = falta > 0
    ? `Añade ${falta} jugador${falta > 1 ? "es" : ""} más para poder jugar. Se guardan para la próxima vez.`
    : "Se guardan para la próxima vez.";
}

function pintarModos() {
  $$(".modo").forEach((b) => b.classList.toggle("sel", b.dataset.modo === datos.modo));
  const sinCategorias = datos.modo === "preguntas" || datos.modo === "admin";
  $("#panelCategorias").classList.toggle("oculto", sinCategorias);
}

function pintarCategorias() {
  const cont = $("#categorias");
  animarSiCambia(cont, Object.keys(todasLasCategorias()).join("|"));
  cont.innerHTML = "";
  const cats = todasLasCategorias();
  // Quitamos de la selección categorías que ya no existen
  datos.categorias = datos.categorias.filter((c) => cats[c]);
  Object.entries(cats).forEach(([nombre, info]) => {
    const btn = document.createElement("button");
    btn.className = "categoria-btn" + (datos.categorias.includes(nombre) ? " selected" : "");
    btn.innerHTML = `<span class="cat-icono">${info.icono}</span>
      <span class="cat-nombre">${esc(nombre)}</span>
      <span class="cat-num">${info.palabras.length}</span>`;
    btn.addEventListener("click", () => {
      const i = datos.categorias.indexOf(nombre);
      if (i >= 0) datos.categorias.splice(i, 1);
      else datos.categorias.push(nombre);
      guardar();
      pintarCategorias();
    });
    cont.appendChild(btn);
  });
  const total = Object.keys(cats).length;
  const sel = datos.categorias.length;
  $("#numCategorias").textContent = sel;
  $("#btnTodasCategorias").textContent = sel === total ? "Ninguna" : "Todas";
}

function pintarImpostores() {
  const n = datos.jugadores.length;
  const valor = numImpostoresActual();
  $("#valorImpostores").textContent = valor;
  $("#autoImpostores").checked = datos.autoImpostores;
  $("#textoImpostores").textContent = datos.autoImpostores
    ? `Automático (${n} jugadores)`
    : (valor === impostoresRecomendados(n) ? "Recomendado" : `Recomendado: ${impostoresRecomendados(n)}`);
  $("#menosImpostores").disabled = datos.autoImpostores || valor <= 1;
  $("#masImpostores").disabled = datos.autoImpostores || valor >= maxImpostores(n);
}

function pintarResumen() {
  const a = datos.ajustes;
  const partes = [];
  if (datos.modo === "clasico") {
    const textos = { nada: "Sin pista", categoria: "Pista: categoría", parecida: "Pista: palabra parecida", ambas: "Pista: categoría + parecida" };
    partes.push("💡 " + textos[a.pista]);
  }
  if (a.escritas && datos.modo !== "preguntas") partes.push(`✍️ Escribiendo${a.vueltasEscritas > 1 ? ` (${a.vueltasEscritas})` : ""}`);
  partes.push(a.tiempo ? `⏱️ ${a.minutos} min` : "⏱️ Sin tiempo");
  if (a.trampa && datos.modo !== "admin") partes.push(`🤡 Trampa ${a.probTrampa}%`);
  if (a.eliminacion) partes.push("🔁 Expulsiones");
  if (a.adivinar && (datos.modo === "clasico" || datos.modo === "admin")) partes.push("🎯 Robo final");
  if (a.votoSecreto) partes.push("🤫 Voto secreto");
  if (datos.modo === "preguntas") {
    if (a.picante) partes.push("🌶️ Picantes");
    if (a.preguntasJugadores) partes.push("👥 Sobre vosotros");
  }
  $("#resumenAjustes").innerHTML = partes.map((p) => `<span>${esc(p)}</span>`).join("");
}

function pintarInicio() {
  pintarJugadores();
  pintarModos();
  pintarCategorias();
  pintarImpostores();
  pintarResumen();
}

// Añadir jugadores (acepta varios separados por comas)
$("#formJugador").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#inputJugador");
  const nuevos = input.value.split(",").map((t) => t.trim()).filter(Boolean);
  let repetidos = 0;
  nuevos.forEach((nombre) => {
    const existe = datos.jugadores.some((j) => j.toLowerCase() === nombre.toLowerCase());
    if (existe) repetidos++;
    else datos.jugadores.push(nombre.slice(0, 20));
  });
  if (repetidos) aviso("Ese nombre ya está en la lista");
  input.value = "";
  input.focus();
  guardar();
  pintarInicio();
});

$("#btnBorrarJugadores").addEventListener("click", () => {
  if (!datos.jugadores.length) return;
  if (!confirm("¿Borrar todos los jugadores?")) return;
  datos.jugadores = [];
  guardar();
  pintarInicio();
});

$$(".modo").forEach((b) => b.addEventListener("click", () => {
  datos.modo = b.dataset.modo;
  guardar();
  pintarModos();
  pintarResumen();
}));

$("#btnTodasCategorias").addEventListener("click", () => {
  const todas = Object.keys(todasLasCategorias());
  datos.categorias = datos.categorias.length === todas.length ? [] : todas;
  guardar();
  pintarCategorias();
});

$("#btnAleatoriaCategoria").addEventListener("click", () => {
  const todas = Object.keys(todasLasCategorias());
  const cat = azar(todas);
  datos.categorias = [cat];
  guardar();
  pintarCategorias();
  aviso(`🎲 Categoría: ${cat}`);
});

$("#menosImpostores").addEventListener("click", () => {
  datos.numImpostores = Math.max(1, numImpostoresActual() - 1);
  guardar();
  pintarImpostores();
});
$("#masImpostores").addEventListener("click", () => {
  datos.numImpostores = Math.min(maxImpostores(datos.jugadores.length), numImpostoresActual() + 1);
  guardar();
  pintarImpostores();
});
$("#autoImpostores").addEventListener("change", (e) => {
  datos.autoImpostores = e.target.checked;
  if (!datos.autoImpostores) datos.numImpostores = impostoresRecomendados(datos.jugadores.length);
  guardar();
  pintarImpostores();
});

/* =========================================================
   EMPEZAR RONDA
   ========================================================= */
let ronda = null;

$("#btnJugar").addEventListener("click", () => {
  if (datos.jugadores.length < 3) {
    aviso("Necesitáis al menos 3 jugadores");
    $("#inputJugador").focus();
    return;
  }
  if ((datos.modo === "clasico" || datos.modo === "undercover") && datos.categorias.length === 0) {
    aviso("Elige al menos una categoría");
    return;
  }
  if (datos.modo === "admin") {
    abrirAdmin();
    return;
  }
  crearRonda();
});

function rondaBase() {
  const jugadores = [...datos.jugadores];
  return {
    modo: datos.modo,
    jugadores,
    impostores: new Set(),
    vivos: new Set(jugadores.map((_, i) => i)),
    trampa: null,          // null | "ninguno" | "todos"
    palabra: "",
    gemela: "",
    categoria: "",
    pistaAdmin: "",
    actual: 0,
    numDebate: 1,
    acertantes: new Set(), // quienes votaron bien en voto secreto
    respuestas: {},        // modo Preguntas: respuesta escrita de cada jugador
    respuestasReveladas: false,
    vistoActual: false,
    expulsados: [],
    pistas: [],            // palabras escritas: { i, texto, vuelta, saltado }
    colaPistas: [],
    posPista: 0
  };
}

function elegirImpostores(r, cantidad) {
  const indices = mezclar(r.jugadores.map((_, i) => i));
  r.impostores = new Set(indices.slice(0, Math.min(cantidad, r.jugadores.length - 1)));
}

function crearRonda() {
  const r = rondaBase();

  if (r.modo === "preguntas") {
    const [normal, otra, tipo] = elegirPregunta();
    const [j1, j2] = dosJugadoresAlAzar();
    r.palabra = conJugadores(normal, j1, j2);
    r.gemela = conJugadores(otra, j1, j2);
    r.categoria = tipo;
  } else {
    const elegida = elegirPalabra();
    if (!elegida) { aviso("No hay palabras en esas categorías"); return; }
    r.palabra = elegida.palabra;
    r.gemela = elegida.gemela;
    r.categoria = elegida.cat;
  }

  elegirImpostores(r, numImpostoresActual());

  // Rondas trampa
  if (datos.ajustes.trampa && Math.random() * 100 < datos.ajustes.probTrampa) {
    if (Math.random() < 0.5) {
      r.trampa = "ninguno";
      r.impostores = new Set();
    } else {
      r.trampa = "todos";
      r.impostores = new Set(r.jugadores.map((_, i) => i));
    }
  }

  guardar();
  empezarReparto(r);
}

/* ---------------- Modo Admin ---------------- */
let adminSeleccion = new Set();

function abrirAdmin() {
  adminSeleccion = new Set();
  $("#adminPalabra").value = "";
  $("#adminPista").value = "";
  const cont = $("#adminJugadores");
  cont.innerHTML = "";
  datos.jugadores.forEach((nombre, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = nombre;
    chip.addEventListener("click", () => {
      if (adminSeleccion.has(i)) adminSeleccion.delete(i);
      else adminSeleccion.add(i);
      chip.classList.toggle("sel", adminSeleccion.has(i));
    });
    cont.appendChild(chip);
  });
  irA("pAdmin");
  $("#adminPalabra").focus();
}

$("#adminCancelar").addEventListener("click", () => irA("pInicio"));

$("#adminEmpezar").addEventListener("click", () => {
  const palabra = $("#adminPalabra").value.trim();
  if (!palabra) { aviso("Escribe la palabra secreta"); return; }
  if (adminSeleccion.size >= datos.jugadores.length) { aviso("No pueden ser todos impostores"); return; }
  const r = rondaBase();
  r.palabra = palabra;
  r.pistaAdmin = $("#adminPista").value.trim();
  r.gemela = r.pistaAdmin;
  r.categoria = "Admin";
  if (adminSeleccion.size) r.impostores = new Set(adminSeleccion);
  else elegirImpostores(r, numImpostoresActual());
  empezarReparto(r);
});

/* =========================================================
   REPARTO DE ROLES
   ========================================================= */
function empezarReparto(r) {
  ronda = r;
  ronda.actual = 0;
  mostrarTurnoReparto();
  irA("pReparto");
}

function pintarProgreso(contenedor, total, actual) {
  contenedor.innerHTML = Array.from({ length: total }, (_, i) =>
    `<i class="${i < actual ? "hecho" : i === actual ? "actual" : ""}"></i>`).join("");
}

function mostrarTurnoReparto() {
  const i = ronda.actual;
  $("#repartoNombre").textContent = ronda.jugadores[i];
  pintarProgreso($("#progresoReparto"), ronda.jugadores.length, i);
  $("#cartaFrente").innerHTML = contenidoCarta(i);
  $("#cartaFrente").classList.toggle("impostor", sabeQueEsImpostor(i));
  $("#cartaRol").classList.remove("girada");
  $("#btnSiguienteReparto").disabled = true;
  ronda.vistoActual = false;
  const ultimo = i === ronda.jugadores.length - 1;
  if (ronda.modo === "preguntas") {
    $("#inputRespuesta").value = "";
    $("#zonaRespuesta").classList.add("oculto");
    $("#btnSiguienteReparto").textContent = ultimo ? "Guardar respuesta: ¡a jugar! ✔" : "Guardar respuesta ✔";
  } else {
    $("#zonaRespuesta").classList.add("oculto");
    $("#btnSiguienteReparto").textContent = ultimo ? "Ya lo he visto: ¡a jugar! ✔" : "Ya lo he visto ✔";
  }
}

// En Despistado y Preguntas el impostor no sabe que lo es
function sabeQueEsImpostor(i) {
  return ronda.impostores.has(i) && (ronda.modo === "clasico" || ronda.modo === "admin");
}

function contenidoCarta(i) {
  const r = ronda;
  const esImpostor = r.impostores.has(i);

  if (r.modo === "preguntas") {
    const pregunta = esImpostor ? r.gemela : r.palabra;
    return `<span class="rol">Tu pregunta</span>
      <span class="pregunta">${esc(pregunta)}</span>
      <span class="extra">Escribe tu respuesta abajo 🤫</span>`;
  }

  if (r.modo === "undercover") {
    const palabra = esImpostor ? r.gemela : r.palabra;
    return `<span class="rol">Tu palabra</span><span class="palabra">${esc(palabra)}</span>`;
  }

  // Clásico y Admin
  if (!esImpostor) {
    return `<span class="rol">Tu palabra</span><span class="palabra">${esc(r.palabra)}</span>`;
  }

  let extra = "";
  if (r.modo === "admin") {
    if (r.pistaAdmin) extra += `<span class="extra">Pista: <b>${esc(r.pistaAdmin)}</b></span>`;
  } else {
    const p = datos.ajustes.pista;
    if (p === "categoria" || p === "ambas") extra += `<span class="extra">Categoría: <b>${esc(r.categoria)}</b></span>`;
    if (p === "parecida" || p === "ambas") extra += `<span class="extra">Palabra parecida: <b>${esc(r.gemela)}</b></span>`;
  }

  if (datos.ajustes.seConocen && r.impostores.size > 1 && r.trampa !== "todos") {
    const otros = [...r.impostores].filter((x) => x !== i).map((x) => r.jugadores[x]);
    extra += `<span class="extra">Tu compinche: <b>${esc(listaNombres(otros))}</b></span>`;
  }
  if (!extra) extra = `<span class="extra">Escucha a los demás y disimula 😏</span>`;

  return `<span class="rol">Eres el</span><span class="palabra">IMPOSTOR 🔪</span>${extra}`;
}

/* Carta: se ve mientras se mantiene pulsada */
function prepararCarta(carta, alVer) {
  const mostrar = (e) => {
    if (e) e.preventDefault();
    if (carta.classList.contains("girada")) return;
    carta.classList.add("girada");
    alVer();
  };
  const ocultar = () => carta.classList.remove("girada");
  carta.addEventListener("pointerdown", (e) => {
    try { carta.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    mostrar(e);
  });
  carta.addEventListener("pointerup", ocultar);
  carta.addEventListener("pointercancel", ocultar);
  carta.addEventListener("lostpointercapture", ocultar);
  carta.addEventListener("contextmenu", (e) => e.preventDefault());
  carta.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") mostrar(e);
  });
  carta.addEventListener("keyup", ocultar);
  carta.addEventListener("blur", ocultar);
}

function puedeSeguirReparto() {
  if (!ronda.vistoActual) return false;
  if (ronda.modo === "preguntas") return $("#inputRespuesta").value.trim().length > 0;
  return true;
}

$("#inputRespuesta").addEventListener("input", () => {
  $("#btnSiguienteReparto").disabled = !puedeSeguirReparto();
});
$("#inputRespuesta").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && puedeSeguirReparto()) $("#btnSiguienteReparto").click();
});

prepararCarta($("#cartaRol"), () => {
  ronda.vistoActual = true;
  if (ronda.modo === "preguntas") $("#zonaRespuesta").classList.remove("oculto");
  $("#btnSiguienteReparto").disabled = !puedeSeguirReparto();
  if (sabeQueEsImpostor(ronda.actual)) {
    vibrar([60, 40, 60]);
    pitido(220, 0.25);
  } else {
    vibrar(30);
    pitido(880, 0.08, 0.08);
  }
});

$("#btnSiguienteReparto").addEventListener("click", () => {
  if (!puedeSeguirReparto()) return;
  if (ronda.modo === "preguntas") {
    ronda.respuestas[ronda.actual] = $("#inputRespuesta").value.trim();
    $("#inputRespuesta").value = "";
    $("#inputRespuesta").blur();
  }
  ronda.actual++;
  if (ronda.actual >= ronda.jugadores.length) {
    empezarDebate();
  } else {
    mostrarTurnoReparto();
  }
});

$("#btnCancelarRonda").addEventListener("click", () => {
  if (!confirm("¿Cancelar la ronda?")) return;
  pararCrono();
  ronda = null;
  irA("pInicio");
  pintarInicio();
});

/* =========================================================
   DEBATE
   ========================================================= */
function vivosLista() {
  return [...ronda.vivos].sort((a, b) => a - b);
}

function empezarDebate() {
  const vivos = vivosLista();
  let candidatos = vivos;
  if (datos.ajustes.noEmpieza) {
    const sinImpostor = vivos.filter((i) => !ronda.impostores.has(i));
    if (sinImpostor.length) candidatos = sinImpostor;
  }
  const empieza = azar(candidatos);
  const horario = Math.random() < 0.5;

  // Orden de habla empezando por el elegido
  let orden = [...vivos];
  if (!horario) orden.reverse();
  const pos = orden.indexOf(empieza);
  orden = orden.slice(pos).concat(orden.slice(0, pos));

  $("#debateRonda").textContent = ronda.numDebate === 1 ? "¡A jugar!" : `Ronda ${ronda.numDebate}`;
  $("#debateEmpieza").textContent = ronda.jugadores[empieza];
  $("#debateSentido").textContent = horario ? "Sentido de las agujas del reloj ⟳" : "Sentido contrario a las agujas del reloj ⟲";
  const ordenHtml = orden.map((i, n) => `<span class="${n === 0 ? "primero" : ""}">${n + 1}. ${esc(ronda.jugadores[i])}</span>`);
  ronda.expulsados.forEach((i) => ordenHtml.push(`<span class="fuera">${esc(ronda.jugadores[i])}</span>`));
  $("#debateOrden").innerHTML = ordenHtml.join("");

  const instr = $("#debateInstruccion");
  if (ronda.modo === "preguntas") {
    pintarDebatePreguntas(instr);
  } else if (ronda.numDebate === 1) {
    instr.textContent = "Por turnos, cada uno dice UNA palabra relacionada con la suya. Haced las vueltas que queráis y luego votad.";
  } else {
    instr.textContent = "El impostor sigue entre vosotros. Otra vuelta de palabras… ¡sin repetir!";
  }

  $("#btnNoHayImpostor").classList.toggle("oculto", !(datos.ajustes.trampa && ronda.modo !== "admin"));
  prepararCrono();
  irA("pDebate");
  melodia([[523], [659], [784]]);

  // Pistas escritas: antes de debatir, cada uno escribe su palabra pasando el iPad
  if (!ronda.pistas.length) pistasPintadas = 0;
  if (datos.ajustes.escritas && ronda.modo !== "preguntas") {
    ronda.colaPistas = [];
    for (let t = 0; t < datos.ajustes.vueltasEscritas; t++) ronda.colaPistas.push(...orden);
    ronda.posPista = 0;
    instr.textContent = "Cada uno escribe UNA palabra relacionada con la suya. Pasaos el iPad en orden.";
    modoEscribir(true);
    turnoEscribir();
  } else {
    modoEscribir(false);
  }
  pintarMuroLocal();
}

/* ---------------- Pistas escritas en un solo iPad ---------------- */
let pistasPintadas = 0;

function modoEscribir(activo) {
  $("#panelEscribir").classList.toggle("oculto", !activo);
  $("#btnIrVotar").classList.toggle("oculto", activo);
  $("#btnRevelarYa").classList.toggle("oculto", activo);
  if (activo) $("#panelCrono").classList.add("oculto");
  else $("#panelCrono").classList.toggle("oculto", !datos.ajustes.tiempo);
}

function turnoEscribir() {
  if (ronda.posPista >= ronda.colaPistas.length) {
    modoEscribir(false);
    $("#debateInstruccion").textContent = "¡Ya habéis escrito todos! Mirad las palabras, debatid y votad.";
    aviso("🗳️ ¡A debatir y votar!");
    melodia([[659], [880]]);
    return;
  }
  const i = ronda.colaPistas[ronda.posPista];
  const nombre = ronda.jugadores[i];
  const tanda = Math.floor(ronda.posPista / (vivosLista().length || 1)) + 1;
  $("#escribirProgreso").textContent = datos.ajustes.vueltasEscritas > 1
    ? `Palabra ${tanda} de ${datos.ajustes.vueltasEscritas} · turno ${ronda.posPista + 1}/${ronda.colaPistas.length}`
    : `Turno ${ronda.posPista + 1} de ${ronda.colaPistas.length}`;
  $("#escribirNombre").textContent = nombre;
  const caja = $("#escribirInicial");
  caja.innerHTML = `<span class="foco"><span class="inicial grande" style="--c:${colorDe(i)}">${esc(nombre[0].toUpperCase())}</span></span>`;
  caja.classList.remove("entra"); void caja.offsetWidth; caja.classList.add("entra");
  $("#inputEscribir").value = "";
  vibrar([50, 40, 50]);
}

/** Un color fijo para cada jugador, para reconocerle en el muro. */
function colorDe(i) {
  const colores = ["#ef4444", "#3b82f6", "#22c55e", "#ec4899", "#f97316", "#eab308", "#8b5cf6", "#14b8a6", "#a16207", "#64748b", "#06b6d4", "#84cc16"];
  return colores[i % colores.length];
}

function apuntarEscrita(texto, saltado = false) {
  ronda.pistas.push({ i: ronda.colaPistas[ronda.posPista], texto, saltado, vuelta: ronda.numDebate });
  ronda.posPista++;
  pintarMuroLocal();
  pitido(saltado ? 330 : 880, 0.08, 0.08);
  turnoEscribir();
}

function pintarMuroLocal() {
  const lista = ronda.pistas;
  $("#panelMuroLocal").classList.toggle("oculto", !lista.length);
  $("#contadorLocal").textContent = lista.filter((p) => !p.saltado).length;
  const vueltas = new Set(lista.map((p) => p.vuelta));
  let html = "";
  for (const v of vueltas) {
    if (vueltas.size > 1) html += `<p class="muro-vuelta">Ronda ${v}</p>`;
    html += `<div class="muro-fila">${lista.map((p, k) => ({ ...p, k })).filter((p) => p.vuelta === v).map((p) => `
      <div class="pista ${p.saltado ? "saltada" : ""} ${p.k >= pistasPintadas ? "nueva" : ""}" style="--c:${colorDe(p.i)}">
        <span class="inicial" style="--c:${colorDe(p.i)}">${esc(ronda.jugadores[p.i][0].toUpperCase())}</span>
        <span class="pista-textos"><small>${esc(ronda.jugadores[p.i])}</small><b>${p.saltado ? "⏳ se lo saltó" : esc(p.texto)}</b></span>
      </div>`).join("")}</div>`;
  }
  $("#muroLocal").innerHTML = html;
  pistasPintadas = lista.length;
}

$("#formEscribir").addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = $("#inputEscribir").value.replace(/\s+/g, " ").trim().slice(0, 30);
  if (!texto) { aviso("Escribe una palabra"); return; }
  if (texto.split(" ").length > 3) { aviso("Mejor una palabra (o dos) 😉"); return; }
  $("#inputEscribir").blur();
  apuntarEscrita(texto);
});
$("#btnSaltarTurno").addEventListener("click", () => apuntarEscrita(null, true));

// Modo Preguntas: primero se revelan todas las respuestas a la vez y luego la pregunta
function htmlRespuestas(marcarImpostor = false) {
  return ronda.jugadores.map((nombre, i) => {
    const clases = ["respuesta"];
    if (!ronda.vivos.has(i)) clases.push("fuera");
    if (marcarImpostor && ronda.impostores.has(i)) clases.push("es-impostor");
    return `<div class="${clases.join(" ")}" style="animation-delay:${i * 0.12}s">
      <b>${esc(nombre)}</b><span>${esc(ronda.respuestas[i] || "—")}</span></div>`;
  }).join("");
}

function pintarDebatePreguntas(instr) {
  const preguntaHtml = `<p>La pregunta de verdad era:<br><b class="resalte">"${esc(ronda.palabra)}"</b></p>`;
  if (ronda.respuestasReveladas) {
    instr.innerHTML = `<div class="respuestas">${htmlRespuestas()}</div>${preguntaHtml}
      ${ronda.numDebate > 1 ? "<p>El impostor sigue entre vosotros. ¿Quién no encaja?</p>" : ""}`;
    return;
  }
  instr.innerHTML = `Ya están todas las respuestas guardadas. Reveladlas a la vez y luego leed la pregunta de verdad.
    <br><button class="btn" id="btnRevelarRespuestas" style="margin-top:10px">📢 Revelar respuestas</button>`;
  $("#btnRevelarRespuestas").addEventListener("click", () => {
    ronda.respuestasReveladas = true;
    melodia([[523], [659]]);
    instr.innerHTML = `<div class="respuestas">${htmlRespuestas()}</div>
      <button class="btn btn-secundario" id="btnLeerPregunta" style="margin-top:12px">📖 Leer la pregunta de verdad</button>`;
    $("#btnLeerPregunta").addEventListener("click", () => {
      pintarDebatePreguntas(instr);
      pitido(784, 0.15);
    });
  });
}

/* ---------------- Cronómetro ---------------- */
let crono = { total: 180, restante: 180, intervalo: null };

function prepararCrono() {
  pararCrono();
  const usar = datos.ajustes.tiempo;
  $("#panelCrono").classList.toggle("oculto", !usar);
  crono.total = Math.round(datos.ajustes.minutos * 60);
  crono.restante = crono.total;
  pintarCrono();
  $("#cronoPlay").textContent = "▶ Empezar";
}

function pintarCrono() {
  const m = Math.floor(crono.restante / 60);
  const s = crono.restante % 60;
  $("#crono").textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  $("#crono").classList.toggle("urgente", crono.restante <= 10 && crono.restante > 0);
  $("#cronoBarra").style.width = `${(crono.restante / crono.total) * 100}%`;
}

function pararCrono() {
  clearInterval(crono.intervalo);
  crono.intervalo = null;
}

function tic() {
  crono.restante = Math.max(0, crono.restante - 1);
  pintarCrono();
  if (crono.restante <= 5 && crono.restante > 0) pitido(880, 0.08);
  if (crono.restante === 0) {
    pararCrono();
    $("#cronoPlay").textContent = "▶ Empezar";
    melodia([[784], [622], [523], [392]]);
    vibrar([300, 100, 300]);
    aviso("⏰ ¡Se acabó el tiempo! A votar", 3500);
  }
}

$("#cronoPlay").addEventListener("click", () => {
  if (crono.intervalo) {
    pararCrono();
    $("#cronoPlay").textContent = "▶ Seguir";
  } else {
    if (crono.restante === 0) crono.restante = crono.total;
    crono.intervalo = setInterval(tic, 1000);
    $("#cronoPlay").textContent = "⏸ Pausa";
  }
});
$("#cronoReset").addEventListener("click", () => {
  pararCrono();
  crono.restante = crono.total;
  pintarCrono();
  $("#cronoPlay").textContent = "▶ Empezar";
});
$("#cronoMas").addEventListener("click", () => {
  crono.restante += 30;
  crono.total = Math.max(crono.total, crono.restante);
  pintarCrono();
});

/* ---------------- Se me olvidó la palabra ---------------- */
let olvideIndice = null;

$("#btnOlvide").addEventListener("click", () => {
  const lista = $("#olvideLista");
  lista.innerHTML = "";
  lista.classList.remove("oculto");
  $("#olvideCarta").classList.add("oculto");
  ronda.jugadores.forEach((nombre, i) => {
    const b = document.createElement("button");
    b.className = "voto-btn";
    b.textContent = nombre;
    b.addEventListener("click", () => {
      olvideIndice = i;
      lista.classList.add("oculto");
      $("#cartaOlvideFrente").innerHTML = contenidoCarta(i);
      $("#cartaOlvideFrente").classList.toggle("impostor", sabeQueEsImpostor(i));
      $("#olvideCarta").classList.remove("oculto");
    });
    lista.appendChild(b);
  });
  abrirModal("modalOlvide");
});
prepararCarta($("#cartaOlvide"), () => vibrar(30));

$("#btnRevelarYa").addEventListener("click", () => {
  if (!confirm("¿Revelar quién era el impostor sin votar? Nadie suma puntos.")) return;
  terminar("revelado");
});

/* =========================================================
   VOTACIÓN
   ========================================================= */
$("#btnIrVotar").addEventListener("click", () => {
  pararCrono();
  if (datos.ajustes.votoSecreto) empezarVotoSecreto();
  else mostrarVotacion();
});

function mostrarVotacion(nota) {
  $("#votoNota").textContent = nota || "Contad hasta 3 y señalad todos a la vez. Luego tocad al más votado.";
  const lista = $("#votoLista");
  lista.innerHTML = "";
  vivosLista().forEach((i) => {
    const b = document.createElement("button");
    b.className = "voto-btn";
    b.textContent = ronda.jugadores[i];
    b.addEventListener("click", () => {
      if (confirm(`¿Expulsar a ${ronda.jugadores[i]}?`)) expulsar(i, null);
    });
    lista.appendChild(b);
  });
  irA("pVotacion");
}

$("#btnEmpate").addEventListener("click", () => {
  ronda.numDebate++;
  empezarDebate();
});

$("#btnNoHayImpostor").addEventListener("click", () => {
  if (!confirm("¿Estáis seguros de que NO hay impostor?")) return;
  terminar(ronda.trampa === "ninguno" ? "trampaAcertada" : "impostor", { porNoHay: true });
});

$("#btnVotoSecreto").addEventListener("click", empezarVotoSecreto);

/* ---------------- Voto secreto ---------------- */
let votoSecreto = null;

function empezarVotoSecreto() {
  votoSecreto = { orden: vivosLista(), paso: 0, votos: {} };
  turnoVotoSecreto();
  irA("pVotoSecreto");
}

function turnoVotoSecreto() {
  const v = votoSecreto;
  const yo = v.orden[v.paso];
  $("#votoSecretoNombre").textContent = ronda.jugadores[yo];
  pintarProgreso($("#progresoVoto"), v.orden.length, v.paso);
  $("#btnMostrarVoto").classList.remove("oculto");
  const lista = $("#votoSecretoLista");
  lista.classList.add("oculto");
  lista.innerHTML = "";

  const opciones = v.orden.filter((i) => i !== yo).map((i) => ({ valor: i, texto: ronda.jugadores[i] }));
  if (datos.ajustes.trampa && ronda.modo !== "admin") opciones.push({ valor: "nadie", texto: "🤡 No hay impostor" });

  opciones.forEach((op) => {
    const b = document.createElement("button");
    b.className = "voto-btn";
    b.textContent = op.texto;
    b.addEventListener("click", () => {
      v.votos[yo] = op.valor;
      vibrar(25);
      v.paso++;
      if (v.paso >= v.orden.length) recontarVotos();
      else turnoVotoSecreto();
    });
    lista.appendChild(b);
  });
}

$("#btnMostrarVoto").addEventListener("click", () => {
  $("#btnMostrarVoto").classList.add("oculto");
  $("#votoSecretoLista").classList.remove("oculto");
});

function recontarVotos() {
  const recuento = {};
  Object.values(votoSecreto.votos).forEach((v) => { recuento[v] = (recuento[v] || 0) + 1; });
  const maximo = Math.max(...Object.values(recuento));
  const ganadores = Object.keys(recuento).filter((k) => recuento[k] === maximo);

  const html = Object.entries(recuento)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span>${esc(k === "nadie" ? "🤡 Nadie" : ronda.jugadores[k])}: <b>${n}</b></span>`)
    .join("");

  if (ganadores.length > 1) {
    const nombres = ganadores.map((k) => (k === "nadie" ? "No hay impostor" : ronda.jugadores[k]));
    mostrarVotacion(`Empate entre ${listaNombres(nombres)}. Desempatad hablando y tocad al expulsado, o jugad otra ronda.`);
    return;
  }

  const elegido = ganadores[0];
  if (elegido === "nadie") {
    terminar(ronda.trampa === "ninguno" ? "trampaAcertada" : "impostor", { porNoHay: true });
    return;
  }
  const idx = Number(elegido);
  // Quienes votaron bien al impostor se llevan +1 extra
  Object.entries(votoSecreto.votos).forEach(([votante, voto]) => {
    if (Number(voto) === idx && ronda.impostores.has(idx)) ronda.acertantes.add(Number(votante));
  });
  expulsar(idx, html);
}

/* =========================================================
   EXPULSIÓN
   ========================================================= */
let trasExpulsion = null;

function expulsar(idx, recuentoHtml) {
  ronda.vivos.delete(idx);
  ronda.expulsados.push(idx);

  $("#recuentoVotos").innerHTML = recuentoHtml || "";
  $("#expulsadoNombre").textContent = ronda.jugadores[idx];
  $("#suspense").classList.remove("oculto");
  $("#expulsadoRol").classList.add("oculto");
  $("#zonaAdivinar").classList.add("oculto");
  $("#palabraAdivinar").classList.add("oculto");
  $("#btnVerPalabraAdivinar").classList.remove("oculto");
  $("#btnTrasExpulsion").classList.add("oculto");
  irA("pExpulsion");
  pitido(330, 0.3, 0.1);

  setTimeout(() => revelarExpulsado(idx), 1800);
}

function revelarExpulsado(idx) {
  const r = ronda;
  const rol = $("#expulsadoRol");
  const esImpostor = r.impostores.has(idx);
  $("#suspense").classList.add("oculto");
  rol.classList.remove("oculto", "es-impostor", "es-inocente");

  // Rondas trampa: se acaba en cuanto echáis a alguien
  if (r.trampa === "ninguno") {
    rol.classList.add("es-inocente");
    rol.innerHTML = `ERA INOCENTE 😇<small>…y es que no había ningún impostor 🤡</small>`;
    siguientePaso("Ver resultado", () => terminar("trampaFallada"));
    return;
  }
  if (r.trampa === "todos") {
    rol.classList.add("es-impostor");
    rol.innerHTML = `ERA IMPOSTOR 🔪<small>…como todos los demás 😂</small>`;
    siguientePaso("Ver resultado", () => terminar("todos"));
    return;
  }

  if (esImpostor) {
    rol.classList.add("es-impostor");
    if (r.modo === "undercover") rol.innerHTML = `ERA EL IMPOSTOR 🎭<small>Su palabra era "${esc(r.gemela)}"</small>`;
    else if (r.modo === "preguntas") rol.innerHTML = `ERA EL IMPOSTOR 🔪<small>Su pregunta era: "${esc(r.gemela)}"</small>`;
    else rol.innerHTML = "ERA IMPOSTOR 🔪";
    melodia([[523], [659], [784], [1046]]);
    vibrar([80, 50, 80, 50, 200]);
  } else {
    rol.classList.add("es-inocente");
    rol.innerHTML = "ERA INOCENTE 😇";
    melodia([[392], [330], [262]]);
    vibrar(250);
  }

  const impostoresVivos = [...r.impostores].filter((i) => r.vivos.has(i)).length;
  const inocentesVivos = r.vivos.size - impostoresVivos;

  if (esImpostor) {
    if (impostoresVivos > 0) {
      rol.innerHTML += `<small>¡Pero queda${impostoresVivos > 1 ? "n" : ""} ${impostoresVivos} impostor${impostoresVivos > 1 ? "es" : ""}!</small>`;
      if (impostoresVivos >= inocentesVivos) {
        siguientePaso("Ver resultado", () => terminar("impostor"));
      } else {
        siguientePaso("Seguir jugando", () => { r.numDebate++; empezarDebate(); });
      }
    } else if (datos.ajustes.adivinar && (r.modo === "clasico" || r.modo === "admin")) {
      $("#adivinaNombre").textContent = r.jugadores[idx];
      $("#zonaAdivinar").classList.remove("oculto");
    } else {
      siguientePaso("Ver resultado", () => terminar("inocentes"));
    }
    return;
  }

  // Han echado a un inocente
  if (impostoresVivos >= inocentesVivos) {
    rol.innerHTML += "<small>Los impostores ya son tantos como vosotros…</small>";
    siguientePaso("Ver resultado", () => terminar("impostor"));
  } else if (!datos.ajustes.eliminacion) {
    siguientePaso("Ver resultado", () => terminar("impostor"));
  } else {
    rol.innerHTML += "<small>El impostor sigue suelto 👀</small>";
    siguientePaso("Seguir jugando", () => { r.numDebate++; empezarDebate(); });
  }
}

function siguientePaso(texto, accion) {
  const b = $("#btnTrasExpulsion");
  b.textContent = texto;
  b.classList.remove("oculto");
  trasExpulsion = accion;
}

$("#btnTrasExpulsion").addEventListener("click", () => trasExpulsion && trasExpulsion());

$("#btnVerPalabraAdivinar").addEventListener("click", () => {
  $("#palabraAdivinar").textContent = ronda.palabra;
  $("#palabraAdivinar").classList.remove("oculto");
  $("#btnVerPalabraAdivinar").classList.add("oculto");
});
$("#btnAdivino").addEventListener("click", () => terminar("impostor", { robo: true }));
$("#btnNoAdivino").addEventListener("click", () => terminar("inocentes"));

/* =========================================================
   FINAL DE RONDA
   ========================================================= */
function terminar(resultado, extra = {}) {
  pararCrono();
  const r = ronda;
  const nombresImpostores = [...r.impostores].map((i) => r.jugadores[i]);
  const delta = {};
  const sumar = (nombre, n) => { delta[nombre] = (delta[nombre] || 0) + n; };

  let emoji = "🎉", titulo = "", subtitulo = "", clase = "";

  switch (resultado) {
    case "inocentes":
      emoji = "🎉"; clase = "gana-inocentes";
      titulo = "¡Ganan los inocentes!";
      subtitulo = nombresImpostores.length > 1 ? "Habéis pillado a todos los impostores." : "Habéis pillado al impostor.";
      r.jugadores.forEach((n, i) => { if (!r.impostores.has(i)) sumar(n, 1); });
      r.acertantes.forEach((i) => sumar(r.jugadores[i], 1));
      break;
    case "impostor":
      emoji = "🔪"; clase = "gana-impostor";
      titulo = nombresImpostores.length > 1 ? "¡Ganan los impostores!" : "¡Gana el impostor!";
      if (extra.robo) subtitulo = "Lo pillasteis… ¡pero adivinó la palabra y os robó la victoria!";
      else if (extra.porNoHay) subtitulo = "Dijisteis que no había impostor… y sí que lo había.";
      else subtitulo = "Se os ha colado bien.";
      nombresImpostores.forEach((n) => sumar(n, 3));
      break;
    case "trampaAcertada":
      emoji = "🧠"; clase = "gana-inocentes";
      titulo = "¡Bien visto!";
      subtitulo = "No había ningún impostor. Todos sumáis 1 punto.";
      r.jugadores.forEach((n) => sumar(n, 1));
      break;
    case "trampaFallada":
      emoji = "🤡"; clase = "gana-impostor";
      titulo = "¡No había impostor!";
      subtitulo = "Os habéis estado acusando entre inocentes. Nadie suma.";
      break;
    case "todos":
      emoji = "😂"; clase = "gana-impostor";
      titulo = "¡Erais TODOS impostores!";
      subtitulo = "Nadie tenía la palabra. Nadie suma.";
      break;
    default:
      emoji = "👀";
      titulo = "Ronda revelada";
      subtitulo = "Nadie suma puntos.";
  }

  Object.entries(delta).forEach(([nombre, n]) => { datos.puntos[nombre] = (datos.puntos[nombre] || 0) + n; });

  datos.historial.unshift({
    fecha: Date.now(),
    modo: r.modo,
    palabra: r.palabra,
    gemela: r.gemela,
    categoria: r.categoria,
    impostores: nombresImpostores,
    resultado: titulo
  });
  datos.historial = datos.historial.slice(0, 50);
  guardar();

  // Pintar pantalla final
  $("#panelFinal").className = `panel centrado final ${clase}`;
  $("#finalEmoji").textContent = emoji;
  $("#finalTitulo").textContent = titulo;
  $("#finalSubtitulo").textContent = subtitulo;

  const esPregunta = r.modo === "preguntas";
  $("#finalEtiquetaPalabra").textContent = esPregunta ? "La pregunta era" : `La palabra era${r.categoria && r.modo !== "admin" ? ` (${r.categoria})` : ""}`;
  $("#finalPalabra").textContent = r.palabra;
  const mostrarGemela = (r.modo === "undercover" || esPregunta) && r.trampa !== "ninguno";
  $("#finalGemelaCaja").classList.toggle("oculto", !mostrarGemela);
  $("#finalEtiquetaGemela").textContent = esPregunta ? "La pregunta del impostor era" : "El impostor tenía";
  $("#finalGemela").textContent = r.gemela;
  $("#finalImpostores").textContent = r.trampa === "ninguno" ? "Nadie 🤡" : r.trampa === "todos" ? "Todos 😂" : listaNombres(nombresImpostores);
  const conRespuestas = esPregunta && Object.keys(r.respuestas).length > 0;
  $("#finalRespuestasCaja").classList.toggle("oculto", !conRespuestas);
  if (conRespuestas) {
    const vivosAntes = r.vivos;
    r.vivos = new Set(r.jugadores.map((_, i) => i)); // en el final no tachamos a nadie
    $("#finalRespuestas").innerHTML = htmlRespuestas(true);
    r.vivos = vivosAntes;
  }

  pintarMarcador($("#finalMarcador"), delta);
  irA("pFinal");

  if (clase === "gana-inocentes") { confeti(); melodia([[523], [659], [784], [1046, 450]]); }
  else if (clase === "gana-impostor") melodia([[392], [370], [349], [330, 500]]);
}

function pintarMarcador(cont, delta = {}) {
  const nombres = new Set([...datos.jugadores, ...Object.keys(datos.puntos)]);
  const filas = [...nombres]
    .map((n) => ({ n, p: datos.puntos[n] || 0 }))
    .filter((f) => datos.jugadores.includes(f.n) || f.p > 0)
    .sort((a, b) => b.p - a.p || a.n.localeCompare(b.n));
  if (!filas.length) {
    cont.innerHTML = `<p class="nota">Todavía no hay puntos.</p>`;
    return;
  }
  const medallas = ["🥇", "🥈", "🥉"];
  cont.innerHTML = filas.map((f, i) => `
    <div class="marcador-fila">
      <span class="pos">${f.p > 0 && medallas[i] ? medallas[i] : i + 1}</span>
      <span class="nom">${esc(f.n)}</span>
      <span class="pts">${f.p}${delta[f.n] ? `<span class="suma">+${delta[f.n]}</span>` : ""}</span>
    </div>`).join("");
}

function confeti() {
  const colores = ["#22c1c3", "#6ee7b7", "#fbbf24", "#fb7185", "#a78bfa", "#ffffff"];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("div");
    c.className = "confeti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = azar(colores);
    c.style.animationDuration = 1.8 + Math.random() * 2 + "s";
    c.style.animationDelay = Math.random() * 0.5 + "s";
    c.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

$("#btnOtraRonda").addEventListener("click", () => {
  if (datos.modo === "admin") abrirAdmin();
  else crearRonda();
});
$("#btnVolverMenu").addEventListener("click", () => {
  ronda = null;
  irA("pInicio");
  pintarInicio();
});

/* =========================================================
   MODALES
   ========================================================= */
function abrirModal(id) {
  if (id === "modalAjustes") pintarAjustes();
  if (id === "modalMarcador") pintarMarcador($("#marcadorModal"));
  if (id === "modalHistorial") pintarHistorial();
  if (id === "modalMisPalabras") pintarMisCategorias();
  $("#" + id).classList.remove("oculto");
}

function cerrarModal(modal) {
  modal.classList.add("oculto");
  if (modal.id === "modalAjustes") { guardar(); pintarResumen(); }
  if (modal.id === "modalOlvide") $("#cartaOlvide").classList.remove("girada");
}

$$("[data-abrir]").forEach((b) => b.addEventListener("click", () => abrirModal(b.dataset.abrir)));
$$("[data-cerrar]").forEach((b) => b.addEventListener("click", () => cerrarModal(b.closest(".modal"))));
$$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) cerrarModal(m); }));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $$(".modal:not(.oculto)").forEach(cerrarModal);
});

/* ---------------- Ajustes ---------------- */
const CASILLAS = {
  ajEliminacion: "eliminacion", ajAdivinar: "adivinar", ajNoEmpieza: "noEmpieza", ajSeConocen: "seConocen",
  ajVotoSecreto: "votoSecreto", ajTrampa: "trampa", ajTiempo: "tiempo", ajNoRepetir: "noRepetir",
  ajSonido: "sonido", ajVibracion: "vibracion", ajPicante: "picante", ajPregJugadores: "preguntasJugadores"
};

function pintarAjustes() {
  const a = datos.ajustes;
  $$("#ajFormaPistas button").forEach((b) => b.classList.toggle("sel", b.dataset.valor === (a.escritas ? "escritas" : "habladas")));
  $("#cajaVueltas").classList.toggle("oculto", !a.escritas);
  $("#notaEscritas").classList.toggle("oculto", !a.escritas);
  $("#valorVueltas").textContent = a.vueltasEscritas;
  $$("#presetsLocal [data-preset]").forEach((b) => {
    const p = PRESETS_LOCAL[b.dataset.preset];
    b.classList.toggle("sel", Object.entries(p).every(([k, v]) => a[k] === v));
  });
  Object.entries(CASILLAS).forEach(([id, clave]) => { $("#" + id).checked = a[clave]; });
  $$("#ajPista button").forEach((b) => b.classList.toggle("sel", b.dataset.valor === a.pista));
  $("#ajProbTrampa").value = a.probTrampa;
  $("#valorProbTrampa").textContent = a.probTrampa + "%";
  $("#ajMinutos").value = a.minutos;
  $("#valorMinutos").textContent = (a.minutos % 1 ? a.minutos.toString().replace(".", ",") : a.minutos) + " min";
  $("#cajaProbTrampa").classList.toggle("oculto", !a.trampa);
  $("#cajaMinutos").classList.toggle("oculto", !a.tiempo);
}

/** Partidas ya preparadas para el modo de un solo iPad. */
const PRESETS_LOCAL = {
  rapida: { escritas: false, tiempo: true, minutos: 1.5, eliminacion: false, trampa: false },
  escrita: { escritas: true, vueltasEscritas: 2, tiempo: true, minutos: 2 },
  clasica: { escritas: false, pista: "categoria", eliminacion: true, adivinar: true, tiempo: false, trampa: false },
  caos: { trampa: true, probTrampa: 20, pista: "nada", eliminacion: true }
};
$$("#presetsLocal [data-preset]").forEach((b) => b.addEventListener("click", () => {
  Object.assign(datos.ajustes, PRESETS_LOCAL[b.dataset.preset]);
  pintarAjustes();
  aviso(`${b.querySelector("span").textContent} Partida ${b.querySelector("b").textContent.toLowerCase()} lista`);
}));
$$("#ajFormaPistas button").forEach((b) => b.addEventListener("click", () => {
  datos.ajustes.escritas = b.dataset.valor === "escritas";
  pintarAjustes();
}));
$$("[data-vueltas]").forEach((b) => b.addEventListener("click", () => {
  datos.ajustes.vueltasEscritas = Math.min(3, Math.max(1, datos.ajustes.vueltasEscritas + Number(b.dataset.vueltas)));
  const v = $("#valorVueltas");
  v.classList.remove("salta"); void v.offsetWidth; v.classList.add("salta");
  pintarAjustes();
}));

Object.entries(CASILLAS).forEach(([id, clave]) => {
  $("#" + id).addEventListener("change", (e) => {
    datos.ajustes[clave] = e.target.checked;
    pintarAjustes();
  });
});
$$("#ajPista button").forEach((b) => b.addEventListener("click", () => {
  datos.ajustes.pista = b.dataset.valor;
  pintarAjustes();
}));
$("#ajProbTrampa").addEventListener("input", (e) => {
  datos.ajustes.probTrampa = Number(e.target.value);
  pintarAjustes();
});
$("#ajMinutos").addEventListener("input", (e) => {
  datos.ajustes.minutos = Number(e.target.value);
  pintarAjustes();
});
$("#btnReiniciarUsadas").addEventListener("click", () => {
  datos.usadas = [];
  guardar();
  aviso("Listo: todas las palabras pueden volver a salir");
});

/* ---------------- Marcador e historial ---------------- */
$("#btnReiniciarPuntos").addEventListener("click", () => {
  if (!confirm("¿Poner todos los puntos a 0?")) return;
  datos.puntos = {};
  guardar();
  pintarMarcador($("#marcadorModal"));
  pintarJugadores();
});

const NOMBRES_MODO = { clasico: "🕵️ Clásico", undercover: "🎭 Despistado", preguntas: "💬 Preguntas", admin: "👑 Admin" };

function pintarHistorial() {
  const cont = $("#listaHistorial");
  if (!datos.historial.length) {
    cont.innerHTML = `<p class="nota">Todavía no habéis jugado ninguna ronda.</p>`;
    return;
  }
  cont.innerHTML = datos.historial.map((h) => {
    const fecha = new Date(h.fecha).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `<div class="historial-item">
      <div class="fila"><b>${esc(h.palabra)}</b><small>${esc(fecha)}</small></div>
      <small>${esc(NOMBRES_MODO[h.modo] || h.modo)} · ${esc(h.categoria || "")} · Impostor: ${esc(h.impostores.length ? listaNombres(h.impostores) : "nadie")}</small>
      <small>${esc(h.resultado)}</small>
    </div>`;
  }).join("");
}

$("#btnBorrarHistorial").addEventListener("click", () => {
  if (!confirm("¿Borrar el historial?")) return;
  datos.historial = [];
  guardar();
  pintarHistorial();
});

/* ---------------- Mis categorías ---------------- */
function pintarMisCategorias() {
  const cont = $("#listaMisCategorias");
  const nombres = Object.keys(datos.propias);
  if (!nombres.length) {
    cont.innerHTML = `<p class="nota">Aún no has creado ninguna.</p>`;
    return;
  }
  cont.innerHTML = "";
  nombres.forEach((nombre) => {
    const item = document.createElement("div");
    item.className = "historial-item";
    item.innerHTML = `<div class="fila"><b>✏️ ${esc(nombre)}</b>
        <span><button class="texto-btn" data-accion="editar">Editar</button>
        <button class="texto-btn peligro" data-accion="borrar">Borrar</button></span></div>
      <small>${datos.propias[nombre].length} palabras</small>`;
    item.querySelector('[data-accion="editar"]').addEventListener("click", () => {
      $("#miCategoriaNombre").value = nombre;
      $("#miCategoriaPalabras").value = datos.propias[nombre].join("\n");
      $("#miCategoriaNombre").focus();
    });
    item.querySelector('[data-accion="borrar"]').addEventListener("click", () => {
      if (!confirm(`¿Borrar la categoría "${nombre}"?`)) return;
      delete datos.propias[nombre];
      guardar();
      pintarMisCategorias();
      pintarCategorias();
    });
    cont.appendChild(item);
  });
}

$("#btnGuardarCategoria").addEventListener("click", () => {
  const nombre = $("#miCategoriaNombre").value.trim();
  const palabras = $("#miCategoriaPalabras").value
    .split("\n")
    .map((l) => l.replace(/\s*\/\s*/, " / ").trim())
    .filter(Boolean);
  if (!nombre) { aviso("Ponle nombre a la categoría"); return; }
  if (CATEGORIAS[nombre]) { aviso("Ya existe una categoría con ese nombre"); return; }
  if (palabras.length < 2) { aviso("Pon al menos 2 palabras"); return; }
  datos.propias[nombre] = palabras;
  if (!datos.categorias.includes(nombre)) datos.categorias.push(nombre);
  guardar();
  $("#miCategoriaNombre").value = "";
  $("#miCategoriaPalabras").value = "";
  pintarMisCategorias();
  pintarCategorias();
  aviso(`✅ "${nombre}" guardada y seleccionada`);
});

/* =========================================================
   ARRANQUE
   ========================================================= */
pintarInicio();

// El modo online vive en Render: desde GitHub Pages el botón lleva directo allí
const SERVIDOR_ONLINE = "https://impostor-sd7s.onrender.com";
if (!location.href.startsWith(SERVIDOR_ONLINE)) {
  $(".boton-enlace").href = SERVIDOR_ONLINE + "/online.html";
}

// Si ya tienes perfil del modo online en este móvil, el botón lo dice
try {
  const perfilOnline = JSON.parse(localStorage.getItem("impostor.perfil"));
  if (perfilOnline && perfilOnline.nombre) {
    const foto = perfilOnline.foto && /^data:image\/jpeg;base64,/.test(perfilOnline.foto)
      ? `<img class="mini-foto" src="${perfilOnline.foto}" alt="" />` : "🌐";
    $(".boton-enlace").innerHTML = `${foto} Jugar online como <b>${esc(perfilOnline.nombre)}</b>`;
  }
} catch (e) { /* sin perfil */ }
