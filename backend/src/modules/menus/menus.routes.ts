import type { FastifyInstance, FastifyReply } from "fastify";
import { menusService } from "./menus.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function menusRoutes(app: FastifyInstance): Promise<void> {
  // GET /residencias/:residencia_id/menus
  app.get<{ Params: { residencia_id: string } }>(
    "/residencias/:residencia_id/menus",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const menus = await menusService.listar(Number(request.params.residencia_id));
        return reply.status(200).send(menus);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /menus/:id
  app.get<{ Params: { id: string } }>(
    "/menus/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const menu = await menusService.obtener(Number(request.params.id));
        return reply.status(200).send(menu);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:residencia_id/menus
  app.post<{
    Params: { residencia_id: string };
    Body: {
      nombre: string;
      descripcion?: string;
      imagen_url?: string;
      video_url?: string;
      dificultad: string;
      tiempo_min: number;
    };
  }>(
    "/residencias/:residencia_id/menus",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["nombre", "dificultad", "tiempo_min"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            descripcion: { type: "string" },
            imagen_url: { type: "string" },
            video_url: { type: "string" },
            dificultad: { type: "string", enum: ["FACIL", "MEDIO", "DIFICIL"] },
            tiempo_min: { type: "integer", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { dificultad, ...rest } = request.body;
        const menu = await menusService.crear({
          ...rest,
          dificultad: dificultad as "FACIL" | "MEDIO" | "DIFICIL",
          residencia_id: Number(request.params.residencia_id),
        });
        return reply.status(201).send(menu);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /menus/:id
  app.patch<{
    Params: { id: string };
    Body: {
      nombre?: string;
      descripcion?: string;
      imagen_url?: string;
      video_url?: string;
      dificultad?: string;
      tiempo_min?: number;
    };
  }>(
    "/menus/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          properties: {
            nombre: { type: "string", minLength: 1 },
            descripcion: { type: "string" },
            imagen_url: { type: "string" },
            video_url: { type: "string" },
            dificultad: { type: "string", enum: ["FACIL", "MEDIO", "DIFICIL"] },
            tiempo_min: { type: "integer", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { dificultad, ...rest } = request.body;
        const menu = await menusService.actualizar(Number(request.params.id), {
          ...rest,
          ...(dificultad ? { dificultad: dificultad as "FACIL" | "MEDIO" | "DIFICIL" } : {}),
        });
        return reply.status(200).send(menu);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /menus/:id
  app.delete<{ Params: { id: string } }>(
    "/menus/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await menusService.eliminar(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /menus/:id/ingredientes
  app.post<{
    Params: { id: string };
    Body: {
      alimento_id: number;
      cantidad_base: number;
      cantidad_por_persona: number;
      unidad: string;
    };
  }>(
    "/menus/:id/ingredientes",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["alimento_id", "cantidad_base", "cantidad_por_persona", "unidad"],
          properties: {
            alimento_id: { type: "integer", minimum: 1 },
            cantidad_base: { type: "number", minimum: 0 },
            cantidad_por_persona: { type: "number", minimum: 0 },
            unidad: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad, ...rest } = request.body;
        const ingrediente = await menusService.agregarIngrediente(Number(request.params.id), {
          ...rest,
          unidad: unidad as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES",
        });
        return reply.status(201).send(ingrediente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /menus/:id/ingredientes/:alimento_id
  app.patch<{
    Params: { id: string; alimento_id: string };
    Body: { cantidad_base?: number; cantidad_por_persona?: number; unidad?: string };
  }>(
    "/menus/:id/ingredientes/:alimento_id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          properties: {
            cantidad_base: { type: "number", minimum: 0 },
            cantidad_por_persona: { type: "number", minimum: 0 },
            unidad: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad, ...rest } = request.body;
        const ingrediente = await menusService.actualizarIngrediente(
          Number(request.params.id),
          Number(request.params.alimento_id),
          {
            ...rest,
            ...(unidad ? { unidad: unidad as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES" } : {}),
          }
        );
        return reply.status(200).send(ingrediente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /menus/:id/ingredientes/:alimento_id
  app.delete<{ Params: { id: string; alimento_id: string } }>(
    "/menus/:id/ingredientes/:alimento_id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await menusService.quitarIngrediente(
          Number(request.params.id),
          Number(request.params.alimento_id)
        );
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /menus/:id/grupos
  app.post<{ Params: { id: string }; Body: { grupo_id: number } }>(
    "/menus/:id/grupos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["grupo_id"],
          properties: { grupo_id: { type: "integer", minimum: 1 } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const asignacion = await menusService.asignarGrupo(
          Number(request.params.id),
          request.body.grupo_id
        );
        return reply.status(201).send(asignacion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /menus/:id/grupos/:grupo_id
  app.delete<{ Params: { id: string; grupo_id: string } }>(
    "/menus/:id/grupos/:grupo_id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await menusService.quitarGrupo(
          Number(request.params.id),
          Number(request.params.grupo_id)
        );
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
