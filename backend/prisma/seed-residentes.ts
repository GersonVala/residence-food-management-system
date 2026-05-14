import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const residenciaId = 1;
  const hash = await bcrypt.hash("residente123", 10);

  const residentes = [
    { email: "sofia.garcia@fundacion.com", nombre: "Sofía", apellido: "García", dni: "40123001", edad: 21, universidad: "UBA", carrera: "Medicina", ciudad_origen: "Rosario", telefono: "+54 341 555-0101", fecha_ingreso: new Date("2024-03-01") },
    { email: "lucas.martinez@fundacion.com", nombre: "Lucas", apellido: "Martínez", dni: "41234002", edad: 23, universidad: "UTN", carrera: "Ingeniería Industrial", ciudad_origen: "Mendoza", telefono: "+54 261 555-0202", fecha_ingreso: new Date("2024-03-15") },
    { email: "valentina.lopez@fundacion.com", nombre: "Valentina", apellido: "López", dni: "42345003", edad: 20, universidad: "UBA", carrera: "Arquitectura", ciudad_origen: "Córdoba", telefono: "+54 351 555-0303", fecha_ingreso: new Date("2024-08-01") },
    { email: "mateo.fernandez@fundacion.com", nombre: "Mateo", apellido: "Fernández", dni: "43456004", edad: 22, universidad: "UNL", carrera: "Contador Público", ciudad_origen: "Santa Fe", telefono: "+54 342 555-0404", fecha_ingreso: new Date("2024-08-10") },
    { email: "camila.rodriguez@fundacion.com", nombre: "Camila", apellido: "Rodríguez", dni: "44567005", edad: 19, universidad: "UBA", carrera: "Psicología", ciudad_origen: "Mar del Plata", telefono: "+54 223 555-0505", fecha_ingreso: new Date("2025-03-01") },
    { email: "benjamin.gomez@fundacion.com", nombre: "Benjamín", apellido: "Gómez", dni: "45678006", edad: 24, universidad: "UNLP", carrera: "Abogacía", ciudad_origen: "La Plata", telefono: "+54 221 555-0606", fecha_ingreso: new Date("2025-03-01") },
    { email: "isabella.diaz@fundacion.com", nombre: "Isabella", apellido: "Díaz", dni: "46789007", edad: 21, universidad: "UNC", carrera: "Bioquímica", ciudad_origen: "Córdoba", telefono: "+54 351 555-0707", fecha_ingreso: new Date("2025-03-15") },
    { email: "nicolas.torres@fundacion.com", nombre: "Nicolás", apellido: "Torres", dni: "47890008", edad: 22, universidad: "UBA", carrera: "Economía", ciudad_origen: "Salta", telefono: "+54 387 555-0808", fecha_ingreso: new Date("2025-03-15") },
    { email: "luciana.vargas@fundacion.com", nombre: "Luciana", apellido: "Vargas", dni: "48901009", edad: 20, universidad: "UTN", carrera: "Ingeniería en Sistemas", ciudad_origen: "Tucumán", telefono: "+54 381 555-0909", fecha_ingreso: new Date("2025-08-01") },
    { email: "agustin.morales@fundacion.com", nombre: "Agustín", apellido: "Morales", dni: "49012010", edad: 23, universidad: "UNR", carrera: "Diseño Gráfico", ciudad_origen: "Rosario", telefono: "+54 341 555-1010", fecha_ingreso: new Date("2025-08-01") },
  ];

  let creados = 0;
  let omitidos = 0;

  for (const r of residentes) {
    const existe = await prisma.user.findUnique({ where: { email: r.email } });
    if (existe) { omitidos++; continue; }

    const user = await prisma.user.create({
      data: {
        email: r.email,
        password_hash: hash,
        role: "RESIDENTE",
        residencia_id: residenciaId,
        first_login: false,
        active: true,
      },
    });

    await prisma.residente.create({
      data: {
        user_id: user.id,
        residencia_id: residenciaId,
        nombre: r.nombre,
        apellido: r.apellido,
        dni: r.dni,
        edad: r.edad,
        telefono: r.telefono,
        universidad: r.universidad,
        carrera: r.carrera,
        ciudad_origen: r.ciudad_origen,
        fecha_ingreso: r.fecha_ingreso,
        activo: true,
      },
    });

    creados++;
  }

  console.log(`Residentes creados: ${creados}`);
  console.log(`Omitidos (ya existían): ${omitidos}`);
  console.log(`Contraseña de todos: residente123`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
