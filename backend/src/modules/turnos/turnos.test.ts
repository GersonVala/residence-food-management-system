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
  const residente = await prisma.residente.create({
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
      provincia_origen: "Córdoba",
      fecha_ingreso: new Date("2024-03-01"),
    },
  });
  return { ...residente, user };
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

// Convención real de los datos: cantidad_base es la cantidad para personas_base comensales.
// El seed además guarda cantidad_por_persona = cantidad_base / personas_base;
// la interfaz de menús la guarda en 0. El escalado no debe depender de ese campo.
async function crearMenuConIngredientes(
  residencia_id: number,
  { personas_base = 10, cantidad_base = 2, cantidad_por_persona = 0.2 } = {}
) {
  const categoria = await prisma.categoria.create({ data: { nombre: `Cat-${Date.now()}` } });
  const alimento = await prisma.alimento.create({
    data: { nombre: `Alimento-${Date.now()}`, unidad_base: "KG", categoria_id: categoria.id },
  });
  const stock = await prisma.stock.create({
    data: { alimento_id: alimento.id, residencia_id, cantidad: 100, unidad: "KG" },
  });
  const menu = await prisma.menu.create({
    data: { nombre: "Milanesa con ing", dificultad: "FACIL", tiempo_min: 30, personas_base, residencia_id },
  });
  await prisma.menuIngrediente.create({
    data: {
      menu_id: menu.id,
      alimento_id: alimento.id,
      cantidad_base,
      cantidad_por_persona,
      unidad: "KG",
    },
  });
  return { menu, alimento, stock };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
  await prisma.seleccionAjuste.deleteMany();
  await prisma.seleccionMenu.deleteMany();
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.turnoCocina.deleteMany();
  await prisma.menuGrupo.deleteMany();
  await prisma.menuIngrediente.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.grupoIntegrante.deleteMany();
  await prisma.grupoCocina.deleteMany();
  await prisma.residente.deleteMany();
  await prisma.user.deleteMany({ where: { role: "RESIDENTE" } });
  await prisma.alimento.deleteMany();
  await prisma.categoria.deleteMany();
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
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO", tipo: "ROTATIVO" });

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
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO", tipo: "ROTATIVO" });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/turnos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "ALMUERZO", tipo: "ROTATIVO" });

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
      .send({ grupo_id: grupo.id, fecha: "2025-06-01", franja: "CENA", tipo: "ROTATIVO" });

    expect(res.status).toBe(400);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/turnos")
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: 1, fecha: "2025-06-01", franja: "ALMUERZO", tipo: "ROTATIVO" });

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
    expect(res.body.rollback_deadline).toBeNull();
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
  it("confirma, genera ajustes y descuenta stock", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu, stock } = await crearMenuConIngredientes(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("CONFIRMADO");
    expect(res.body.ajustes).toHaveLength(1);

    // cantidad_base(2) / personas_base(10) * personas(4) = 0.8
    const stockActualizado = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockActualizado?.cantidad).toBeCloseTo(99.2);
  });

  it("no duplica la cantidad cuando cocina para personas_base (datos del seed)", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    // Receta de 1.5 kg para 10 personas, cargada como lo hace el seed
    const { menu, stock } = await crearMenuConIngredientes(residencia.id, {
      personas_base: 10, cantidad_base: 1.5, cantidad_por_persona: 0.15,
    });

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 10 });
    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    const stockTras = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockTras?.cantidad).toBeCloseTo(98.5);
  });

  it("escala ingredientes cargados desde la interfaz (cantidad_por_persona = 0)", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    // Receta de 2 kg para 10 personas; cocinan 20 → 4 kg
    const { menu, stock } = await crearMenuConIngredientes(residencia.id, {
      personas_base: 10, cantidad_base: 2, cantidad_por_persona: 0,
    });

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 20 });
    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    const stockTras = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockTras?.cantidad).toBeCloseTo(96);
  });

  it("confirma con stock insuficiente descontando parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu, stock } = await crearMenuConIngredientes(residencia.id);

    // Dejar solo 0.5kg — insuficiente para 4 personas (necesita 0.8kg)
    await prisma.stock.update({ where: { id: stock.id }, data: { cantidad: 0.5 } });

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    // Confirma igual, descuenta lo que hay (0.5kg de 0.8kg necesarios)
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("CONFIRMADO");
    const stockTras = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockTras?.cantidad).toBe(0);
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
    const { menu } = await crearMenuConIngredientes(residencia.id);

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
  it("revierte una selección pendiente sin tocar stock", async () => {
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

  it("revierte una selección confirmada y devuelve el stock", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    // fecha futura para que el rollback_deadline no esté vencido
    const fechaFutura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: fechaFutura, franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu, stock } = await crearMenuConIngredientes(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });

    await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/confirmar`)
      .set("Authorization", `Bearer ${token}`);

    // stock bajó de 100 a 99.2
    const stockTras = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockTras?.cantidad).toBeCloseTo(99.2);

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/revertir`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("REVERTIDO");

    // stock vuelve a 100
    const stockRestaurado = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(stockRestaurado?.cantidad).toBeCloseTo(100);
  });

  it("repone el stock en los mismos lotes de los que se descontó", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const fechaFutura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: fechaFutura, franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    // receta: 2 kg para 10 personas
    const { menu, alimento, stock: loteTardio } = await crearMenuConIngredientes(residencia.id);
    await prisma.stock.update({
      where: { id: loteTardio.id },
      data: { cantidad: 10, fecha_vencimiento: new Date("2031-01-01") },
    });
    // creado después, pero vence antes: el descuento lo consume primero
    const lotePronto = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 2, unidad: "KG", fecha_vencimiento: new Date("2030-01-01") },
    });

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 10 });
    await supertest(app.server).patch(`/selecciones/${sel.body.id}/confirmar`).set("Authorization", `Bearer ${token}`);

    await supertest(app.server).patch(`/selecciones/${sel.body.id}/revertir`).set("Authorization", `Bearer ${token}`);

    const pronto = await prisma.stock.findUnique({ where: { id: lotePronto.id } });
    const tardio = await prisma.stock.findUnique({ where: { id: loteTardio.id } });
    expect(pronto?.cantidad).toBeCloseTo(2);
    expect(tardio?.cantidad).toBeCloseTo(10);
  });

  it("revierte por completo aunque el lote original haya sido dado de baja", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const fechaFutura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: fechaFutura, franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu, stock } = await crearMenuConIngredientes(residencia.id);

    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 10 });
    await supertest(app.server).patch(`/selecciones/${sel.body.id}/confirmar`).set("Authorization", `Bearer ${token}`);
    // el lote se da de baja: el alimento queda sin lotes activos
    await prisma.stock.update({ where: { id: stock.id }, data: { activo: false } });

    const res = await supertest(app.server)
      .patch(`/selecciones/${sel.body.id}/revertir`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const seleccion = await prisma.seleccionMenu.findUnique({ where: { id: sel.body.id } });
    expect(seleccion?.estado).toBe("REVERTIDO");
    const lote = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(lote?.cantidad).toBeCloseTo(100);
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
    const { menu } = await crearMenuConIngredientes(residencia.id);

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

// ---------------------------------------------------------------------------
// GET /me/selecciones
// ---------------------------------------------------------------------------

describe("GET /me/selecciones", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/me/selecciones");
    expect(res.status).toBe(401);
  });

  it("retorna 403 si el usuario no es RESIDENTE", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .get("/me/selecciones")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("retorna lista vacía cuando el residente no tiene selecciones", async () => {
    const residencia = await crearResidencia();
    const residente = await crearResidente(residencia.id);
    const token = await login(residente.user.email);

    const res = await supertest(app.server)
      .get("/me/selecciones")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna selecciones con menu, turno y ajustes", async () => {
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu } = await crearMenuConIngredientes(residencia.id);
    const token = await login(residente.user.email);

    const admin = await crearAdmin();
    const adminToken = await login(admin.email);

    await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 3 });

    const res = await supertest(app.server)
      .get("/me/selecciones")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].menu.nombre).toBe("Milanesa con ing");
    expect(res.body[0].turno.franja).toBe("ALMUERZO");
    expect(res.body[0].personas).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Plazo para deshacer: rollback_horas DESPUÉS de confirmar
// ---------------------------------------------------------------------------

describe("plazo para deshacer una cocción confirmada", () => {
  const HORA = 60 * 60 * 1000;

  async function escenario(tipo: "FIJO" | "ROTATIVO") {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data:
        tipo === "FIJO"
          ? { grupo_id: grupo.id, residencia_id: residencia.id, tipo: "FIJO", dia_semana: 1, franja: "ALMUERZO" }
          : { grupo_id: grupo.id, residencia_id: residencia.id, tipo: "ROTATIVO", fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const residente = await crearResidente(residencia.id);
    const { menu } = await crearMenuConIngredientes(residencia.id);
    const sel = await supertest(app.server)
      .post(`/turnos/${turno.id}/selecciones`)
      .set("Authorization", `Bearer ${token}`)
      .send({ residente_id: residente.id, menu_id: menu.id, personas: 4 });
    return { token, residencia, grupo, turno, residente, menu, sel };
  }

  const confirmar = (token: string, id: number) =>
    supertest(app.server).patch(`/selecciones/${id}/confirmar`).set("Authorization", `Bearer ${token}`);
  const revertir = (token: string, id: number) =>
    supertest(app.server).patch(`/selecciones/${id}/revertir`).set("Authorization", `Bearer ${token}`);

  it("una selección PENDIENTE de turno FIJO se crea sin plazo", async () => {
    const { sel } = await escenario("FIJO");
    expect(sel.status).toBe(201);
    expect(sel.body.rollback_deadline).toBeNull();
  });

  it("confirmar fija rollback_deadline = ahora + rollback_horas", async () => {
    const { token, sel } = await escenario("FIJO");
    const antes = Date.now();
    const res = await confirmar(token, sel.body.id);
    const despues = Date.now();

    expect(res.status).toBe(200);
    const deadline = new Date(res.body.rollback_deadline).getTime();
    expect(deadline).toBeGreaterThanOrEqual(antes + 2 * HORA - 1000);
    expect(deadline).toBeLessThanOrEqual(despues + 2 * HORA + 1000);
  });

  it("turno FIJO: se puede confirmar y revertir dentro del plazo", async () => {
    const { token, sel } = await escenario("FIJO");
    await confirmar(token, sel.body.id);
    const res = await revertir(token, sel.body.id);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("REVERTIDO");
  });

  it("turno ROTATIVO (aunque su fecha ya pasó): se puede revertir dentro del plazo", async () => {
    const { token, sel } = await escenario("ROTATIVO");
    await confirmar(token, sel.body.id);
    const res = await revertir(token, sel.body.id);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("REVERTIDO");
  });

  it("retorna 400 si el plazo venció", async () => {
    const { token, sel } = await escenario("FIJO");
    await confirmar(token, sel.body.id);
    await prisma.seleccionMenu.update({
      where: { id: sel.body.id },
      data: { rollback_deadline: new Date(Date.now() - 1000) },
    });

    const res = await revertir(token, sel.body.id);
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toContain("El plazo para deshacer esta cocción ya venció");
    const tras = await prisma.seleccionMenu.findUnique({ where: { id: sel.body.id } });
    expect(tras?.estado).toBe("CONFIRMADO");
  });

  it("un residente puede revertir su propia selección confirmada", async () => {
    const { token, sel, residente } = await escenario("FIJO");
    await confirmar(token, sel.body.id);
    const tokenResidente = await login(residente.user.email);

    const res = await revertir(tokenResidente, sel.body.id);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("REVERTIDO");
  });

  it("un residente NO puede revertir la selección de otro residente (403)", async () => {
    const { token, sel, residencia } = await escenario("FIJO");
    await confirmar(token, sel.body.id);
    const otro = await crearResidente(residencia.id);
    const tokenOtro = await login(otro.user.email);

    const res = await revertir(tokenOtro, sel.body.id);
    expect(res.status).toBe(403);
    const tras = await prisma.seleccionMenu.findUnique({ where: { id: sel.body.id } });
    expect(tras?.estado).toBe("CONFIRMADO");
  });
});

// ---------------------------------------------------------------------------
// Concurrencia: confirmar / revertir no deben duplicar ni sobregirar stock
// ---------------------------------------------------------------------------

describe("concurrencia de confirmar y revertir", () => {
  const confirmar = (token: string, id: number) =>
    supertest(app.server).patch(`/selecciones/${id}/confirmar`).set("Authorization", `Bearer ${token}`);
  const revertir = (token: string, id: number) =>
    supertest(app.server).patch(`/selecciones/${id}/revertir`).set("Authorization", `Bearer ${token}`);

  // Receta de `cantidad_base` kg para 10 personas; cada selección es para 10 => descuenta cantidad_base
  async function escenario(stockInicial: number, cantidad_base: number, cantidadSelecciones: number) {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const grupo = await crearGrupo(residencia.id);
    const turno = await prisma.turnoCocina.create({
      data: { grupo_id: grupo.id, residencia_id: residencia.id, fecha: new Date("2025-12-01"), franja: "ALMUERZO" },
    });
    const { menu, stock } = await crearMenuConIngredientes(residencia.id, {
      personas_base: 10, cantidad_base, cantidad_por_persona: 0,
    });
    await prisma.stock.update({ where: { id: stock.id }, data: { cantidad: stockInicial } });

    const selecciones: number[] = [];
    for (let i = 0; i < cantidadSelecciones; i++) {
      const residente = await crearResidente(residencia.id);
      const sel = await supertest(app.server)
        .post(`/turnos/${turno.id}/selecciones`)
        .set("Authorization", `Bearer ${token}`)
        .send({ residente_id: residente.id, menu_id: menu.id, personas: 10 });
      selecciones.push(sel.body.id as number);
    }
    return { token, stock, selecciones };
  }

  it("dos confirmaciones simultáneas de la misma selección: una 200, una 409, stock descontado una vez", async () => {
    const { token, stock, selecciones } = await escenario(10, 3, 1);

    const [a, b] = await Promise.all([
      confirmar(token, selecciones[0]!),
      confirmar(token, selecciones[0]!),
    ]);

    // El perdedor recibe 409 si pierde la carrera dentro de la transacción,
    // o 400 si ya veía CONFIRMADO al leer la selección
    const estados = [a.status, b.status].sort();
    expect(estados[0]).toBe(200);
    expect([400, 409]).toContain(estados[1]);
    const final = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(final?.cantidad).toBeCloseTo(7);
    const ajustes = await prisma.seleccionAjuste.findMany({ where: { seleccion_id: selecciones[0]! } });
    expect(ajustes).toHaveLength(1);
    const salidas = await prisma.movimientoStock.count({ where: { stock_id: stock.id, tipo: "SALIDA" } });
    expect(salidas).toBe(1);
  });

  it("dos selecciones distintas sobre un mismo lote insuficiente: nunca se descuenta de más", async () => {
    const { token, stock, selecciones } = await escenario(8, 6, 2);

    const resultados = await Promise.all(selecciones.map((id) => confirmar(token, id)));

    expect(resultados.map((r) => r.status)).toEqual([200, 200]);
    const final = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(final!.cantidad).toBeGreaterThanOrEqual(0);
    expect(final!.cantidad).toBeCloseTo(0);

    const ajustes = await prisma.seleccionAjuste.findMany({ where: { seleccion_id: { in: selecciones } } });
    const real = ajustes.map((a) => a.cantidad_real).sort((x, y) => x - y);
    expect(real[0]).toBeCloseTo(2);
    expect(real[1]).toBeCloseTo(6);
    const salidas = await prisma.movimientoStock.findMany({ where: { stock_id: stock.id, tipo: "SALIDA" } });
    expect(salidas.reduce((acc, m) => acc + m.cantidad, 0)).toBeCloseTo(8);
  });

  it("dos reversiones simultáneas: una prospera, la otra falla, stock restituido una sola vez", async () => {
    const { token, stock, selecciones } = await escenario(10, 3, 1);
    await confirmar(token, selecciones[0]!);

    const [a, b] = await Promise.all([
      revertir(token, selecciones[0]!),
      revertir(token, selecciones[0]!),
    ]);

    const estados = [a.status, b.status].sort();
    expect(estados[0]).toBe(200);
    expect([400, 409]).toContain(estados[1]);
    const final = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(final?.cantidad).toBeCloseTo(10);
    const entradas = await prisma.movimientoStock.count({
      where: { stock_id: stock.id, tipo: "ENTRADA", motivo: { startsWith: "Rollback" } },
    });
    expect(entradas).toBe(1);
  });
});
