import type { FastifyInstance, FastifyReply } from "fastify";
import { historialService } from "./historial.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function historialRoutes(app: FastifyInstance): Promise<void> {
  // GET /residencias/:residencia_id/historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
  app.get<{
    Params: { residencia_id: string };
    Querystring: { desde?: string; hasta?: string };
  }>(
    "/residencias/:residencia_id/historial",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const { desde, hasta } = request.query;
        const data = await historialService.obtener(
          Number(request.params.residencia_id),
          desde ? new Date(desde) : undefined,
          hasta ? new Date(hasta + "T23:59:59") : undefined
        );
        return reply.status(200).send(data);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
