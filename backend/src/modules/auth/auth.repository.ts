import { prisma } from "../../shared/prisma/client.js";
import type { User } from "@prisma/client";

export const authRepository = {
  /**
   * Busca un usuario por email. Retorna null si no existe.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * Busca un usuario por id. Retorna null si no existe.
   */
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Actualiza la contraseña de un usuario y opcionalmente su first_login.
   */
  async updatePassword(
    id: number,
    password_hash: string,
    first_login: boolean
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { password_hash, first_login },
    });
  },

  /**
   * Marca el primer login como completado (first_login → false).
   */
  async setFirstLoginDone(id: number): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { first_login: false },
    });
  },
};
