import type { FastifyInstance, FastifyReply } from "fastify";
import { turnosService } from "./turnos.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function turnosRoutes(app: FastifyInstance): Promise<void> {
  // GET /residencias/:residencia_id/turnos
  app.get<{ Params: { residencia_id: string } }>(
    "/residencias/:residencia_id/turnos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const turnos = await turnosService.listar(Number(request.params.residencia_id));
        return reply.status(200).send(turnos);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /turnos/:id
  app.get<{ Params: { id: string } }>(
    "/turnos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const turno = await turnosService.obtener(Number(request.params.id));
        return reply.status(200).send(turno);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:residencia_id/turnos
  app.post<{
    Params: { residencia_id: string };
    Body: { grupo_id: number; fecha: string; franja: string };
  }>(
    "/residencias/:residencia_id/turnos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["grupo_id", "fecha", "franja"],
          properties: {
            grupo_id: { type: "integer", minimum: 1 },
            fecha: { type: "string", format: "date" },
            franja: { type: "string", enum: ["ALMUERZO", "CENA"] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { grupo_id, fecha, franja } = request.body;
        const turno = await turnosService.crear({
          grupo_id,
          residencia_id: Number(request.params.residencia_id),
          fecha: new Date(fecha),
          franja: franja as "ALMUERZO" | "CENA",
        });
        return reply.status(201).send(turno);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /turnos/:id
  app.delete<{ Params: { id: string } }>(
    "/turnos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await turnosService.cancelar(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /turnos/:id/selecciones
  app.post<{
    Params: { id: string };
    Body: { residente_id: number; menu_id: number; personas: number };
  }>(
    "/turnos/:id/selecciones",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")],
      schema: {
        body: {
          type: "object",
          required: ["residente_id", "menu_id", "personas"],
          properties: {
            residente_id: { type: "integer", minimum: 1 },
            menu_id: { type: "integer", minimum: 1 },
            personas: { type: "integer", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { residente_id, menu_id, personas } = request.body;
        const seleccion = await turnosService.seleccionarMenu(
          Number(request.params.id),
          residente_id,
          menu_id,
          personas
        );
        return reply.status(201).send(seleccion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /selecciones/:id/confirmar
  app.patch<{ Params: { id: string } }>(
    "/selecciones/:id/confirmar",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const seleccion = await turnosService.confirmarSeleccion(Number(request.params.id));
        return reply.status(200).send(seleccion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /selecciones/:id/revertir
  app.patch<{ Params: { id: string } }>(
    "/selecciones/:id/revertir",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const seleccion = await turnosService.revertirSeleccion(Number(request.params.id));
        return reply.status(200).send(seleccion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /selecciones/:id
  app.delete<{ Params: { id: string } }>(
    "/selecciones/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await turnosService.eliminarSeleccion(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
