import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // -------------------------------------------------------------------------
  // Residencia de prueba
  // -------------------------------------------------------------------------
  const residencia = await prisma.residencia.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: "Residencia San Martín",
      direccion: "Av. San Martín 1234",
      ciudad: "Buenos Aires",
      provincia: "CABA",
      capacidad_max: 50,
      rollback_horas: 2,
    },
  });

  console.log(`Residencia creada: ${residencia.nombre}`);

  // -------------------------------------------------------------------------
  // Admin Global
  // -------------------------------------------------------------------------
  const adminHash = await bcrypt.hash("admin123", 10);
  const adminGlobal = await prisma.user.upsert({
    where: { email: "admin@fundacion.com" },
    update: {},
    create: {
      email: "admin@fundacion.com",
      password_hash: adminHash,
      role: "ADMIN_GLOBAL",
      first_login: false,
      active: true,
    },
  });

  console.log(`Admin Global creado: ${adminGlobal.email}`);

  // -------------------------------------------------------------------------
  // Admin de Residencia
  // -------------------------------------------------------------------------
  const adminResHash = await bcrypt.hash("admin123", 10);
  const adminRes = await prisma.user.upsert({
    where: { email: "adminres@fundacion.com" },
    update: {},
    create: {
      email: "adminres@fundacion.com",
      password_hash: adminResHash,
      role: "ADMIN_RESIDENCIA",
      residencia_id: residencia.id,
      first_login: false,
      active: true,
    },
  });

  console.log(`Admin Residencia creado: ${adminRes.email}`);

  // -------------------------------------------------------------------------
  // Residente de prueba
  // -------------------------------------------------------------------------
  const residenteHash = await bcrypt.hash("residente123", 10);
  const residenteUser = await prisma.user.upsert({
    where: { email: "residente@fundacion.com" },
    update: {},
    create: {
      email: "residente@fundacion.com",
      password_hash: residenteHash,
      role: "RESIDENTE",
      residencia_id: residencia.id,
      first_login: true, // primer login pendiente
      active: true,
    },
  });

  await prisma.residente.upsert({
    where: { user_id: residenteUser.id },
    update: {},
    create: {
      user_id: residenteUser.id,
      residencia_id: residencia.id,
      nombre: "Juan",
      apellido: "Pérez",
      dni: "12345678",
      edad: 22,
      telefono: "+54 11 1234-5678",
      universidad: "UBA",
      carrera: "Ingeniería Informática",
      ciudad_origen: "Córdoba",
      fecha_ingreso: new Date("2024-03-01"),
    },
  });

  console.log(`Residente creado: ${residenteUser.email}`);

  // -------------------------------------------------------------------------
  // Categorías de alimentos
  // -------------------------------------------------------------------------
  const categorias = ["Carnes", "Verduras", "Frutas", "Lácteos", "Cereales", "Condimentos"];

  for (const nombre of categorias) {
    await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  console.log(`${categorias.length} categorías creadas`);

  console.log("\nSeed completado exitosamente.");
  console.log("\nCredenciales de prueba:");
  console.log("  Admin Global:     admin@fundacion.com        / admin123");
  console.log("  Admin Residencia: adminres@fundacion.com     / admin123");
  console.log("  Residente:        residente@fundacion.com    / residente123 (primer login pendiente)");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
