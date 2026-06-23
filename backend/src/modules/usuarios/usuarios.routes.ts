import type { FastifyInstance, FastifyReply } from "fastify";
import { usuariosService } from "./usuarios.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function usuariosRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, requireRoles("ADMIN_GLOBAL")];

  // GET /usuarios
  app.get("/usuarios", { preHandler }, async (_req, reply) => {
    try {
      const usuarios = await usuariosService.listar();
      return reply.status(200).send(usuarios);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // POST /usuarios
  app.post<{
    Body: { email: string; role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA"; residencia_id?: number | null };
  }>(
    "/usuarios",
    {
      preHandler,
      schema: {
        body: {
          type: "object",
          required: ["email", "role"],
          properties: {
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["ADMIN_GLOBAL", "ADMIN_RESIDENCIA"] },
            residencia_id: { type: ["integer", "null"], minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await usuariosService.crear(request.body);
        return reply.status(201).send(result);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /usuarios/:id
  app.patch<{
    Params: { id: string };
    Body: { residencia_id?: number | null; active?: boolean };
  }>(
    "/usuarios/:id",
    {
      preHandler,
      schema: {
        body: {
          type: "object",
          properties: {
            residencia_id: { type: ["integer", "null"], minimum: 1 },
            active: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const usuario = await usuariosService.actualizar(Number(request.params.id), request.body);
        return reply.status(200).send(usuario);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /usuarios/:id — soft delete (active = false)
  app.delete<{ Params: { id: string } }>(
    "/usuarios/:id",
    { preHandler },
    async (request, reply) => {
      try {
        await usuariosService.desactivar(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
