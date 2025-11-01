const categorias = {
 "Full combo": [],

  "Personas": [
    "Samuel", "Adriel", "Álvaro", "Pedro", "Mateo", "Alejandro", 
    "Diego", "Fran", "David", "Daniel", "Ryan"
  ],

  "Animales": [
    "Chiska", "Frida", "Dori", "Bimba", "Perro", "Gato", "Conejo", "Tiburón", "Tortuga", "Caballo",
    "León", "Loro", "Panda", "Erizo", "Camaleón", "Delfín", "Pulpo", "Murciélago", "Zorro", "Rana",
    "Pingüino", "Gaviota", "Cangrejo", "Ciervo", "Gallina", "Cerdo", "Ratón", "Cabra", "Serpiente", "Elefante"
  ],

  "Cartas del Clash Royale": [
    "Montapuercos", "P.E.K.K.A", "Mago", "Megaesbirro", "Barril de duendes", "Minero", "Gigante noble",
    "Globo bombástico", "Chispitas", "Bruja", "Caballero", "Esqueleto gigante", "Tronco", "Leñador",
    "Dragón infernal", "Mago eléctrico", "Reina arquera", "Mini P.E.K.K.A", "Arquero mágico", "Duende lanzadardos",
    "Veneno", "Cementerio", "Príncipe", "Valquiria", "Bola de fuego", "Hielo", "Pillos", "Horda de esbirros",
    "Príncipe oscuro", "Cazador", "Torre infernal", "Duendes con lanza", "Ejército de esqueletos", "Gigante eléctrico",
    "Barril de bárbaros", "Chispa", "Furia", "Mago de hielo", "Mago", "Reina arquera", "Sabueso de lava"
  ],

  "Comida": [
    "Tortilla de patatas", "Paella", "Croquetas", "Jamón serrano", "Gazpacho", "Churros", "Empanada", 
    "Pulpo a la gallega", "Queso", "Bocadillo", "Pizza", "Hamburguesa", "Tacos", "Hot dog", "Canelones", 
    "Arepa", "Patatas bravas", "Calamares", "Pan con tomate", "Tarta de queso", "Papas arrugadas", 
    "Gofio", "Cachopo", "Lasaña", "Ensaladilla rusa", "Kebab", "Rosquilla", "Helado", "Tarta de chocolate", "Turrón"
  ],

  "Juegos": [
    "NBA 2K", "Juego del impostor", "Minecraft", "Fortnite", "Among Us", "GTA V", "Clash Royale",
    "Call of Duty", "Valorant", "Roblox", "FIFA", "Brawl Stars", "Apex Legends", "Fall Guys",
    "Stumble Guys", "Subway Surfers", "Geometry Dash", "Rocket League", "PUBG", "The Sims",
    "Candy Crush", "Plantas vs Zombies", "Mario Kart", "Zelda", "Super Smash Bros", "Terraria",
    "Five Nights at Freddy’s", "Spore", "League of Legends", "Counter Strike", "Overwatch", "Ark", "Genshin Impact"
  ],

  "Marcas de coche": [
    "BMW", "Audi", "Mercedes", "Seat", "Volkswagen", "Ford", "Renault", "Toyota", "Honda", "Nissan",
    "Peugeot", "Citroën", "Kia", "Hyundai", "Lamborghini", "Ferrari", "Porsche", "Opel", "Volvo", "Tesla",
    "Fiat", "Suzuki", "Maserati", "Jaguar", "Alfa Romeo", "Chevrolet", "Mini", "Bentley", "Bugatti", "Dacia",
    "Lexus", "Subaru", "Jeep", "Cadillac", "Smart", "Land Rover", "Mazda", "Abarth", "Cupra", "Skoda"
  ],

  "Lugares Locales": [
    "El Médano", "PH", "Aldea Blanca", "Los Cristianos", "Las Américas", "Adeje", "San Isidro", "Los Abrigos", "Costa del Silencio",
    "Granadilla", "La Tejita", "La Caleta", "Vilaflor", "Fañabé", "Golf del Sur", "Palm-Mar", "Guaza",
    "Arona", "Charco del Cliso", "Tajao", "Abades", "Las Galletas", "Parque La Reina", "Buzanada",
    "La Mareta", "Chayofa", "Cabo Blanco", "Valle San Lorenzo", "El Fraile", "Chío", "Santiago del Teide", "Callao Salvaje"
  ],

  "Lugares": [
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Tenerife", "Lanzarote", "Granada", "Bilbao", "Toledo", "Málaga",
    "Londres", "París", "Roma", "Berlín", "Nueva York", "Tokio", "Lisboa", "Ámsterdam", "Atenas", "Praga",
    "Viena", "Dublín", "Varsovia", "Budapest", "Oslo", "Copenhague", "Bruselas", "Zúrich", "Moscú", "Estocolmo",
    "Buenos Aires", "Santiago de Chile", "México DF", "Lima", "Bogotá", "Quito", "Caracas", "Río de Janeiro", "Toronto", "Los Ángeles"
  ],

  "Objetos": [
    "Móvil", "Bolígrafo", "Mochila", "Reloj", "Silla", "Mesa", "Cargador", "Camiseta", "Altavoz", "Botella",
    "Gafas", "Cepillo", "Cojín", "Cuchara", "Taza", "Auriculares", "Ratón", "Teclado", "Zapato", "Libro",
    "Ventilador", "Cartera", "Llave", "Mando", "Pelota", "Lámpara", "Rueda", "Teléfono", "Cuchillo", "Bolsa",
    "Cuerda", "Cable", "Papel", "Espejo", "Pizarra", "Sábana", "Calcetín", "Tijeras", "Reloj de arena", "Linterna"
  ]
};
categorias["Full combo"] = Object.values(categorias).flat();

let palabraBase = "";
let palabraCategoria = ""; // mantenemos categoría para pista
let impostorIndices = [];
let currentJugador = 0;
let jugadores = [];
let numImpostores = 1;

// Configuración (por defecto desactivadas)
const config = {
  rondasEspeciales: false,
  pista: false,
  partidaPorTiempo: false
};

// Probabilidades para rondas especiales (ajustables):
const PROB_TODOS_IMPOSTORES = 0.05;
const PROB_TODOS_INOCENTES = 0.05;

// Cronómetro
let tiempoRestante = 180;
let intervaloCrono = null;

// 🔹 NUEVO: selección múltiple con botones
const contenedor = document.getElementById("categorias-container");
const seleccionadas = new Set();

Object.keys(categorias).forEach(nombre => {
  if (nombre === "Full combo") return;
  const btn = document.createElement("div");
  btn.className = "categoria-btn";
  btn.textContent = nombre;
  btn.addEventListener("click", () => {
    if (seleccionadas.has(nombre)) {
      seleccionadas.delete(nombre);
      btn.classList.remove("selected");
    } else {
      seleccionadas.add(nombre);
      btn.classList.add("selected");
    }
    // Actualizar texto del botón de toggle cuando el usuario cambia selección manualmente
    actualizarEstadoToggle();
  });
  contenedor.appendChild(btn);
});

// --- elementos configuración y cronómetro ---
const btnToggleCategorias = document.getElementById("btnToggleCategorias");
const btnConfiguracion = document.getElementById("btnConfiguracion");
const configPanel = document.getElementById("configPanel");
const cerrarConfigBtn = document.getElementById("cerrarConfig");
const cfgRondasEspeciales = document.getElementById("cfgRondasEspeciales");
const cfgPista = document.getElementById("cfgPista");
const cfgPartidaTiempo = document.getElementById("cfgPartidaTiempo");

const cronometroPanel = document.getElementById("cronometroPanel");
const cronometroDisplay = document.getElementById("cronometro");
const iniciarCronometroBtn = document.getElementById("iniciarCronometroBtn");
const reiniciarCronometroBtn = document.getElementById("reiniciarCronometroBtn");
const nuevaRondaTiempoBtn = document.getElementById("nuevaRondaTiempoBtn");

// Función para actualizar el texto del botón toggle según el estado actual
function actualizarEstadoToggle(){
  const botones = Array.from(document.querySelectorAll('.categoria-btn'));
  if (botones.length === 0) {
    btnToggleCategorias.textContent = 'Seleccionar todas';
    return;
  }
  const todosSeleccionados = botones.every(b => b.classList.contains('selected'));
  btnToggleCategorias.textContent = todosSeleccionados ? 'Deseleccionar todas' : 'Seleccionar todas';
}

// Lógica del botón seleccionar/deseleccionar todas
btnToggleCategorias.addEventListener('click', () => {
  const botones = Array.from(document.querySelectorAll('.categoria-btn'));
  if (botones.length === 0) return;
  const todosSeleccionados = botones.every(b => b.classList.contains('selected'));

  if (todosSeleccionados) {
    // deselect all
    botones.forEach(b => {
      b.classList.remove('selected');
      seleccionadas.delete(b.textContent);
    });
    btnToggleCategorias.textContent = 'Seleccionar todas';
  } else {
    // select all
    botones.forEach(b => {
      b.classList.add('selected');
      seleccionadas.add(b.textContent);
    });
    btnToggleCategorias.textContent = 'Deseleccionar todas';
  }
});

// Vincular apertura/cierre configuración
btnConfiguracion.addEventListener("click", () => {
  // marcar casillas según estado actual
  document.getElementById("cfgRondasEspeciales").checked = config.rondasEspeciales;
  document.getElementById("cfgPista").checked = config.pista;
  document.getElementById("cfgPartidaTiempo").checked = config.partidaPorTiempo;
  configPanel.classList.remove("hidden");
  configPanel.setAttribute("aria-hidden", "false");
});
cerrarConfigBtn.addEventListener("click", () => {
  // guardar opciones
  config.rondasEspeciales = document.getElementById("cfgRondasEspeciales").checked;
  config.pista = document.getElementById("cfgPista").checked;
  config.partidaPorTiempo = document.getElementById("cfgPartidaTiempo").checked;
  configPanel.classList.add("hidden");
  configPanel.setAttribute("aria-hidden", "true");
});

// cronómetro botones
iniciarCronometroBtn.addEventListener("click", iniciarCronometro);
reiniciarCronometroBtn.addEventListener("click", iniciarCronometro);
nuevaRondaTiempoBtn.addEventListener("click", () => {
  cronometroPanel.classList.add("hidden");
  cronometroPanel.setAttribute("aria-hidden", "true");
  nuevaRonda();
});

// función para iniciar / reiniciar cronómetro
function iniciarCronometro() {
  tiempoRestante = 180; // 3 minutos
  actualizarCronometroUI();

  // mostrar/ocultar botones
  iniciarCronometroBtn.classList.add("hidden");
  reiniciarCronometroBtn.classList.remove("hidden");
  nuevaRondaTiempoBtn.classList.add("hidden");

  if (intervaloCrono) clearInterval(intervaloCrono);
  intervaloCrono = setInterval(() => {
    tiempoRestante--;
    actualizarCronometroUI();
    if (tiempoRestante <= 0) {
      clearInterval(intervaloCrono);
      // al finalizar, mostrar opciones: reiniciar cronómetro o nueva ronda
      reiniciarCronometroBtn.classList.remove("hidden");
      nuevaRondaTiempoBtn.classList.remove("hidden");
      iniciarCronometroBtn.classList.add("hidden");
    }
  }, 1000);
}

function actualizarCronometroUI() {
  const m = Math.floor(tiempoRestante / 60);
  const s = tiempoRestante % 60;
  if (cronometroDisplay) cronometroDisplay.innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// función para seleccionar número de impostores
function seleccionarImpostores(cantidad) {
  numImpostores = cantidad;
}

// función principal: nuevaRonda
function nuevaRonda() {
  const input = document.getElementById("listaJugadores").value;
  jugadores = input.split(",").map(j => j.trim()).filter(j => j.length > 0);

  if (jugadores.length === 0) {
    alert("Escribe al menos un jugador.");
    return;
  }

  let lista = [];
  // Construimos una lista de pares {cat, palabra} para poder dar la pista de categoría
  let listaPares = [];
  if (seleccionadas.size > 0) {
    seleccionadas.forEach(cat => {
      const arr = categorias[cat] || [];
      arr.forEach(p => listaPares.push({cat, palabra: p}));
      lista = lista.concat(arr);
    });
  } else {
    alert("Selecciona al menos una categoría.");
    return;
  }

  // ---- RONDAS ESPECIALES: posibilidad de todos impostores o todos inocentes
  let todosImpostores = false;
  let todosInocentes = false;
  if (config.rondasEspeciales) {
    const r = Math.random();
    if (r < PROB_TODOS_IMPOSTORES) {
      todosImpostores = true;
    } else if (r < PROB_TODOS_IMPOSTORES + PROB_TODOS_INOCENTES) {
      todosInocentes = true;
    }
  }

  // Elegir palabra: seleccionamos un par para poder mostrar la categoría si hace falta
  const elegido = listaPares[Math.floor(Math.random() * listaPares.length)];
  palabraBase = elegido.palabra;
  palabraCategoria = elegido.cat;

  // Generar impostorIndices según casos
  if (todosImpostores) {
    impostorIndices = jugadores.map((_, i) => i); // todos
  } else if (todosInocentes) {
    impostorIndices = []; // ninguno
  } else {
    const indices = jugadores.map((_, i) => i).sort(() => Math.random() - 0.5);
    impostorIndices = indices.slice(0, Math.min(numImpostores, jugadores.length));
  }

  currentJugador = 0;
  document.getElementById("output").innerHTML = "Pasa el dispositivo a <b>" + jugadores[currentJugador] + "</b>";
  document.getElementById("accion").innerHTML = `<button class="btn" onclick="verRol()">Ver rol</button>`;
  renderPlayersList();
}

function verRol() {
  const out = document.getElementById("output");
  if (impostorIndices.includes(currentJugador)) {
    // Si pista activada, indicamos la categoría (sólo como hint, no la palabra)
    if (config.pista) {
      out.innerHTML = `${jugadores[currentJugador]}, tu rol es: <b>IMPOSTOR</b><br><small>Pista: categoría - <b>${palabraCategoria}</b></small>`;
    } else {
      out.innerHTML = `${jugadores[currentJugador]}, tu rol es: <b>IMPOSTOR</b>`;
    }
  } else {
    out.innerHTML = `${jugadores[currentJugador]}, tu palabra es: <b>${palabraBase}</b>`;
  }

  document.getElementById("accion").innerHTML = `<button class="btn" onclick="siguienteJugador()">Siguiente jugador</button>`;
}

// Modificación: al terminar de mostrar a todos, si partidaPorTiempo está activada mostramos botón para iniciar crono
function siguienteJugador() {
  currentJugador++;
  if (currentJugador >= jugadores.length) {
    // Todos han visto su rol
    if (config.partidaPorTiempo) {
      // Mostrar panel con opción de iniciar cronómetro
      document.getElementById("output").innerHTML = `Todos han visto su rol. Pulsa para iniciar la partida por tiempo.`;
      document.getElementById("accion").innerHTML = `<button class="btn" onclick="abrirCronometroPanel()">Iniciar cronómetro</button>`;
    } else {
      const jugadorAleatorio = jugadores[Math.floor(Math.random() * jugadores.length)];
      document.getElementById("output").innerHTML = `Todos han visto su rol, empieza <b>${jugadorAleatorio}</b>`;
      document.getElementById("accion").innerHTML = `<button class="btn" onclick="nuevaRonda()">Nueva ronda</button>`;
    }
  } else {
    document.getElementById("output").innerHTML = "Pasa el dispositivo a <b>" + jugadores[currentJugador] + "</b>";
    document.getElementById("accion").innerHTML = `<button class="btn" onclick="verRol()">Ver rol</button>`;
  }
}

// abrir panel cronómetro
function abrirCronometroPanel() {
  cronometroPanel.classList.remove("hidden");
  cronometroPanel.setAttribute("aria-hidden", "false");
  // inicializamos UI
  actualizarCronometroUI();
  iniciarCronometroBtn.classList.remove("hidden");
  reiniciarCronometroBtn.classList.add("hidden");
  nuevaRondaTiempoBtn.classList.add("hidden");
}

// renderizado lista de jugadores (igual a tu versión original)
function renderPlayersList() {
  const container = document.getElementById("players");
  container.innerHTML = "";
  jugadores.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player-item";
    div.innerHTML = `
      <div>${p}</div>
      <div class="player-actions">
        <button onclick="alert('Rol: ${impostorIndices.includes(i) ? 'IMPOSTOR' : 'INOCENTE'}${impostorIndices.includes(i) ? '' : '\\nPalabra: ' + palabraBase}${(config.pista && impostorIndices.includes(i)) ? '\\nPista: categoría - ' + palabraCategoria : ''}')">Ver</button>
      </div>`;
    container.appendChild(div);
  });
}

// Actualizar el texto del toggle al inicio (por si hay botones ya)
actualizarEstadoToggle();

