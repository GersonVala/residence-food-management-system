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
    data: { email: `admin-${role}-${Date.now()}@test.com`, password_hash: hash, role, first_login: false },
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

const residenteBase = {
  email: "residente@test.com",
  nombre: "Juan",
  apellido: "Pérez",
  dni: "12345678",
  edad: 22,
  universidad: "UBA",
  carrera: "Ingeniería",
  ciudad_origen: "Córdoba",
  fecha_ingreso: new Date("2024-03-01").toISOString(),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
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
// GET /residencias/:id/residentes
// ---------------------------------------------------------------------------

describe("GET /residencias/:residencia_id/residentes", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias/1/residentes");
    expect(res.status).toBe(401);
  });

  it("retorna lista vacía cuando no hay residentes", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna solo residentes activos de esa residencia", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Juan");
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:id/residentes
// ---------------------------------------------------------------------------

describe("POST /residencias/:residencia_id/residentes", () => {
  it("crea residente y su usuario correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Juan");
    expect(res.body.dni).toBe("12345678");

    const user = await prisma.user.findFirst({ where: { email: residenteBase.email } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("RESIDENTE");
    expect(user?.first_login).toBe(true);
  });

  it("retorna 409 si el DNI ya existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...residenteBase, email: "otro@test.com" });

    expect(res.status).toBe(409);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/residentes")
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    expect(res.status).toBe(404);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Solo nombre" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /residentes/:id
// ---------------------------------------------------------------------------

describe("GET /residentes/:id", () => {
  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .get("/residentes/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna el residente si existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const created = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const res = await supertest(app.server)
      .get(`/residentes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.apellido).toBe("Pérez");
  });
});

// ---------------------------------------------------------------------------
// PATCH /residentes/:id
// ---------------------------------------------------------------------------

describe("PATCH /residentes/:id", () => {
  it("actualiza campos parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const created = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const res = await supertest(app.server)
      .patch(`/residentes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ carrera: "Medicina", telefono: "1155556666" });

    expect(res.status).toBe(200);
    expect(res.body.carrera).toBe("Medicina");
    expect(res.body.telefono).toBe("1155556666");
    expect(res.body.nombre).toBe("Juan");
  });

  it("retorna 409 si el nuevo DNI ya pertenece a otro residente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const segundo = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...residenteBase, email: "segundo@test.com", dni: "87654321" });

    const res = await supertest(app.server)
      .patch(`/residentes/${segundo.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dni: "12345678" });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// DELETE /residentes/:id
// ---------------------------------------------------------------------------

describe("DELETE /residentes/:id", () => {
  it("hace soft delete — retorna 204 y el residente queda inactivo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const created = await supertest(app.server)
      .post(`/residencias/${residencia.id}/residentes`)
      .set("Authorization", `Bearer ${token}`)
      .send(residenteBase);

    const res = await supertest(app.server)
      .delete(`/residentes/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.residente.findUnique({ where: { id: created.body.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .delete("/residentes/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
