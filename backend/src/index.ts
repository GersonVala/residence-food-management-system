// dotenv solo carga si las variables no están ya definidas (override: false es el default)
// En modo test, vitest.config.ts inyecta NODE_ENV=test antes de este import
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { residenciasRoutes } from "./modules/residencias/residencias.routes.js";
import { residentesRoutes } from "./modules/residentes/residentes.routes.js";
import { gruposRoutes } from "./modules/grupos/grupos.routes.js";
import { menusRoutes } from "./modules/menus/menus.routes.js";
import { turnosRoutes } from "./modules/turnos/turnos.routes.js";
import { stockRoutes } from "./modules/stock/stock.routes.js";
import { uploadsRoutes } from "./modules/uploads/uploads.routes.js";
import { historialRoutes } from "./modules/historial/historial.routes.js";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { MAX_BYTES } from "./modules/uploads/uploads.helper.js";
import { resolveJwtSecret, resolveFrontendUrl } from "./shared/config.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
// En producción lanzan error si faltan o son inseguros (ver shared/config.ts)
const JWT_SECRET = resolveJwtSecret(process.env);
const FRONTEND_URL = resolveFrontendUrl(process.env);

const isTest = process.env.NODE_ENV === "test";

export const app = Fastify({
  // En producción (Railway) hay un proxy delante: sin trustProxy request.ip sería
  // siempre la IP del proxy y el rate limit bloquearía a todos juntos. Solo se
  // activa en producción para que en local nadie pueda falsear X-Forwarded-For.
  trustProxy: process.env.NODE_ENV === "production",
  logger: isTest
    ? false
    : {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty" }
            : undefined,
      },
});

// ============================================================
// Plugins
// ============================================================

await app.register(cors, {
  origin: FRONTEND_URL,
  credentials: true,
});

await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: '7d' },
});

// global: false → solo aplica a las rutas que declaran config.rateLimit (login/reset).
// hook preHandler: corre después de parsear el body, así la clave puede incluir el email.
await app.register(rateLimit, { global: false, hook: "preHandler" });

await app.register(multipart, {
  limits: {
    fileSize: MAX_BYTES,
  },
});

// ============================================================
// Módulos
// ============================================================

await app.register(uploadsRoutes);
await app.register(authRoutes);
await app.register(residenciasRoutes);
await app.register(residentesRoutes);
await app.register(gruposRoutes);
await app.register(menusRoutes);
await app.register(turnosRoutes);
await app.register(stockRoutes);
await app.register(historialRoutes);
await app.register(usuariosRoutes);
await app.register(analyticsRoutes);

// ============================================================
// Rutas base
// ============================================================

app.get("/health", async (_request, _reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: process.env.NODE_ENV || "development",
  };
});

// ============================================================
// Iniciar servidor
// ============================================================

if (process.env.NODE_ENV !== "test") {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Servidor iniciado en http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
