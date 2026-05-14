import path from "path";
import type { FastifyInstance } from "fastify";
import staticPlugin from "@fastify/static";

export async function uploadsRoutes(app: FastifyInstance): Promise<void> {
  await app.register(staticPlugin, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });
}
