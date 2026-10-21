// Carga las palabras de palabras.js para el servidor.
//
// palabras.js es un script normal del navegador (declara constantes globales),
// no un modulo. Para no tener las palabras repetidas en dos sitios, aqui se lee
// el fichero tal cual y se evalua aparte. Solo lo usa el servidor y las pruebas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function cargarBanco(ruta = path.join(RAIZ, 'palabras.js')) {
  const codigo = fs.readFileSync(ruta, 'utf8');
  // eslint-disable-next-line no-new-func
  const sacar = new Function(`${codigo}
    return { CATEGORIAS, PREGUNTAS, PREGUNTAS_PICANTES, PREGUNTAS_JUGADORES };`);
  return sacar();
}
