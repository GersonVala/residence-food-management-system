import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import { MIN_PASSWORD_LENGTH } from "../../shared/utils/password.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin-usuarios@test.com";
const ADMIN_PASSWORD = "password123";

async function crearAdminYLoguear(): Promise<string> {
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: { email: ADMIN_EMAIL, password_hash, role: "ADMIN_GLOBAL", first_login: false },
  });
  const res = await supertest(app.server)
    .post("/auth/login")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
  await prisma.seleccionAjuste.deleteMany();
  await prisma.seleccionMenu.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.grupoIntegrante.deleteMany();
  await prisma.menuGrupo.deleteMany();
  await prisma.menuIngrediente.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.turnoCocina.deleteMany();
  await prisma.grupoCocina.deleteMany();
  await prisma.residente.deleteMany();
  await prisma.auditoriaLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.alimento.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.residencia.deleteMany();
});

// ---------------------------------------------------------------------------
// POST /usuarios
// ---------------------------------------------------------------------------

describe("POST /usuarios", () => {
  it("crea un ADMIN_RESIDENCIA con la contraseña que eligió el admin y first_login = true", async () => {
    const token = await crearAdminYLoguear();
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post("/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "voluntario@test.com",
        role: "ADMIN_RESIDENCIA",
        residencia_id: residencia.id,
        password: "clave-elegida",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: "voluntario@test.com", role: "ADMIN_RESIDENCIA" });
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("password_hash");
    expect(res.body).not.toHaveProperty("password_temporal");

    const user = await prisma.user.findUnique({ where: { email: "voluntario@test.com" } });
    expect(user?.first_login).toBe(true);

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "voluntario@test.com", password: "clave-elegida" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.primer_login).toBe(true);
  });

  it("crea un ADMIN_GLOBAL que puede entrar con la contraseña indicada", async () => {
    const token = await crearAdminYLoguear();

    const res = await supertest(app.server)
      .post("/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "global2@test.com", role: "ADMIN_GLOBAL", password: "otra-clave" });

    expect(res.status).toBe(201);

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "global2@test.com", password: "otra-clave" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.primer_login).toBe(true);
  });

  it("retorna 400 si falta la contraseña", async () => {
    const token = await crearAdminYLoguear();

    const res = await supertest(app.server)
      .post("/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "sinpass@test.com", role: "ADMIN_GLOBAL" });

    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: "sinpass@test.com" } })).toBeNull();
  });

  it("retorna 400 si la contraseña es más corta que el mínimo", async () => {
    const token = await crearAdminYLoguear();

    const res = await supertest(app.server)
      .post("/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "corta@test.com",
        role: "ADMIN_GLOBAL",
        password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
      });

    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: "corta@test.com" } })).toBeNull();
  });

  it("retorna 409 si el email ya existe", async () => {
    const token = await crearAdminYLoguear();

    const res = await supertest(app.server)
      .post("/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: ADMIN_EMAIL, role: "ADMIN_GLOBAL", password: "clave-elegida" });

    expect(res.status).toBe(409);
  });
});
