import { randomInt } from "node:crypto";

/** Largo mínimo de cualquier contraseña elegida por una persona (cambio de contraseña y alta de usuarios). */
export const MIN_PASSWORD_LENGTH = 6;

// Sin caracteres ambiguos (0/O/o, 1/l/I) para que se pueda dictar o copiar a mano sin errores.
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Genera una contraseña temporal criptográficamente segura (crypto.randomInt).
 * Se usa únicamente al resetear contraseñas: las altas usan una contraseña inicial
 * conocida (DNI del residente o la que elige el admin).
 */
export function generarPasswordTemporal(largo = 10): string {
  let resultado = "";
  for (let i = 0; i < largo; i++) {
    resultado += CARACTERES[randomInt(CARACTERES.length)];
  }
  return resultado;
}
