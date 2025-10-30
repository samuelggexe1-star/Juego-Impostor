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
let impostorIndices = [];
let currentJugador = 0;
let jugadores = [];
let numImpostores = 1;

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
  });
  contenedor.appendChild(btn);
});

function nuevaRonda() {
  const input = document.getElementById("listaJugadores").value;
  jugadores = input.split(",").map(j => j.trim()).filter(j => j.length > 0);

  if (jugadores.length === 0) {
    alert("Escribe al menos un jugador.");
    return;
  }

  let lista = [];
  if (seleccionadas.size > 0) {
    seleccionadas.forEach(cat => lista = lista.concat(categorias[cat]));
  } else {
    alert("Selecciona al menos una categoría.");
    return;
  }

  palabraBase = lista[Math.floor(Math.random() * lista.length)];

  const indices = jugadores.map((_, i) => i).sort(() => Math.random() - 0.5);
  impostorIndices = indices.slice(0, Math.min(numImpostores, jugadores.length));

  currentJugador = 0;
  document.getElementById("output").innerHTML = "Pasa el dispositivo a <b>" + jugadores[currentJugador] + "</b>";
  document.getElementById("accion").innerHTML = `<button class="btn" onclick="verRol()">Ver rol</button>`;
  renderPlayersList();
}

function seleccionarImpostores(cantidad) {
  numImpostores = cantidad;
}

function verRol() {
  const out = document.getElementById("output");
  if (impostorIndices.includes(currentJugador)) {
    out.innerHTML = `${jugadores[currentJugador]}, tu rol es: <b>IMPOSTOR</b>`;
  } else {
    out.innerHTML = `${jugadores[currentJugador]}, tu palabra es: <b>${palabraBase}</b>`;
  }

  document.getElementById("accion").innerHTML = `<button class="btn" onclick="siguienteJugador()">Siguiente jugador</button>`;
}

function siguienteJugador() {
  currentJugador++;
  if (currentJugador >= jugadores.length) {
    document.getElementById("output").innerHTML = "Todos vieron su rol. ¡A jugar!";
    document.getElementById("accion").innerHTML = `<button class="btn" onclick="nuevaRonda()">Nueva ronda</button>`;
  } else {
    document.getElementById("output").innerHTML = "Pasa el dispositivo a <b>" + jugadores[currentJugador] + "</b>";
    document.getElementById("accion").innerHTML = `<button class="btn" onclick="verRol()">Ver rol</button>`;
  }
}

function renderPlayersList() {
  const container = document.getElementById("players");
  container.innerHTML = "";
  jugadores.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player-item";
    div.innerHTML = `
      <div>${p}</div>
      <div class="player-actions">
        <button onclick="alert('Rol: ${impostorIndices.includes(i) ? 'IMPOSTOR' : 'INOCENTE'}${impostorIndices.includes(i) ? '' : '\\nPalabra: ' + palabraBase}')">Ver</button>
      </div>`;
    container.appendChild(div);
  });
}