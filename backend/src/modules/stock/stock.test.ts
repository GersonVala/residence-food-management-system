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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });

beforeEach(async () => {
  await prisma.movimientoStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.menuGrupo.deleteMany();
  await prisma.menuIngrediente.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.alimento.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.grupoCocina.deleteMany();
  await prisma.residencia.deleteMany();
});

// ---------------------------------------------------------------------------
// GET /categorias
// ---------------------------------------------------------------------------

describe("GET /categorias", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/categorias");
    expect(res.status).toBe(401);
  });

  it("retorna lista vacía cuando no hay categorías", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .get("/categorias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /categorias
// ---------------------------------------------------------------------------

describe("POST /categorias", () => {
  it("crea una categoría correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Lácteos" });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Lácteos");
  });

  it("retorna 409 si ya existe una categoría con ese nombre", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    await supertest(app.server)
      .post("/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Lácteos" });

    const res = await supertest(app.server)
      .post("/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Lácteos" });

    expect(res.status).toBe(409);
  });

  it("retorna 400 si falta el nombre", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /categorias/:id
// ---------------------------------------------------------------------------

describe("PATCH /categorias/:id", () => {
  it("actualiza el nombre de la categoría", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const cat = await prisma.categoria.create({ data: { nombre: "Carnes" } });

    const res = await supertest(app.server)
      .patch(`/categorias/${cat.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Carnes y Aves" });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Carnes y Aves");
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .patch("/categorias/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "X" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /categorias/:id
// ---------------------------------------------------------------------------

describe("DELETE /categorias/:id", () => {
  it("elimina una categoría sin alimentos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const cat = await prisma.categoria.create({ data: { nombre: "Temporal" } });

    const res = await supertest(app.server)
      .delete(`/categorias/${cat.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("retorna 400 si tiene alimentos asociados", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const cat = await prisma.categoria.create({ data: { nombre: "Verduras" } });
    await prisma.alimento.create({
      data: { nombre: "Zanahoria", unidad_base: "KG", categoria_id: cat.id },
    });

    const res = await supertest(app.server)
      .delete(`/categorias/${cat.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /alimentos y POST /alimentos
// ---------------------------------------------------------------------------

describe("POST /alimentos", () => {
  it("crea un alimento correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const cat = await prisma.categoria.create({ data: { nombre: "Cereales" } });

    const res = await supertest(app.server)
      .post("/alimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Arroz", unidad_base: "KG", categoria_id: cat.id });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Arroz");
    expect(res.body.categoria.nombre).toBe("Cereales");
  });

  it("retorna 404 si la categoría no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/alimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Arroz", unidad_base: "KG", categoria_id: 999 });

    expect(res.status).toBe(404);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);

    const res = await supertest(app.server)
      .post("/alimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Arroz" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /alimentos/:id", () => {
  it("actualiza un alimento parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const cat = await prisma.categoria.create({ data: { nombre: "Aceites" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Aceite", unidad_base: "LITROS", categoria_id: cat.id },
    });

    const res = await supertest(app.server)
      .patch(`/alimentos/${alimento.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ marca: "Cocinero", calorias: 884 });

    expect(res.status).toBe(200);
    expect(res.body.marca).toBe("Cocinero");
    expect(res.body.calorias).toBe(884);
    expect(res.body.nombre).toBe("Aceite");
  });
});

// ---------------------------------------------------------------------------
// GET /residencias/:id/stock y POST
// ---------------------------------------------------------------------------

describe("GET /residencias/:residencia_id/stock", () => {
  it("retorna lista vacía cuando no hay stock", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/stock`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /residencias/:residencia_id/stock", () => {
  it("crea un registro de stock correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Harinas" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Harina", unidad_base: "KG", categoria_id: cat.id },
    });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/stock`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: alimento.id, cantidad: 10, unidad: "KG" });

    expect(res.status).toBe(201);
    expect(res.body.cantidad).toBe(10);
    expect(res.body.alimento.nombre).toBe("Harina");
  });

  it("retorna 404 si el alimento no existe", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/stock`)
      .set("Authorization", `Bearer ${token}`)
      .send({ alimento_id: 999, cantidad: 5, unidad: "KG" });

    expect(res.status).toBe(404);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/stock`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cantidad: 5 });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /stock/:id", () => {
  it("actualiza el stock correctamente", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Legumbres" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Lentejas", unidad_base: "KG", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 5, unidad: "KG" },
    });

    const res = await supertest(app.server)
      .patch(`/stock/${stock.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cantidad: 8, stock_minimo: 2 });

    expect(res.status).toBe(200);
    expect(res.body.cantidad).toBe(8);
    expect(res.body.stock_minimo).toBe(2);
  });
});

describe("DELETE /stock/:id", () => {
  it("hace soft delete del stock", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Conservas" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Atún", unidad_base: "UNIDADES", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 12, unidad: "UNIDADES" },
    });

    const res = await supertest(app.server)
      .delete(`/stock/${stock.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const enDb = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(enDb?.activo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

describe("POST /stock/:stock_id/movimientos", () => {
  it("registra una entrada y actualiza la cantidad", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Pastas" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Fideos", unidad_base: "KG", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 5, unidad: "KG" },
    });

    const res = await supertest(app.server)
      .post(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "ENTRADA", cantidad: 3, motivo: "Compra semanal" });

    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe("ENTRADA");

    const actualizado = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(actualizado?.cantidad).toBe(8);
  });

  it("registra una salida y descuenta la cantidad", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Bebidas" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Agua", unidad_base: "LITROS", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 20, unidad: "LITROS" },
    });

    const res = await supertest(app.server)
      .post(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "SALIDA", cantidad: 5 });

    expect(res.status).toBe(201);

    const actualizado = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(actualizado?.cantidad).toBe(15);
  });

  it("retorna 400 si no hay stock suficiente para una salida", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Especias" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Sal", unidad_base: "KG", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 1, unidad: "KG" },
    });

    const res = await supertest(app.server)
      .post(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "SALIDA", cantidad: 10 });

    expect(res.status).toBe(400);
  });

  it("registra un ajuste sin modificar la cantidad", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Varios" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Azúcar", unidad_base: "KG", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 3, unidad: "KG" },
    });

    await supertest(app.server)
      .post(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "AJUSTE", cantidad: 1, motivo: "Corrección de inventario" });

    const actualizado = await prisma.stock.findUnique({ where: { id: stock.id } });
    expect(actualizado?.cantidad).toBe(3);
  });
});

describe("GET /stock/:stock_id/movimientos", () => {
  it("retorna el historial de movimientos", async () => {
    const admin = await crearAdmin();
    const token = await login(admin.email);
    const residencia = await crearResidencia();
    const cat = await prisma.categoria.create({ data: { nombre: "Frescos" } });
    const alimento = await prisma.alimento.create({
      data: { nombre: "Leche", unidad_base: "LITROS", categoria_id: cat.id },
    });
    const stock = await prisma.stock.create({
      data: { alimento_id: alimento.id, residencia_id: residencia.id, cantidad: 10, unidad: "LITROS" },
    });

    await supertest(app.server)
      .post(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tipo: "ENTRADA", cantidad: 5 });

    const res = await supertest(app.server)
      .get(`/stock/${stock.id}/movimientos`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe("ENTRADA");
  });
});
