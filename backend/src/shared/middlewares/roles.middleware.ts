import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "./auth.middleware.js";

type Role = JwtPayload["role"];

/**
 * Crea un middleware que restringe el acceso a los roles indicados.
 * Uso: preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")]
 */
export function requireRoles(...roles: Role[]) {
  return async function rolesMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const usuario = request.usuario;

    if (!usuario) {
      reply.status(401).send({
        error: "No autorizado",
        mensaje: "Autenticación requerida",
      });
      return;
    }

    if (!roles.includes(usuario.role)) {
      reply.status(403).send({
        error: "Acceso prohibido",
        mensaje: `Se requiere uno de los siguientes roles: ${roles.join(", ")}`,
      });
      return;
    }
  };
}
