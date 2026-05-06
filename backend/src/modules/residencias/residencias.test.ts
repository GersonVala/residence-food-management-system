import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function crearAdmin(role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" = "ADMIN_GLOBAL") {
  const password_hash = await bcrypt.hash("password123", 10);
  return prisma.user.create({
    data: { email: `admin-${role}-${Date.now()}@test.com`, password_hash, role, first_login: false },
  });
}

async function loginAdmin(email: string): Promise<string> {
  const res = await supertest(app.server)
    .post("/auth/login")
    .send({ email, password: "password123" });
  return res.body.token as string;
}

const residenciaBase = {
  nombre: "Residencia Test",
  direccion: "Av. Siempre Viva 742",
  ciudad: "Buenos Aires",
  provincia: "Buenos Aires",
  capacidad_max: 30,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.residencia.deleteMany();
});

// ---------------------------------------------------------------------------
// GET /residencias
// ---------------------------------------------------------------------------

describe("GET /residencias", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias");
    expect(res.status).toBe(401);
  });

  it("retorna 403 si es RESIDENTE", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
      data: { email: "residente@test.com", password_hash: hash, role: "RESIDENTE", first_login: false },
    });
    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: user.email, password: "password123" });
    const token = loginRes.body.token as string;

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("retorna lista vacía cuando no hay residencias", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna solo residencias activas", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    await prisma.residencia.createMany({
      data: [
        { ...residenciaBase, nombre: "Activa" },
        { ...residenciaBase, nombre: "Inactiva", activo: false },
      ],
    });

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Activa");
  });
});

// ---------------------------------------------------------------------------
// GET /residencias/:id
// ---------------------------------------------------------------------------

describe("GET /residencias/:id", () => {
  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .get("/residencias/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna la residencia si existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
  });
});

// ---------------------------------------------------------------------------
// POST /residencias
// ---------------------------------------------------------------------------

describe("POST /residencias", () => {
  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send(residenciaBase);
    expect(res.status).toBe(403);
  });

  it("crea una residencia correctamente", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send(residenciaBase);
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
    expect(res.body.activo).toBe(true);
    expect(res.body.rollback_horas).toBe(2);
  });

  it("crea residencia con rollback_horas personalizado", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...residenciaBase, rollback_horas: 4 });
    expect(res.status).toBe(201);
    expect(res.body.rollback_horas).toBe(4);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Solo nombre" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /residencias/:id
// ---------------------------------------------------------------------------

describe("PATCH /residencias/:id", () => {
  it("actualiza campos parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba", rollback_horas: 3 });
    expect(res.status).toBe(200);
    expect(res.body.ciudad).toBe("Córdoba");
    expect(res.body.rollback_horas).toBe(3);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .patch("/residencias/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba" });
    expect(res.status).toBe(404);
  });

  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba" });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /residencias/:id
// ---------------------------------------------------------------------------

describe("DELETE /residencias/:id", () => {
  it("hace soft delete — retorna 204 y la residencia queda inactiva", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const enDb = await prisma.residencia.findUnique({ where: { id: residencia.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .delete("/residencias/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
