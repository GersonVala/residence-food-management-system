import type { FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  id: number;
  email: string;
  role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" | "RESIDENTE";
  residencia_id: number | null;
}

declare module "fastify" {
  interface FastifyRequest {
    usuario: JwtPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    request.usuario = request.user as JwtPayload;
  } catch (_err) {
    reply.status(401).send({
      error: "No autorizado",
      mensaje: "Token inválido o expirado",
    });
  }
}
