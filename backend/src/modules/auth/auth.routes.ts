import type { FastifyInstance, FastifyRequest } from "fastify";
import { authService } from "./auth.service.js";
import { authMiddleware, authPermitePrimerLogin } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

const MENSAJE_RATE_LIMIT = "Demasiados intentos. Esperá un minuto antes de volver a intentar.";

// Clave IP + email: frena fuerza bruta sobre una cuenta sin que un atacante
// pueda bloquear a todos los usuarios de la misma IP (ej. una residencia).
function rateLimitLogin() {
  return {
    max: 5,
    timeWindow: "1 minute",
    keyGenerator: (request: FastifyRequest) => {
      const email = (request.body as { email?: string } | undefined)?.email ?? "";
      return `${request.ip}:${email.toLowerCase()}`;
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Demasiados intentos",
      mensaje: MENSAJE_RATE_LIMIT,
    }),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /auth/login
  // -------------------------------------------------------------------------
  app.post<{
    Body: { email: string; password: string };
  }>(
    "/auth/login",
    {
      config: { rateLimit: rateLimitLogin() },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body;
        const result = await authService.login(email, password, app);
        return reply.status(200).send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; error?: string; mensaje?: string };
        if (e.statusCode) {
          return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /auth/change-password  (requiere auth)
  // -------------------------------------------------------------------------
  app.post<{
    Body: { password_actual: string; password_nuevo: string };
  }>(
    "/auth/change-password",
    {
      preHandler: [authPermitePrimerLogin],
      schema: {
        body: {
          type: "object",
          required: ["password_actual", "password_nuevo"],
          properties: {
            password_actual: { type: "string", minLength: 1 },
            password_nuevo: { type: "string", minLength: 6 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { password_actual, password_nuevo } = request.body;
        await authService.cambiarPassword(
          request.usuario.id,
          password_actual,
          password_nuevo
        );
        return reply.status(200).send({ mensaje: "Contraseña actualizada correctamente" });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; error?: string; mensaje?: string };
        if (e.statusCode) {
          return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /auth/reset  (solo ADMIN_GLOBAL o ADMIN_RESIDENCIA)
  // -------------------------------------------------------------------------
  app.post<{
    Body: { user_id: number };
  }>(
    "/auth/reset",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
          keyGenerator: (request: FastifyRequest) => `${request.ip}:reset`,
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: "Demasiados intentos",
            mensaje: MENSAJE_RATE_LIMIT,
          }),
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["user_id"],
          properties: {
            user_id: { type: "integer", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { user_id } = request.body;
        const result = await authService.resetPassword(request.usuario, user_id);
        return reply.status(200).send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; error?: string; mensaje?: string };
        if (e.statusCode) {
          return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /auth/me  (requiere auth)
  // -------------------------------------------------------------------------
  app.get(
    "/auth/me",
    { preHandler: [authPermitePrimerLogin] },
    async (request, reply) => {
      const { id, email, role, residencia_id } = request.usuario;
      return reply.status(200).send({ id, email, role, residencia_id });
    }
  );
}
