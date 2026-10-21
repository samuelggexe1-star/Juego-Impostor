/* =========================================================
   PALABRAS DEL JUEGO
   ---------------------------------------------------------
   Formato de cada palabra:  "Palabra / Gemela"
   - "Gemela" es una palabra parecida pero distinta.
     Se usa para:
       · la pista "palabra parecida" del impostor
       · el modo Undercover (el impostor recibe la gemela
         y NO sabe que es el impostor)
   - Si una palabra no tiene gemela, el juego coge otra
     palabra al azar de la misma categoría.
   Para añadir palabras basta con meter otra línea.
   ========================================================= */

const CATEGORIAS = {
  "Vosotros": { icono: "👥", jugadores: true, palabras: [
    "{J}", "El móvil de {J}", "La habitación de {J}", "La madre de {J}", "El historial de Google de {J}",
    "{J} bailando reguetón", "{J} en un examen", "{J} recién levantado", "{J} enfadado", "{J} ligando",
    "{J} en la playa", "La mochila de {J}", "Los pies de {J}", "La risa de {J}", "{J} conduciendo",
    "{J} cantando en la ducha", "{J} de mayor", "{J} de bebé", "Los calcetines de {J}", "El último audio de {J}",
    "{J} en el gimnasio", "El peinado de {J}", "{J} jugando al FIFA", "{J} pidiendo en el McDonald's",
    "La boda de {J}", "{J} llorando con una peli", "{J} a las 3 de la mañana", "Las zapatillas de {J}",
    "{J} en un apocalipsis zombi", "{J} copiando en un examen", "{J} perdiendo al Clash Royale",
    "La galería de fotos de {J}", "{J} con 80 años", "{J} hablando con la profe", "El TikTok de {J}",
    "{J} intentando cocinar", "{J} en una discoteca", "{J} con miedo", "La nevera de {J}", "{J} ganando la lotería"
  ]},

  "Cosas raras": { icono: "🤢", palabras: [
    "Pedo en el ascensor / Eructo en clase", "Eructo en clase / Pedo en el ascensor",
    "Moco debajo de la mesa / Chicle debajo de la mesa", "Chicle debajo de la mesa / Moco debajo de la mesa",
    "Mear en la piscina / Mear en el mar", "Mear en el mar / Mear en la piscina",
    "Calcetines sudados / Zapatillas sudadas", "Pelo en la comida / Mosca en la sopa", "Mosca en la sopa / Pelo en la comida",
    "Cortarse las uñas en el salón / Cortarse las uñas de los pies en la cama", "Hurgarse la nariz / Morderse las uñas",
    "Morderse las uñas / Hurgarse la nariz", "Oler la ropa antes de ponértela / Repetir camiseta tres días",
    "Repetir camiseta tres días / Oler la ropa antes de ponértela", "Llamar mamá a la profe / Saludar a quien no te saludaba",
    "Saludar a quien no te saludaba / Llamar mamá a la profe", "Audio al grupo equivocado / Like a una foto de hace 3 años",
    "Like a una foto de hace 3 años / Audio al grupo equivocado", "Que te pillen cantando solo / Que te pillen hablando solo",
    "Caerse en el recreo / Tropezar en las escaleras", "Que te suene la tripa en un examen / Pedo silencioso en un examen",
    "Pedo silencioso en un examen / Que te suene la tripa en un examen", "Babear durmiendo / Roncar en clase",
    "Roncar en clase / Babear durmiendo", "Cereales con agua / Cereales con zumo", "Pizza con piña / Tortilla sin cebolla",
    "Tortilla sin cebolla / Tortilla con cebolla", "Ketchup en la paella / Mayonesa en la pizza",
    "Mayonesa en la pizza / Ketchup en la paella", "Zumo después de lavarte los dientes / Leche caducada",
    "Leche caducada / Yogur caducado", "Pisar caca de perro / Pisar un chicle", "Pisar un chicle / Pisar caca de perro",
    "Lamer la tapa del yogur / Lamer el plato", "Dormir con zapatos / Ducharse con calcetines",
    "Ducharse con calcetines / Dormir con zapatos", "Olor a pies / Olor a sobaco", "Olor a sobaco / Olor a pies",
    "Cera de los oídos / Legaña", "Legaña / Cera de los oídos", "Uña encarnada / Callo en el pie",
    "Grano a punto de explotar / Espinilla", "Vomitar en la guagua / Marearse en el barco",
    "Abuela que pellizca los mofletes / Tía que pregunta por la novia", "Tía que pregunta por la novia / Abuela que pellizca los mofletes",
    "Selfie en el baño / Selfie en el ascensor", "Masticar con la boca abierta / Sorber la sopa",
    "Comerse los mocos / Comerse las uñas", "Culpar al perro de tu pedo / Culpar a tu hermano de tu pedo",
    "Dormir con la luz encendida / Mirar debajo de la cama", "Bailar como un pato / Cantar mal a propósito",
    "Imitar a un profe / Funar a un profe", "Ducharse una vez por semana / Lavarse los dientes una vez al día",
    "Mandar un 'te quiero' a tu profe / Mandar un 'te quiero' a tu jefe", "Quedarse encerrado en el baño / Quedarse sin papel en el baño",
    "Quedarse sin papel en el baño / Quedarse encerrado en el baño", "Comer del suelo / Regla de los 5 segundos",
    "Calzoncillos del revés / Camiseta del revés", "Bragueta abierta / Calzoncillos del revés",
    "Llorar con un anuncio / Llorar con Coco", "Hablar en sueños / Ser sonámbulo", "Ser sonámbulo / Hablar en sueños"
  ]},

  "Personas": { icono: "🧑", palabras: [
    "Samuel", "Adriel", "Álvaro", "Pedro", "Mateo", "Alejandro", "Diego", "Fran", "David", "Daniel", "Ryan", "67"
  ]},

  "Animales": { icono: "🐶", palabras: [
    "Perro / Lobo", "Gato / Tigre", "Conejo / Liebre", "Tiburón / Orca", "Tortuga / Caracol", "Caballo / Burro",
    "León / Tigre", "Loro / Periquito", "Panda / Koala", "Erizo / Puercoespín", "Camaleón / Lagarto",
    "Delfín / Ballena", "Pulpo / Calamar", "Murciélago / Búho", "Zorro / Lobo", "Rana / Sapo",
    "Pingüino / Foca", "Gaviota / Paloma", "Cangrejo / Langosta", "Ciervo / Alce", "Cabra / Oveja",
    "Serpiente / Lagarto", "Elefante / Rinoceronte", "Oso / Gorila", "Nutria / Castor", "Jirafa / Camello",
    "Cocodrilo / Caimán", "Mono / Gorila", "Hámster / Ratón", "Abeja / Avispa", "Mariposa / Polilla",
    "Hormiga / Termita", "Araña / Escorpión", "Águila / Halcón", "Vaca / Toro", "Cerdo / Jabalí",
    "Gallina / Pato", "Canguro / Koala", "Medusa / Pulpo", "Caracol / Babosa", "Hipopótamo / Rinoceronte",
    "Pez payaso / Pez globo", "Flamenco / Cigüeña", "Mosquito / Mosca",
    "Chiska", "Bimba", "Dori", "Frida"
  ]},

  "Comida": { icono: "🍕", palabras: [
    "Tortilla de patatas / Revuelto", "Paella / Arroz con pollo", "Croquetas / Empanadillas", "Jamón serrano / Chorizo",
    "Gazpacho / Salmorejo", "Churros / Porras", "Empanada / Empanadilla", "Pulpo a la gallega / Calamares",
    "Pizza / Focaccia", "Hamburguesa / Perrito caliente", "Tacos / Burrito", "Sushi / Ramen", "Ceviche / Tartar",
    "Kebab / Shawarma", "Falafel / Hummus", "Canelones / Lasaña", "Lasaña / Macarrones", "Ramen / Sopa de fideos",
    "Burrito / Fajitas", "Hot dog / Bocadillo", "Arepa / Cachapa", "Poke / Sushi", "Dumplings / Gyozas",
    "Gyozas / Rollitos de primavera", "Baklava / Hojaldre", "Papas arrugadas / Papas fritas",
    "Gofio / Harina", "Mojo picón / Ketchup", "Puchero canario / Cocido", "Huevos fritos / Tortilla francesa",
    "Nuggets / Alitas", "Alitas de pollo / Costillas", "Macarrones / Espaguetis", "Espaguetis carbonara / Espaguetis boloñesa",
    "Lentejas / Garbanzos", "Ensalada / Verduras", "Sándwich mixto / Tostada", "Patatas bravas / Patatas fritas",
    "Nachos / Doritos", "Pan / Baguette", "Queso / Mantequilla", "Pollo asado / Pavo", "Filete / Chuleta",
    "Salchichas / Chorizo", "Barraquito / Cortado", "Cereales / Galletas", "Palomitas / Patatas de bolsa",
    "Crepe / Gofre", "Bocadillo de calamares / Bocadillo de tortilla", "Mejillones / Almejas"
  ]},

  "Bebidas": { icono: "🥤", palabras: [
    "Coca-Cola / Pepsi", "Fanta / Trina", "Agua / Agua con gas", "Zumo de naranja / Zumo de piña",
    "Batido de chocolate / Colacao", "Café / Té", "Monster / Red Bull", "Red Bull / Monster", "Aquarius / Powerade",
    "Leche / Yogur líquido", "Colacao / Nesquik", "Limonada / Granizado", "Granizado / Slush", "Té helado / Nestea",
    "Smoothie / Batido", "Chocolate caliente / Colacao", "Sprite / Seven Up", "Batido de fresa / Yogur",
    "Horchata / Leche", "Clipper / Fanta"
  ]},

  "Postres y dulces": { icono: "🍰", palabras: [
    "Helado / Polo", "Tarta de queso / Tarta de chocolate", "Flan / Natillas", "Donut / Berlina", "Brownie / Bizcocho",
    "Galletas Oreo / Galletas Príncipe", "Gominolas / Chuches", "Chupa Chups / Piruleta", "Chocolate / Nutella",
    "Nutella / Crema de cacahuete", "Churros con chocolate / Porras", "Tiramisú / Tarta de café",
    "Arroz con leche / Natillas", "Magdalena / Muffin", "Cruasán / Napolitana", "Napolitana de chocolate / Cruasán",
    "Gofre / Tortitas", "Tortitas / Crepes", "Bienmesabe / Leche asada", "Kinder Bueno / Kit Kat",
    "Kit Kat / Twix", "Algodón de azúcar / Gominolas", "Palmera de chocolate / Donut", "Turrón / Polvorón",
    "Roscón de Reyes / Panettone", "Cupcake / Magdalena", "Muffin / Magdalena", "Macarons / Galletas"
  ]},

  "Videojuegos": { icono: "🎮", palabras: [
    "Minecraft / Terraria", "Fortnite / Warzone", "Among Us / Fall Guys", "GTA V / Red Dead Redemption",
    "Clash Royale / Clash of Clans", "Call of Duty / Battlefield", "Valorant / Counter Strike", "Roblox / Minecraft",
    "FIFA / eFootball", "Brawl Stars / Clash Royale", "Apex Legends / Fortnite", "Fall Guys / Stumble Guys",
    "Rocket League / FIFA", "PUBG / Free Fire", "The Sims / Animal Crossing", "League of Legends / Dota 2",
    "Counter Strike / Valorant", "Overwatch / Valorant", "Stardew Valley / Animal Crossing", "Terraria / Minecraft",
    "Hades / Dead Cells", "Genshin Impact / Zelda", "Mario Kart / Crash Team Racing", "Zelda / Elden Ring",
    "Cyberpunk 2077 / GTA V", "NBA 2K / FIFA", "Juego Impostor / Among Us", "Pokémon / Digimon",
    "Super Mario Bros / Sonic", "Sonic / Super Mario Bros", "Tetris / Candy Crush", "Candy Crush / Tetris",
    "Subway Surfers / Temple Run", "Geometry Dash / Flappy Bird", "Pac-Man / Space Invaders", "Elden Ring / Dark Souls",
    "God of War / Zelda", "The Last of Us / Resident Evil", "Resident Evil / The Last of Us", "Smash Bros / Mario Kart",
    "Clash of Clans / Clash Royale", "Free Fire / PUBG", "Geoguessr / Google Maps", "Wii Sports / Just Dance",
    "Five Nights at Freddy's / Poppy Playtime", "Hollow Knight / Celeste", "Pou / Tamagotchi", "Ajedrez / Damas"
  ]},

  "Marcas de coche": { icono: "🚗", palabras: [
    "BMW / Audi", "Audi / Mercedes", "Mercedes / BMW", "Seat / Cupra", "Volkswagen / Seat", "Ford / Opel",
    "Renault / Peugeot", "Toyota / Honda", "Honda / Toyota", "Nissan / Mazda", "Peugeot / Citroën",
    "Citroën / Peugeot", "Kia / Hyundai", "Hyundai / Kia", "Lamborghini / Ferrari", "Ferrari / Lamborghini",
    "Porsche / Ferrari", "Tesla / BYD", "Fiat / Lancia", "Mini / Smart", "Volvo / Skoda", "Skoda / Volkswagen",
    "Jeep / Land Rover", "Maserati / Alfa Romeo", "Alfa Romeo / Maserati", "Dacia / Renault", "Bugatti / McLaren",
    "McLaren / Bugatti", "Opel / Ford", "Suzuki / Mitsubishi", "Land Rover / Jeep", "Cupra / Seat"
  ]},

  "Marcas": { icono: "🏷️", palabras: [
    "Nike / Adidas", "Adidas / Puma", "Puma / Reebok", "Zara / Pull&Bear", "Pull&Bear / Bershka", "Bershka / Stradivarius",
    "Primark / Shein", "Shein / Temu", "Apple / Samsung", "Samsung / Xiaomi", "Xiaomi / Huawei", "Sony / Nintendo",
    "Nintendo / Sony", "McDonald's / Burger King", "Burger King / KFC", "KFC / Popeyes", "Telepizza / Domino's",
    "Domino's / Telepizza", "Starbucks / Costa Coffee", "Mercadona / Lidl", "Lidl / Aldi", "Hiperdino / Mercadona",
    "Amazon / AliExpress", "IKEA / Leroy Merlin", "Coca-Cola / Pepsi", "Lego / Playmobil", "Vans / Converse",
    "Converse / Vans", "The North Face / Columbia", "Decathlon / Sprinter", "Ray-Ban / Hawkers", "Gucci / Louis Vuitton",
    "Louis Vuitton / Gucci", "Supreme / Off-White", "JD Sports / Foot Locker", "Media Markt / Worten"
  ]},

  "Lugares Locales": { icono: "🏝️", palabras: [
    "El Médano / La Tejita", "La Tejita / El Médano", "Los Cristianos / Las Américas", "Las Américas / Los Cristianos",
    "Adeje / Fañabé", "San Isidro / Granadilla", "Los Abrigos / Golf del Sur", "Costa del Silencio / Las Galletas",
    "Granadilla / San Isidro", "La Caleta / Fañabé", "Fañabé / La Caleta", "Golf del Sur / Los Abrigos",
    "Palm-Mar / Guaza", "Guaza / Palm-Mar", "Arona / Adeje", "Las Galletas / Costa del Silencio",
    "Parque La Reina / Cabo Blanco", "Buzanada / Chayofa", "Chayofa / Buzanada", "Cabo Blanco / Parque La Reina",
    "PH / Miraverde", "Miraverde / PH", "Aldea Blanca / Los Cardones", "Los Cardones / Aldea Blanca",
    "Montaña Roja / Montaña Pelada", "Siam Park / Aqualand", "Aqualand / Siam Park", "Aeropuerto Tenerife Sur / Aeropuerto Tenerife Norte",
    "Siam Mall / Gran Sur", "Gran Sur / Siam Mall", "Loro Parque / Siam Park"
  ]},

  "Canarias": { icono: "🌋", palabras: [
    "Teide / Roque Nublo", "Tenerife / Gran Canaria", "Gran Canaria / Tenerife", "Lanzarote / Fuerteventura",
    "Fuerteventura / Lanzarote", "La Palma / La Gomera", "La Gomera / El Hierro", "El Hierro / La Gomera",
    "La Graciosa / Lanzarote", "Santa Cruz / Las Palmas", "Las Palmas / Santa Cruz", "La Laguna / La Orotava",
    "Puerto de la Cruz / Los Cristianos", "Carnaval / Romería", "Romería / Carnaval", "Guagua / Tranvía",
    "Tranvía / Guagua", "Papas arrugadas / Papas con mojo", "Gofio / Millo", "Millo / Gofio", "Barraquito / Cortado leche y leche",
    "Drago / Palmera", "Timple / Guitarra", "Lucha canaria / Juego del palo", "Guanche / Mencey",
    "CD Tenerife / UD Las Palmas", "UD Las Palmas / CD Tenerife", "Lagartija / Perenquén", "Perenquén / Lagartija",
    "Calima / Panza de burro", "Panza de burro / Calima", "Anaga / Teno", "Masca / Anaga", "Los Gigantes / Masca",
    "Volcán / Montaña", "Fiestas del Cristo / Corpus", "Arepera / Guachinche", "Guachinche / Arepera",
    "Mojo verde / Mojo rojo", "Chinijo / Pibe", "Ñoos / Fuerte", "Mi niño / Chacho"
  ]},

  "Ciudades del mundo": { icono: "🏙️", palabras: [
    "Madrid / Barcelona", "Barcelona / Valencia", "Valencia / Barcelona", "Sevilla / Málaga", "Málaga / Sevilla",
    "Bilbao / San Sebastián", "Londres / Dublín", "París / Roma", "Roma / Milán", "Berlín / Múnich", "Nueva York / Chicago",
    "Los Ángeles / Las Vegas", "Las Vegas / Miami", "Miami / Los Ángeles", "Tokio / Seúl", "Seúl / Tokio",
    "Lisboa / Oporto", "Ámsterdam / Bruselas", "Praga / Viena", "Viena / Budapest", "Dublín / Edimburgo",
    "Oslo / Estocolmo", "Sídney / Melbourne", "Moscú / San Petersburgo", "Estocolmo / Copenhague",
    "Buenos Aires / Montevideo", "Santiago de Chile / Lima", "Ciudad de México / Cancún", "Lima / Bogotá",
    "Bogotá / Medellín", "Caracas / Bogotá", "La Habana / Santo Domingo", "Río de Janeiro / São Paulo",
    "Dubái / Abu Dabi", "Estambul / El Cairo", "El Cairo / Marrakech", "Marrakech / Estambul", "Venecia / Florencia",
    "Pekín / Shanghái", "Hong Kong / Singapur", "Atenas / Roma", "Mónaco / Montecarlo"
  ]},

  "Países": { icono: "🌍", palabras: [
    "España / Portugal", "Portugal / España", "Francia / Italia", "Italia / Grecia", "Alemania / Austria",
    "Reino Unido / Irlanda", "Estados Unidos / Canadá", "Canadá / Estados Unidos", "México / Colombia",
    "Argentina / Uruguay", "Brasil / Argentina", "Colombia / Venezuela", "Venezuela / Colombia", "Cuba / República Dominicana",
    "Japón / China", "China / Japón", "Corea del Sur / Japón", "India / Pakistán", "Australia / Nueva Zelanda",
    "Egipto / Marruecos", "Marruecos / Argelia", "Rusia / Ucrania", "Suiza / Austria", "Países Bajos / Bélgica",
    "Suecia / Noruega", "Noruega / Finlandia", "Grecia / Turquía", "Turquía / Grecia", "Chile / Perú",
    "Perú / Bolivia", "Senegal / Nigeria", "Sudáfrica / Kenia", "Islandia / Groenlandia", "Tailandia / Vietnam",
    "Arabia Saudí / Emiratos Árabes", "Jamaica / Cuba"
  ]},

  "Sitios": { icono: "📍", palabras: [
    "Playa / Piscina", "Piscina / Playa", "Hospital / Farmacia", "Colegio / Instituto", "Instituto / Universidad",
    "Biblioteca / Librería", "Cine / Teatro", "Teatro / Cine", "Supermercado / Centro comercial",
    "Centro comercial / Supermercado", "Gimnasio / Polideportivo", "Aeropuerto / Estación de tren",
    "Estación de guaguas / Aeropuerto", "Restaurante / Bar", "Discoteca / Bar", "Parque / Jardín", "Zoo / Acuario",
    "Acuario / Zoo", "Museo / Galería de arte", "Iglesia / Catedral", "Comisaría / Juzgado", "Banco / Cajero",
    "Gasolinera / Taller", "Peluquería / Barbería", "Barbería / Peluquería", "Hotel / Apartamento", "Camping / Albergue",
    "Montaña / Volcán", "Desierto / Playa", "Selva / Bosque", "Bosque / Selva", "Cementerio / Iglesia",
    "Parque de atracciones / Parque acuático", "Parque acuático / Parque de atracciones", "Estadio / Pabellón",
    "Cárcel / Comisaría", "Castillo / Palacio", "Isla / Península", "Cueva / Túnel", "Faro / Puerto", "Puerto / Muelle",
    "Lavandería / Tintorería", "Bolera / Recreativos", "Karting / Circuito", "Escape room / Laser tag"
  ]},

  "Objetos": { icono: "🧰", palabras: [
    "Móvil / Tablet", "Bolígrafo / Lápiz", "Mochila / Bolso", "Reloj / Pulsera", "Silla / Taburete", "Mesa / Escritorio",
    "Cargador / Cable USB", "Camiseta / Sudadera", "Altavoz / Auriculares", "Botella / Vaso", "Gafas / Lentillas",
    "Cepillo de dientes / Peine", "Cojín / Almohada", "Cuchara / Tenedor", "Taza / Vaso", "Auriculares / Cascos",
    "Ratón / Teclado", "Teclado / Piano", "Zapato / Zapatilla", "Libro / Revista", "Linterna / Vela",
    "Calculadora / Regla", "Cartera / Monedero", "Llave / Candado", "Mando de la tele / Mando de la consola",
    "Paraguas / Chubasquero", "Espejo / Ventana", "Toalla / Sábana", "Peine / Cepillo", "Tijeras / Cúter",
    "Vela / Mechero", "Mechero / Cerillas", "Martillo / Mazo", "Escoba / Fregona", "Fregona / Escoba",
    "Nevera / Congelador", "Microondas / Horno", "Lavadora / Lavavajillas", "Secador / Plancha", "Cama / Sofá",
    "Sofá / Sillón", "Lámpara / Bombilla", "Alfombra / Felpudo", "Cortina / Persiana", "Grifo / Ducha",
    "Balón / Pelota de tenis", "Patinete / Bicicleta", "Monopatín / Patinete", "Globo / Pompa de jabón",
    "Dado / Ficha", "Brújula / Mapa", "Imán / Clip", "Pegamento / Celo", "Celo / Pegamento"
  ]},

  "Tecnología": { icono: "💻", palabras: [
    "Ordenador / Portátil", "Tablet / Móvil", "Smartphone / Tablet", "Router / Módem", "Cámara / Webcam",
    "Televisor / Monitor", "Impresora / Escáner", "Disco duro / Pendrive", "SSD / Disco duro", "Procesador / Tarjeta gráfica",
    "Tarjeta gráfica / Procesador", "Micrófono / Altavoz", "Dron / Helicóptero de juguete", "Smartwatch / Pulsera de actividad",
    "Consola / Ordenador", "Placa base / Procesador", "Monitor / Televisor", "PlayStation / Xbox", "Xbox / PlayStation",
    "Nintendo Switch / Steam Deck", "AirPods / Auriculares", "Wifi / Bluetooth", "Bluetooth / Wifi", "Pendrive / Tarjeta SD",
    "Robot / Inteligencia artificial", "Inteligencia artificial / Robot", "Realidad virtual / Realidad aumentada",
    "Gafas VR / Gafas 3D", "Power bank / Cargador", "Mando / Joystick", "Teclado mecánico / Teclado de membrana",
    "Alexa / Siri", "Siri / Google Assistant", "Proyector / Televisor", "Calculadora científica / Calculadora",
    "Patinete eléctrico / Bici eléctrica", "Coche eléctrico / Coche híbrido", "Criptomoneda / Bitcoin", "Contraseña / PIN",
    "Virus informático / Hacker", "Código QR / Código de barras", "Captura de pantalla / Grabación de pantalla"
  ]},

  "Apps y redes": { icono: "📱", palabras: [
    "Instagram / TikTok", "TikTok / Instagram Reels", "WhatsApp / Telegram", "Telegram / WhatsApp", "YouTube / Twitch",
    "Twitch / YouTube", "Snapchat / Instagram", "Twitter / Threads", "Facebook / Instagram", "Spotify / Apple Music",
    "Netflix / HBO", "HBO / Disney+", "Disney+ / Netflix", "Amazon Prime / Netflix", "Discord / Slack",
    "Google Maps / Waze", "Uber / Cabify", "Glovo / Uber Eats", "Uber Eats / Just Eat", "Wallapop / Vinted",
    "Vinted / Wallapop", "BeReal / Snapchat", "Pinterest / Tumblr", "Duolingo / Babbel", "ChatGPT / Claude",
    "Claude / ChatGPT", "Shazam / Spotify", "Tinder / Bumble", "Google Drive / Dropbox", "Gmail / Outlook",
    "Bizum / PayPal", "PayPal / Bizum", "Reddit / Twitter", "Kick / Twitch", "CapCut / InShot", "Canva / Photoshop",
    "Google Classroom / Moodle", "Zoom / Google Meet", "Steam / Epic Games", "Epic Games / Steam"
  ]},

  "Películas": { icono: "🎬", palabras: [
    "El Padrino / Scarface", "Titanic / Pearl Harbor", "Avatar / Pandora", "Interestelar / Gravity", "Parásitos / Joker",
    "Inception / Matrix", "Gladiator / Troya", "Matrix / Inception", "Los Vengadores / Liga de la Justicia",
    "Toy Story / Cars", "Jurassic Park / King Kong", "Harry Potter / Las Crónicas de Narnia",
    "El Señor de los Anillos / El Hobbit", "La La Land / Grease", "Coco / Encanto", "Forrest Gump / Big Fish",
    "Regreso al Futuro / Terminator", "Joker / Batman", "Mad Max / Fast & Furious", "El Gran Hotel Budapest / Amélie",
    "Shrek / Madagascar", "Madagascar / Kung Fu Panda", "El Rey León / Tarzán", "Frozen / Enredados", "Buscando a Nemo / Tiburón",
    "Up / Wall-E", "Los Increíbles / Los Vengadores", "Gru, mi villano favorito / Los Minions", "Star Wars / Star Trek",
    "Piratas del Caribe / Indiana Jones", "Indiana Jones / Piratas del Caribe", "Spider-Man / Batman", "Batman / Superman",
    "Iron Man / Spider-Man", "Fast & Furious / Need for Speed", "Tiburón / Megalodón",
    "It / Annabelle", "El Exorcista / Expediente Warren", "Barbie / Oppenheimer", "Oppenheimer / Barbie",
    "Top Gun / Fast & Furious", "Rocky / Creed", "Solo en casa / Mrs. Doubtfire", "Ratatouille / Chef",
    "Monstruos S.A. / Monster House", "Del Revés / Soul", "Super Mario Bros: La película / Sonic: La película",
    "Spider-Man: Cruzando el Multiverso / Spider-Man: Un nuevo universo", "Dune / Star Wars"
  ]},

  "Series": { icono: "📺", palabras: [
    "Breaking Bad / Better Call Saul", "Stranger Things / Dark", "The Crown / Downton Abbey", "Juego de Tronos / La Casa del Dragón",
    "The Mandalorian / Star Wars", "Friends / How I Met Your Mother", "The Office / Brooklyn 99", "Black Mirror / Love, Death & Robots",
    "Narcos / El Chapo", "Peaky Blinders / Boardwalk Empire", "Rick y Morty / Futurama", "Los Simpsons / Padre de familia",
    "Fargo / True Detective", "Dexter / Mindhunter", "The Witcher / Juego de Tronos", "Chernobyl / The Last of Us",
    "Mindhunter / Dexter", "Ozark / Breaking Bad", "Sherlock / Doctor House", "How I Met Your Mother / Friends",
    "La Casa de Papel / Élite", "Élite / Física o Química", "El juego del calamar / Alice in Borderland",
    "Wednesday / Stranger Things", "The Boys / Invincible", "Invincible / The Boys", "Bob Esponja / Hora de Aventuras",
    "Pokémon / Digimon", "One Piece / Naruto", "Naruto / Dragon Ball", "Dragon Ball / Naruto", "Ataque a los Titanes / Demon Slayer",
    "Demon Slayer / Jujutsu Kaisen", "Death Note / Code Geass", "Aquí no hay quien viva / La que se avecina",
    "La que se avecina / Aquí no hay quien viva", "Los Serrano / Médico de familia", "Vis a vis / Prison Break",
    "Prison Break / Vis a vis", "The Walking Dead / The Last of Us", "Gran Hermano / La isla de las tentaciones",
    "La isla de las tentaciones / Gran Hermano", "Pasapalabra / Saber y Ganar", "MasterChef / Pesadilla en la cocina",
    "Lost / The 100", "Grey's Anatomy / Doctor House", "Euphoria / Élite"
  ]},

  "Dibujos y personajes": { icono: "🦸", palabras: [
    "Bob Esponja / Patricio", "Patricio / Calamardo", "Mickey Mouse / Minnie Mouse", "Pato Donald / Goofy", "Shrek / Fiona",
    "Pikachu / Charmander", "Charmander / Squirtle", "Mario / Luigi", "Luigi / Wario", "Sonic / Knuckles", "Kirby / Yoshi",
    "Spider-Man / Venom", "Batman / Joker", "Superman / Flash", "Iron Man / Capitán América", "Hulk / Thor",
    "Thor / Loki", "Thanos / Darth Vader", "Darth Vader / Kylo Ren", "Yoda / Grogu", "Harry Potter / Ron Weasley",
    "Hermione / Ginny", "Voldemort / Darth Vader", "Gandalf / Dumbledore", "Dumbledore / Gandalf", "Gollum / Dobby",
    "Homer Simpson / Peter Griffin", "Bart Simpson / Stewie", "Goku / Vegeta", "Vegeta / Goku", "Naruto / Sasuke",
    "Luffy / Zoro", "Elsa / Anna", "Buzz Lightyear / Woody", "Woody / Buzz Lightyear", "Rayo McQueen / Mate",
    "Nemo / Dory", "Simba / Mufasa", "Stitch / Lilo", "Minion / Gru", "Gru / Minion", "Mr. Bean / Chaplin",
    "Pocoyó / Peppa Pig", "Peppa Pig / George", "Doraemon / Shin Chan", "Shin Chan / Doraemon", "Scooby-Doo / Shaggy",
    "Tom / Jerry", "Bugs Bunny / Pato Lucas", "Steve (Minecraft) / Alex (Minecraft)", "Creeper / Zombie",
    "Link / Zelda", "Kratos / Atreus", "Lara Croft / Indiana Jones", "Chucky / Annabelle", "Wednesday Addams / Merlina"
  ]},

  "Música": { icono: "🎵", palabras: [
    "Pop / Indie", "Rock / Metal", "Jazz / Blues", "Rap / Trap", "Reguetón / Dembow", "Electrónica / Techno",
    "Clásica / Ópera", "Blues / Soul", "Country / Folk", "Indie / Pop", "Funk / Disco", "Soul / R&B",
    "Salsa / Bachata", "Bachata / Merengue", "Merengue / Salsa", "K-Pop / J-Pop", "Metal / Rock", "Trap / Drill",
    "House / Techno", "Techno / House", "Flamenco / Rumba", "Drill / Trap", "Dembow / Reguetón", "Cumbia / Salsa",
    "Punk / Rock", "Ópera / Clásica", "Reggae / Ska", "Corrido / Ranchera", "Gospel / Soul", "Lo-fi / Chill"
  ]},

  "Cantantes y artistas": { icono: "🎤", palabras: [
    "Bad Bunny / J Balvin", "J Balvin / Maluma", "Maluma / J Balvin", "Rosalía / Aitana", "Aitana / Lola Indigo",
    "Quevedo / Bizarrap", "Bizarrap / Quevedo", "Shakira / Karol G", "Karol G / Shakira", "Taylor Swift / Billie Eilish",
    "Billie Eilish / Olivia Rodrigo", "Ed Sheeran / Justin Bieber", "Justin Bieber / Ed Sheeran", "Drake / Kanye West",
    "Kanye West / Travis Scott", "Travis Scott / Drake", "Eminem / 50 Cent", "Michael Jackson / Prince",
    "Daddy Yankee / Don Omar", "Don Omar / Daddy Yankee", "Anuel AA / Ozuna", "Ozuna / Anuel AA", "Feid / Ryan Castro",
    "Myke Towers / Rauw Alejandro", "Rauw Alejandro / Myke Towers", "Peso Pluma / Natanael Cano", "C. Tangana / Rosalía",
    "Morad / Beny Jr", "Beny Jr / Morad", "Duki / Bizarrap", "Trueno / Duki", "Rels B / Juan Magán", "Dani Fernández / Pablo Alborán",
    "Pablo Alborán / Alejandro Sanz", "Alejandro Sanz / Pablo Alborán", "Melendi / Estopa", "Estopa / Melendi",
    "Queen / The Beatles", "The Beatles / The Rolling Stones", "Coldplay / Imagine Dragons", "Imagine Dragons / Coldplay",
    "BTS / Blackpink", "Blackpink / BTS", "Dua Lipa / Rihanna", "Rihanna / Beyoncé", "The Weeknd / Bruno Mars",
    "Bruno Mars / The Weeknd", "Jhayco / Myke Towers", "Saiko / Quevedo", "Daviles de Novelda / Melendi"
  ]},

  "Fútbol: equipos": { icono: "⚽", palabras: [
    "Real Madrid / Barcelona", "Barcelona / Real Madrid", "Atlético de Madrid / Real Madrid", "Sevilla / Betis",
    "Betis / Sevilla", "Valencia / Villarreal", "Villarreal / Valencia", "Athletic Club / Real Sociedad",
    "Real Sociedad / Athletic Club", "CD Tenerife / UD Las Palmas", "UD Las Palmas / CD Tenerife", "Girona / Espanyol",
    "Manchester United / Manchester City", "Manchester City / Manchester United", "Liverpool / Chelsea", "Chelsea / Arsenal",
    "Arsenal / Tottenham", "PSG / Olympique de Marsella", "Bayern de Múnich / Borussia Dortmund",
    "Borussia Dortmund / Bayern de Múnich", "Juventus / Inter de Milán", "Inter de Milán / AC Milan", "AC Milan / Inter de Milán",
    "Boca Juniors / River Plate", "River Plate / Boca Juniors", "Inter Miami / LA Galaxy", "Al Nassr / Al Hilal",
    "Napoli / Roma", "Ajax / PSV", "Benfica / Oporto", "Selección Española / Selección Portuguesa",
    "Selección Argentina / Selección Brasileña"
  ]},

  "Futbolistas": { icono: "🥅", palabras: [
    "Messi / Cristiano Ronaldo", "Cristiano Ronaldo / Messi", "Mbappé / Vinícius", "Vinícius / Rodrygo", "Haaland / Lewandowski",
    "Lewandowski / Haaland", "Lamine Yamal / Nico Williams", "Nico Williams / Lamine Yamal", "Pedri / Gavi", "Gavi / Pedri",
    "Bellingham / Valverde", "Valverde / Bellingham", "Neymar / Ronaldinho", "Ronaldinho / Neymar", "Modrić / Kroos",
    "Kroos / Modrić", "Sergio Ramos / Piqué", "Piqué / Sergio Ramos", "Iniesta / Xavi", "Xavi / Iniesta", "Casillas / Courtois",
    "Courtois / Ter Stegen", "Ter Stegen / Courtois", "Griezmann / Benzema", "Benzema / Griezmann", "Salah / Mané",
    "Kane / Lewandowski", "Pedro (futbolista) / Fernando Torres", "Fernando Torres / David Villa", "Zidane / Ronaldo Nazário",
    "Ronaldo Nazário / Zidane", "Maradona / Pelé", "Pelé / Maradona", "Ibrahimović / Cristiano Ronaldo", "Rodri / Busquets",
    "Busquets / Rodri", "Raphinha / Vinícius", "Kylian Mbappé / Erling Haaland", "Dani Carvajal / Jordi Alba",
    "Endrick / Arda Güler", "Saka / Foden", "De Bruyne / Modrić"
  ]},

  "Deportes": { icono: "🏅", palabras: [
    "Fútbol / Fútbol sala", "Fútbol sala / Fútbol", "Baloncesto / Balonmano", "Balonmano / Waterpolo", "Tenis / Pádel",
    "Pádel / Tenis", "Natación / Waterpolo", "Surf / Bodyboard", "Bodyboard / Surf", "Kitesurf / Windsurf",
    "Windsurf / Kitesurf", "Skate / Patinaje", "Ciclismo / Mountain bike", "Atletismo / Running", "Boxeo / Kickboxing",
    "Kárate / Taekwondo", "Judo / Lucha libre", "Golf / Minigolf", "Voleibol / Vóley playa", "Rugby / Fútbol americano",
    "Fútbol americano / Rugby", "Béisbol / Críquet", "Esquí / Snowboard", "Snowboard / Esquí", "Escalada / Senderismo",
    "Senderismo / Escalada", "Fórmula 1 / MotoGP", "MotoGP / Fórmula 1", "Gimnasia / Danza", "Crossfit / Gimnasio",
    "Hockey / Hockey sobre hielo", "Ping pong / Bádminton", "Bádminton / Ping pong", "Esgrima / Kendo", "Parkour / Escalada",
    "Buceo / Snorkel", "Snorkel / Buceo", "Lucha canaria / Lucha libre", "UFC / Boxeo", "Calistenia / Crossfit", "Ajedrez / Damas"
  ]},

  "Profesiones": { icono: "👷", palabras: [
    "Médico / Enfermero", "Profesor / Director", "Ingeniero / Arquitecto", "Abogado / Juez", "Enfermero / Médico",
    "Carpintero / Albañil", "Panadero / Pastelero", "Peluquero / Barbero", "Policía / Guardia Civil", "Bombero / Socorrista",
    "Electricista / Fontanero", "Programador / Informático", "Diseñador / Pintor", "Arquitecto / Ingeniero",
    "Periodista / Presentador", "Cocinero / Camarero", "Mecánico / Electricista", "Dentista / Médico", "Veterinario / Médico",
    "Agricultor / Ganadero", "Piloto / Azafato", "Azafato / Piloto", "Astronauta / Piloto", "Youtuber / Streamer",
    "Streamer / Youtuber", "Futbolista / Entrenador", "Entrenador / Árbitro", "Árbitro / Juez", "Socorrista / Bombero",
    "Fontanero / Electricista", "Cajero / Dependiente", "Dependiente / Cajero", "Taxista / Conductor de guagua",
    "Conductor de guagua / Taxista", "Cartero / Repartidor", "Repartidor / Cartero", "Actor / Cantante", "Cantante / Actor",
    "Fotógrafo / Cámara", "Psicólogo / Psiquiatra", "Farmacéutico / Médico", "Militar / Policía", "Detective / Policía",
    "Científico / Investigador", "Influencer / Youtuber", "Jardinero / Agricultor", "Pescador / Marinero", "Surfista / Socorrista"
  ]},

  "Ciencia": { icono: "🔬", palabras: [
    "Física / Química", "Química / Física", "Biología / Medicina", "Astronomía / Astrología", "Geología / Vulcanología",
    "Botánica / Biología", "Zoología / Veterinaria", "Ecología / Medio ambiente", "Genética / ADN", "Meteorología / Clima",
    "Neurociencia / Psicología", "Matemáticas / Física", "Robótica / Informática", "Nanotecnología / Robótica",
    "Microbiología / Virología", "Psicología / Filosofía", "Oceanografía / Biología marina", "Paleontología / Arqueología",
    "Farmacología / Química", "Ingeniería genética / Clonación", "Átomo / Molécula", "Molécula / Átomo", "Célula / Bacteria",
    "Bacteria / Virus", "Virus / Bacteria", "ADN / Gen", "Gravedad / Magnetismo", "Agujero negro / Estrella",
    "Planeta / Estrella", "Galaxia / Universo", "Luna / Sol", "Sol / Estrella", "Volcán / Terremoto", "Terremoto / Tsunami",
    "Fotosíntesis / Respiración", "Electricidad / Magnetismo", "Microscopio / Telescopio", "Telescopio / Microscopio",
    "Dinosaurio / Fósil", "Evolución / Selección natural", "Tabla periódica / Elemento químico", "Laboratorio / Experimento"
  ]},

  "Cuerpo humano": { icono: "🫀", palabras: [
    "Corazón / Pulmón", "Pulmón / Corazón", "Cerebro / Cráneo", "Hígado / Riñón", "Riñón / Hígado", "Estómago / Intestino",
    "Ojo / Oreja", "Oreja / Nariz", "Nariz / Boca", "Boca / Labios", "Diente / Muela", "Lengua / Diente", "Mano / Pie",
    "Pie / Mano", "Rodilla / Codo", "Codo / Rodilla", "Hombro / Cadera", "Cuello / Garganta", "Espalda / Pecho",
    "Ombligo / Barriga", "Uña / Pelo", "Pelo / Barba", "Ceja / Pestaña", "Pestaña / Ceja", "Dedo / Uña", "Tobillo / Muñeca",
    "Muñeca / Tobillo", "Hueso / Músculo", "Músculo / Hueso", "Sangre / Sudor", "Piel / Pelo", "Esqueleto / Calavera",
    "Talón / Tobillo", "Mejilla / Barbilla", "Barbilla / Mandíbula", "Bíceps / Tríceps"
  ]},

  "Plantas": { icono: "🌿", palabras: [
    "Roble / Pino", "Pino / Abeto", "Palmera / Cocotero", "Higuera / Olivo", "Cactus / Aloe vera", "Aloe vera / Cactus",
    "Rosa / Clavel", "Girasol / Margarita", "Tulipán / Rosa", "Orquídea / Lirio", "Lavanda / Romero", "Menta / Hierbabuena",
    "Albahaca / Perejil", "Tomatera / Pimiento", "Patata / Batata", "Bambú / Caña", "Helecho / Musgo", "Lirio / Orquídea",
    "Magnolia / Jazmín", "Olivo / Higuera", "Drago / Palmera", "Margarita / Girasol", "Clavel / Rosa", "Jazmín / Azahar",
    "Musgo / Césped", "Césped / Musgo", "Seta / Champiñón", "Champiñón / Seta", "Calabaza / Sandía", "Sandía / Melón",
    "Melón / Sandía", "Plátano / Platanera", "Naranjo / Limonero", "Limonero / Naranjo", "Manzano / Peral",
    "Tabaiba / Cardón", "Cardón / Tabaiba", "Bonsái / Árbol", "Hiedra / Enredadera", "Buganvilla / Hibisco"
  ]},

  "Instrumentos musicales": { icono: "🎸", palabras: [
    "Guitarra / Bajo", "Piano / Teclado", "Violín / Viola", "Batería / Cajón", "Saxofón / Clarinete", "Flauta / Flauta dulce",
    "Trompeta / Trombón", "Acordeón / Armónica", "Ukelele / Timple", "Cello / Contrabajo", "Contrabajo / Cello",
    "Clarinete / Oboe", "Órgano / Piano", "Armónica / Acordeón", "Mandolina / Laúd", "Xilófono / Marimba", "Oboe / Fagot",
    "Trombón / Tuba", "Banjo / Ukelele", "Sitar / Guitarra", "Timple / Ukelele", "Bajo / Guitarra", "Arpa / Lira",
    "Pandereta / Maracas", "Maracas / Pandereta", "Triángulo / Campana", "Tambor / Batería", "Gaita / Flauta",
    "Castañuelas / Palmas", "Tuba / Trombón", "Cajón / Batería", "DJ / Mesa de mezclas"
  ]},

  "Emociones": { icono: "😄", palabras: [
    "Alegría / Euforia", "Tristeza / Nostalgia", "Ira / Frustración", "Sorpresa / Confusión", "Miedo / Ansiedad",
    "Calma / Alivio", "Nostalgia / Tristeza", "Euforia / Alegría", "Vergüenza / Culpa", "Orgullo / Satisfacción",
    "Ansiedad / Nervios", "Curiosidad / Interés", "Empatía / Compasión", "Envidia / Celos", "Amor / Cariño",
    "Aburrimiento / Pereza", "Confusión / Duda", "Gratitud / Admiración", "Frustración / Ira", "Alivio / Calma",
    "Celos / Envidia", "Esperanza / Ilusión", "Ilusión / Esperanza", "Asco / Rechazo", "Soledad / Tristeza",
    "Nervios / Ansiedad", "Pereza / Aburrimiento", "Cariño / Amor", "Odio / Rencor", "Paz / Calma"
  ]},

  "Ropa y accesorios": { icono: "👕", palabras: [
    "Camiseta / Polo", "Pantalones / Vaqueros", "Zapatillas / Zapatos", "Chaqueta / Abrigo", "Gorra / Sombrero",
    "Sombrero / Gorra", "Bufanda / Pañuelo", "Guantes / Manoplas", "Calcetines / Medias", "Corbata / Pajarita",
    "Vestido / Falda", "Falda / Vestido", "Botas / Botines", "Chanclas / Sandalias", "Pijama / Chándal", "Traje / Esmoquin",
    "Cinturón / Tirantes", "Reloj / Pulsera", "Mochila / Riñonera", "Bolso / Cartera", "Sudadera / Jersey", "Jersey / Sudadera",
    "Chándal / Pijama", "Bañador / Bikini", "Bikini / Bañador", "Gafas de sol / Gafas", "Collar / Colgante", "Pendientes / Piercing",
    "Anillo / Pulsera", "Gorro de lana / Gorra", "Pantalón corto / Bañador", "Camiseta de fútbol / Camiseta",
    "Chaleco / Chaqueta", "Bata / Albornoz", "Albornoz / Toalla", "Riñonera / Mochila", "Calzoncillos / Bañador",
    "Uniforme / Traje", "Disfraz / Uniforme", "Crocs / Chanclas"
  ]},

  "Herramientas": { icono: "🔧", palabras: [
    "Martillo / Maza", "Destornillador / Llave inglesa", "Alicates / Tenazas", "Taladro / Atornillador", "Sierra / Serrucho",
    "Llave inglesa / Alicates", "Cúter / Tijeras", "Nivel / Escuadra", "Cinta métrica / Regla", "Lima / Lija",
    "Soldador / Soplete", "Cepillo de carpintero / Lija", "Maza / Martillo", "Pala / Rastrillo", "Rastrillo / Pala",
    "Soplete / Soldador", "Broca / Tornillo", "Torno / Taladro", "Tijeras / Cúter", "Engranaje / Tuerca", "Tornillo / Clavo",
    "Clavo / Tornillo", "Tuerca / Arandela", "Escalera / Andamio", "Carretilla / Pala", "Hacha / Sierra", "Pistola de silicona / Pegamento",
    "Lija / Lima", "Gato (coche) / Llave de rueda", "Cortacésped / Desbrozadora", "Manguera / Regadera", "Brocha / Rodillo",
    "Rodillo / Brocha", "Linterna frontal / Linterna", "Cinta americana / Celo"
  ]},

  "Instituto": { icono: "🏫", palabras: [
    "Examen / Control", "Control / Examen", "Recreo / Descanso", "Deberes / Trabajo", "Profesor de guardia / Tutor",
    "Tutor / Director", "Director / Jefe de estudios", "Pizarra / Proyector", "Proyector / Pizarra digital", "Libreta / Cuaderno",
    "Estuche / Mochila", "Típex / Goma de borrar", "Goma de borrar / Típex", "Subrayador / Rotulador", "Calculadora / Regla",
    "Compás / Transportador", "Matemáticas / Física", "Lengua / Literatura", "Inglés / Francés", "Historia / Geografía",
    "Educación Física / Recreo", "Tecnología / Informática", "Filosofía / Ética", "Química / Biología", "Biología / Química",
    "Recuperación / Examen", "Boletín de notas / Examen", "Excursión / Viaje de estudios", "Viaje de estudios / Excursión",
    "Graduación / Fiesta", "Cafetería / Comedor", "Conserje / Profesor", "Expulsión / Parte", "Parte / Expulsión",
    "Chuleta / Apuntes", "Apuntes / Chuleta", "Trabajo en grupo / Exposición", "Exposición / Presentación", "Selectividad / Bachillerato",
    "Bachillerato / ESO", "EBAU / Selectividad", "Taquilla / Mochila", "Huelga / Vacaciones", "Novillos / Faltar a clase"
  ]},

  "Fiesta y ocio": { icono: "🎉", palabras: [
    "Cumpleaños / Fiesta", "Fiesta / Discoteca", "Discoteca / Fiesta", "Concierto / Festival", "Festival / Concierto",
    "Karaoke / Concierto", "Barbacoa / Paella en la playa", "Pijamada / Acampada", "Acampada / Pijamada", "Carnaval / Halloween",
    "Halloween / Carnaval", "Navidad / Reyes", "Reyes Magos / Papá Noel", "Papá Noel / Reyes Magos", "Nochevieja / Año Nuevo",
    "Uvas / Cava", "Fuegos artificiales / Petardos", "Petardos / Fuegos artificiales", "Disfraz / Máscara", "Piñata / Globo",
    "Tarta de cumpleaños / Velas", "Regalo / Sorpresa", "Juegos de mesa / Cartas", "UNO / Parchís", "Parchís / Oca",
    "Monopoly / Catán", "Cartas / Póker", "Verdad o reto / Yo nunca", "Yo nunca / Verdad o reto", "Escondite / Pilla pilla",
    "Pilla pilla / Escondite", "Bolera / Billar", "Billar / Futbolín", "Futbolín / Billar", "Feria / Parque de atracciones",
    "Noria / Montaña rusa", "Montaña rusa / Noria", "Cine / Netflix", "Maratón de series / Maratón de pelis", "Día de playa / Día de piscina",
    "Viaje / Excursión", "Boda / Comunión", "Comunión / Bautizo"
  ]},

  "Fantasía y terror": { icono: "🐉", palabras: [
    "Dragón / Dinosaurio", "Vampiro / Zombi", "Zombi / Vampiro", "Hombre lobo / Vampiro", "Fantasma / Espíritu",
    "Bruja / Mago", "Mago / Bruja", "Hada / Elfo", "Elfo / Enano", "Enano / Elfo", "Unicornio / Pegaso", "Pegaso / Unicornio",
    "Sirena / Tritón", "Duende / Gnomo", "Ogro / Troll", "Troll / Ogro", "Fénix / Dragón", "Momia / Zombi", "Esqueleto / Calavera",
    "Alien / Ovni", "Ovni / Alien", "Robot / Androide", "Demonio / Ángel", "Ángel / Demonio", "Payaso / Bufón", "Varita / Báculo",
    "Poción / Hechizo", "Hechizo / Poción", "Castillo encantado / Casa encantada", "Kraken / Leviatán", "Yeti / Bigfoot",
    "Bigfoot / Yeti", "Minotauro / Centauro", "Centauro / Minotauro", "Medusa (mitología) / Gorgona", "Ninja / Samurái",
    "Samurái / Ninja", "Pirata / Corsario", "Caballero / Vikingo", "Vikingo / Pirata", "Superhéroe / Villano", "Villano / Superhéroe"
  ]},

  "Transporte": { icono: "🚌", palabras: [
    "Coche / Furgoneta", "Moto / Scooter", "Scooter / Moto", "Bicicleta / Patinete", "Patinete / Bicicleta", "Guagua / Tranvía",
    "Tranvía / Tren", "Tren / Metro", "Metro / Tren", "Avión / Avioneta", "Avioneta / Helicóptero", "Helicóptero / Avioneta",
    "Barco / Lancha", "Ferry / Crucero", "Crucero / Ferry", "Lancha / Moto de agua", "Moto de agua / Lancha", "Velero / Barco",
    "Kayak / Canoa", "Canoa / Kayak", "Taxi / Uber", "Uber / Taxi", "Camión / Furgoneta", "Furgoneta / Camión",
    "Ambulancia / Coche de policía", "Coche de policía / Ambulancia", "Camión de bomberos / Ambulancia", "Tractor / Excavadora",
    "Excavadora / Grúa", "Grúa / Excavadora", "Quad / Buggy", "Buggy / Quad", "Globo aerostático / Dirigible", "Cohete / Nave espacial",
    "Submarino / Barco", "Teleférico / Telesilla", "Monopatín / Patinete", "Caravana / Autocaravana", "Limusina / Coche",
    "Karts / Coche de choque", "Coche de choque / Karts", "Patines / Monopatín"
  ]},

  "Casa": { icono: "🏠", palabras: [
    "Cocina / Comedor", "Comedor / Salón", "Salón / Comedor", "Baño / Aseo", "Dormitorio / Habitación", "Garaje / Trastero",
    "Trastero / Garaje", "Terraza / Balcón", "Balcón / Terraza", "Azotea / Terraza", "Jardín / Patio", "Patio / Jardín",
    "Pasillo / Recibidor", "Ático / Buhardilla", "Sótano / Garaje", "Ascensor / Escaleras", "Escaleras / Ascensor",
    "Ventana / Puerta", "Puerta / Ventana", "Timbre / Telefonillo", "Buzón / Telefonillo", "Chimenea / Estufa",
    "Aire acondicionado / Ventilador", "Ventilador / Aire acondicionado", "Bañera / Ducha", "Ducha / Bañera", "Váter / Bidé",
    "Litera / Cama", "Armario / Cómoda", "Cómoda / Mesita de noche", "Estantería / Librería", "Sofá cama / Sofá",
    "Lavavajillas / Lavadora", "Tostadora / Sandwichera", "Freidora de aire / Horno", "Cafetera / Tetera", "Batidora / Licuadora",
    "Piscina / Jacuzzi", "Jacuzzi / Piscina", "Hamaca / Tumbona"
  ]},

  "Streamers y famosos": { icono: "🌟", palabras: [
    "Ibai / AuronPlay", "AuronPlay / Ibai", "El Rubius / TheGrefg", "TheGrefg / El Rubius", "Illojuan / Ibai",
    "Spreen / Rivers", "Rivers / Spreen", "Willyrex / Vegetta777", "Vegetta777 / Willyrex", "Mr. Beast / Speed",
    "Speed / Kai Cenat", "Kai Cenat / Speed", "Xokas / Illojuan", "Westcol / Spreen", "DjMaRiiO / Ibai", "Mrwhosetheboss / Xataka",
    "Rubén Doblas / Ibai", "Elon Musk / Mark Zuckerberg", "Mark Zuckerberg / Elon Musk", "Jeff Bezos / Elon Musk",
    "Pablo Motos / David Broncano", "David Broncano / Pablo Motos", "Jordi Wild / Ibai", "La Pantoja / Lola Flores",
    "Kim Kardashian / Kylie Jenner", "Kylie Jenner / Kim Kardashian", "Zendaya / Tom Holland", "Tom Holland / Zendaya",
    "Leonardo DiCaprio / Brad Pitt", "Brad Pitt / Leonardo DiCaprio", "Dwayne Johnson (La Roca) / Vin Diesel",
    "Vin Diesel / Dwayne Johnson (La Roca)", "Rafa Nadal / Carlos Alcaraz", "Carlos Alcaraz / Rafa Nadal", "Fernando Alonso / Carlos Sainz",
    "Carlos Sainz / Fernando Alonso", "Marc Márquez / Valentino Rossi", "LeBron James / Michael Jordan", "Michael Jordan / LeBron James",
    "Ilia Topuria / Conor McGregor", "Conor McGregor / Ilia Topuria", "Usain Bolt / Carl Lewis"
  ]},

  "Memes y jerga": { icono: "😂", palabras: [
    "67 / 41", "Aura / Rizz", "Rizz / Aura", "Skibidi / Sigma", "Sigma / Alfa", "NPC / Bot", "Cringe / Vergüenza ajena",
    "Mewing / Looksmaxxing", "Looksmaxxing / Mewing", "Bro / Tío", "Random / Raro", "Crush / Novio", "Ghostear / Dejar en visto",
    "Dejar en visto / Ghostear", "Funar / Cancelar", "Cancelar / Funar", "Red flag / Green flag", "Green flag / Red flag",
    "POV / Storytime", "Storytime / POV", "Basado / Real", "Real / Basado", "Tralalero Tralala / Bombardiro Crocodilo",
    "Bombardiro Crocodilo / Tralalero Tralala", "Tung Tung Tung Sahur / Tralalero Tralala", "Rickroll / Trollface",
    "Stonks / Dinero", "Chad / Sigma", "Delulu / Flipado", "Flipado / Delulu", "GOAT / Crack", "Crack / Máquina", "Máquina / Crack",
    "Hater / Troll", "Troll / Hater", "Spoiler / Teaser", "Lag / Bug", "Bug / Lag", "Noob / Pro", "Pro / Noob", "Shiny / Legendario",
    "Fit / Outfit", "Outfit / Fit", "Vibe / Rollo", "Literal / Literalmente", "Mood / Vibe", "Chill / Tranqui", "Facha / Estilo"
  ]},

  "Naturaleza y clima": { icono: "⛅", palabras: [
    "Lluvia / Tormenta", "Tormenta / Huracán", "Huracán / Tornado", "Tornado / Huracán", "Nieve / Granizo", "Granizo / Nieve",
    "Niebla / Calima", "Calima / Niebla", "Arcoíris / Aurora boreal", "Aurora boreal / Arcoíris", "Rayo / Trueno", "Trueno / Rayo",
    "Viento / Brisa", "Sol / Calor", "Ola / Marea", "Marea / Ola", "Río / Lago", "Lago / Laguna", "Cascada / Río", "Mar / Océano",
    "Océano / Mar", "Volcán / Montaña", "Montaña / Colina", "Isla / Islote", "Playa / Cala", "Desierto / Sabana", "Glaciar / Iceberg",
    "Iceberg / Glaciar", "Selva / Jungla", "Arena / Tierra", "Piedra / Roca", "Lava / Magma", "Terremoto / Erupción",
    "Eclipse / Luna llena", "Luna llena / Eclipse", "Estrella fugaz / Cometa", "Cometa / Meteorito", "Amanecer / Atardecer",
    "Atardecer / Amanecer", "Primavera / Verano", "Verano / Primavera", "Otoño / Invierno", "Invierno / Otoño"
  ]}
};

/* =========================================================
   MODO PREGUNTAS
   Todos reciben la pregunta normal y el impostor una parecida.
   Cada uno contesta en voz alta (o con los dedos a la vez)
   y hay que descubrir quién tenía otra pregunta.
   Formato: [pregunta normal, pregunta del impostor]
   {J} y {J2} se cambian por jugadores de la partida.
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
