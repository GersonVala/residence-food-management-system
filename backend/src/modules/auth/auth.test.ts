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
  // Limpiar en orden para respetar FK: primero dependientes, luego usuarios
  await prisma.auditoriaLog.deleteMany();
  await prisma.user.deleteMany();
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
