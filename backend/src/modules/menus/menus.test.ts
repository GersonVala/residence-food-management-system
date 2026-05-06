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
    },
  });
}

async function crearCategoria() {
  return prisma.categoria.create({ data: { nombre: `Cat-${Date.now()}` } });
}

async function crearAlimento(categoria_id: number) {
  return prisma.alimento.create({
    data: {
      nombre: `Alimento-${Date.now()}`,
      unidad_base: "KG",
      categoria_id,
    },
  });
}

async function crearGrupo(residencia_id: number) {
  return prisma.grupoCocina.create({
    data: { nombre: `Grupo-${Date.now()}`, residencia_id },
  });
}

const menuBase = {
  nombre: "Milanesa napolitana",
  dificultad: "MEDIO",
  tiempo_min: 45,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
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
// GET /residencias/:residencia_id/menus
// ---------------------------------------------------------------------------

describe("GET /residencias/:residencia_id/menus", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias/1/menus");
    expect(res.status).toBe(401);
  });

  it("retorna lista vacía cuando no hay menús", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/menus`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna solo menús activos de esa residencia", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    await prisma.menu.createMany({
      data: [
        { ...menuBase, residencia_id: residencia.id, activo: true },
        { ...menuBase, nombre: "Inactivo", residencia_id: residencia.id, activo: false },
      ],
    });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/menus`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Milanesa napolitana");
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:residencia_id/menus
// ---------------------------------------------------------------------------

describe("POST /residencias/:residencia_id/menus", () => {
  it("crea un menú correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/menus`)
      .set("Authorization", `Bearer ${token}`)
      .send(menuBase);

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Milanesa napolitana");
    expect(res.body.dificultad).toBe("MEDIO");
    expect(res.body.activo).toBe(true);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/menus")
      .set("Authorization", `Bearer ${token}`)
      .send(menuBase);

    expect(res.status).toBe(404);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/menus`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Solo nombre" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /menus/:id
// ---------------------------------------------------------------------------

describe("GET /menus/:id", () => {
  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .get("/menus/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna el menú con ingredientes y grupos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .get(`/menus/${menu.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Milanesa napolitana");
    expect(res.body.ingredientes).toEqual([]);
    expect(res.body.grupos).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PATCH /menus/:id
// ---------------------------------------------------------------------------

describe("PATCH /menus/:id", () => {
  it("actualiza campos parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .patch(`/menus/${menu.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dificultad: "DIFICIL", tiempo_min: 60 });

    expect(res.status).toBe(200);
    expect(res.body.dificultad).toBe("DIFICIL");
    expect(res.body.tiempo_min).toBe(60);
    expect(res.body.nombre).toBe("Milanesa napolitana");
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .patch("/menus/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Nuevo" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /menus/:id
// ---------------------------------------------------------------------------

describe("DELETE /menus/:id", () => {
  it("hace soft delete — retorna 204 y queda inactivo", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .delete(`/menus/${menu.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.menu.findUnique({ where: { id: menu.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .delete("/menus/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /menus/:id/ingredientes
// ---------------------------------------------------------------------------

describe("POST /menus/:id/ingredientes", () => {
  it("agrega un ingrediente al menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const categoria = await crearCategoria();
    const alimento = await crearAlimento(categoria.id);

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        alimento_id: alimento.id,
        cantidad_base: 2,
        cantidad_por_persona: 0.2,
        unidad: "KG",
      });

    expect(res.status).toBe(201);
    expect(res.body.alimento_id).toBe(alimento.id);
    expect(res.body.unidad).toBe("KG");
  });

  it("retorna 409 si el alimento ya está en el menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const categoria = await crearCategoria();
    const alimento = await crearAlimento(categoria.id);

    await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: alimento.id, cantidad_base: 2, cantidad_por_persona: 0.2, unidad: "KG" });

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: alimento.id, cantidad_base: 3, cantidad_por_persona: 0.3, unidad: "KG" });

    expect(res.status).toBe(409);
  });

  it("retorna 404 si el alimento no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: 999, cantidad_base: 1, cantidad_por_persona: 0.1, unidad: "KG" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /menus/:id/ingredientes/:alimento_id
// ---------------------------------------------------------------------------

describe("PATCH /menus/:id/ingredientes/:alimento_id", () => {
  it("actualiza cantidades del ingrediente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const categoria = await crearCategoria();
    const alimento = await crearAlimento(categoria.id);

    await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: alimento.id, cantidad_base: 2, cantidad_por_persona: 0.2, unidad: "KG" });

    const res = await supertest(app.server)
      .patch(`/menus/${menu.id}/ingredientes/${alimento.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cantidad_base: 3, cantidad_por_persona: 0.3 });

    expect(res.status).toBe(200);
    expect(res.body.cantidad_base).toBe(3);
    expect(res.body.cantidad_por_persona).toBe(0.3);
  });

  it("retorna 404 si el ingrediente no está en el menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .patch(`/menus/${menu.id}/ingredientes/999`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cantidad_base: 5 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /menus/:id/ingredientes/:alimento_id
// ---------------------------------------------------------------------------

describe("DELETE /menus/:id/ingredientes/:alimento_id", () => {
  it("quita el ingrediente del menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const categoria = await crearCategoria();
    const alimento = await crearAlimento(categoria.id);

    await supertest(app.server)
      .post(`/menus/${menu.id}/ingredientes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: alimento.id, cantidad_base: 2, cantidad_por_persona: 0.2, unidad: "KG" });

    const res = await supertest(app.server)
      .delete(`/menus/${menu.id}/ingredientes/${alimento.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.menuIngrediente.findUnique({
      where: { menu_id_alimento_id: { menu_id: menu.id, alimento_id: alimento.id } },
    });
    expect(enDb).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST /menus/:id/grupos
// ---------------------------------------------------------------------------

describe("POST /menus/:id/grupos", () => {
  it("asigna un grupo al menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const grupo = await crearGrupo(residencia.id);

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id });

    expect(res.status).toBe(201);
    expect(res.body.grupo_id).toBe(grupo.id);
    expect(res.body.menu_id).toBe(menu.id);
  });

  it("retorna 409 si el grupo ya tiene asignado el menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const grupo = await crearGrupo(residencia.id);

    await supertest(app.server)
      .post(`/menus/${menu.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id });

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id });

    expect(res.status).toBe(409);
  });

  it("retorna 404 si el grupo no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .post(`/menus/${menu.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: 999 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /menus/:id/grupos/:grupo_id
// ---------------------------------------------------------------------------

describe("DELETE /menus/:id/grupos/:grupo_id", () => {
  it("quita el grupo del menú", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });
    const grupo = await crearGrupo(residencia.id);

    await supertest(app.server)
      .post(`/menus/${menu.id}/grupos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grupo_id: grupo.id });

    const res = await supertest(app.server)
      .delete(`/menus/${menu.id}/grupos/${grupo.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("retorna 404 si el grupo no estaba asignado", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const menu = await prisma.menu.create({
      data: { ...menuBase, residencia_id: residencia.id },
    });

    const res = await supertest(app.server)
      .delete(`/menus/${menu.id}/grupos/999`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
