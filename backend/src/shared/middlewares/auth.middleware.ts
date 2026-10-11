import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../prisma/client.js";

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

export const CAMBIO_PASSWORD_REQUERIDO = "CAMBIO_PASSWORD_REQUERIDO";

async function verificar(
  request: FastifyRequest,
  reply: FastifyReply,
  { permitirPrimerLogin }: { permitirPrimerLogin: boolean }
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (_err) {
    reply.status(401).send({
      error: "No autorizado",
      mensaje: "Token inválido o expirado",
    });
    return;
  }

  const payload = request.user as JwtPayload;

  // Se consulta la DB (no solo el token): un token emitido antes de un reset de
  // contraseña no puede saltear el cambio obligatorio. Una sola query liviana.
  const actual = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { first_login: true },
  });

  if (!actual) {
    reply.status(401).send({
      error: "No autorizado",
      mensaje: "Token inválido o expirado",
    });
    return;
  }

  if (actual.first_login && !permitirPrimerLogin) {
    reply.status(403).send({
      error: CAMBIO_PASSWORD_REQUERIDO,
      mensaje: "Tenés que cambiar tu contraseña antes de continuar",
    });
    return;
  }

  request.usuario = payload;
}

/** Autenticación estándar: JWT válido y sin cambio de contraseña pendiente. */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  return verificar(request, reply, { permitirPrimerLogin: false });
}

/**
 * Autenticación que tolera first_login = true. Solo para el endpoint de cambio
 * de contraseña y el que devuelve la sesión actual (/auth/me).
 */
export async function authPermitePrimerLogin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  return verificar(request, reply, { permitirPrimerLogin: true });
}
