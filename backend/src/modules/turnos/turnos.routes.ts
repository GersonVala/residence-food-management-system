import type { FastifyInstance, FastifyReply } from "fastify";
import { turnosService } from "./turnos.service.js";
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
    Body: { grupo_id: number; franja: string; tipo: string; dia_semana?: number; fecha?: string };
  }>(
    "/residencias/:residencia_id/turnos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["grupo_id", "franja", "tipo"],
          properties: {
            grupo_id: { type: "integer", minimum: 1 },
            franja: { type: "string", enum: ["ALMUERZO", "CENA"] },
            tipo: { type: "string", enum: ["FIJO", "ROTATIVO"] },
            dia_semana: { type: "integer", minimum: 0, maximum: 6 },
            fecha: { type: "string", format: "date" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { grupo_id, franja, tipo, dia_semana, fecha } = request.body;
        const turno = await turnosService.crear({
          grupo_id,
          residencia_id: Number(request.params.residencia_id),
          franja: franja as "ALMUERZO" | "CENA",
          tipo: tipo as "FIJO" | "ROTATIVO",
          dia_semana,
          fecha: fecha ? new Date(fecha) : undefined,
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
    Body: { residente_id: number; menu_id: number; personas: number; nota?: string };
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
            nota: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { residente_id, menu_id, personas, nota } = request.body;
        const seleccion = await turnosService.seleccionarMenu(
          Number(request.params.id),
          residente_id,
          menu_id,
          personas,
          nota
        );
        return reply.status(201).send(seleccion);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // PATCH /selecciones/:id/confirmar
  app.patch<{
    Params: { id: string };
    Body?: { ajustes?: { alimento_id: number; cantidad: number }[] };
  }>(
    "/selecciones/:id/confirmar",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA", "RESIDENTE")],
    },
    async (request, reply) => {
      try {
        const seleccion_id = Number(request.params.id);
        if (request.usuario.role === "RESIDENTE") {
          const sel = await turnosService.obtenerSeleccion(seleccion_id);
          const residente = await prisma.residente.findUnique({ where: { user_id: request.usuario.id } });
          if (!sel || !residente || sel.residente_id !== residente.id) {
            return reply.status(403).send({ error: "Forbidden", mensaje: "Solo podés confirmar tus propias selecciones" });
          }
        }
        const seleccion = await turnosService.confirmarSeleccion(seleccion_id, request.body?.ajustes);
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

  // GET /me/selecciones — historial de cocciones del residente autenticado
  app.get(
    "/me/selecciones",
    { preHandler: [authMiddleware, requireRoles("RESIDENTE")] },
    async (request, reply) => {
      try {
        const residente = await prisma.residente.findUnique({
          where: { user_id: request.usuario.id },
        });
        if (!residente) {
          return reply.status(404).send({ error: "Not Found", mensaje: "Residente no encontrado" });
        }
        const selecciones = await prisma.seleccionMenu.findMany({
          where: { residente_id: residente.id },
          include: {
            menu: { select: { id: true, nombre: true, dificultad: true, tiempo_min: true, imagen_url: true } },
            turno: {
              select: {
                id: true,
                tipo: true,
                dia_semana: true,
                fecha: true,
                franja: true,
                grupo: { select: { id: true, nombre: true } },
              },
            },
            ajustes: {
              include: { alimento: { select: { id: true, nombre: true } } },
            },
          },
          orderBy: { created_at: "desc" },
        });
        return reply.status(200).send(selecciones);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
