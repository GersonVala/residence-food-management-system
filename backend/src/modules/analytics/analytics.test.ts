import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import bcrypt from "bcrypt";

async function tokenAdminGlobal(): Promise<string> {
  const hash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.create({
    data: { email: `admin-analytics-${Date.now()}@test.com`, password_hash: hash, role: "ADMIN_GLOBAL", first_login: false },
  });
  const res = await supertest(app.server).post("/auth/login").send({ email: admin.email, password: "password123" });
  return res.body.token as string;
}

function crearResidencia(activo: boolean) {
  return prisma.residencia.create({
    data: {
      nombre: `Residencia ${activo ? "activa" : "de baja"} ${Date.now()}`,
      direccion: "Av. Test 123",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      capacidad_max: 20,
      activo,
    },
  });
}

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

describe("GET /analytics/cocina — residencias", () => {
  it("informa las residencias activas y el total de registradas, incluidas las dadas de baja", async () => {
    const token = await tokenAdminGlobal();
    await crearResidencia(true);
    await crearResidencia(false);

    const res = await supertest(app.server)
      .get("/analytics/cocina")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total_residencias).toBe(await prisma.residencia.count({ where: { activo: true } }));
    expect(res.body.stats.total_residencias_registradas).toBe(await prisma.residencia.count());
    expect(res.body.stats.total_residencias_registradas).toBeGreaterThan(res.body.stats.total_residencias);
  });
});
