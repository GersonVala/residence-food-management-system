import type { FastifyInstance } from "fastify";
import { authService } from "./auth.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /auth/login
  // -------------------------------------------------------------------------
  app.post<{
    Body: { email: string; password: string };
  }>(
    "/auth/login",
    {
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
      preHandler: [authMiddleware],
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
        const result = await authService.resetPassword(user_id);
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
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id, email, role, residencia_id } = request.usuario;
      return reply.status(200).send({ id, email, role, residencia_id });
    }
  );
}
