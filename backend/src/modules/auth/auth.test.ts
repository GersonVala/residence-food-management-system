import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function crearUsuario(overrides: {
  email?: string;
  password?: string;
  role?: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" | "RESIDENTE";
  first_login?: boolean;
  active?: boolean;
}) {
  const {
    email = "test@fundacion.com",
    password = "password123",
    role = "ADMIN_GLOBAL",
    first_login = false,
    active = true,
  } = overrides;

  const password_hash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { email, password_hash, role, first_login, active },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

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
// POST /auth/login
// ---------------------------------------------------------------------------

describe("POST /auth/login", () => {
  it("retorna 200 con token cuando las credenciales son correctas", async () => {
    await crearUsuario({ email: "admin@fundacion.com", first_login: false });

    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it("incluye datos del usuario en la respuesta", async () => {
    await crearUsuario({
      email: "admin@fundacion.com",
      role: "ADMIN_GLOBAL",
      first_login: false,
    });

    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({
      email: "admin@fundacion.com",
      role: "ADMIN_GLOBAL",
    });
    expect(res.body.usuario).not.toHaveProperty("password_hash");
  });

  it("retorna 401 con contraseña incorrecta", async () => {
    await crearUsuario({ email: "admin@fundacion.com" });

    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("retorna 401 cuando el email no existe", async () => {
    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "noexiste@fundacion.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("retorna 401 cuando el usuario está inactivo", async () => {
    await crearUsuario({ email: "inactivo@fundacion.com", active: false });

    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "inactivo@fundacion.com", password: "password123" });

    expect(res.status).toBe(401);
  });

  it("indica primer_login = true cuando first_login está activo", async () => {
    await crearUsuario({ email: "nuevo@fundacion.com", first_login: true });

    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "nuevo@fundacion.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.primer_login).toBe(true);
  });

  it("retorna 400 cuando faltan campos requeridos", async () => {
    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/change-password
// ---------------------------------------------------------------------------

describe("POST /auth/change-password", () => {
  it("cambia la contraseña correctamente y marca first_login = false", async () => {
    const usuario = await crearUsuario({
      email: "nuevo@fundacion.com",
      password: "vieja123",
      first_login: true,
    });

    // Login para obtener token
    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "nuevo@fundacion.com", password: "vieja123" });

    const token = loginRes.body.token;

    const res = await supertest(app.server)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password_actual: "vieja123", password_nuevo: "nueva456" });

    expect(res.status).toBe(200);

    // Verificar que ahora puede loguear con la nueva contraseña
    const loginNuevo = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "nuevo@fundacion.com", password: "nueva456" });

    expect(loginNuevo.status).toBe(200);

    // Verificar que first_login quedó en false
    const userActualizado = await prisma.user.findUnique({
      where: { id: usuario.id },
    });
    expect(userActualizado?.first_login).toBe(false);
  });

  it("retorna 401 cuando password_actual es incorrecto", async () => {
    await crearUsuario({ email: "user@fundacion.com", first_login: true });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "user@fundacion.com", password: "password123" });

    const token = loginRes.body.token;

    const res = await supertest(app.server)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password_actual: "incorrecta", password_nuevo: "nueva456" });

    expect(res.status).toBe(401);
  });

  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server)
      .post("/auth/change-password")
      .send({ password_actual: "vieja123", password_nuevo: "nueva456" });

    expect(res.status).toBe(401);
  });

  it("retorna 400 cuando password_nuevo tiene menos de 6 caracteres", async () => {
    await crearUsuario({ email: "user@fundacion.com" });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "user@fundacion.com", password: "password123" });

    const res = await supertest(app.server)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ password_actual: "password123", password_nuevo: "abc" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/reset (Admin resetea contraseña de otro usuario)
// ---------------------------------------------------------------------------

describe("POST /auth/reset", () => {
  it("admin global puede resetear contraseña de cualquier usuario", async () => {
    const admin = await crearUsuario({
      email: "admin@fundacion.com",
      role: "ADMIN_GLOBAL",
      first_login: false,
    });

    const usuarioTarget = await crearUsuario({
      email: "target@fundacion.com",
      role: "RESIDENTE",
      first_login: false,
    });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com", password: "password123" });

    const res = await supertest(app.server)
      .post("/auth/reset")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ user_id: usuarioTarget.id });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("password_temporal");

    // Verificar que first_login volvió a true
    const usuarioReset = await prisma.user.findUnique({
      where: { id: usuarioTarget.id },
    });
    expect(usuarioReset?.first_login).toBe(true);

    void admin; // evitar unused warning
  });

  it("retorna 403 si el usuario no es admin", async () => {
    await crearUsuario({
      email: "residente@fundacion.com",
      role: "RESIDENTE",
      first_login: false,
    });

    const target = await crearUsuario({
      email: "otro@fundacion.com",
      role: "RESIDENTE",
      first_login: false,
    });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "residente@fundacion.com", password: "password123" });

    const res = await supertest(app.server)
      .post("/auth/reset")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ user_id: target.id });

    expect(res.status).toBe(403);
  });

  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server)
      .post("/auth/reset")
      .send({ user_id: 1 });

    expect(res.status).toBe(401);
  });

  it("retorna 404 si el user_id no existe", async () => {
    await crearUsuario({
      email: "admin@fundacion.com",
      role: "ADMIN_GLOBAL",
      first_login: false,
    });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "admin@fundacion.com", password: "password123" });

    const res = await supertest(app.server)
      .post("/auth/reset")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ user_id: 99999 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Acceso sin token a ruta protegida
// ---------------------------------------------------------------------------

describe("Rutas protegidas sin token", () => {
  it("GET /auth/me retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /auth/me retorna datos del usuario con token válido", async () => {
    await crearUsuario({ email: "user@fundacion.com", first_login: false });

    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "user@fundacion.com", password: "password123" });

    const res = await supertest(app.server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email", "user@fundacion.com");
    expect(res.body).not.toHaveProperty("password_hash");
  });
});

// ---------------------------------------------------------------------------
// POST /auth/reset — alcance por rol y residencia
// ---------------------------------------------------------------------------

async function crearResidencia(nombre: string) {
  return prisma.residencia.create({
    data: {
      nombre,
      direccion: "Av. Test 123",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      capacidad_max: 30,
    },
  });
}

async function crearResidenteEn(residencia_id: number, email: string) {
  const user = await prisma.user.create({
    data: {
      email,
      password_hash: await bcrypt.hash("password123", 10),
      role: "RESIDENTE",
      first_login: false,
      residencia_id,
    },
  });
  await prisma.residente.create({
    data: {
      user_id: user.id,
      residencia_id,
      nombre: "Juan",
      apellido: "Pérez",
      dni: `dni-${email}`,
      edad: 22,
      universidad: "UBA",
      carrera: "Ingeniería",
      ciudad_origen: "Córdoba",
      provincia_origen: "Córdoba",
      fecha_ingreso: new Date("2024-03-01"),
    },
  });
  return user;
}

async function crearAdminDeResidencia(email: string, residencia_id: number) {
  const admin = await crearUsuario({ email, role: "ADMIN_RESIDENCIA" });
  return prisma.user.update({ where: { id: admin.id }, data: { residencia_id } });
}

async function tokenDe(email: string): Promise<string> {
  const res = await supertest(app.server)
    .post("/auth/login")
    .send({ email, password: "password123" });
  return res.body.token as string;
}

async function resetear(token: string, user_id: number) {
  return supertest(app.server)
    .post("/auth/reset")
    .set("Authorization", `Bearer ${token}`)
    .send({ user_id });
}

describe("POST /auth/reset — alcance por rol", () => {
  it("ADMIN_RESIDENCIA resetea a un residente de su propia residencia", async () => {
    const res1 = await crearResidencia("Res 1");
    await crearAdminDeResidencia("admin1@f.com", res1.id);
    const residente = await crearResidenteEn(res1.id, "res@f.com");

    const r = await resetear(await tokenDe("admin1@f.com"), residente.id);

    expect(r.status).toBe(200);
    expect(r.body.password_temporal).toHaveLength(10);
    const actualizado = await prisma.user.findUnique({ where: { id: residente.id } });
    expect(actualizado?.first_login).toBe(true);
  });

  it("ADMIN_RESIDENCIA no puede resetear a un ADMIN_GLOBAL", async () => {
    const res1 = await crearResidencia("Res 1");
    await crearAdminDeResidencia("admin1@f.com", res1.id);
    const global = await crearUsuario({ email: "global@f.com", role: "ADMIN_GLOBAL" });

    const r = await resetear(await tokenDe("admin1@f.com"), global.id);

    expect(r.status).toBe(403);
    expect(r.body).not.toHaveProperty("password_temporal");
  });

  it("ADMIN_RESIDENCIA no puede resetear a otro ADMIN_RESIDENCIA", async () => {
    const res1 = await crearResidencia("Res 1");
    await crearAdminDeResidencia("admin1@f.com", res1.id);
    const otro = await crearAdminDeResidencia("admin2@f.com", res1.id);

    const r = await resetear(await tokenDe("admin1@f.com"), otro.id);

    expect(r.status).toBe(403);
  });

  it("ADMIN_RESIDENCIA no puede resetear a un residente de otra residencia", async () => {
    const res1 = await crearResidencia("Res 1");
    const res2 = await crearResidencia("Res 2");
    await crearAdminDeResidencia("admin1@f.com", res1.id);
    const ajeno = await crearResidenteEn(res2.id, "ajeno@f.com");

    const r = await resetear(await tokenDe("admin1@f.com"), ajeno.id);

    expect(r.status).toBe(403);
    const intacto = await prisma.user.findUnique({ where: { id: ajeno.id } });
    expect(intacto?.first_login).toBe(false);
  });

  it("ADMIN_GLOBAL puede resetear a un administrador", async () => {
    await crearUsuario({ email: "global@f.com", role: "ADMIN_GLOBAL" });
    const adminRes = await crearUsuario({ email: "admin1@f.com", role: "ADMIN_RESIDENCIA" });

    const r = await resetear(await tokenDe("global@f.com"), adminRes.id);

    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("password_temporal");
  });
});

// ---------------------------------------------------------------------------
// Cambio de contraseña obligatorio en el primer login (enforcement server-side)
// ---------------------------------------------------------------------------

describe("Primer login: cambio de contraseña obligatorio", () => {
  it("bloquea rutas protegidas con 403 CAMBIO_PASSWORD_REQUERIDO", async () => {
    await crearUsuario({ email: "nuevo@f.com", role: "ADMIN_GLOBAL", first_login: true });
    const token = await tokenDe("nuevo@f.com");

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("CAMBIO_PASSWORD_REQUERIDO");
  });

  it("permite GET /auth/me y POST /auth/change-password", async () => {
    await crearUsuario({ email: "nuevo@f.com", role: "ADMIN_GLOBAL", first_login: true });
    const token = await tokenDe("nuevo@f.com");

    const me = await supertest(app.server).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);

    const cambio = await supertest(app.server)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password_actual: "password123", password_nuevo: "nueva456" });
    expect(cambio.status).toBe(200);
  });

  it("después de cambiar la contraseña el mismo token ya accede a rutas protegidas", async () => {
    await crearUsuario({ email: "nuevo@f.com", role: "ADMIN_GLOBAL", first_login: true });
    const token = await tokenDe("nuevo@f.com");

    await supertest(app.server)
      .post("/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ password_actual: "password123", password_nuevo: "nueva456" });

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("un token viejo queda bloqueado si first_login vuelve a true (se chequea la DB, no el token)", async () => {
    const usuario = await crearUsuario({ email: "u@f.com", role: "ADMIN_GLOBAL", first_login: false });
    const tokenViejo = await tokenDe("u@f.com");

    await prisma.user.update({ where: { id: usuario.id }, data: { first_login: true } });

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${tokenViejo}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("CAMBIO_PASSWORD_REQUERIDO");
  });

  it("rechaza con 401 un token de un usuario que ya no existe", async () => {
    const usuario = await crearUsuario({ email: "u@f.com", role: "ADMIN_GLOBAL" });
    const token = await tokenDe("u@f.com");
    await prisma.user.delete({ where: { id: usuario.id } });

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Rate limit de login
// ---------------------------------------------------------------------------

describe("POST /auth/login — rate limit", () => {
  it("el 6º intento en un minuto devuelve 429", async () => {
    await crearUsuario({ email: "victima@f.com" });
    const intentar = () =>
      supertest(app.server).post("/auth/login").send({ email: "victima@f.com", password: "mal" });

    for (let i = 0; i < 5; i++) {
      expect((await intentar()).status).toBe(401);
    }
    const sexto = await intentar();
    expect(sexto.status).toBe(429);
    expect(sexto.body.mensaje).toMatch(/intentos/i);
  });

  it("el límite es por email: otro email no queda bloqueado", async () => {
    await crearUsuario({ email: "a@f.com" });
    await crearUsuario({ email: "b@f.com" });
    for (let i = 0; i < 6; i++) {
      await supertest(app.server).post("/auth/login").send({ email: "a@f.com", password: "mal" });
    }
    const res = await supertest(app.server)
      .post("/auth/login")
      .send({ email: "b@f.com", password: "password123" });
    expect(res.status).toBe(200);
  });
});
