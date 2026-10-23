# IMPOSTOR 🔪

Juego de fiesta para jugar con un solo móvil pasándolo de mano en mano. Todos reciben la misma palabra menos el impostor, que tiene que disimular.

## Cómo se juega

1. Apuntad los jugadores (mínimo 3) y elegid modo y categorías.
2. Pasad el móvil: cada uno **mantiene pulsada la carta** para ver su palabra y la suelta para ocultarla.
3. Por turnos, cada uno dice una palabra relacionada con la secreta.
4. Debatid, votad y expulsad al sospechoso.
5. Si pilláis al impostor ganan los inocentes… salvo que adivine la palabra.

## Modos

- 🕵️ **Clásico**: el impostor sabe que lo es. Puede tener pista (categoría, palabra parecida o las dos).
- 🎭 **Undercover**: el impostor recibe una palabra parecida (Pizza / Lasaña) y no sabe que es el impostor.
- 💬 **Preguntas**: todos responden a una pregunta y el impostor tiene otra distinta.
- 👑 **Admin**: alguien que no juega elige la palabra y los impostores.

## Funciones

- 42 categorías y más de 1.600 palabras, cada una con su "palabra gemela".
- Categoría **Vosotros 👥**: frases con los jugadores de la partida ("El móvil de Mateo", "Diego a las 3 de la mañana").
- Categoría **Cosas raras 🤢** para echar unas risas.
- Modo Preguntas con preguntas **picantes 🌶️** y preguntas **sobre los jugadores** (se activan en Ajustes).
- Categorías propias creadas desde la app.
- Número de impostores automático según jugadores, o manual.
- Rondas trampa: a veces no hay impostor o lo son todos (probabilidad ajustable).
- **Pistas escritas ✍️**: en vez de hablar, cada uno escribe su palabra en el iPad por turnos (1 a 3 palabras por persona) y salen todas en un muro.
- Ajustes por bloques con interruptores y **partidas ya preparadas** (Rápida, Sin hablar, Clásica, Caos).
- Expulsiones por rondas hasta pillar al impostor.
- Votación rápida o secreta en el móvil.
- El impostor pillado puede robar la victoria adivinando la palabra.
- Orden de turnos al azar (el impostor nunca empieza, si quieres).
- Cronómetro ajustable con sonido y vibración.
- Marcador de puntos e historial de rondas.
- No repite palabras hasta que salen todas.
- Todo se guarda en el navegador.

## 🌐 Modo online (cada uno con su móvil)

Montado igual que el billar: un servidor Node sin dependencias, salas con código de 4 letras y SSE + POST (funciona en la wifi del instituto, que bloquea los websockets).

- **Perfil en cada móvil**: nombre, foto y color favorito. Se guarda en el móvil, así que al volver otro día sale arriba a la derecha y se puede editar. También guarda tus estadísticas (partidas, victorias, veces de impostor) y te ofrece volver a tu última sala.
- **Salas públicas**: al entrar salen siempre *Sala 1*, *Sala 2* y *Sala 3*, con cuánta gente hay, quiénes son y si están jugando. Entra quien quiera; manda el primero que llega. Si llegas con la partida empezada, entras en la siguiente ronda. Cuando se quedan vacías un rato, vuelven a empezar de cero.
- **Espectadores 👀**: se puede entrar a mirar (botón *Mirar* en las públicas, o la casilla al entrar con código) o pasarse a espectador desde la sala de espera. El espectador lo ve todo: la palabra, quién es el impostor, la carta de cada uno, las respuestas y los votos en directo. Quien llega con la ronda en marcha la ve así y juega desde la siguiente. El anfitrión puede desactivar que los espectadores vean los roles.
- **Chat general 💬**: un botón abajo a la derecha abre un chat donde habla todo el mundo, esté en la sala que esté o en la entrada. Se ve desde qué sala escribe cada uno.
- **Salir en plena partida 🚪**: el botón de la puerta (arriba) te saca aunque la ronda esté en marcha. Quien se va deja de jugar esa ronda y no se lleva puntos; si era el impostor, ganan los inocentes, y si los impostores pasan a ser la mitad, ganan ellos.
- **Salas privadas**: el anfitrión crea una y comparte el código de 4 letras o el enlace de invitación.
- **Cada uno ve su carta en su móvil.** El servidor solo le manda a cada móvil SU carta, así que nadie puede mirar quién es el impostor.
- **Pistas escritas ✍️** (ajuste): cada uno escribe su palabra en su móvil cuando le toca, con tiempo por turno, y salen todas en un muro animado antes de votar.
- **Ajustes por secciones** que se abren y cierran, con contadores, interruptores y partidas ya preparadas (Rápida, Sin hablar, Misterio, Caos).
- **Debate y votación a la vez**: hay un tiempo (1 a 10 min) para hablar y votar. Cuando se acaba, sale el más votado (si gana «saltar», no sale nadie). Se puede cambiar el voto hasta el final, o desactivarlo.
- **Varios expulsados por turno** (ajuste): si son 2, cada uno vota a 2 personas y salen los 2 más votados. Si hay empate en el último hueco, no sale ninguno de los empatados.
- **Roles ocultos** (ajuste): no se dice si el expulsado era impostor; se descubre al final, con la lista de expulsados de cada vuelta.
- Si los impostores llegan a ser la mitad de los que quedan, ganan directamente.
- **Expulsión** en el espacio: "X era el impostor." / "X ha sido expulsado."
- **VICTORIA / DERROTA** según tu bando, y marcador de la sala.
- En el modo Preguntas cada uno escribe su respuesta en su móvil y se revelan todas a la vez.

### Probarlo en tu ordenador

```bash
npm start        # y abrir http://localhost:8080/online.html
npm test         # las pruebas de las salas
```

En la misma wifi, los demás pueden entrar con la IP de tu ordenador (por ejemplo `http://192.168.1.35:8080/online.html`).

### Dónde está

**👉 https://impostor-sd7s.onrender.com/online.html**

Está desplegado en Render con `render.yaml` (plan gratis). La dirección está puesta en `online/red.js` y en `script.js` (`SERVIDOR_ONLINE`), así que el botón "Jugar online" de GitHub Pages lleva directamente allí. Cada vez que se sube algo a `main`, Render lo vuelve a desplegar.

El plan gratis se duerme si nadie entra en un rato: la primera vez tarda unos segundos en despertar.

## Archivos

- `index.html`: pantallas del juego
- `style.css`: estilos
- `script.js`: lógica
- `online.html`, `online/`: el modo online (cliente, lógica de salas y red)
- `server.js`: el servidor del modo online
- `tests/`: pruebas del modo online
- `palabras.js`: categorías, palabras y preguntas. Para añadir palabras, escribe una línea nueva con el formato `"Palabra / Parecida"`.
