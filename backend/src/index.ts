// dotenv solo carga si las variables no están ya definidas (override: false es el default)
// En modo test, vitest.config.ts inyecta NODE_ENV=test antes de este import
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { residenciasRoutes } from "./modules/residencias/residencias.routes.js";
import { residentesRoutes } from "./modules/residentes/residentes.routes.js";
import { gruposRoutes } from "./modules/grupos/grupos.routes.js";
import { menusRoutes } from "./modules/menus/menus.routes.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const isTest = process.env.NODE_ENV === "test";

export const app = Fastify({
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
});

// ============================================================
// Módulos
// ============================================================

await app.register(authRoutes);
await app.register(residenciasRoutes);
await app.register(residentesRoutes);
await app.register(gruposRoutes);
await app.register(menusRoutes);

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
