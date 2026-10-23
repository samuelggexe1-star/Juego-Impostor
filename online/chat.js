// El chat general: uno solo para todo el mundo, este en la sala que este o en
// la entrada. Logica pura, como las salas: el servidor solo reparte.
//
// Solo se guardan los ultimos mensajes en memoria. No hace falta mas: es para
// hablar mientras se juega, no un historial.

export const MAX_MENSAJES = 80;
export const LARGO_MAXIMO = 200;
/** Entre mensaje y mensaje de la misma persona (para que nadie llene el chat). */
export const ESPERA_MS = 1200;

export function crearChat({ ahora = () => Date.now() } = {}) {
  const mensajes = [];
  const ultimo = new Map();   // id -> { t, texto }
  let siguiente = 1;

  return {
    mensajes,

    /**
     * Publica un mensaje. `donde` es lo que se enseña al lado del nombre
     * ("Sala 1", "Sala privada"…) o null si esta en la entrada.
     */
    publicar({ id, nombre, color, donde, texto }) {
      const limpio = String(texto || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO);
      if (!limpio) return { error: 'Escribe algo' };
      const nom = String(nombre || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Anónimo';
      const t = ahora();
      const antes = ultimo.get(id);
      if (antes && t - antes.t < ESPERA_MS) return { error: 'Más despacio 😅' };
      if (antes && antes.texto === limpio && t - antes.t < 10000) return { error: 'Ya lo has dicho' };
      ultimo.set(id, { t, texto: limpio });
      if (ultimo.size > 2000) ultimo.clear();

      const mensaje = {
        n: siguiente++,
        autor: id,
        nombre: nom,
        color: String(color || '').slice(0, 20),
        donde: donde ? String(donde).slice(0, 24) : null,
        texto: limpio,
        t
      };
      mensajes.push(mensaje);
      if (mensajes.length > MAX_MENSAJES) mensajes.splice(0, mensajes.length - MAX_MENSAJES);
      return { mensaje };
    }
  };
}
