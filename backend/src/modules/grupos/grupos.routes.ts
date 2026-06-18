import type { FastifyInstance, FastifyReply } from "fastify";
import { gruposService } from "./grupos.service.js";
import { gruposRepository } from "./grupos.repository.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function gruposRoutes(app: FastifyInstance): Promise<void> {
  // GET /residentes/:residente_id/grupo — el grupo activo de un residente (RESIDENTE puede consultar el suyo)
  app.get<{ Params: { residente_id: string } }>(
    "/residentes/:residente_id/grupo",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const integrante = await gruposRepository.findIntegranteEnCualquierGrupo(Number(request.params.residente_id));
        if (!integrante) {
          return reply.status(200).send(null);
        }
        return reply.status(200).send({ grupo_id: integrante.grupo_id, nombre: integrante.grupo.nombre });
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /residencias/:residencia_id/grupos
  app.get<{ Params: { residencia_id: string } }>(
    "/residencias/:residencia_id/grupos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const grupos = await gruposService.listar(Number(request.params.residencia_id));
        return reply.status(200).send(grupos);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /grupos/:id
  app.get<{ Params: { id: string } }>(
    "/grupos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const grupo = await gruposService.obtener(Number(request.params.id));
        return reply.status(200).send(grupo);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:residencia_id/grupos
  app.post<{ Params: { residencia_id: string }; Body: { nombre: string } }>(
    "/residencias/:residencia_id/grupos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["nombre"],
          properties: { nombre: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const grupo = await gruposService.crear(
          request.body.nombre,
          Number(request.params.residencia_id)
        );
        return reply.status(201).send(grupo);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /grupos/:id
  app.patch<{ Params: { id: string }; Body: { nombre: string } }>(
    "/grupos/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["nombre"],
          properties: { nombre: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const grupo = await gruposService.actualizar(Number(request.params.id), request.body.nombre);
        return reply.status(200).send(grupo);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /grupos/:id — disolver (soft delete)
  app.delete<{ Params: { id: string } }>(
    "/grupos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await gruposService.disolver(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /grupos/:id/integrantes
  app.get<{ Params: { id: string } }>(
    "/grupos/:id/integrantes",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const integrantes = await gruposService.listarIntegrantes(Number(request.params.id));
        return reply.status(200).send(integrantes);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /grupos/:id/integrantes
  app.post<{ Params: { id: string }; Body: { residente_id: number } }>(
    "/grupos/:id/integrantes",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["residente_id"],
          properties: { residente_id: { type: "integer", minimum: 1 } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const integrante = await gruposService.agregarIntegrante(
          Number(request.params.id),
          request.body.residente_id
        );
        return reply.status(201).send(integrante);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /grupos/:id/integrantes/:residente_id
  app.delete<{ Params: { id: string; residente_id: string } }>(
    "/grupos/:id/integrantes/:residente_id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await gruposService.quitarIntegrante(
          Number(request.params.id),
          Number(request.params.residente_id)
        );
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /grupos/:id/menus
  app.get<{ Params: { id: string } }>(
    "/grupos/:id/menus",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")] },
    async (request, reply) => {
      try {
        const menus = await gruposService.listarMenus(Number(request.params.id));
        return reply.status(200).send(menus);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /grupos/:id/menus
  app.post<{ Params: { id: string }; Body: { menu_id: number } }>(
    "/grupos/:id/menus",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["menu_id"],
          properties: { menu_id: { type: "integer", minimum: 1 } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const asignacion = await gruposService.agregarMenu(
          Number(request.params.id),
          request.body.menu_id
        );
        return reply.status(201).send(asignacion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /grupos/:id/menus/:menu_id
  app.delete<{ Params: { id: string; menu_id: string } }>(
    "/grupos/:id/menus/:menu_id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await gruposService.quitarMenu(
          Number(request.params.id),
          Number(request.params.menu_id)
        );
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
