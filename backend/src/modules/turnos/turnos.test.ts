import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function crearAdmin() {
  const hash = await bcrypt.hash("password123", 10);
  return prisma.user.create({
    data: { email: `admin-${Date.now()}@test.com`, password_hash: hash, role: "ADMIN_GLOBAL", first_login: false },
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
      rollback_horas: 2,
    },
  });
}

async function crearGrupo(residencia_id: number) {
  return prisma.grupoCocina.create({
    data: { nombre: `Grupo-${Date.now()}`, residencia_id },
  });
}

async function crearResidente(residencia_id: number) {
  const hash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: `residente-${Date.now()}@test.com`,
      password_hash: hash,
      role: "RESIDENTE",
      first_login: false,
      residencia_id,
    },
  });
  return prisma.residente.create({
    data: {
      user_id: user.id,
      residencia_id,
      nombre: "Juan",
      apellido: "Pérez",
      dni: `${Date.now()}`,
      edad: 22,
      universidad: "UBA",
      carrera: "Ingeniería",
      ciudad_origen: "Córdoba",
      fecha_ingreso: new Date("2024-03-01"),
    },
  });
}

async function crearMenu(residencia_id: number) {
  return prisma.menu.create({
    data: {
      nombre: "Milanesa",
      dificultad: "FACIL",
      tiempo_min: 30,
      residencia_id,
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
  await prisma.turnoCocina.deleteMany();
  await prisma.menuGrupo.deleteMany();
  await prisma.menuIngrediente.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.grupoIntegrante.deleteMany();
  await prisma.grupoCocina.deleteMany();
  await prisma.residente.deleteMany();
  await prisma.user.deleteMany({ where: { role: "RESIDENTE" } });
  await prisma.residencia.deleteMany();
});

// ---------------------------------------------------------------------------
// GET /residencias/:residencia_id/turnos
// ---------------------------------------------------------------------------

describe("GET /residencias/:residencia_id/turnos", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias/1/turnos");
    expect(res.status).toBe(401);
  });

  it("retorna lista vacía cuando no hay turnos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:residencia_id/turnos
// ---------------------------------------------------------------------------

describe("POST /residencias/:residencia_id/turnos", () => {
  it("crea un turno correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO" });

    expect(res.status).toBe(201);
    expect(res.body.franja).toBe("ALMUERZO");
    expect(res.body.activo).toBe(true);
  });

  it("retorna 409 si ya existe turno para ese grupo/fecha/franja", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);

    await supertest(app.server)
      .post(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO" });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO" });

    expect(res.status).toBe(409);
  });

  it("retorna 400 si el grupo no pertenece a la residencia", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia1 = await crearResidencia();
    const residencia2 = await crearResidencia();
    const grupo = await crearGrupo(residencia2.id);

    const res = await supertest(app.server)
      .post(`/residencias/${residencia1.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "CENA" });

    expect(res.status).toBe(400);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/turnos")
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: 1, fecha: "2025-06-01", franja: "ALMUERZO" });

    expect(res.status).toBe(404);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: 1 });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /turnos/:id
// ---------------------------------------------------------------------------

describe("DELETE /turnos/:id", () => {
  it("cancela el turno — soft delete, retorna 204", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-06-01"), franja: "ALMUERZO" },
    });

    const res = await supertest(app.server)
      .delete(`/turnos/${turno.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.turnoCocina.findUnique({ where: { id: turno.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .delete("/turnos/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /turnos/:id/selecciones
// ---------------------------------------------------------------------------

describe("POST /turnos/:id/selecciones", () => {
  it("registra la selección de menú del residente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const res = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 5 });

    expect(res.status).toBe(201);
    expect(res.body.personas).toBe(5);
    expect(res.body.estado).toBe("PENDIENTE");
    expect(res.body.rollback_deadline).toBeDefined();
  });

  it("retorna 409 si el residente ya seleccionó en este turno", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 5 });

    const res = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 3 });

    expect(res.status).toBe(409);
  });

  it("retorna 404 si el menú no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "CENA" },
    });
    const residente = await crearResidente(residencia.id);

    const res = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: 999, personas: 3 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /selecciones/:id/confirmar
// ---------------------------------------------------------------------------

describe("PATCH /selecciones/:id/confirmar", () => {
  it("confirma una selección pendiente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("CONFIRMADO");
  });

  it("retorna 400 si la selección ya está confirmada", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /selecciones/:id/revertir
// ---------------------------------------------------------------------------

describe("PATCH /selecciones/:id/revertir", () => {
  it("revierte una selección pendiente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/revertir`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("REVERTIDO");
  });

  it("retorna 400 si ya fue revertida", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/revertir`)
      .set("Authorization", `Bearer ${token}`);

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/revertir`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /selecciones/:id
// ---------------------------------------------------------------------------

describe("DELETE /selecciones/:id", () => {
  it("elimina una selección pendiente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    const res = await supertest(app.server)
      .delete(`/selecciones/${sel.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("retorna 400 si la selección está confirmada", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const menu = await crearMenu(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    const res = await supertest(app.server)
      .delete(`/selecciones/${sel.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .delete("/selecciones/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
