import type { FastifyInstance, FastifyReply } from "fastify";
import { residentesService } from "./residentes.service.js";
import { residentesRepository } from "./residentes.repository.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";
import { prisma } from "../../shared/prisma/client.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

// T-2.7: schemaBase now includes residencia_id so PATCH can accept it
const schemaBase = {
  type: "object",
  properties: {
    nombre: { type: "string", minLength: 1 },
    apellido: { type: "string", minLength: 1 },
    dni: { type: "string", minLength: 1 },
    edad: { type: "integer", minimum: 1 },
    telefono: { type: "string" },
    universidad: { type: "string", minLength: 1 },
    carrera: { type: "string", minLength: 1 },
    ciudad_origen: { type: "string", minLength: 1 },
    provincia_origen: { type: "string", minLength: 1 },
    fecha_ingreso: { type: "string", format: "date-time" },
    residencia_id: { type: "integer", minimum: 1 },
    activo: { type: "boolean" },
    fecha_retiro: { type: ["string", "null"] },
    motivo_baja: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export async function residentesRoutes(app: FastifyInstance): Promise<void> {
  // GET /residentes/me — residente del usuario autenticado (RESIDENTE only)
  app.get(
    "/residentes/me",
    { preHandler: [authMiddleware, requireRoles("RESIDENTE")] },
    async (request, reply) => {
      try {
        const residente = await residentesRepository.findByUserId(request.usuario.id);
        if (!residente) {
          return reply.status(404).send({ error: "Not Found", mensaje: "Residente no encontrado" });
        }
        return reply.status(200).send(residente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /residentes/me — residente actualiza su propio teléfono
  app.patch<{ Body: { telefono?: string } }>(
    "/residentes/me",
    {
      preHandler: [authMiddleware, requireRoles("RESIDENTE")],
      schema: {
        body: {
          type: "object",
          properties: {
            telefono: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const residente = await residentesRepository.findByUserId(request.usuario.id);
        if (!residente) {
          return reply.status(404).send({ error: "Not Found", mensaje: "Residente no encontrado" });
        }
        const actualizado = await residentesRepository.update(residente.id, { telefono: request.body.telefono });
        return reply.status(200).send(actualizado);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // T-2.3: GET /residentes — global listing, ADMIN_GLOBAL only
  // Must be registered BEFORE /:id routes to avoid Fastify path conflicts
  app.get(
    "/residentes",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (_request, reply) => {
      try {
        const residentes = await residentesService.listarTodos();
        return reply.status(200).send(residentes);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /residencias/:residencia_id/residentes
  app.get<{ Params: { residencia_id: string } }>(
    "/residencias/:residencia_id/residentes",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const residentes = await residentesService.listar(Number(request.params.residencia_id));
        return reply.status(200).send(residentes);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // GET /residentes/:id
  app.get<{ Params: { id: string } }>(
    "/residentes/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const residente = await residentesService.obtener(Number(request.params.id));
        return reply.status(200).send(residente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:residencia_id/residentes
  app.post<{
    Params: { residencia_id: string };
    Body: {
      email: string;
      nombre: string;
      apellido: string;
      dni: string;
      edad: number;
      telefono?: string;
      universidad: string;
      carrera: string;
      ciudad_origen: string;
      provincia_origen: string;
      fecha_ingreso: string;
    };
  }>(
    "/residencias/:residencia_id/residentes",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          ...schemaBase,
          required: ["email", "nombre", "apellido", "dni", "edad", "universidad", "carrera", "ciudad_origen", "provincia_origen", "fecha_ingreso"],
          properties: {
            ...schemaBase.properties,
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const residente = await residentesService.crear({
          ...request.body,
          residencia_id: Number(request.params.residencia_id),
          fecha_ingreso: new Date(request.body.fecha_ingreso),
        });
        return reply.status(201).send(residente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /residentes/:id
  app.patch<{
    Params: { id: string };
    Body: Partial<{
      nombre: string;
      apellido: string;
      dni: string;
      edad: number;
      telefono: string;
      universidad: string;
      carrera: string;
      ciudad_origen: string;
      fecha_ingreso: string;
      residencia_id: number;
      activo: boolean;
      fecha_retiro: string | null;
      motivo_baja: string | null;
    }>;
  }>(
    "/residentes/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: { body: schemaBase },
    },
    async (request, reply) => {
      try {
        const { fecha_ingreso, fecha_retiro, ...rest } = request.body;
        const data = {
          ...rest,
          ...(fecha_ingreso ? { fecha_ingreso: new Date(fecha_ingreso) } : {}),
          ...(fecha_retiro !== undefined ? { fecha_retiro: fecha_retiro ? new Date(fecha_retiro) : null } : {}),
        };
        const residente = await residentesService.actualizar(Number(request.params.id), data);
        return reply.status(200).send(residente);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /residentes/:id/permiso-stock — ADMIN_RESIDENCIA activa/desactiva permiso de carga de stock
  app.patch<{ Params: { id: string }; Body: { puede_cargar_stock: boolean } }>(
    "/residentes/:id/permiso-stock",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["puede_cargar_stock"],
          properties: { puede_cargar_stock: { type: "boolean" } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const residente = await residentesService.obtener(Number(request.params.id));
        await prisma.user.update({
          where: { id: residente.user_id },
          data: { puede_cargar_stock: request.body.puede_cargar_stock },
        });
        return reply.status(200).send({ puede_cargar_stock: request.body.puede_cargar_stock });
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /residentes/:id
  app.delete<{ Params: { id: string }; Body: { motivo_baja: string } }>(
    "/residentes/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["motivo_baja"],
          properties: {
            motivo_baja: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        await residentesService.eliminar(Number(request.params.id), request.body.motivo_baja);
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
