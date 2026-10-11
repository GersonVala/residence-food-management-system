import { randomInt } from "node:crypto";

// Sin caracteres ambiguos (0/O/o, 1/l/I) para que se pueda dictar o copiar a mano sin errores.
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Genera una contraseña temporal criptográficamente segura (crypto.randomInt).
 * Se usa al crear residentes/usuarios y al resetear contraseñas.
 */
export function generarPasswordTemporal(largo = 10): string {
  let resultado = "";
  for (let i = 0; i < largo; i++) {
    resultado += CARACTERES[randomInt(CARACTERES.length)];
  }
  return resultado;
}
