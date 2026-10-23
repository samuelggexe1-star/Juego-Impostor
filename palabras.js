/* =========================================================
   PALABRAS DEL JUEGO
   ---------------------------------------------------------
   Formato de cada palabra:  "Palabra / Gemela"
   - "Gemela" es una palabra parecida pero distinta.
     Se usa para:
       · la pista "palabra parecida" del impostor
       · el modo Despistado (el impostor recibe la gemela
         y NO sabe que es el impostor)
   - Si una palabra no tiene gemela, el juego coge otra
     palabra al azar de la misma categoría.
   Reglas para que el juego funcione bien:
   - Palabras sueltas o nombres de cosas, nunca frases.
   - Que las conozca todo el mundo (y las gemelas también).
   Para añadir palabras basta con meter otra línea.
   ========================================================= */

const CATEGORIAS = {
  "Personas": { icono: "🧑", palabras: [
    "Samuel", "Adriel", "Álvaro", "Pedro", "Mateo", "Alejandro", "Diego", "Fran", "David", "Daniel", "Ryan", "67"
  ]},

  "Animales": { icono: "🐶", palabras: [
    "Perro / Lobo", "Gato / Tigre", "Conejo / Hámster", "Tiburón / Delfín", "Tortuga / Caracol", "Caballo / Burro",
    "León / Tigre", "Loro / Periquito", "Panda / Koala", "Erizo / Topo", "Camaleón / Lagartija",
    "Delfín / Ballena", "Pulpo / Calamar", "Murciélago / Búho", "Zorro / Lobo", "Rana / Sapo",
    "Pingüino / Foca", "Gaviota / Paloma", "Cangrejo / Langosta", "Ciervo / Reno", "Cabra / Oveja",
    "Serpiente / Lagarto", "Elefante / Rinoceronte", "Oso / Gorila", "Jirafa / Camello", "Cocodrilo / Lagarto",
    "Mono / Gorila", "Hámster / Ratón", "Abeja / Avispa", "Mariposa / Mariquita", "Hormiga / Cucaracha",
    "Araña / Escorpión", "Águila / Halcón", "Vaca / Toro", "Cerdo / Jabalí", "Gallina / Pato", "Canguro / Koala",
    "Medusa / Pulpo", "Caracol / Babosa", "Hipopótamo / Rinoceronte", "Flamenco / Cigüeña", "Mosquito / Mosca",
    "Ballena / Orca", "Burro / Caballo", "Cucaracha / Hormiga", "Lagartija / Lagarto", "Ardilla / Ratón",
    "Pez / Delfín", "Gusano / Serpiente", "Búho / Murciélago", "Cebra / Caballo", "Pavo / Gallina"
  ]},

  "Comida": { icono: "🍕", palabras: [
    "Pizza / Hamburguesa", "Hamburguesa / Perrito", "Tortilla / Revuelto", "Paella / Arroz", "Croquetas / Empanadillas",
    "Jamón / Chorizo", "Churros / Porras", "Empanada / Empanadilla", "Tacos / Burrito", "Sushi / Ramen",
    "Kebab / Shawarma", "Lasaña / Macarrones", "Macarrones / Espaguetis", "Espaguetis / Fideos", "Burrito / Fajitas",
    "Perrito / Bocadillo", "Bocadillo / Sándwich", "Sándwich / Tostada", "Nuggets / Alitas", "Alitas / Costillas",
    "Lentejas / Garbanzos", "Ensalada / Verduras", "Nachos / Doritos", "Pan / Tostada", "Queso / Mantequilla",
    "Pollo / Pavo", "Filete / Chuleta", "Salchichas / Chorizo", "Cereales / Galletas", "Palomitas / Patatillas",
    "Huevo / Tortilla", "Arroz / Paella", "Sopa / Caldo", "Papas fritas / Papas arrugadas", "Gofio / Harina",
    "Puchero / Cocido", "Calamares / Pulpo", "Mejillones / Almejas", "Gambas / Langostinos", "Atún / Salmón",
    "Salmón / Atún", "Yogur / Natillas", "Crepe / Gofre", "Mortadela / Salchichón", "Albóndigas / Hamburguesa",
    "Pizza barbacoa / Pizza margarita", "Ketchup / Mayonesa", "Mayonesa / Mostaza", "Mojo / Ketchup"
  ]},

  "Frutas y verduras": { icono: "🍎", palabras: [
    "Manzana / Pera", "Pera / Manzana", "Plátano / Mango", "Naranja / Mandarina", "Mandarina / Naranja", "Limón / Lima",
    "Fresa / Frambuesa", "Sandía / Melón", "Melón / Sandía", "Uva / Cereza", "Cereza / Fresa", "Piña / Mango",
    "Mango / Papaya", "Papaya / Mango", "Kiwi / Higo", "Higo / Ciruela", "Coco / Piña", "Melocotón / Albaricoque",
    "Aguacate / Pepino", "Tomate / Pimiento", "Lechuga / Espinacas", "Zanahoria / Calabaza", "Patata / Batata",
    "Cebolla / Ajo", "Ajo / Cebolla", "Pepino / Calabacín", "Calabacín / Berenjena", "Berenjena / Calabacín",
    "Brócoli / Coliflor", "Coliflor / Brócoli", "Maíz / Guisantes", "Champiñón / Seta", "Calabaza / Zanahoria",
    "Pimiento / Tomate", "Espinacas / Acelgas", "Batata / Patata"
  ]},

  "Bebidas": { icono: "🥤", palabras: [
    "Coca-Cola / Pepsi", "Fanta / Trina", "Agua / Gaseosa", "Zumo / Batido", "Batido / Smoothie", "Café / Té", "Té / Café",
    "Monster / Red Bull", "Red Bull / Monster", "Aquarius / Powerade", "Leche / Yogur", "Colacao / Nesquik",
    "Limonada / Granizado", "Granizado / Limonada", "Nestea / Aquarius", "Sprite / Seven Up", "Horchata / Leche",
    "Chocolate / Colacao", "Gaseosa / Sprite", "Clipper / Fanta", "Barraquito / Cortado", "Cortado / Café"
  ]},

  "Postres y dulces": { icono: "🍰", palabras: [
    "Helado / Polo", "Polo / Helado", "Tarta / Bizcocho", "Flan / Natillas", "Natillas / Flan", "Donut / Berlina",
    "Brownie / Bizcocho", "Oreo / Galleta", "Gominolas / Chuches", "Piruleta / Chupachups", "Chocolate / Nutella",
    "Nutella / Chocolate", "Tiramisú / Tarta", "Magdalena / Muffin", "Cruasán / Napolitana", "Napolitana / Cruasán",
    "Gofre / Tortitas", "Tortitas / Gofre", "Kinder / Kit Kat", "Kit Kat / Twix", "Turrón / Polvorón",
    "Roscón / Panettone", "Cupcake / Magdalena", "Palmera / Donut", "Chicle / Caramelo", "Caramelo / Chicle",
    "Algodón de azúcar / Gominolas", "Bizcocho / Magdalena", "Galleta / Oreo"
  ]},

  "Videojuegos": { icono: "🎮", palabras: [
    "Minecraft / Roblox", "Fortnite / Warzone", "Among Us / Fall Guys", "GTA / Red Dead", "Clash Royale / Clash of Clans",
    "Call of Duty / Battlefield", "Valorant / Counter Strike", "Roblox / Minecraft", "FIFA / eFootball", "Brawl Stars / Clash Royale",
    "Fall Guys / Stumble Guys", "Rocket League / FIFA", "Free Fire / Fortnite", "Los Sims / Animal Crossing",
    "League of Legends / Valorant", "Counter Strike / Valorant", "Mario Kart / Mario Bros", "Zelda / Mario",
    "Pokémon / Digimon", "Mario Bros / Sonic", "Sonic / Mario Bros", "Tetris / Candy Crush", "Candy Crush / Tetris",
    "Subway Surfers / Temple Run", "Geometry Dash / Flappy Bird", "Pac-Man / Tetris", "Clash of Clans / Clash Royale",
    "Five Nights at Freddy's / Poppy Playtime", "Pou / Tamagotchi", "Ajedrez / Damas", "Just Dance / Wii Sports",
    "Smash Bros / Mario Kart", "Warzone / Fortnite", "NBA 2K / FIFA", "Stumble Guys / Fall Guys", "Genshin Impact / Zelda"
  ]},

  "Marcas de coche": { icono: "🚗", palabras: [
    "BMW / Audi", "Audi / Mercedes", "Mercedes / BMW", "Seat / Cupra", "Volkswagen / Seat", "Ford / Opel",
    "Renault / Peugeot", "Toyota / Honda", "Honda / Toyota", "Nissan / Toyota", "Peugeot / Citroën",
    "Citroën / Peugeot", "Kia / Hyundai", "Hyundai / Kia", "Lamborghini / Ferrari", "Ferrari / Lamborghini",
    "Porsche / Ferrari", "Tesla / BYD", "Fiat / Seat", "Mini / Smart", "Jeep / Land Rover", "Dacia / Renault",
    "Bugatti / Lamborghini", "Opel / Ford", "Cupra / Seat", "Suzuki / Toyota", "Volvo / Audi", "Skoda / Volkswagen"
  ]},

  "Marcas": { icono: "🏷️", palabras: [
    "Nike / Adidas", "Adidas / Puma", "Puma / Nike", "Zara / Pull&Bear", "Pull&Bear / Bershka", "Bershka / Zara",
    "Primark / Shein", "Shein / Temu", "Apple / Samsung", "Samsung / Xiaomi", "Xiaomi / Samsung", "Sony / Nintendo",
    "Nintendo / Sony", "McDonald's / Burger King", "Burger King / KFC", "KFC / McDonald's", "Telepizza / Domino's",
    "Domino's / Telepizza", "Starbucks / McDonald's", "Mercadona / Lidl", "Lidl / Aldi", "Hiperdino / Mercadona",
    "Amazon / AliExpress", "IKEA / Leroy Merlin", "Lego / Playmobil", "Vans / Converse", "Converse / Vans",
    "Decathlon / Sprinter", "Gucci / Louis Vuitton", "Louis Vuitton / Gucci", "JD Sports / Foot Locker", "Media Markt / Worten"
  ]},

  "Lugares Locales": { icono: "🏝️", palabras: [
    "El Médano / La Tejita", "La Tejita / El Médano", "Los Cristianos / Las Américas", "Las Américas / Los Cristianos",
    "Adeje / Fañabé", "San Isidro / Granadilla", "Los Abrigos / Golf del Sur", "Costa del Silencio / Las Galletas",
    "Granadilla / San Isidro", "La Caleta / Fañabé", "Fañabé / La Caleta", "Golf del Sur / Los Abrigos",
    "Palm-Mar / Guaza", "Guaza / Palm-Mar", "Arona / Adeje", "Las Galletas / Costa del Silencio",
    "Parque La Reina / Cabo Blanco", "Buzanada / Chayofa", "Chayofa / Buzanada", "Cabo Blanco / Parque La Reina",
    "PH / Miraverde", "Miraverde / PH", "Aldea Blanca / Los Cardones", "Los Cardones / Aldea Blanca",
    "Montaña Roja / Montaña Pelada", "Siam Park / Aqualand", "Aqualand / Siam Park", "Aeropuerto Sur / Aeropuerto Norte",
    "Siam Mall / Gran Sur", "Gran Sur / Siam Mall", "Loro Parque / Siam Park"
  ]},

  "Canarias": { icono: "🌋", palabras: [
    "Teide / Roque Nublo", "Tenerife / Gran Canaria", "Gran Canaria / Tenerife", "Lanzarote / Fuerteventura",
    "Fuerteventura / Lanzarote", "La Palma / La Gomera", "La Gomera / El Hierro", "El Hierro / La Gomera",
    "Santa Cruz / Las Palmas", "Las Palmas / Santa Cruz", "La Laguna / La Orotava", "Puerto de la Cruz / Los Cristianos",
    "Carnaval / Romería", "Romería / Carnaval", "Guagua / Tranvía", "Tranvía / Guagua", "Papas arrugadas / Mojo",
    "Mojo / Papas arrugadas", "Gofio / Millo", "Millo / Gofio", "Barraquito / Cortado", "Drago / Palmera",
    "Timple / Guitarra", "Lucha canaria / Lucha libre", "Guanche / Vikingo", "CD Tenerife / UD Las Palmas",
    "UD Las Palmas / CD Tenerife", "Lagartija / Perenquén", "Perenquén / Lagartija", "Calima / Niebla",
    "Masca / Los Gigantes", "Los Gigantes / Masca", "Volcán / Montaña", "Guachinche / Arepera", "Arepera / Guachinche",
    "Plátano / Tomate"
  ]},

  "Ciudades del mundo": { icono: "🏙️", palabras: [
    "Madrid / Barcelona", "Barcelona / Valencia", "Valencia / Barcelona", "Sevilla / Málaga", "Málaga / Sevilla",
    "Bilbao / San Sebastián", "Londres / Dublín", "París / Roma", "Roma / Milán", "Berlín / Múnich", "Nueva York / Chicago",
    "Los Ángeles / Las Vegas", "Las Vegas / Miami", "Miami / Los Ángeles", "Tokio / Seúl", "Seúl / Tokio",
    "Lisboa / Oporto", "Ámsterdam / Bruselas", "Praga / Viena", "Dublín / Londres", "Moscú / Kiev",
    "Buenos Aires / Montevideo", "Ciudad de México / Cancún", "Bogotá / Medellín", "La Habana / Caracas",
    "Río de Janeiro / São Paulo", "Dubái / Abu Dabi", "Estambul / El Cairo", "El Cairo / Marrakech", "Venecia / Florencia",
    "Pekín / Shanghái", "Atenas / Roma", "Mónaco / Montecarlo"
  ]},

  "Países": { icono: "🌍", palabras: [
    "España / Portugal", "Portugal / España", "Francia / Italia", "Italia / Grecia", "Alemania / Austria",
    "Inglaterra / Irlanda", "Estados Unidos / Canadá", "Canadá / Estados Unidos", "México / Colombia",
    "Argentina / Uruguay", "Brasil / Argentina", "Colombia / Venezuela", "Venezuela / Colombia", "Cuba / Jamaica",
    "Japón / China", "China / Japón", "Corea del Sur / Japón", "India / China", "Australia / Nueva Zelanda",
    "Egipto / Marruecos", "Marruecos / Egipto", "Rusia / Ucrania", "Suiza / Austria", "Holanda / Bélgica",
    "Suecia / Noruega", "Noruega / Suecia", "Grecia / Turquía", "Turquía / Grecia", "Chile / Perú",
    "Perú / Chile", "Sudáfrica / Kenia", "Islandia / Groenlandia", "Tailandia / Vietnam", "Jamaica / Cuba"
  ]},

  "Sitios": { icono: "📍", palabras: [
    "Playa / Piscina", "Piscina / Playa", "Hospital / Farmacia", "Colegio / Instituto", "Instituto / Universidad",
    "Biblioteca / Librería", "Cine / Teatro", "Teatro / Cine", "Supermercado / Centro comercial",
    "Gimnasio / Polideportivo", "Aeropuerto / Estación", "Estación / Aeropuerto", "Restaurante / Bar", "Discoteca / Bar",
    "Parque / Jardín", "Zoo / Acuario", "Acuario / Zoo", "Museo / Biblioteca", "Iglesia / Catedral", "Comisaría / Cárcel",
    "Banco / Cajero", "Gasolinera / Taller", "Peluquería / Barbería", "Barbería / Peluquería", "Hotel / Apartamento",
    "Camping / Albergue", "Montaña / Volcán", "Desierto / Playa", "Selva / Bosque", "Bosque / Selva", "Cementerio / Iglesia",
    "Feria / Parque de atracciones", "Estadio / Pabellón", "Cárcel / Comisaría", "Castillo / Palacio", "Isla / Playa",
    "Cueva / Túnel", "Faro / Puerto", "Puerto / Muelle", "Bolera / Recreativos", "Karting / Circuito", "Escape room / Laser tag"
  ]},

  "Objetos": { icono: "🧰", palabras: [
    "Móvil / Tablet", "Bolígrafo / Lápiz", "Mochila / Bolso", "Reloj / Pulsera", "Silla / Taburete", "Mesa / Escritorio",
    "Cargador / Cable", "Altavoz / Auriculares", "Botella / Vaso", "Gafas / Lentillas", "Almohada / Cojín", "Cuchara / Tenedor",
    "Tenedor / Cuchillo", "Taza / Vaso", "Auriculares / Cascos", "Ratón / Teclado", "Zapato / Zapatilla", "Libro / Revista",
    "Linterna / Vela", "Calculadora / Regla", "Cartera / Monedero", "Llave / Candado", "Mando / Teclado",
    "Paraguas / Chubasquero", "Espejo / Ventana", "Toalla / Sábana", "Peine / Cepillo", "Tijeras / Cúter", "Vela / Mechero",
    "Mechero / Cerillas", "Escoba / Fregona", "Fregona / Escoba", "Nevera / Congelador", "Microondas / Horno",
    "Lavadora / Lavavajillas", "Secador / Plancha", "Cama / Sofá", "Sofá / Sillón", "Lámpara / Bombilla",
    "Alfombra / Felpudo", "Cortina / Persiana", "Ducha / Bañera", "Balón / Pelota", "Patinete / Bicicleta", "Globo / Pompa",
    "Dado / Ficha", "Mapa / Brújula", "Pegamento / Celo", "Celo / Pegamento", "Goma / Típex"
  ]},

  "Tecnología": { icono: "💻", palabras: [
    "Ordenador / Portátil", "Portátil / Tablet", "Tablet / Móvil", "Router / Wifi", "Cámara / Webcam",
    "Televisión / Monitor", "Impresora / Escáner", "Pendrive / Disco duro", "Micrófono / Altavoz", "Dron / Helicóptero",
    "Smartwatch / Pulsera", "Consola / Ordenador", "Monitor / Televisión", "PlayStation / Xbox", "Xbox / PlayStation",
    "Nintendo Switch / PlayStation", "AirPods / Auriculares", "Wifi / Bluetooth", "Bluetooth / Wifi", "Robot / Inteligencia artificial",
    "Gafas VR / Gafas 3D", "Powerbank / Cargador", "Mando / Joystick", "Alexa / Siri", "Siri / Alexa", "Proyector / Televisión",
    "Bitcoin / Dinero", "Contraseña / PIN", "Virus / Hacker", "Código QR / Código de barras", "Captura / Foto", "Emoji / Sticker"
  ]},

  "Apps y redes": { icono: "📱", palabras: [
    "Instagram / TikTok", "TikTok / Instagram", "WhatsApp / Telegram", "Telegram / WhatsApp", "YouTube / Twitch",
    "Twitch / YouTube", "Snapchat / Instagram", "Twitter / Facebook", "Facebook / Twitter", "Spotify / YouTube",
    "Netflix / HBO", "HBO / Disney+", "Disney+ / Netflix", "Amazon Prime / Netflix", "Discord / WhatsApp",
    "Google Maps / GPS", "Uber / Taxi", "Glovo / Uber Eats", "Uber Eats / Glovo", "Wallapop / Vinted", "Vinted / Wallapop",
    "BeReal / Snapchat", "Pinterest / Instagram", "Duolingo / Google Traductor", "ChatGPT / Google", "Google / ChatGPT",
    "Shazam / Spotify", "Gmail / WhatsApp", "Bizum / PayPal", "PayPal / Bizum", "CapCut / TikTok", "Canva / Photoshop",
    "Google Classroom / Gmail", "Zoom / Google Meet", "Steam / Epic Games", "Kick / Twitch"
  ]},

  "Películas": { icono: "🎬", palabras: [
    "Titanic / Avatar", "Avatar / Titanic", "Matrix / Inception", "Inception / Matrix", "Gladiator / Troya",
    "Los Vengadores / Spider-Man", "Toy Story / Cars", "Cars / Toy Story", "Jurassic Park / King Kong", "King Kong / Godzilla",
    "Harry Potter / Narnia", "El Señor de los Anillos / Harry Potter", "Coco / Encanto", "Encanto / Coco", "Forrest Gump / Titanic",
    "Regreso al Futuro / Terminator", "Joker / Batman", "Shrek / Madagascar", "Madagascar / Kung Fu Panda",
    "Kung Fu Panda / Madagascar", "El Rey León / Tarzán", "Frozen / Enredados", "Enredados / Frozen", "Buscando a Nemo / Tiburón",
    "Up / Wall-E", "Los Increíbles / Los Vengadores", "Gru / Los Minions", "Los Minions / Gru", "Star Wars / Star Trek",
    "Piratas del Caribe / Indiana Jones", "Indiana Jones / Piratas del Caribe", "Spider-Man / Batman", "Batman / Superman",
    "Iron Man / Spider-Man", "Fast & Furious / Cars", "Tiburón / Megalodón", "It / Annabelle", "Annabelle / It",
    "Barbie / Oppenheimer", "Top Gun / Fast & Furious", "Rocky / Creed", "Solo en casa / Mr. Bean",
    "Ratatouille / Chef", "Monstruos S.A. / Monster House", "Del Revés / Coco", "Mario Bros / Sonic", "Sonic / Mario Bros",
    "Dune / Star Wars", "Interstellar / Gravity"
  ]},

  "Series": { icono: "📺", palabras: [
    "Breaking Bad / Narcos", "Narcos / Breaking Bad", "Stranger Things / Miércoles", "Miércoles / Stranger Things",
    "Juego de Tronos / The Witcher", "The Witcher / Juego de Tronos", "Friends / Cómo conocí a vuestra madre",
    "Cómo conocí a vuestra madre / Friends", "The Office / Friends", "Black Mirror / Stranger Things", "Peaky Blinders / Narcos",
    "Rick y Morty / Los Simpson", "Los Simpson / Padre de familia", "Padre de familia / Los Simpson", "La Casa de Papel / Élite",
    "Élite / La Casa de Papel", "El juego del calamar / Alice in Borderland", "The Boys / Invincible", "Invincible / The Boys",
    "Bob Esponja / Hora de Aventuras", "One Piece / Naruto", "Naruto / Dragon Ball", "Dragon Ball / Naruto",
    "Ataque a los Titanes / Demon Slayer", "Demon Slayer / Ataque a los Titanes", "Death Note / Naruto",
    "Aquí no hay quien viva / La que se avecina", "La que se avecina / Aquí no hay quien viva", "Prison Break / Vis a vis",
    "The Walking Dead / The Last of Us", "The Last of Us / The Walking Dead", "Gran Hermano / La isla de las tentaciones",
    "La isla de las tentaciones / Gran Hermano", "Pasapalabra / Saber y Ganar", "MasterChef / Pesadilla en la cocina",
    "Doctor House / Anatomía de Grey", "Euphoria / Élite", "Sherlock / Doctor House", "Dexter / Breaking Bad"
  ]},

  "Dibujos y personajes": { icono: "🦸", palabras: [
    "Bob Esponja / Patricio", "Patricio / Calamardo", "Mickey Mouse / Minnie", "Pato Donald / Goofy", "Shrek / Fiona",
    "Pikachu / Charmander", "Charmander / Squirtle", "Mario / Luigi", "Luigi / Mario", "Sonic / Mario", "Kirby / Yoshi",
    "Spider-Man / Venom", "Batman / Joker", "Superman / Flash", "Iron Man / Capitán América", "Hulk / Thor",
    "Thor / Loki", "Thanos / Darth Vader", "Darth Vader / Thanos", "Yoda / Grogu", "Harry Potter / Ron",
    "Hermione / Ginny", "Voldemort / Darth Vader", "Gandalf / Dumbledore", "Dumbledore / Gandalf", "Gollum / Dobby",
    "Homer Simpson / Peter Griffin", "Bart Simpson / Stewie", "Goku / Vegeta", "Vegeta / Goku", "Naruto / Sasuke",
    "Luffy / Zoro", "Elsa / Anna", "Buzz Lightyear / Woody", "Woody / Buzz Lightyear", "Rayo McQueen / Mate",
    "Nemo / Dory", "Simba / Mufasa", "Stitch / Lilo", "Minion / Gru", "Mr. Bean / Chaplin", "Pocoyó / Peppa Pig",
    "Peppa Pig / Pocoyó", "Doraemon / Shin Chan", "Shin Chan / Doraemon", "Scooby-Doo / Shaggy", "Tom / Jerry",
    "Bugs Bunny / Pato Lucas", "Steve / Creeper", "Creeper / Zombi", "Chucky / Annabelle", "Miércoles / Morticia"
  ]},

  "Música": { icono: "🎵", palabras: [
    "Pop / Rock", "Rock / Metal", "Rap / Trap", "Trap / Rap", "Reguetón / Dembow", "Electrónica / Techno",
    "Clásica / Ópera", "Salsa / Bachata", "Bachata / Merengue", "Merengue / Salsa", "K-Pop / Pop", "Metal / Rock",
    "House / Techno", "Techno / House", "Flamenco / Rumba", "Rumba / Flamenco", "Dembow / Reguetón", "Cumbia / Salsa",
    "Punk / Rock", "Ópera / Clásica", "Reggae / Reguetón", "Jazz / Blues", "Karaoke / Concierto", "Villancico / Canción"
  ]},

  "Cantantes y artistas": { icono: "🎤", palabras: [
    "Bad Bunny / J Balvin", "J Balvin / Maluma", "Maluma / J Balvin", "Rosalía / Aitana", "Aitana / Rosalía",
    "Quevedo / Bizarrap", "Bizarrap / Quevedo", "Shakira / Karol G", "Karol G / Shakira", "Taylor Swift / Billie Eilish",
    "Billie Eilish / Taylor Swift", "Ed Sheeran / Justin Bieber", "Justin Bieber / Ed Sheeran", "Drake / Travis Scott",
    "Travis Scott / Drake", "Eminem / 50 Cent", "Michael Jackson / Elvis", "Daddy Yankee / Don Omar", "Don Omar / Daddy Yankee",
    "Anuel / Ozuna", "Ozuna / Anuel", "Feid / Karol G", "Myke Towers / Rauw Alejandro", "Rauw Alejandro / Myke Towers",
    "Peso Pluma / Bad Bunny", "C. Tangana / Rosalía", "Morad / Beny Jr", "Duki / Bizarrap", "Rels B / Morad",
    "Pablo Alborán / Alejandro Sanz", "Alejandro Sanz / Pablo Alborán", "Melendi / Estopa", "Estopa / Melendi",
    "Queen / The Beatles", "The Beatles / Queen", "Coldplay / Imagine Dragons", "Imagine Dragons / Coldplay",
    "BTS / Blackpink", "Blackpink / BTS", "Dua Lipa / Rihanna", "Rihanna / Beyoncé", "The Weeknd / Bruno Mars", "Bruno Mars / The Weeknd"
  ]},

  "Fútbol: equipos": { icono: "⚽", palabras: [
    "Real Madrid / Barça", "Barça / Real Madrid", "Atlético de Madrid / Real Madrid", "Sevilla / Betis",
    "Betis / Sevilla", "Valencia / Villarreal", "Villarreal / Valencia", "Athletic / Real Sociedad",
    "Real Sociedad / Athletic", "CD Tenerife / UD Las Palmas", "UD Las Palmas / CD Tenerife",
    "Manchester United / Manchester City", "Manchester City / Manchester United", "Liverpool / Chelsea", "Chelsea / Arsenal",
    "Arsenal / Chelsea", "PSG / Bayern", "Bayern / Dortmund", "Dortmund / Bayern", "Juventus / Inter", "Inter / Milan",
    "Milan / Inter", "Boca Juniors / River Plate", "River Plate / Boca Juniors", "Inter Miami / LA Galaxy",
    "Al Nassr / Al Hilal", "Selección Española / Selección Portuguesa", "Argentina / Brasil"
  ]},

  "Futbolistas": { icono: "🥅", palabras: [
    "Messi / Cristiano Ronaldo", "Cristiano Ronaldo / Messi", "Mbappé / Vinícius", "Vinícius / Rodrygo", "Haaland / Lewandowski",
    "Lewandowski / Haaland", "Lamine Yamal / Nico Williams", "Nico Williams / Lamine Yamal", "Pedri / Gavi", "Gavi / Pedri",
    "Bellingham / Valverde", "Valverde / Bellingham", "Neymar / Ronaldinho", "Ronaldinho / Neymar", "Modrić / Kroos",
    "Kroos / Modrić", "Sergio Ramos / Piqué", "Piqué / Sergio Ramos", "Iniesta / Xavi", "Xavi / Iniesta", "Casillas / Courtois",
    "Courtois / Casillas", "Griezmann / Benzema", "Benzema / Griezmann", "Salah / Mané", "Kane / Haaland",
    "Fernando Torres / David Villa", "Zidane / Ronaldo Nazário", "Maradona / Pelé", "Pelé / Maradona",
    "Ibrahimović / Cristiano Ronaldo", "Rodri / Busquets", "Busquets / Rodri", "Raphinha / Vinícius", "Carvajal / Jordi Alba"
  ]},

  "Deportes": { icono: "🏅", palabras: [
    "Fútbol / Fútbol sala", "Fútbol sala / Fútbol", "Baloncesto / Balonmano", "Balonmano / Baloncesto", "Tenis / Pádel",
    "Pádel / Tenis", "Natación / Waterpolo", "Surf / Bodyboard", "Bodyboard / Surf", "Kitesurf / Windsurf",
    "Windsurf / Kitesurf", "Skate / Patinaje", "Ciclismo / Running", "Atletismo / Running", "Boxeo / Kickboxing",
    "Kárate / Taekwondo", "Judo / Kárate", "Golf / Minigolf", "Voleibol / Vóley playa", "Rugby / Fútbol americano",
    "Fútbol americano / Rugby", "Béisbol / Críquet", "Esquí / Snowboard", "Snowboard / Esquí", "Escalada / Senderismo",
    "Senderismo / Escalada", "Fórmula 1 / MotoGP", "MotoGP / Fórmula 1", "Gimnasia / Baile", "Crossfit / Gimnasio",
    "Hockey / Patinaje", "Ping pong / Bádminton", "Bádminton / Ping pong", "Parkour / Escalada", "Buceo / Snorkel",
    "Snorkel / Buceo", "Lucha canaria / Lucha libre", "UFC / Boxeo", "Calistenia / Crossfit"
  ]},

  "Profesiones": { icono: "👷", palabras: [
    "Médico / Enfermero", "Profesor / Director", "Ingeniero / Arquitecto", "Abogado / Juez", "Enfermero / Médico",
    "Carpintero / Albañil", "Panadero / Pastelero", "Peluquero / Barbero", "Policía / Guardia Civil", "Bombero / Socorrista",
    "Electricista / Fontanero", "Programador / Informático", "Arquitecto / Ingeniero", "Periodista / Presentador",
    "Cocinero / Camarero", "Camarero / Cocinero", "Mecánico / Electricista", "Dentista / Médico", "Veterinario / Médico",
    "Agricultor / Ganadero", "Piloto / Azafato", "Azafato / Piloto", "Astronauta / Piloto", "Youtuber / Streamer",
    "Streamer / Youtuber", "Futbolista / Entrenador", "Entrenador / Árbitro", "Árbitro / Juez", "Socorrista / Bombero",
    "Fontanero / Electricista", "Cajero / Dependiente", "Dependiente / Cajero", "Taxista / Guagüero", "Guagüero / Taxista",
    "Cartero / Repartidor", "Repartidor / Cartero", "Actor / Cantante", "Cantante / Actor", "Fotógrafo / Periodista",
    "Psicólogo / Médico", "Farmacéutico / Médico", "Militar / Policía", "Detective / Policía", "Científico / Médico",
    "Influencer / Youtuber", "Jardinero / Agricultor", "Pescador / Marinero", "Payaso / Mago", "Mago / Payaso"
  ]},

  "Espacio y ciencia": { icono: "🔬", palabras: [
    "Sol / Luna", "Luna / Sol", "Estrella / Planeta", "Planeta / Estrella", "Tierra / Marte", "Marte / Júpiter",
    "Júpiter / Saturno", "Saturno / Júpiter", "Galaxia / Universo", "Agujero negro / Estrella", "Cohete / Nave espacial",
    "Astronauta / Extraterrestre", "Meteorito / Cometa", "Cometa / Meteorito", "Eclipse / Luna llena",
    "Átomo / Molécula", "Célula / Bacteria", "Bacteria / Virus", "Virus / Bacteria", "ADN / Gen", "Gravedad / Imán",
    "Imán / Gravedad", "Electricidad / Rayo", "Microscopio / Telescopio", "Telescopio / Microscopio", "Dinosaurio / Fósil",
    "Fósil / Dinosaurio", "Laboratorio / Hospital", "Volcán / Terremoto", "Terremoto / Volcán", "Robot / Ordenador",
    "Matemáticas / Física", "Física / Química", "Química / Física", "Biología / Química", "Fuego / Lava"
  ]},

  "Cuerpo humano": { icono: "🫀", palabras: [
    "Corazón / Pulmón", "Pulmón / Corazón", "Cerebro / Cabeza", "Estómago / Barriga", "Ojo / Oreja", "Oreja / Nariz",
    "Nariz / Boca", "Boca / Labios", "Diente / Muela", "Lengua / Diente", "Mano / Pie", "Pie / Mano", "Rodilla / Codo",
    "Codo / Rodilla", "Hombro / Cadera", "Cuello / Garganta", "Espalda / Pecho", "Ombligo / Barriga", "Uña / Pelo",
    "Pelo / Barba", "Barba / Bigote", "Ceja / Pestaña", "Pestaña / Ceja", "Dedo / Uña", "Tobillo / Muñeca",
    "Muñeca / Tobillo", "Hueso / Músculo", "Músculo / Hueso", "Sangre / Sudor", "Piel / Pelo", "Esqueleto / Calavera",
    "Talón / Tobillo", "Mejilla / Barbilla", "Barbilla / Mejilla", "Culo / Espalda"
  ]},

  "Naturaleza": { icono: "🌿", palabras: [
    "Árbol / Arbusto", "Pino / Palmera", "Palmera / Pino", "Cactus / Aloe vera", "Aloe vera / Cactus", "Rosa / Clavel",
    "Girasol / Margarita", "Margarita / Girasol", "Tulipán / Rosa", "Flor / Hoja", "Hoja / Flor", "Césped / Musgo",
    "Seta / Champiñón", "Drago / Palmera", "Bambú / Caña", "Bonsái / Árbol", "Lluvia / Tormenta", "Tormenta / Huracán",
    "Huracán / Tornado", "Tornado / Huracán", "Nieve / Granizo", "Granizo / Nieve", "Niebla / Calima", "Calima / Niebla",
    "Arcoíris / Aurora boreal", "Rayo / Trueno", "Trueno / Rayo", "Viento / Brisa", "Ola / Marea", "Río / Lago", "Lago / Río",
    "Cascada / Río", "Mar / Océano", "Océano / Mar", "Montaña / Colina", "Isla / Península", "Playa / Cala", "Desierto / Playa",
    "Glaciar / Iceberg", "Iceberg / Glaciar", "Selva / Bosque", "Arena / Tierra", "Piedra / Roca", "Lava / Magma",
    "Amanecer / Atardecer", "Atardecer / Amanecer", "Primavera / Verano", "Verano / Primavera", "Otoño / Invierno", "Invierno / Otoño"
  ]},

  "Instrumentos musicales": { icono: "🎸", palabras: [
    "Guitarra / Bajo", "Bajo / Guitarra", "Piano / Teclado", "Teclado / Piano", "Violín / Chelo", "Batería / Tambor",
    "Tambor / Batería", "Saxofón / Trompeta", "Trompeta / Saxofón", "Flauta / Clarinete", "Clarinete / Flauta",
    "Acordeón / Armónica", "Armónica / Acordeón", "Ukelele / Timple", "Timple / Ukelele", "Arpa / Guitarra",
    "Pandereta / Maracas", "Maracas / Pandereta", "Triángulo / Campana", "Gaita / Flauta", "Castañuelas / Pandereta",
    "Trombón / Trompeta", "Xilófono / Piano", "Micrófono / Altavoz", "Cajón / Batería"
  ]},

  "Emociones": { icono: "😄", palabras: [
    "Alegría / Felicidad", "Felicidad / Alegría", "Tristeza / Pena", "Enfado / Rabia", "Rabia / Enfado", "Sorpresa / Susto",
    "Susto / Miedo", "Miedo / Susto", "Calma / Tranquilidad", "Vergüenza / Corte", "Orgullo / Satisfacción",
    "Nervios / Estrés", "Estrés / Nervios", "Curiosidad / Interés", "Envidia / Celos", "Celos / Envidia", "Amor / Cariño",
    "Cariño / Amor", "Aburrimiento / Pereza", "Pereza / Aburrimiento", "Confusión / Duda", "Asco / Grima",
    "Grima / Asco", "Ilusión / Emoción", "Soledad / Tristeza", "Odio / Rabia", "Risa / Sonrisa", "Llanto / Tristeza"
  ]},

  "Ropa y accesorios": { icono: "👕", palabras: [
    "Camiseta / Sudadera", "Sudadera / Camiseta", "Pantalones / Vaqueros", "Vaqueros / Pantalones", "Zapatillas / Zapatos",
    "Chaqueta / Abrigo", "Abrigo / Chaqueta", "Gorra / Sombrero", "Sombrero / Gorra", "Bufanda / Pañuelo",
    "Guantes / Calcetines", "Calcetines / Medias", "Corbata / Pajarita", "Vestido / Falda", "Falda / Vestido",
    "Botas / Zapatillas", "Chanclas / Sandalias", "Sandalias / Chanclas", "Pijama / Chándal", "Chándal / Pijama",
    "Traje / Corbata", "Cinturón / Tirantes", "Reloj / Pulsera", "Mochila / Riñonera", "Riñonera / Mochila",
    "Bolso / Mochila", "Jersey / Sudadera", "Bañador / Bikini", "Bikini / Bañador", "Gafas de sol / Gafas",
    "Collar / Cadena", "Pendientes / Piercing", "Anillo / Pulsera", "Gorro / Gorra", "Chaleco / Chaqueta",
    "Albornoz / Toalla", "Uniforme / Disfraz", "Disfraz / Uniforme", "Crocs / Chanclas"
  ]},

  "Herramientas": { icono: "🔧", palabras: [
    "Martillo / Mazo", "Destornillador / Llave inglesa", "Llave inglesa / Alicates", "Alicates / Tijeras", "Taladro / Destornillador",
    "Sierra / Hacha", "Hacha / Sierra", "Cúter / Tijeras", "Tijeras / Cúter", "Metro / Regla", "Pala / Rastrillo",
    "Rastrillo / Pala", "Tornillo / Clavo", "Clavo / Tornillo", "Escalera / Andamio", "Carretilla / Pala",
    "Pistola de silicona / Pegamento", "Manguera / Regadera", "Regadera / Manguera", "Brocha / Rodillo", "Rodillo / Brocha",
    "Linterna / Lámpara", "Cinta americana / Celo", "Cortacésped / Tijeras de podar", "Caja de herramientas / Maletín"
  ]},

  "Instituto": { icono: "🏫", palabras: [
    "Examen / Control", "Control / Examen", "Recreo / Descanso", "Deberes / Trabajo", "Tutor / Director",
    "Director / Jefe de estudios", "Pizarra / Proyector", "Proyector / Pizarra", "Libreta / Cuaderno", "Cuaderno / Libreta",
    "Estuche / Mochila", "Típex / Goma", "Goma / Típex", "Subrayador / Rotulador", "Rotulador / Subrayador",
    "Compás / Regla", "Matemáticas / Física", "Lengua / Literatura", "Inglés / Francés", "Francés / Inglés",
    "Historia / Geografía", "Geografía / Historia", "Educación Física / Recreo", "Informática / Tecnología",
    "Filosofía / Historia", "Química / Biología", "Biología / Química", "Recuperación / Examen", "Notas / Examen",
    "Excursión / Viaje de estudios", "Viaje de estudios / Excursión", "Graduación / Fiesta", "Cafetería / Comedor",
    "Conserje / Profesor", "Expulsión / Castigo", "Castigo / Expulsión", "Chuleta / Apuntes", "Apuntes / Chuleta",
    "Exposición / Trabajo en grupo", "Bachillerato / ESO", "ESO / Bachillerato", "Selectividad / Bachillerato",
    "Taquilla / Mochila", "Huelga / Vacaciones", "Vacaciones / Huelga"
  ]},

  "Fiesta y ocio": { icono: "🎉", palabras: [
    "Cumpleaños / Fiesta", "Fiesta / Discoteca", "Discoteca / Fiesta", "Concierto / Festival", "Festival / Concierto",
    "Karaoke / Concierto", "Barbacoa / Picnic", "Picnic / Barbacoa", "Pijamada / Acampada", "Acampada / Pijamada",
    "Carnaval / Halloween", "Halloween / Carnaval", "Navidad / Reyes", "Reyes Magos / Papá Noel", "Papá Noel / Reyes Magos",
    "Nochevieja / Navidad", "Uvas / Cava", "Fuegos artificiales / Petardos", "Petardos / Fuegos artificiales",
    "Disfraz / Máscara", "Piñata / Globo", "Tarta / Velas", "Regalo / Sorpresa", "UNO / Parchís", "Parchís / Oca",
    "Monopoly / Parchís", "Cartas / Póker", "Póker / Cartas", "Escondite / Pilla pilla", "Pilla pilla / Escondite",
    "Bolera / Billar", "Billar / Futbolín", "Futbolín / Billar", "Feria / Parque de atracciones", "Noria / Montaña rusa",
    "Montaña rusa / Noria", "Cine / Netflix", "Viaje / Excursión", "Boda / Comunión", "Comunión / Boda"
  ]},

  "Fantasía y terror": { icono: "🐉", palabras: [
    "Dragón / Dinosaurio", "Vampiro / Zombi", "Zombi / Vampiro", "Hombre lobo / Vampiro", "Fantasma / Espíritu",
    "Bruja / Mago", "Mago / Bruja", "Hada / Elfo", "Elfo / Duende", "Duende / Elfo", "Unicornio / Pegaso", "Pegaso / Unicornio",
    "Sirena / Delfín", "Ogro / Gigante", "Gigante / Ogro", "Fénix / Dragón", "Momia / Zombi", "Esqueleto / Calavera",
    "Calavera / Esqueleto", "Extraterrestre / Ovni", "Ovni / Extraterrestre", "Robot / Androide", "Demonio / Ángel",
    "Ángel / Demonio", "Payaso / Bufón", "Varita / Escoba", "Poción / Hechizo", "Hechizo / Poción",
    "Casa encantada / Castillo", "Yeti / Bigfoot", "Bigfoot / Yeti", "Ninja / Samurái", "Samurái / Ninja",
    "Pirata / Vikingo", "Vikingo / Pirata", "Caballero / Príncipe", "Superhéroe / Villano", "Villano / Superhéroe"
  ]},

  "Transporte": { icono: "🚌", palabras: [
    "Coche / Furgoneta", "Moto / Scooter", "Scooter / Moto", "Bicicleta / Patinete", "Patinete / Bicicleta", "Guagua / Tranvía",
    "Tranvía / Tren", "Tren / Metro", "Metro / Tren", "Avión / Avioneta", "Avioneta / Helicóptero", "Helicóptero / Avioneta",
    "Barco / Lancha", "Ferry / Crucero", "Crucero / Ferry", "Lancha / Moto de agua", "Moto de agua / Lancha", "Velero / Barco",
    "Kayak / Canoa", "Canoa / Kayak", "Taxi / Uber", "Uber / Taxi", "Camión / Furgoneta", "Furgoneta / Camión",
    "Ambulancia / Coche de policía", "Coche de policía / Ambulancia", "Camión de bomberos / Ambulancia", "Tractor / Excavadora",
    "Excavadora / Grúa", "Grúa / Excavadora", "Quad / Buggy", "Buggy / Quad", "Globo / Dirigible", "Cohete / Nave espacial",
    "Submarino / Barco", "Teleférico / Telesilla", "Caravana / Autocaravana", "Limusina / Coche", "Karts / Coches de choque",
    "Coches de choque / Karts", "Patines / Monopatín", "Monopatín / Patines"
  ]},

  "Casa": { icono: "🏠", palabras: [
    "Cocina / Comedor", "Comedor / Salón", "Salón / Comedor", "Baño / Ducha", "Dormitorio / Habitación", "Garaje / Trastero",
    "Trastero / Garaje", "Terraza / Balcón", "Balcón / Terraza", "Azotea / Terraza", "Jardín / Patio", "Patio / Jardín",
    "Pasillo / Recibidor", "Sótano / Garaje", "Ascensor / Escaleras", "Escaleras / Ascensor", "Ventana / Puerta",
    "Puerta / Ventana", "Timbre / Telefonillo", "Buzón / Telefonillo", "Chimenea / Estufa", "Aire acondicionado / Ventilador",
    "Ventilador / Aire acondicionado", "Bañera / Ducha", "Ducha / Bañera", "Váter / Lavabo", "Litera / Cama",
    "Armario / Cómoda", "Cómoda / Mesita de noche", "Estantería / Armario", "Sofá cama / Sofá", "Tostadora / Sandwichera",
    "Freidora de aire / Horno", "Cafetera / Tetera", "Batidora / Licuadora", "Piscina / Jacuzzi", "Jacuzzi / Piscina",
    "Hamaca / Tumbona", "Tumbona / Hamaca"
  ]},

  "Streamers y famosos": { icono: "🌟", palabras: [
    "Ibai / AuronPlay", "AuronPlay / Ibai", "El Rubius / TheGrefg", "TheGrefg / El Rubius", "Illojuan / Ibai",
    "Willyrex / Vegetta777", "Vegetta777 / Willyrex", "MrBeast / Speed", "Speed / MrBeast", "Xokas / Illojuan",
    "Elon Musk / Mark Zuckerberg", "Mark Zuckerberg / Elon Musk", "Pablo Motos / David Broncano",
    "David Broncano / Pablo Motos", "Kim Kardashian / Kylie Jenner", "Kylie Jenner / Kim Kardashian", "Zendaya / Tom Holland",
    "Tom Holland / Zendaya", "Leonardo DiCaprio / Brad Pitt", "Brad Pitt / Leonardo DiCaprio", "La Roca / Vin Diesel",
    "Vin Diesel / La Roca", "Rafa Nadal / Carlos Alcaraz", "Carlos Alcaraz / Rafa Nadal", "Fernando Alonso / Carlos Sainz",
    "Carlos Sainz / Fernando Alonso", "LeBron James / Michael Jordan", "Michael Jordan / LeBron James",
    "Ilia Topuria / Conor McGregor", "Conor McGregor / Ilia Topuria", "Usain Bolt / Michael Jordan"
  ]}
};

/* =========================================================
   MODO PREGUNTAS
   Todos reciben la pregunta normal y el impostor una parecida.
   Cada uno contesta en voz alta (o con los dedos a la vez)
   y hay que descubrir quién tenía otra pregunta.
   Formato: [pregunta normal, pregunta del impostor]
   {J} y {J2} se cambian por jugadores de la partida.
   (Los nombres de los jugadores solo se usan aquí, en las preguntas.)
   ========================================================= */
const PREGUNTAS = [
  ["¿Cuántas horas duermes al día?", "¿Cuántas horas pasas con el móvil al día?"],
  ["¿Cuántos hermanos te gustaría tener?", "¿Cuántas mascotas te gustaría tener?"],
  ["¿Qué nota sacarías en matemáticas del 1 al 10?", "¿Qué nota le pones a la comida del comedor del 1 al 10?"],
  ["¿Cuántas veces a la semana vas a la playa?", "¿Cuántas veces a la semana comes pizza?"],
  ["¿A qué edad te gustaría casarte?", "¿A qué edad te gustaría jubilarte?"],
  ["¿Qué superpoder te gustaría tener?", "¿Qué animal te gustaría ser?"],
  ["¿Cuál es tu comida favorita?", "¿Qué comida no soportas?"],
  ["¿A qué país te irías de viaje?", "¿En qué país no vivirías nunca?"],
  ["¿Cuántos euros pagarías por una cena buena?", "¿Cuántos euros pagarías por unas zapatillas?"],
  ["¿Cuál es tu asignatura favorita?", "¿Qué asignatura quitarías del instituto?"],
  ["¿Qué famoso te gustaría conocer?", "¿Con qué famoso no te irías ni a la esquina?"],
  ["¿Cuántos amigos íntimos tienes?", "¿Cuántas veces has llorado este año?"],
  ["¿Qué número del 1 al 10 te representa?", "¿Cuántos días a la semana haces deporte?"],
  ["¿Qué te llevarías a una isla desierta?", "¿Qué tirarías ahora mismo a la basura?"],
  ["¿Cuál es tu película favorita?", "¿Cuál es la peor película que has visto?"],
  ["¿Qué profesión te gustaría tener?", "¿Qué profesión no harías ni loco?"],
  ["¿Cuántas horas tardarías en hacer los deberes de una semana?", "¿Cuántas horas juegas a la consola un sábado?"],
  ["¿A qué hora te levantas un día de clase?", "¿A qué hora te acuestas un viernes?"],
  ["¿Qué canción pondrías en una fiesta?", "¿Qué canción te pone triste?"],
  ["¿Cuánto te gusta el reguetón del 1 al 10?", "¿Cuánto miedo te dan las arañas del 1 al 10?"],
  ["¿Cuántos países has visitado?", "¿Cuántas islas canarias has visitado?"],
  ["¿Qué color de coche te comprarías?", "¿De qué color pintarías tu habitación?"],
  ["¿Qué harías con 1.000 €?", "¿Qué harías si fueras invisible un día?"],
  ["¿Cuál es el mejor jugador de fútbol de la historia?", "¿Quién es el peor del grupo jugando al fútbol?"],
  ["¿Cuántos mensajes mandas al día?", "¿Cuántos vasos de agua bebes al día?"],
  ["¿Quién del grupo sería mejor presidente?", "¿Quién del grupo sobreviviría menos en una película de terror?"],
  ["¿Quién del grupo es el más gracioso?", "¿Quién del grupo llega siempre tarde?"],
  ["¿Quién del grupo se haría famoso antes?", "¿Quién del grupo acabaría en la cárcel antes (de broma)?"],
  ["¿Quién del grupo cocina mejor?", "¿Quién del grupo come más?"],
  ["¿Quién del grupo tiene más estilo?", "¿Quién del grupo pasa más tiempo en el espejo?"],
  ["¿Cuántos años tenías cuando tuviste tu primer móvil?", "¿A qué edad dejaste de creer en los Reyes Magos?"],
  ["¿Qué emoji usas más?", "¿Qué emoji no usarías nunca?"],
  ["¿Qué app abres más al día?", "¿Qué app borrarías del mundo?"],
  ["¿Playa o montaña? ¿Por qué?", "¿Calor o frío? ¿Por qué?"],
  ["¿Cuántas veces al año vas al cine?", "¿Cuántas veces al año vas al médico?"],
  ["¿Cuál es tu número favorito?", "¿Cuántas veces has suspendido un examen?"],
  ["¿Qué te pedirías en el McDonald's?", "¿Qué te pedirías en un restaurante chino?"],
  ["¿Cuántas personas invitarías a tu cumpleaños?", "¿Cuántas personas tienes bloqueadas en el móvil?"],
  ["¿Cuál sería tu nombre de luchador?", "¿Cómo le pondrías a tu perro?"],
  ["¿Cuál es el mejor día de la semana?", "¿Cuál es el peor día de la semana?"]
];

/* =========================================================
   PREGUNTAS PICANTES 🌶️ (se activan en Ajustes)
   Están pensadas para que la respuesta del impostor quede
   fatal cuando se lee la pregunta de verdad.
   ========================================================= */
const PREGUNTAS_PICANTES = [
  ["¿Qué le regalarías a tu abuela?", "¿Qué tirarías por la ventana sin pensarlo?"],
  ["¿Qué llevarías a una primera cita?", "¿Qué tienes escondido debajo de la cama?"],
  ["¿Qué te comerías ahora mismo?", "¿Qué es lo más asqueroso que has visto en la calle?"],
  ["¿Qué le dirías a tu profe favorito?", "¿Qué le gritarías a un árbitro?"],
  ["¿Dónde te gustaría vivir?", "¿Dónde no entrarías ni aunque te pagaran?"],
  ["¿Qué olor te encanta?", "¿Qué olor te da arcadas?"],
  ["¿Qué le pedirías a los Reyes Magos?", "¿Qué tienes escondido en tu habitación?"],
  ["¿Qué meterías en la mochila para una excursión?", "¿Qué no debería ver nunca tu madre en tu móvil?"],
  ["¿Con qué famoso te irías de vacaciones?", "¿A qué famoso le darías una colleja?"],
  ["¿Qué cantarías en un karaoke?", "¿Qué ruido haces cuando te despiertas?"],
  ["¿Qué te gusta hacer un domingo por la tarde?", "¿Qué haces en el baño más tiempo del necesario?"],
  ["¿Cuál es tu plato favorito de tu madre?", "¿Qué es lo peor que has comido en casa de un amigo?"],
  ["¿Qué nombre le pondrías a tu hijo?", "¿Qué nombre le pondrías a un pedo?"],
  ["¿Qué animal tendrías de mascota?", "¿Qué animal te comerías si no hubiera otra cosa?"],
  ["¿Qué parte de tu cuerpo te gusta más?", "¿Qué parte de tu cuerpo huele peor?"],
  ["¿Qué meterías en una tarta de cumpleaños?", "¿Qué meterías en el bocadillo del que peor te cae?"],
  ["¿A quién llamarías si tuvieras un problema?", "¿De quién has hablado mal esta semana?"],
  ["¿Qué es lo primero que haces al levantarte?", "¿Qué es lo último que buscaste en Google?"],
  ["¿Qué le dirías a tu crush?", "¿Qué le dirías a un perro que te acaba de morder?"],
  ["¿Qué harías en tu último día en la Tierra?", "¿Qué harías encerrado toda la noche en un Mercadona?"],
  ["¿Qué comida compartirías con tus amigos?", "¿Qué no compartirías ni con tu madre?"],
  ["¿Cuántas duchas te das a la semana?", "¿Cuántas veces a la semana comes pasta?"],
  ["¿Cuántos días tardas en contestar un WhatsApp?", "¿Cuántos días llevas con los mismos calcetines?"],
  ["¿Cuántas veces al día te lavas los dientes?", "¿Cuántas veces al día te hurgas la nariz?"],
  ["¿Cuántos euros gastarías en el regalo de tu mejor amigo?", "¿Por cuántos euros te comerías un grillo vivo?"],
  ["¿Cuántas horas estudias para un examen?", "¿Cuántas horas aguantas sin ir al baño?"],
  ["¿Cuántos amigos de verdad tienes?", "¿Cuántos mocos te habrás comido en tu vida?"],
  ["Del 1 al 10, ¿cuánto quieres a tu familia?", "Del 1 al 10, ¿cuánto te huelen los pies?"],
  ["Del 1 al 10, ¿qué tal cocinas?", "Del 1 al 10, ¿cuánto mientes a tus padres?"],
  ["Del 1 al 10, ¿cómo de guapo te ves hoy?", "Del 1 al 10, ¿cuánto te pica el culo ahora mismo?"],
  ["Del 1 al 10, ¿cuánto te gusta tu instituto?", "Del 1 al 10, ¿cuánto miedo te dan las palomas?"],
  ["¿Qué es lo mejor de tu habitación?", "¿Qué es lo más guarro que hay en tu habitación?"],
  ["¿Qué te traerías de recuerdo de un viaje?", "¿Qué has robado alguna vez, aunque sea un boli?"],
  ["¿A qué te gustaría dedicarte?", "¿Qué harías por 100 € si nadie se enterara?"],
  ["¿Qué le dirías a tu madre el Día de la Madre?", "¿Qué le dirías a alguien que se te cuela en el Mercadona?"],
  ["¿Cuál es tu palabra favorita?", "¿Qué palabrota dices más?"],
  ["¿Qué te pones para dormir?", "¿Qué te pondrías para ir a la guerra?"],
  ["¿Qué meterías en la piscina para hacerla más divertida?", "¿Qué has hecho dentro de una piscina que no deberías?"],
  ["¿Qué es lo más bonito que te han dicho?", "¿Qué es lo peor que te ha dicho un profe?"],
  ["¿Qué foto pondrías de perfil?", "¿Qué foto tuya borrarías de internet?"],
  ["¿Qué canción pondrías en tu boda?", "¿Qué canción pondrías en tu funeral?"],
  ["¿Cuál es tu mayor talento?", "¿Cuál es tu mayor vicio?"],
  ["¿Qué harías si te encuentras 50 € en el suelo?", "¿Qué harías si te pillan copiando en un examen?"],
  ["¿Cuál es tu postre favorito?", "¿Qué es lo más raro que has comido por una apuesta?"],
  ["¿Qué animal serías?", "¿Qué animal es tu padre?"],
  ["¿Qué haces cuando te aburres en clase?", "¿Qué haces cuando nadie te ve en casa?"],
  ["¿Cuál es tu mayor miedo?", "¿Qué te daría más vergüenza que se supiera?"],
  ["¿Qué le pondrías a una pizza?", "¿Qué le pondrías en la comida a tu peor enemigo?"],
  ["¿A qué hora te gustaría levantarte?", "¿A qué hora fue la última vez que lloraste?"],
  ["¿Qué le enseñarías a un extraterrestre de la Tierra?", "¿Qué le esconderías a tu madre si viniera ahora?"],
  ["¿A quién del grupo llevarías a una isla desierta?", "¿A quién del grupo dejarías tirado en una isla desierta?"],
  ["¿Quién del grupo sería mejor padre?", "¿Quién del grupo huele peor después de jugar al fútbol?"],
  ["¿Quién del grupo te cae mejor?", "¿Quién del grupo te debe dinero?"],
  ["¿Con quién del grupo compartirías habitación?", "¿Quién del grupo ronca seguro?"],
  ["¿Quién del grupo tiene más futuro?", "¿Quién del grupo tiene el historial de búsqueda más turbio?"],
  ["¿Quién del grupo es más listo?", "¿Quién del grupo se cree más listo de lo que es?"],
  ["¿A quién del grupo le contarías un secreto?", "¿Quién del grupo es el más chismoso?"],
  ["¿Quién del grupo baila mejor?", "¿Quién del grupo haría el ridículo más grande en una boda?"],
  ["¿Quién del grupo sería un buen presidente?", "¿Quién del grupo se pasaría el día durmiendo si pudiera?"]
];

/* =========================================================
   PREGUNTAS CON JUGADORES 👥 (se activan en Ajustes)
   {J} = un jugador de la partida, {J2} = otro distinto
   ========================================================= */
const PREGUNTAS_JUGADORES = [
  ["¿Qué le regalarías a {J} por su cumpleaños?", "¿Qué le robarías a {J} sin que se diera cuenta?"],
  ["¿Qué lleva {J} en la mochila?", "¿Qué tiene {J} escondido debajo de la cama?"],
  ["¿En qué trabajará {J} dentro de 10 años?", "¿Por qué acabará {J} saliendo en las noticias?"],
  ["¿Qué animal sería {J}?", "¿A qué huele la habitación de {J}?"],
  ["¿Qué canción define a {J}?", "¿Qué canta {J} en la ducha?"],
  ["¿Cuál es la comida favorita de {J}?", "¿Qué le darías de comer a {J} como venganza?"],
  ["¿Qué haría {J} con 1.000 €?", "¿Qué haría {J} solo en casa un fin de semana entero?"],
  ["¿Qué superpoder tendría {J}?", "¿Cuál es el mayor defecto de {J}?"],
  ["Del 1 al 10, ¿cuánto quieres a {J}?", "Del 1 al 10, ¿cuánto le huelen los pies a {J}?"],
  ["Del 1 al 10, ¿qué tal juega {J} al fútbol?", "Del 1 al 10, ¿qué probabilidad hay de que {J} llore hoy?"],
  ["¿A qué edad se casará {J}?", "¿Cuántos días aguanta {J} sin ducharse?"],
  ["¿Cuántos amigos tiene {J}?", "¿Cuántas veces ha suspendido {J}?"],
  ["¿A dónde te llevarías a {J} de viaje?", "¿Dónde dejarías tirado a {J}?"],
  ["¿Qué le dirías a {J} si se fuera a vivir lejos?", "¿Qué le dirías a {J} si te debiera 50 €?"],
  ["¿A qué famoso se parece {J}?", "¿A qué personaje de dibujos se parece {J}?"],
  ["¿Qué haría {J} en un apocalipsis zombi?", "¿Qué haría {J} si le pillan copiando?"],
  ["¿Qué tiene {J} de fondo de pantalla?", "¿Qué es lo último que ha buscado {J} en Google?"],
  ["¿Qué apodo le pondrías a {J}?", "¿Qué insulto cariñoso le dirías a {J}?"],
  ["¿Cómo se llamaría el canal de YouTube de {J}?", "¿Cómo se llamaría el perfume de {J}?"],
  ["¿Qué profesión tendría {J} en la Edad Media?", "¿Por qué estaría {J} en la cárcel en la Edad Media?"],
  ["¿Qué desayuna {J}?", "¿Qué hace {J} a las 3 de la mañana?"],
  ["¿En qué es un crack {J}?", "¿En qué es un desastre {J}?"],
  ["¿Qué haría {J} en una cita con {J2}?", "¿Por qué se pelearían {J} y {J2}?"],
  ["¿Qué tienen en común {J} y {J2}?", "¿Qué secreto comparten {J} y {J2}?"],
  ["¿Qué serie verían juntos {J} y {J2}?", "¿Qué harían {J} y {J2} si se quedaran encerrados en un ascensor?"],
  ["¿Quién ganaría en un duelo de baile, {J} o {J2}?", "¿Quién huele peor, {J} o {J2}?"],
  ["¿Quién es más listo, {J} o {J2}?", "¿Quién sobreviviría menos en la selva, {J} o {J2}?"],
  ["¿Qué le cocinaría {J} a {J2}?", "¿Qué le escondería {J} a {J2} en la mochila?"]
];
