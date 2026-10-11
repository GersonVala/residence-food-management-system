import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { authRepository } from "./auth.repository.js";
import { generarPasswordTemporal } from "../../shared/utils/password.js";
import type { JwtPayload } from "../../shared/middlewares/auth.middleware.js";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

export type LoginResult = {
  token: string;
  primer_login: boolean;
  usuario: {
    id: number;
    email: string;
    role: string;
    residencia_id: number | null;
  };
};

export type ResetResult = {
  password_temporal: string;
};

export const authService = {
  /**
   * Autentica un usuario con email y contraseña.
   * Lanza error 401 si las credenciales son incorrectas o el usuario está inactivo.
   */
  async login(
    email: string,
    password: string,
    app: FastifyInstance
  ): Promise<LoginResult> {
    const usuario = await authRepository.findByEmail(email);

    if (!usuario || !usuario.active) {
      throw { statusCode: 401, error: "No autorizado", mensaje: "Credenciales incorrectas" };
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      throw { statusCode: 401, error: "No autorizado", mensaje: "Credenciales incorrectas" };
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      residencia_id: usuario.residencia_id,
    };

    const token = app.jwt.sign(payload);

    return {
      token,
      primer_login: usuario.first_login,
      usuario: payload,
    };
  },

  /**
   * Cambia la contraseña del usuario autenticado.
   * Valida la contraseña actual y aplica mínimo de longitud.
   */
  async cambiarPassword(
    userId: number,
    passwordActual: string,
    passwordNuevo: string
  ): Promise<void> {
    if (passwordNuevo.length < MIN_PASSWORD_LENGTH) {
      throw {
        statusCode: 400,
        error: "Validación",
        mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      };
    }

    const usuario = await authRepository.findById(userId);
    if (!usuario) {
      throw { statusCode: 404, error: "No encontrado", mensaje: "Usuario no encontrado" };
    }

    const actualValida = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!actualValida) {
      throw {
        statusCode: 401,
        error: "No autorizado",
        mensaje: "La contraseña actual es incorrecta",
      };
    }

    const nuevoHash = await bcrypt.hash(passwordNuevo, SALT_ROUNDS);
    await authRepository.updatePassword(userId, nuevoHash, false);
  },

  /**
   * Resetea la contraseña de un usuario (acción de admin).
   * - ADMIN_GLOBAL puede resetear a cualquiera.
   * - ADMIN_RESIDENCIA solo a RESIDENTES de su propia residencia (403 si no).
   * Genera una contraseña temporal aleatoria y marca first_login = true.
   */
  async resetPassword(
    actor: Pick<JwtPayload, "role" | "residencia_id">,
    targetUserId: number
  ): Promise<ResetResult> {
    const usuario = await authRepository.findByIdConResidente(targetUserId);
    if (!usuario) {
      throw { statusCode: 404, error: "No encontrado", mensaje: "Usuario no encontrado" };
    }

    if (actor.role !== "ADMIN_GLOBAL") {
      const esResidenteDeSuResidencia =
        usuario.role === "RESIDENTE" &&
        usuario.residente !== null &&
        actor.residencia_id !== null &&
        usuario.residente.residencia_id === actor.residencia_id;

      if (!esResidenteDeSuResidencia) {
        throw {
          statusCode: 403,
          error: "Acceso prohibido",
          mensaje: "Solo podés resetear la contraseña de residentes de tu residencia",
        };
      }
    }

    const passwordTemporal = generarPasswordTemporal();
    const hash = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

    await authRepository.updatePassword(targetUserId, hash, true);

    return { password_temporal: passwordTemporal };
  },
};
