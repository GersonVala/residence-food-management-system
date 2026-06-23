import type { FastifyInstance, FastifyReply } from "fastify";
import { analyticsService } from "./analytics.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { residencia_id?: string; desde?: string; hasta?: string };
  }>(
    "/analytics/cocina",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        const { residencia_id, desde, hasta } = request.query;
        const data = await analyticsService.getCocinaStats({
          residencia_id: residencia_id ? Number(residencia_id) : undefined,
          desde: desde ? new Date(desde) : undefined,
          hasta: hasta ? new Date(hasta + "T23:59:59") : undefined,
        });
        return reply.status(200).send(data);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.get(
    "/analytics/residencias",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (_request, reply) => {
      try {
        const data = await analyticsService.getResidenciasResumen();
        return reply.status(200).send(data);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
