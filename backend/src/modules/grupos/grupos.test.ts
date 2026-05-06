import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function crearAdmin(role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" = "ADMIN_GLOBAL") {
  const hash = await bcrypt.hash("password123", 10);
  return prisma.user.create({
    data: { email: `admin-${Date.now()}@test.com`, password_hash: hash, role, first_login: false },
  });
}

async function login(email: string): Promise<string> {
  const res = await supertest(app.server)
    .post("/auth/login")
    .send({ email, password: "password123" });
  return res.body.token as string;
}

async function crearResidencia() {
  return prisma.residencia.create({
    data: {
      nombre: "Residencia Test",
      direccion: "Av. Test 123",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      capacidad_max: 30,
    },
  });
}

async function crearResidente(residencia_id: number, dni = "12345678") {
  const hash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: `residente-${Date.now()}@test.com`,
      password_hash: hash,
      role: "RESIDENTE",
      first_login: true,
      residencia_id,
    },
  });
  return prisma.residente.create({
    data: {
      user_id: user.id,
      residencia_id,
      nombre: "Juan",
      apellido: "Pérez",
      dni,
      edad: 22,
      universidad: "UBA",
      carrera: "Ingeniería",
      ciudad_origen: "Córdoba",
      fecha_ingreso: new Date("2024-03-01"),
    },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
  await prisma.seleccionMenu.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.grupoIntegrante.deleteMany();
  await prisma.menuGrupo.deleteMany();
  await prisma.menuIngrediente.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.grupoCocina.deleteMany();
  await prisma.residente.deleteMany();
  await prisma.user.deleteMany({ where: { role: "RESIDENTE" } });
  await prisma.residencia.deleteMany();
});

// ---------------------------------------------------------------------------
// GET /residencias/:id/grupos
// ---------------------------------------------------------------------------

describe("GET /residencias/:residencia_id/grupos", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias/1/grupos");
    expect(res.status).toBe(401);
  });

  it("retorna lista vacía cuando no hay grupos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/grupos`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna solo grupos activos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    await prisma.grupoCocina.createMany({
      data: [
        { nombre: "Grupo A", residencia_id: residencia.id, activo: true },
        { nombre: "Grupo B", residencia_id: residencia.id, activo: false },
      ],
    });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/grupos`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Grupo A");
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:id/grupos
// ---------------------------------------------------------------------------

describe("POST /residencias/:residencia_id/grupos", () => {
  it("crea un grupo correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Grupo Lunes" });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Grupo Lunes");
    expect(res.body.activo).toBe(true);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/grupos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Grupo X" });

    expect(res.status).toBe(404);
  });

  it("retorna 400 si falta el nombre", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /grupos/:id
// ---------------------------------------------------------------------------

describe("PATCH /grupos/:id", () => {
  it("actualiza el nombre del grupo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo Viejo", residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .patch(`/grupos/${grupo.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Grupo Nuevo" });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Grupo Nuevo");
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .patch("/grupos/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Nuevo" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /grupos/:id
// ---------------------------------------------------------------------------

describe("DELETE /grupos/:id", () => {
  it("disuelve el grupo — soft delete", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .delete(`/grupos/${grupo.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.grupoCocina.findUnique({ where: { id: grupo.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .delete("/grupos/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /grupos/:id/integrantes
// ---------------------------------------------------------------------------

describe("GET /grupos/:id/integrantes", () => {
  it("retorna lista vacía cuando no hay integrantes", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .get(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /grupos/:id/integrantes
// ---------------------------------------------------------------------------

describe("POST /grupos/:id/integrantes", () => {
  it("agrega un residente al grupo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });
    const residente = await crearResidente(residencia.id);

    const res = await supertest(app.server)
      .post(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id });

    expect(res.status).toBe(201);
    expect(res.body.residente_id).toBe(residente.id);
    expect(res.body.fecha_egreso).toBeNull();
  });

  it("retorna 409 si el residente ya está en el grupo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });
    const residente = await crearResidente(residencia.id);

    await supertest(app.server)
      .post(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id });

    const res = await supertest(app.server)
      .post(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id });

    expect(res.status).toBe(409);
  });

  it("retorna 404 si el residente no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .post(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: 999 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /grupos/:id/integrantes/:residente_id
// ---------------------------------------------------------------------------

describe("DELETE /grupos/:id/integrantes/:residente_id", () => {
  it("quita al residente del grupo — registra fecha_egreso", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });
    const residente = await crearResidente(residencia.id);

    await supertest(app.server)
      .post(`/grupos/${grupo.id}/integrantes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id });

    const res = await supertest(app.server)
      .delete(`/grupos/${grupo.id}/integrantes/${residente.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const integrante = await prisma.grupoIntegrante.findFirst({
      where: { grupo_id: grupo.id, residente_id: residente.id },
    });
    expect(integrante?.fecha_egreso).not.toBeNull();
  });

  it("retorna 404 si el residente no está en el grupo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await prisma.grupoCocina.create({
      data: { nombre: "Grupo A", residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .delete(`/grupos/${grupo.id}/integrantes/999`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
