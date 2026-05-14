import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import path from "path";
import { promises as fs } from "fs";
import { app } from "../../index.js";
import { prisma } from "../../shared/prisma/client.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function crearAdmin(role: "ADMIN_GLOBAL" | "ADMIN_RESIDENCIA" = "ADMIN_GLOBAL") {
  const password_hash = await bcrypt.hash("password123", 10);
  return prisma.user.create({
    data: { email: `admin-${role}-${Date.now()}@test.com`, password_hash, role, first_login: false },
  });
}

async function loginAdmin(email: string): Promise<string> {
  const res = await supertest(app.server)
    .post("/auth/login")
    .send({ email, password: "password123" });
  return res.body.token as string;
}

const residenciaBase = {
  nombre: "Residencia Test",
  direccion: "Av. Siempre Viva 742",
  ciudad: "Buenos Aires",
  provincia: "Buenos Aires",
  capacidad_max: 30,
};

// Buffer que imita un JPEG mínimo válido (no se valida contenido, sólo extensión y tamaño)
const jpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Directorio de uploads de test a limpiar
const UPLOADS_TEST_DIR = path.resolve(process.cwd(), "uploads", "residencias");

async function cleanUploadsTestDir() {
  try {
    const files = await fs.readdir(UPLOADS_TEST_DIR);
    await Promise.all(
      files.map((f) => fs.unlink(path.join(UPLOADS_TEST_DIR, f)).catch(() => null))
    );
  } catch {
    // El directorio puede no existir en un entorno limpio
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await cleanUploadsTestDir();
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.residenciaFoto.deleteMany();
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
  await prisma.residencia.deleteMany();
  await cleanUploadsTestDir();
});

// ---------------------------------------------------------------------------
// GET /residencias
// ---------------------------------------------------------------------------

describe("GET /residencias", () => {
  it("retorna 401 sin token", async () => {
    const res = await supertest(app.server).get("/residencias");
    expect(res.status).toBe(401);
  });

  it("retorna 403 si es RESIDENTE", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
      data: { email: `residente-${Date.now()}@test.com`, password_hash: hash, role: "RESIDENTE", first_login: false },
    });
    const loginRes = await supertest(app.server)
      .post("/auth/login")
      .send({ email: user.email, password: "password123" });
    const token = loginRes.body.token as string;

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("retorna lista vacía cuando no hay residencias", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna solo residencias activas", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    await prisma.residencia.createMany({
      data: [
        { ...residenciaBase, nombre: "Activa" },
        { ...residenciaBase, nombre: "Inactiva", activo: false },
      ],
    });

    const res = await supertest(app.server)
      .get("/residencias")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Activa");
  });
});

// ---------------------------------------------------------------------------
// GET /residencias/:id (enriquecido — T-5.1)
// ---------------------------------------------------------------------------

describe("GET /residencias/:id", () => {
  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .get("/residencias/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna la residencia con residentes y voluntarios vacíos si no tiene usuarios", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
    expect(res.body.residentes).toEqual([]);
    expect(res.body.voluntarios).toEqual([]);
    expect(res.body.fotos).toEqual([]);
  });

  it("retorna residentes asociados a la residencia", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Crear usuario RESIDENTE asociado
    const hash = await bcrypt.hash("password123", 10);
    const userResidente = await prisma.user.create({
      data: {
        email: `residente-test-${Date.now()}@test.com`,
        password_hash: hash,
        role: "RESIDENTE",
        residencia_id: residencia.id,
        first_login: false,
      },
    });
    await prisma.residente.create({
      data: {
        user_id: userResidente.id,
        residencia_id: residencia.id,
        nombre: "Juan",
        apellido: "Pérez",
        dni: `${Date.now()}`,
        edad: 22,
        universidad: "UBA",
        carrera: "Ingeniería",
        ciudad_origen: "Rosario",
        fecha_ingreso: new Date(),
      },
    });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.residentes).toHaveLength(1);
    expect(res.body.residentes[0].nombre).toBe("Juan");
    expect(res.body.voluntarios).toEqual([]);
  });

  it("retorna voluntarios (ADMIN_RESIDENCIA) asociados a la residencia", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Crear un ADMIN_RESIDENCIA asociado a la residencia
    const hash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        email: `voluntario-${Date.now()}@test.com`,
        password_hash: hash,
        role: "ADMIN_RESIDENCIA",
        residencia_id: residencia.id,
        first_login: false,
      },
    });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.voluntarios).toHaveLength(1);
    expect(res.body.voluntarios[0].role).toBe("ADMIN_RESIDENCIA");
    expect(res.body.residentes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /residencias
// ---------------------------------------------------------------------------

describe("POST /residencias", () => {
  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send(residenciaBase);
    expect(res.status).toBe(403);
  });

  it("crea una residencia correctamente", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send(residenciaBase);
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
    expect(res.body.activo).toBe(true);
    expect(res.body.rollback_horas).toBe(2);
  });

  it("crea residencia con rollback_horas personalizado", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...residenciaBase, rollback_horas: 4 });
    expect(res.status).toBe(201);
    expect(res.body.rollback_horas).toBe(4);
  });

  it("retorna 400 si faltan campos requeridos", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Solo nombre" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /residencias/:id
// ---------------------------------------------------------------------------

describe("PATCH /residencias/:id", () => {
  it("actualiza campos parcialmente", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba", rollback_horas: 3 });
    expect(res.status).toBe(200);
    expect(res.body.ciudad).toBe("Córdoba");
    expect(res.body.rollback_horas).toBe(3);
    expect(res.body.nombre).toBe(residenciaBase.nombre);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .patch("/residencias/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba" });
    expect(res.status).toBe(404);
  });

  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ciudad: "Córdoba" });
    expect(res.status).toBe(403);
  });

  it("acepta y persiste imagen_url en PATCH", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ imagen_url: "https://ejemplo.com/foto.jpg" });
    expect(res.status).toBe(200);
    expect(res.body.imagen_url).toBe("https://ejemplo.com/foto.jpg");
  });
});

// ---------------------------------------------------------------------------
// DELETE /residencias/:id
// ---------------------------------------------------------------------------

describe("DELETE /residencias/:id", () => {
  it("hace soft delete — retorna 204 y la residencia queda inactiva", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const enDb = await prisma.residencia.findUnique({ where: { id: residencia.id } });
    expect(enDb?.activo).toBe(false);
  });

  it("retorna 404 si no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .delete("/residencias/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("retorna 403 si es ADMIN_RESIDENCIA", async () => {
    const admin = await crearAdmin("ADMIN_RESIDENCIA");
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("elimina los registros ResidenciaFoto de la DB al hacer soft-delete (CRITICAL-3)", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Agregar dos fotos a la galería
    await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pngBuffer, "foto1.png");
    await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", jpegBuffer, "foto2.jpg");

    const fotosAntes = await prisma.residenciaFoto.findMany({
      where: { residencia_id: residencia.id },
    });
    expect(fotosAntes).toHaveLength(2);

    // Soft-delete la residencia
    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    // Los registros ResidenciaFoto deben haber sido eliminados de la DB
    const fotosDespues = await prisma.residenciaFoto.findMany({
      where: { residencia_id: residencia.id },
    });
    expect(fotosDespues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /residencias/:id/fotos — listado standalone (CRITICAL-2)
// ---------------------------------------------------------------------------

describe("GET /residencias/:id/fotos", () => {
  it("retorna 200 con array vacío si la residencia no tiene fotos", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna 200 con array de fotos cuando existen", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Subir una foto primero
    await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pngBuffer, "galeria.png");

    const res = await supertest(app.server)
      .get(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].residencia_id).toBe(residencia.id);
    expect(res.body[0].url).toMatch(/^\/uploads\/residencias\/.+\.png$/);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .get("/residencias/999/fotos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:id/imagen (T-5.2)
// ---------------------------------------------------------------------------

describe("POST /residencias/:id/imagen", () => {
  it("sube imagen principal y actualiza imagen_url en DB", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/imagen`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", jpegBuffer, "foto.jpg");

    expect(res.status).toBe(200);
    expect(res.body.imagen_url).toMatch(/^\/uploads\/residencias\/.+\.jpg$/);

    const enDb = await prisma.residencia.findUnique({ where: { id: residencia.id } });
    expect(enDb?.imagen_url).toBe(res.body.imagen_url);
  });

  it("retorna 400 si la extensión no está permitida", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/imagen`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("ejecutable"), "malware.exe");

    expect(res.status).toBe(400);
  });

  it("retorna 413 si el archivo excede 5MB", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Generar buffer de ~6MB
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024 + 1, 0);

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/imagen`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", bigBuffer, "grande.jpg");

    expect(res.status).toBe(413);
  });

  it("retorna 404 si la residencia no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);

    const res = await supertest(app.server)
      .post("/residencias/999/imagen")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", jpegBuffer, "foto.jpg");

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /residencias/:id/fotos — galería (T-5.3)
// ---------------------------------------------------------------------------

describe("POST /residencias/:id/fotos", () => {
  it("crea un registro ResidenciaFoto y retorna 201", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pngBuffer, "galeria.png");

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/residencias\/.+\.png$/);
    expect(res.body.residencia_id).toBe(residencia.id);

    const fotoEnDb = await prisma.residenciaFoto.findUnique({ where: { id: res.body.id } });
    expect(fotoEnDb).not.toBeNull();
  });

  it("retorna 400 si la extensión no está permitida", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("%PDF"), "documento.pdf");

    expect(res.status).toBe(400);

    const fotosEnDb = await prisma.residenciaFoto.findMany({ where: { residencia_id: residencia.id } });
    expect(fotosEnDb).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE /residencias/:id/fotos/:fotoId (T-5.3)
// ---------------------------------------------------------------------------

describe("DELETE /residencias/:id/fotos/:fotoId", () => {
  it("borra el registro de DB y el archivo de disco, retorna 204", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Subir foto primero
    const uploadRes = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pngBuffer, "galeria.png");

    expect(uploadRes.status).toBe(201);
    const fotoId = uploadRes.body.id as number;
    const fotoUrl = uploadRes.body.url as string;

    // Verificar que el archivo existe en disco
    const filePath = path.resolve(process.cwd(), fotoUrl.slice(1));
    await expect(fs.access(filePath)).resolves.toBeUndefined();

    // Borrar
    const deleteRes = await supertest(app.server)
      .delete(`/residencias/${residencia.id}/fotos/${fotoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    // Verificar que el registro no existe en DB
    const enDb = await prisma.residenciaFoto.findUnique({ where: { id: fotoId } });
    expect(enDb).toBeNull();

    // Verificar que el archivo fue eliminado de disco
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it("retorna 404 si la foto no existe", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .delete(`/residencias/${residencia.id}/fotos/999`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /residencias/:id/fotos/reorder (T-5.3)
// ---------------------------------------------------------------------------

describe("PATCH /residencias/:id/fotos/reorder", () => {
  it("actualiza el orden de las fotos en batch", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    // Subir dos fotos
    const foto1Res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pngBuffer, "foto1.png");
    const foto2Res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", jpegBuffer, "foto2.jpg");

    const foto1Id = foto1Res.body.id as number;
    const foto2Id = foto2Res.body.id as number;

    // Reordenar: foto2 primero, foto1 segundo
    const res = await supertest(app.server)
      .patch(`/residencias/${residencia.id}/fotos/reorder`)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ id: foto2Id, orden: 0 }, { id: foto1Id, orden: 1 }] });

    expect(res.status).toBe(200);

    const foto1EnDb = await prisma.residenciaFoto.findUnique({ where: { id: foto1Id } });
    const foto2EnDb = await prisma.residenciaFoto.findUnique({ where: { id: foto2Id } });
    expect(foto1EnDb?.orden).toBe(1);
    expect(foto2EnDb?.orden).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Validación de extensión inválida y tamaño excedido (T-5.4)
// ---------------------------------------------------------------------------

describe("Validación de archivos", () => {
  it("rechaza extensión inválida en POST imagen — no escribe archivo en disco", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/imagen`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("content"), "test.txt");

    expect(res.status).toBe(400);

    // Verificar que no se escribió nada en disco
    let files: string[] = [];
    try {
      files = await fs.readdir(UPLOADS_TEST_DIR);
    } catch {
      // directorio inexistente = ok
    }
    expect(files).toHaveLength(0);
  });

  it("rechaza archivo mayor a 5MB — retorna 413", async () => {
    const admin = await crearAdmin();
    const token = await loginAdmin(admin.email);
    const residencia = await prisma.residencia.create({ data: residenciaBase });

    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0);

    const res = await supertest(app.server)
      .post(`/residencias/${residencia.id}/fotos`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", bigBuffer, "enorme.png");

    expect(res.status).toBe(413);
  });
});
