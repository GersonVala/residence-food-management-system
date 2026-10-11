import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../index.js";
import { prisma } from "../prisma/client.js";

// Un usuario de la residencia A no debe poder leer ni modificar recursos de la residencia B.
// ADMIN_GLOBAL no tiene esta restricción.

let tokenAdminA: string;
let tokenResidenteA: string;
let tokenGlobal: string;
let f: {
  resA: number; resB: number;
  residenteA: number; residenteB: number;
  grupoA: number; grupoB: number;
  menuB: number; menuBiblioteca: number;
  alimento: number; stockB: number;
  turnoB: number; seleccionB: number;
};

async function crearUsuario(email: string, role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" | "RESIDENTE", residencia_id: number | null, puede_cargar_stock = false) {
  const password_hash = await bcrypt.hash("password123", 10);
  return prisma.user.create({ data: { email, password_hash, role, residencia_id, first_login: false, puede_cargar_stock } });
}

async function crearResidente(email: string, dni: string, residencia_id: number, puede_cargar_stock = false) {
  const user = await crearUsuario(email, "RESIDENTE", residencia_id, puede_cargar_stock);
  return prisma.residente.create({
    data: {
      user_id: user.id, residencia_id, nombre: "Ana", apellido: "Test", dni, edad: 21,
      universidad: "UBA", carrera: "Medicina", ciudad_origen: "Salta", provincia_origen: "Salta",
      fecha_ingreso: new Date("2025-03-01"),
    },
  });
}

async function login(email: string): Promise<string> {
  const res = await supertest(app.server).post("/auth/login").send({ email, password: "password123" });
  return res.body.token as string;
}

async function limpiarBase() {
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
  await prisma.auditoriaLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.alimento.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.residenciaFoto.deleteMany();
  await prisma.residencia.deleteMany();
}

beforeAll(async () => {
  await app.ready();
  await limpiarBase();

  const datos = { direccion: "Calle 1", ciudad: "CABA", provincia: "Buenos Aires", capacidad_max: 20 };
  const resA = await prisma.residencia.create({ data: { nombre: "Residencia A", ...datos } });
  const resB = await prisma.residencia.create({ data: { nombre: "Residencia B", ...datos } });

  await crearUsuario("global@test.com", "ADMIN_GLOBAL", null);
  await crearUsuario("admin-a@test.com", "ADMIN_RESIDENCIA", resA.id);
  const residenteA = await crearResidente("residente-a@test.com", "30000001", resA.id, true);
  const residenteB = await crearResidente("residente-b@test.com", "30000002", resB.id);

  const grupoA = await prisma.grupoCocina.create({ data: { nombre: "Grupo A", residencia_id: resA.id } });
  const grupoB = await prisma.grupoCocina.create({ data: { nombre: "Grupo B", residencia_id: resB.id } });
  const menuB = await prisma.menu.create({ data: { nombre: "Guiso B", dificultad: "FACIL", tiempo_min: 30, personas_base: 4, residencia_id: resB.id } });
  const menuBiblioteca = await prisma.menu.create({ data: { nombre: "Guiso biblioteca", dificultad: "FACIL", tiempo_min: 30, personas_base: 4, residencia_id: null } });
  const categoria = await prisma.categoria.create({ data: { nombre: "Verduras" } });
  const alimento = await prisma.alimento.create({ data: { nombre: "Papa", unidad_base: "KG", categoria_id: categoria.id } });
  await prisma.menuIngrediente.create({ data: { menu_id: menuB.id, alimento_id: alimento.id, cantidad_base: 1, cantidad_por_persona: 0, unidad: "KG" } });
  const stockB = await prisma.stock.create({ data: { alimento_id: alimento.id, residencia_id: resB.id, cantidad: 10, unidad: "KG" } });
  const turnoB = await prisma.turnoCocina.create({ data: { grupo_id: grupoB.id, residencia_id: resB.id, tipo: "ROTATIVO", fecha: new Date("2030-01-01"), franja: "ALMUERZO" } });
  const seleccionB = await prisma.seleccionMenu.create({ data: { turno_id: turnoB.id, menu_id: menuB.id, residente_id: residenteB.id, personas: 2, rollback_deadline: new Date("2030-01-01") } });

  f = {
    resA: resA.id, resB: resB.id, residenteA: residenteA.id, residenteB: residenteB.id,
    grupoA: grupoA.id, grupoB: grupoB.id, menuB: menuB.id, menuBiblioteca: menuBiblioteca.id,
    alimento: alimento.id, stockB: stockB.id, turnoB: turnoB.id, seleccionB: seleccionB.id,
  };

  tokenGlobal = await login("global@test.com");
  tokenAdminA = await login("admin-a@test.com");
  tokenResidenteA = await login("residente-a@test.com");
});

afterAll(async () => {
  await limpiarBase();
  await app.close();
  await prisma.$disconnect();
});

type Caso = { metodo: "get" | "post" | "patch" | "delete"; ruta: () => string; body?: () => object };

const casosAdminResidencia: Caso[] = [
  // residencias
  { metodo: "get", ruta: () => `/residencias/${f.resB}` },
  { metodo: "get", ruta: () => `/residencias/${f.resB}/fotos` },
  // residentes
  { metodo: "get", ruta: () => `/residencias/${f.resB}/residentes` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/residentes`, body: () => ({
    email: "nuevo@test.com", nombre: "N", apellido: "N", dni: "40000000", edad: 20, universidad: "U", carrera: "C",
    ciudad_origen: "X", provincia_origen: "X", fecha_ingreso: "2025-03-01T00:00:00.000Z" }) },
  { metodo: "get", ruta: () => `/residentes/${f.residenteB}` },
  { metodo: "patch", ruta: () => `/residentes/${f.residenteB}`, body: () => ({ telefono: "123" }) },
  { metodo: "patch", ruta: () => `/residentes/${f.residenteB}/permiso-stock`, body: () => ({ puede_cargar_stock: true }) },
  { metodo: "delete", ruta: () => `/residentes/${f.residenteB}`, body: () => ({ motivo_baja: "x" }) },
  // grupos
  { metodo: "get", ruta: () => `/residentes/${f.residenteB}/grupo` },
  { metodo: "get", ruta: () => `/residencias/${f.resB}/grupos` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/grupos`, body: () => ({ nombre: "Intruso" }) },
  { metodo: "get", ruta: () => `/grupos/${f.grupoB}` },
  { metodo: "patch", ruta: () => `/grupos/${f.grupoB}`, body: () => ({ nombre: "Hackeado" }) },
  { metodo: "delete", ruta: () => `/grupos/${f.grupoB}` },
  { metodo: "get", ruta: () => `/grupos/${f.grupoB}/integrantes` },
  { metodo: "post", ruta: () => `/grupos/${f.grupoB}/integrantes`, body: () => ({ residente_id: f.residenteB }) },
  { metodo: "delete", ruta: () => `/grupos/${f.grupoB}/integrantes/${f.residenteB}` },
  { metodo: "get", ruta: () => `/grupos/${f.grupoB}/menus` },
  { metodo: "post", ruta: () => `/grupos/${f.grupoB}/menus`, body: () => ({ menu_id: f.menuB }) },
  { metodo: "delete", ruta: () => `/grupos/${f.grupoB}/menus/${f.menuB}` },
  // menús
  { metodo: "get", ruta: () => `/residencias/${f.resB}/menus` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/menus`, body: () => ({ nombre: "X", dificultad: "FACIL", tiempo_min: 10, personas_base: 4 }) },
  { metodo: "get", ruta: () => `/menus/${f.menuB}` },
  { metodo: "patch", ruta: () => `/menus/${f.menuB}`, body: () => ({ nombre: "Hackeado" }) },
  { metodo: "delete", ruta: () => `/menus/${f.menuB}` },
  { metodo: "post", ruta: () => `/menus/${f.menuB}/ingredientes`, body: () => ({ alimento_id: f.alimento, cantidad_base: 1, cantidad_por_persona: 0, unidad: "KG" }) },
  { metodo: "patch", ruta: () => `/menus/${f.menuB}/ingredientes/${f.alimento}`, body: () => ({ cantidad_base: 2 }) },
  { metodo: "delete", ruta: () => `/menus/${f.menuB}/ingredientes/${f.alimento}` },
  { metodo: "post", ruta: () => `/menus/${f.menuB}/grupos`, body: () => ({ grupo_id: f.grupoB }) },
  { metodo: "delete", ruta: () => `/menus/${f.menuB}/grupos/${f.grupoB}` },
  { metodo: "post", ruta: () => `/menus/${f.menuBiblioteca}/clonar`, body: () => ({ residencia_id: f.resB }) },
  { metodo: "patch", ruta: () => `/menus/${f.menuBiblioteca}`, body: () => ({ nombre: "Biblioteca modificada" }) },
  // stock
  { metodo: "get", ruta: () => `/residencias/${f.resB}/stock` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/stock`, body: () => ({ alimento_id: f.alimento, cantidad: 1, unidad: "KG" }) },
  { metodo: "get", ruta: () => `/stock/${f.stockB}` },
  { metodo: "patch", ruta: () => `/stock/${f.stockB}`, body: () => ({ cantidad: 999 }) },
  { metodo: "delete", ruta: () => `/stock/${f.stockB}` },
  { metodo: "patch", ruta: () => `/residencias/${f.resB}/stock/alimento/${f.alimento}/minimo`, body: () => ({ stock_minimo: 1 }) },
  { metodo: "get", ruta: () => `/stock/${f.stockB}/movimientos` },
  { metodo: "post", ruta: () => `/stock/${f.stockB}/movimientos`, body: () => ({ tipo: "SALIDA", cantidad: 1 }) },
  // turnos y selecciones
  { metodo: "get", ruta: () => `/residencias/${f.resB}/turnos` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/turnos`, body: () => ({ grupo_id: f.grupoB, franja: "CENA", tipo: "ROTATIVO", fecha: "2030-02-01" }) },
  { metodo: "get", ruta: () => `/turnos/${f.turnoB}` },
  { metodo: "delete", ruta: () => `/turnos/${f.turnoB}` },
  { metodo: "post", ruta: () => `/turnos/${f.turnoB}/selecciones`, body: () => ({ residente_id: f.residenteB, menu_id: f.menuB, personas: 2 }) },
  { metodo: "patch", ruta: () => `/selecciones/${f.seleccionB}/confirmar`, body: () => ({}) },
  { metodo: "patch", ruta: () => `/selecciones/${f.seleccionB}/revertir` },
  { metodo: "delete", ruta: () => `/selecciones/${f.seleccionB}` },
  // historial
  { metodo: "get", ruta: () => `/residencias/${f.resB}/historial` },
];

const casosResidente: Caso[] = [
  { metodo: "get", ruta: () => `/residentes/${f.residenteB}/grupo` },
  { metodo: "get", ruta: () => `/grupos/${f.grupoB}` },
  { metodo: "get", ruta: () => `/grupos/${f.grupoB}/integrantes` },
  { metodo: "get", ruta: () => `/residencias/${f.resB}/menus` },
  { metodo: "get", ruta: () => `/menus/${f.menuB}` },
  { metodo: "get", ruta: () => `/residencias/${f.resB}/stock` },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/stock`, body: () => ({ alimento_id: f.alimento, cantidad: 1, unidad: "KG" }) },
  { metodo: "post", ruta: () => `/residencias/${f.resB}/stock/${f.stockB}/entrada`, body: () => ({ cantidad: 1 }) },
  { metodo: "get", ruta: () => `/residencias/${f.resB}/turnos` },
  { metodo: "get", ruta: () => `/turnos/${f.turnoB}` },
  { metodo: "post", ruta: () => `/turnos/${f.turnoB}/selecciones`, body: () => ({ residente_id: f.residenteA, menu_id: f.menuB, personas: 2 }) },
  { metodo: "patch", ruta: () => `/selecciones/${f.seleccionB}/revertir` },
];

function enviar(c: Caso, token: string) {
  const req = supertest(app.server)[c.metodo](c.ruta()).set("Authorization", `Bearer ${token}`);
  return c.body ? req.send(c.body()) : req;
}

describe("Aislamiento entre residencias — ADMIN_RESIDENCIA", () => {
  it.each(casosAdminResidencia.map((c) => [`${c.metodo.toUpperCase()} ${c.ruta.toString().match(/`(.*)`/)?.[1]}`, c]))(
    "%s sobre la residencia B devuelve 403",
    async (_nombre, c) => {
      const res = await enviar(c as Caso, tokenAdminA);
      expect(res.status).toBe(403);
    }
  );
});

describe("Aislamiento entre residencias — RESIDENTE", () => {
  it.each(casosResidente.map((c) => [`${c.metodo.toUpperCase()} ${c.ruta.toString().match(/`(.*)`/)?.[1]}`, c]))(
    "%s sobre la residencia B devuelve 403",
    async (_nombre, c) => {
      const res = await enviar(c as Caso, tokenResidenteA);
      expect(res.status).toBe(403);
    }
  );
});

describe("Aislamiento entre residencias — accesos legítimos", () => {
  it("ADMIN_RESIDENCIA sigue accediendo a su propia residencia", async () => {
    const res = await supertest(app.server).get(`/residencias/${f.resA}/grupos`).set("Authorization", `Bearer ${tokenAdminA}`);
    expect(res.status).toBe(200);
  });

  it("ADMIN_RESIDENCIA puede leer un menú de la biblioteca compartida", async () => {
    const res = await supertest(app.server).get(`/menus/${f.menuBiblioteca}`).set("Authorization", `Bearer ${tokenAdminA}`);
    expect(res.status).toBe(200);
  });

  it("ADMIN_RESIDENCIA puede clonar un menú de la biblioteca a su residencia", async () => {
    const res = await supertest(app.server).post(`/menus/${f.menuBiblioteca}/clonar`)
      .set("Authorization", `Bearer ${tokenAdminA}`).send({ residencia_id: f.resA });
    expect(res.status).toBe(201);
  });

  it("ADMIN_GLOBAL accede a cualquier residencia", async () => {
    const res = await supertest(app.server).get(`/residencias/${f.resB}/grupos`).set("Authorization", `Bearer ${tokenGlobal}`);
    expect(res.status).toBe(200);
  });

  it("un recurso inexistente sigue devolviendo 404, no 403", async () => {
    const res = await supertest(app.server).get(`/grupos/999999`).set("Authorization", `Bearer ${tokenAdminA}`);
    expect(res.status).toBe(404);
  });

  it("no se puede agregar a un grupo un residente de otra residencia", async () => {
    const res = await supertest(app.server).post(`/grupos/${f.grupoA}/integrantes`)
      .set("Authorization", `Bearer ${tokenAdminA}`).send({ residente_id: f.residenteB });
    expect(res.status).toBe(403);
  });
});
