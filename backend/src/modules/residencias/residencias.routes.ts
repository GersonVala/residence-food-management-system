import type { FastifyInstance } from "fastify";
import { residenciasService } from "./residencias.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

const schemaBase = {
  type: "object",
  properties: {
    nombre: { type: "string", minLength: 1 },
    direccion: { type: "string", minLength: 1 },
    ciudad: { type: "string", minLength: 1 },
    provincia: { type: "string", minLength: 1 },
    capacidad_max: { type: "integer", minimum: 1 },
    rollback_horas: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
};

function handleError(err: unknown, reply: Parameters<Parameters<FastifyInstance["get"]>[2]>[1]) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function residenciasRoutes(app: FastifyInstance): Promise<void> {
  // GET /residencias — solo admins
  app.get(
    "/residencias",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (_request, reply) => {
      const residencias = await residenciasService.listar();
      return reply.status(200).send(residencias);
    }
  );

  // GET /residencias/:id
  app.get<{ Params: { id: string } }>(
    "/residencias/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const residencia = await residenciasService.obtener(Number(request.params.id));
        return reply.status(200).send(residencia);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias — solo ADMIN_GLOBAL
  app.post<{ Body: { nombre: string; direccion: string; ciudad: string; provincia: string; capacidad_max: number; rollback_horas?: number } }>(
    "/residencias",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")],
      schema: {
        body: {
          ...schemaBase,
          required: ["nombre", "direccion", "ciudad", "provincia", "capacidad_max"],
        },
      },
    },
    async (request, reply) => {
      try {
        const residencia = await residenciasService.crear(request.body);
        return reply.status(201).send(residencia);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /residencias/:id — solo ADMIN_GLOBAL
  app.patch<{ Params: { id: string }; Body: Partial<{ nombre: string; direccion: string; ciudad: string; provincia: string; capacidad_max: number; rollback_horas: number }> }>(
    "/residencias/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")],
      schema: { body: schemaBase },
    },
    async (request, reply) => {
      try {
        const residencia = await residenciasService.actualizar(
          Number(request.params.id),
          request.body
        );
        return reply.status(200).send(residencia);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /residencias/:id — solo ADMIN_GLOBAL (soft delete)
  app.delete<{ Params: { id: string } }>(
    "/residencias/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        await residenciasService.eliminar(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
