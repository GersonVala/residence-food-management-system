import type { FastifyInstance, FastifyReply } from "fastify";
import { residenciasService } from "./residencias.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

// ============================================================
// Schema base para creación/edición de residencia
// ============================================================

const schemaBase = {
  type: "object",
  properties: {
    nombre: { type: "string", minLength: 1 },
    direccion: { type: "string", minLength: 1 },
    ciudad: { type: "string", minLength: 1 },
    provincia: { type: "string", minLength: 1 },
    capacidad_max: { type: "integer", minimum: 1 },
    rollback_horas: { type: "integer", minimum: 1 },
    imagen_url: { type: "string" },
  },
  additionalProperties: false,
};

// ============================================================
// Helper de errores
// ============================================================

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string; code?: string };
  // @fastify/multipart arroja FST_REQ_FILE_TOO_LARGE cuando se supera el límite configurado
  if (e.code === "FST_REQ_FILE_TOO_LARGE") {
    return reply.status(413).send({ error: "Payload Too Large", mensaje: "El archivo supera el límite de 5 MB" });
  }
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

// ============================================================
// Rutas
// ============================================================

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

  // GET /residencias/:id — enriquecido con residentes, voluntarios y fotos
  app.get<{ Params: { id: string } }>(
    "/residencias/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const residencia = await residenciasService.obtenerConRelaciones(
          Number(request.params.id)
        );
        return reply.status(200).send(residencia);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias — solo ADMIN_GLOBAL
  app.post<{
    Body: {
      nombre: string;
      direccion: string;
      ciudad: string;
      provincia: string;
      capacidad_max: number;
      rollback_horas?: number;
    };
  }>(
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

  // PATCH /residencias/:id — solo ADMIN_GLOBAL (acepta imagen_url para edición manual)
  app.patch<{
    Params: { id: string };
    Body: Partial<{
      nombre: string;
      direccion: string;
      ciudad: string;
      provincia: string;
      capacidad_max: number;
      rollback_horas: number;
      imagen_url: string | null;
    }>;
  }>(
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

  // DELETE /residencias/:id — solo ADMIN_GLOBAL (soft delete + cleanup de archivos)
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

  // GET /residencias/:id/fotos — listado standalone de fotos de la galería
  app.get<{ Params: { id: string } }>(
    "/residencias/:id/fotos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const fotos = await residenciasService.listarFotos(Number(request.params.id));
        return reply.status(200).send(fotos);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:id/imagen — subir imagen principal (multipart)
  app.post<{ Params: { id: string } }>(
    "/residencias/:id/imagen",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({ error: "Bad Request", mensaje: "No se envió ningún archivo" });
        }
        const residencia = await residenciasService.subirImagen(Number(request.params.id), file);
        return reply.status(200).send({ id: residencia.id, imagen_url: residencia.imagen_url });
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /residencias/:id/fotos — agregar foto a galería (multipart)
  app.post<{ Params: { id: string } }>(
    "/residencias/:id/fotos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({ error: "Bad Request", mensaje: "No se envió ningún archivo" });
        }
        const foto = await residenciasService.agregarFoto(Number(request.params.id), file);
        return reply.status(201).send(foto);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // DELETE /residencias/:id/fotos/:fotoId — eliminar foto de galería
  app.delete<{ Params: { id: string; fotoId: string } }>(
    "/residencias/:id/fotos/:fotoId",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        await residenciasService.eliminarFoto(
          Number(request.params.id),
          Number(request.params.fotoId)
        );
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /residencias/:id/fotos/reorder — reordenar fotos en batch
  // ADR: usamos un único PATCH batch en vez de N PATCH individuales porque evita N round-trips al DB y garantiza atomicidad via $transaction.
  app.patch<{
    Params: { id: string };
    Body: { items: { id: number; orden: number }[] };
  }>(
    "/residencias/:id/fotos/reorder",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")],
      schema: {
        body: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "orden"],
                properties: {
                  id: { type: "integer" },
                  orden: { type: "integer", minimum: 0 },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const fotos = await residenciasService.reordenarFotos(
          Number(request.params.id),
          request.body.items
        );
        return reply.status(200).send(fotos);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
