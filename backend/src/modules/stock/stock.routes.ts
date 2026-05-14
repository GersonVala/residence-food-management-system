import type { FastifyInstance, FastifyReply } from "fastify";
import { stockService } from "./stock.service.js";
import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import { requireRoles } from "../../shared/middlewares/roles.middleware.js";

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; error?: string; mensaje?: string };
  if (e.statusCode) {
    return reply.status(e.statusCode).send({ error: e.error, mensaje: e.mensaje });
  }
  throw err;
}

export async function stockRoutes(app: FastifyInstance): Promise<void> {
  // ── Categorías ──────────────────────────────────────────────

  app.get(
    "/categorias",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (_request, reply) => {
      const categorias = await stockService.listarCategorias();
      return reply.status(200).send(categorias);
    }
  );

  app.post<{ Body: { nombre: string } }>(
    "/categorias",
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
        const categoria = await stockService.crearCategoria(request.body.nombre);
        return reply.status(201).send(categoria);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.patch<{ Params: { id: string }; Body: { nombre: string } }>(
    "/categorias/:id",
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
        const categoria = await stockService.actualizarCategoria(
          Number(request.params.id),
          request.body.nombre
        );
        return reply.status(200).send(categoria);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/categorias/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        await stockService.eliminarCategoria(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // ── Alimentos ────────────────────────────────────────────────

  app.get(
    "/alimentos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (_request, reply) => {
      const alimentos = await stockService.listarAlimentos();
      return reply.status(200).send(alimentos);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/alimentos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const alimento = await stockService.obtenerAlimento(Number(request.params.id));
        return reply.status(200).send(alimento);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.post<{
    Body: {
      nombre: string;
      marca?: string;
      unidad_base: string;
      contenido_neto?: number;
      unidad_contenido?: string;
      categoria_id: number;
      calorias?: number;
      proteinas?: number;
      carbohidratos?: number;
      grasas?: number;
    };
  }>(
    "/alimentos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["nombre", "unidad_base", "categoria_id"],
          properties: {
            nombre: { type: "string", minLength: 1 },
            marca: { type: "string" },
            unidad_base: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            contenido_neto: { type: "number", minimum: 0 },
            unidad_contenido: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            categoria_id: { type: "integer", minimum: 1 },
            calorias: { type: "number", minimum: 0 },
            proteinas: { type: "number", minimum: 0 },
            carbohidratos: { type: "number", minimum: 0 },
            grasas: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad_base, unidad_contenido, ...rest } = request.body;
        const alimento = await stockService.crearAlimento({
          ...rest,
          unidad_base: unidad_base as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES",
          ...(unidad_contenido ? { unidad_contenido: unidad_contenido as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES" } : {}),
        });
        return reply.status(201).send(alimento);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // POST /alimentos/:id/imagen — subir imagen del alimento (multipart, guarda en disco)
  app.post<{ Params: { id: string } }>(
    "/alimentos/:id/imagen",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({ error: "Bad Request", mensaje: "No se envió ningún archivo" });
        }
        const alimento = await stockService.subirImagenAlimento(Number(request.params.id), file);
        return reply.status(200).send({ id: alimento.id, imagen_url: alimento.imagen_url });
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.patch<{
    Params: { id: string };
    Body: {
      nombre?: string;
      marca?: string;
      unidad_base?: string;
      contenido_neto?: number;
      unidad_contenido?: string;
      categoria_id?: number;
      calorias?: number;
      proteinas?: number;
      carbohidratos?: number;
      grasas?: number;
    };
  }>(
    "/alimentos/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          properties: {
            nombre: { type: "string", minLength: 1 },
            marca: { type: "string" },
            unidad_base: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            contenido_neto: { type: "number", minimum: 0 },
            unidad_contenido: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            categoria_id: { type: "integer", minimum: 1 },
            calorias: { type: "number", minimum: 0 },
            proteinas: { type: "number", minimum: 0 },
            carbohidratos: { type: "number", minimum: 0 },
            grasas: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad_base, unidad_contenido, ...rest } = request.body;
        const alimento = await stockService.actualizarAlimento(Number(request.params.id), {
          ...rest,
          ...(unidad_base ? { unidad_base: unidad_base as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES" } : {}),
          ...(unidad_contenido ? { unidad_contenido: unidad_contenido as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES" } : {}),
        });
        return reply.status(200).send(alimento);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/alimentos/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL")] },
    async (request, reply) => {
      try {
        await stockService.eliminarAlimento(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // ── Stock ────────────────────────────────────────────────────

  app.get<{ Params: { residencia_id: string } }>(
    "/residencias/:residencia_id/stock",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      const stock = await stockService.listarStock(Number(request.params.residencia_id));
      return reply.status(200).send(stock);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/stock/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const stock = await stockService.obtenerStock(Number(request.params.id));
        return reply.status(200).send(stock);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.post<{
    Params: { residencia_id: string };
    Body: {
      alimento_id: number;
      cantidad: number;
      unidad: string;
      fecha_vencimiento?: string;
      stock_minimo?: number;
    };
  }>(
    "/residencias/:residencia_id/stock",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["alimento_id", "cantidad", "unidad"],
          properties: {
            alimento_id: { type: "integer", minimum: 1 },
            cantidad: { type: "number", minimum: 0 },
            unidad: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            fecha_vencimiento: { type: "string", format: "date" },
            stock_minimo: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad, fecha_vencimiento, ...rest } = request.body;
        const stock = await stockService.crearStock(
          {
            ...rest,
            residencia_id: Number(request.params.residencia_id),
            unidad: unidad as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES",
            ...(fecha_vencimiento ? { fecha_vencimiento: new Date(fecha_vencimiento) } : {}),
          },
          request.usuario?.id
        );
        return reply.status(201).send(stock);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.patch<{
    Params: { id: string };
    Body: { cantidad?: number; unidad?: string; fecha_vencimiento?: string; stock_minimo?: number };
  }>(
    "/stock/:id",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          properties: {
            cantidad: { type: "number", minimum: 0 },
            unidad: { type: "string", enum: ["KG", "GR", "LITROS", "ML", "UNIDADES", "PAQUETES"] },
            fecha_vencimiento: { type: "string", format: "date" },
            stock_minimo: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { unidad, fecha_vencimiento, ...rest } = request.body;
        const stock = await stockService.actualizarStock(Number(request.params.id), {
          ...rest,
          ...(unidad ? { unidad: unidad as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES" } : {}),
          ...(fecha_vencimiento ? { fecha_vencimiento: new Date(fecha_vencimiento) } : {}),
        });
        return reply.status(200).send(stock);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/stock/:id",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        await stockService.eliminarStock(Number(request.params.id));
        return reply.status(204).send();
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  // ── Movimientos ──────────────────────────────────────────────

  app.get<{ Params: { stock_id: string } }>(
    "/stock/:stock_id/movimientos",
    { preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")] },
    async (request, reply) => {
      try {
        const movimientos = await stockService.listarMovimientos(Number(request.params.stock_id));
        return reply.status(200).send(movimientos);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );

  app.post<{
    Params: { stock_id: string };
    Body: {
      tipo: string;
      cantidad: number;
      residente_id?: number;
      turno_id?: number;
      motivo?: string;
    };
  }>(
    "/stock/:stock_id/movimientos",
    {
      preHandler: [authMiddleware, requireRoles("ADMIN_GLOBAL", "ADMIN_RESIDENCIA")],
      schema: {
        body: {
          type: "object",
          required: ["tipo", "cantidad"],
          properties: {
            tipo: { type: "string", enum: ["ENTRADA", "SALIDA", "AJUSTE"] },
            cantidad: { type: "number", minimum: 0 },
            residente_id: { type: "integer", minimum: 1 },
            turno_id: { type: "integer", minimum: 1 },
            motivo: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const { tipo, ...rest } = request.body;
        const movimiento = await stockService.registrarMovimiento({
          ...rest,
          stock_id: Number(request.params.stock_id),
          tipo: tipo as "ENTRADA" | "SALIDA" | "AJUSTE",
        });
        return reply.status(201).send(movimiento);
      } catch (err) {
        return handleError(err, reply);
      }
    }
  );
}
