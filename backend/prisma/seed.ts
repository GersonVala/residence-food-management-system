import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // -------------------------------------------------------------------------
  // Categorías de alimentos
  // -------------------------------------------------------------------------
  const categoriasNombres = [
    "Carnes", "Verduras", "Frutas", "Lácteos",
    "Cereales y Harinas", "Condimentos y Especias",
    "Aceites y Grasas", "Legumbres", "Pastas y Arroz",
  ];

  const categoriasCreadas: Record<string, number> = {};
  for (const nombre of categoriasNombres) {
    const cat = await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    categoriasCreadas[nombre] = cat.id;
  }
  console.log(`${categoriasNombres.length} categorías`);

  // -------------------------------------------------------------------------
  // Alimentos (50)
  // -------------------------------------------------------------------------
  const alimentosData = [
    { nombre: "Pollo entero",           unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Pechuga de pollo",       unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Carne picada",           unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Asado de tira",          unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Milanesa de ternera",    unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Chorizo",                unidad_base: "KG",       categoria: "Carnes" },
    { nombre: "Atún en lata",           unidad_base: "GR",       categoria: "Carnes",            marca: "La Campagnola" },
    { nombre: "Papa",                   unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Cebolla",                unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Tomate",                 unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Zanahoria",              unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Zapallo",                unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Ajo",                    unidad_base: "GR",       categoria: "Verduras" },
    { nombre: "Pimiento rojo",          unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Espinaca",               unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Choclo",                 unidad_base: "UNIDADES", categoria: "Verduras" },
    { nombre: "Zapallito",              unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Berenjena",              unidad_base: "KG",       categoria: "Verduras" },
    { nombre: "Manzana",                unidad_base: "KG",       categoria: "Frutas" },
    { nombre: "Banana",                 unidad_base: "KG",       categoria: "Frutas" },
    { nombre: "Naranja",                unidad_base: "KG",       categoria: "Frutas" },
    { nombre: "Limón",                  unidad_base: "KG",       categoria: "Frutas" },
    { nombre: "Leche entera",           unidad_base: "LITROS",   categoria: "Lácteos",           marca: "La Serenísima" },
    { nombre: "Queso cremoso",          unidad_base: "KG",       categoria: "Lácteos" },
    { nombre: "Queso rallado",          unidad_base: "GR",       categoria: "Lácteos",           marca: "Sancor" },
    { nombre: "Crema de leche",         unidad_base: "ML",       categoria: "Lácteos" },
    { nombre: "Huevo",                  unidad_base: "UNIDADES", categoria: "Lácteos" },
    { nombre: "Manteca",                unidad_base: "GR",       categoria: "Lácteos" },
    { nombre: "Harina 0000",            unidad_base: "KG",       categoria: "Cereales y Harinas", marca: "Canuelas" },
    { nombre: "Pan rallado",            unidad_base: "GR",       categoria: "Cereales y Harinas" },
    { nombre: "Avena",                  unidad_base: "GR",       categoria: "Cereales y Harinas" },
    { nombre: "Sal fina",               unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Pimienta negra",         unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Orégano",                unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Ají molido",             unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Perejil",                unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Pimentón dulce",         unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Comino",                 unidad_base: "GR",       categoria: "Condimentos y Especias" },
    { nombre: "Caldo de verdura",       unidad_base: "UNIDADES", categoria: "Condimentos y Especias", marca: "Knorr" },
    { nombre: "Aceite de girasol",      unidad_base: "LITROS",   categoria: "Aceites y Grasas",  marca: "Natura" },
    { nombre: "Aceite de oliva",        unidad_base: "LITROS",   categoria: "Aceites y Grasas" },
    { nombre: "Lentejas",               unidad_base: "KG",       categoria: "Legumbres" },
    { nombre: "Garbanzos",              unidad_base: "KG",       categoria: "Legumbres" },
    { nombre: "Porotos negros",         unidad_base: "KG",       categoria: "Legumbres" },
    { nombre: "Arroz largo fino",       unidad_base: "KG",       categoria: "Pastas y Arroz",    marca: "Gallo" },
    { nombre: "Fideos spaghetti",       unidad_base: "KG",       categoria: "Pastas y Arroz",    marca: "Matarazzo" },
    { nombre: "Fideos moñito",          unidad_base: "KG",       categoria: "Pastas y Arroz",    marca: "Matarazzo" },
    { nombre: "Fideos tallarín",        unidad_base: "KG",       categoria: "Pastas y Arroz" },
    { nombre: "Puré de tomate",         unidad_base: "GR",       categoria: "Pastas y Arroz",    marca: "Arcor" },
    { nombre: "Salsa de tomate lista",  unidad_base: "GR",       categoria: "Pastas y Arroz",    marca: "Knorr" },
  ] as const;

  const alimentoIds: Record<string, number> = {};
  for (const a of alimentosData) {
    const marca = (a as { marca?: string }).marca ?? null;
    const existing = await prisma.alimento.findFirst({ where: { nombre: a.nombre, marca } });
    const alimento = existing ?? await prisma.alimento.create({
      data: {
        nombre: a.nombre,
        marca,
        unidad_base: a.unidad_base as "KG" | "GR" | "LITROS" | "ML" | "UNIDADES",
        categoria_id: categoriasCreadas[a.categoria],
      },
    });
    alimentoIds[a.nombre] = alimento.id;
  }
  console.log(`${alimentosData.length} alimentos`);

  // -------------------------------------------------------------------------
  // Menús (10)
  // -------------------------------------------------------------------------
  type Unidad = "KG" | "GR" | "LITROS" | "ML" | "UNIDADES";
  type Dificultad = "FACIL" | "MEDIO" | "DIFICIL";

  const menusData: Array<{
    nombre: string; descripcion: string; dificultad: Dificultad;
    tiempo_min: number; personas_base: number;
    ingredientes: { nombre: string; cantidad: number; unidad: Unidad }[];
  }> = [
    {
      nombre: "Milanesas con puré de papas", dificultad: "FACIL", tiempo_min: 50, personas_base: 10,
      descripcion: "Clásico argentino. Milanesas de ternera empanadas y fritas, acompañadas de un cremoso puré de papas.",
      ingredientes: [
        { nombre: "Milanesa de ternera", cantidad: 2.5, unidad: "KG" },
        { nombre: "Huevo", cantidad: 6, unidad: "UNIDADES" },
        { nombre: "Pan rallado", cantidad: 400, unidad: "GR" },
        { nombre: "Papa", cantidad: 3, unidad: "KG" },
        { nombre: "Manteca", cantidad: 100, unidad: "GR" },
        { nombre: "Leche entera", cantidad: 0.3, unidad: "LITROS" },
        { nombre: "Aceite de girasol", cantidad: 0.5, unidad: "LITROS" },
        { nombre: "Sal fina", cantidad: 20, unidad: "GR" },
        { nombre: "Pimienta negra", cantidad: 5, unidad: "GR" },
      ],
    },
    {
      nombre: "Fideos con salsa bolognesa", dificultad: "FACIL", tiempo_min: 45, personas_base: 10,
      descripcion: "Salsa bolognesa casera con carne picada y tomate, sobre fideos spaghetti al dente.",
      ingredientes: [
        { nombre: "Fideos spaghetti", cantidad: 1.5, unidad: "KG" },
        { nombre: "Carne picada", cantidad: 1.5, unidad: "KG" },
        { nombre: "Puré de tomate", cantidad: 800, unidad: "GR" },
        { nombre: "Cebolla", cantidad: 0.5, unidad: "KG" },
        { nombre: "Ajo", cantidad: 20, unidad: "GR" },
        { nombre: "Aceite de girasol", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Orégano", cantidad: 10, unidad: "GR" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
        { nombre: "Queso rallado", cantidad: 200, unidad: "GR" },
      ],
    },
    {
      nombre: "Arroz con pollo", dificultad: "MEDIO", tiempo_min: 60, personas_base: 10,
      descripcion: "Guiso clásico y nutritivo. El pollo se dora primero para sellar los jugos, luego se cocina junto al arroz.",
      ingredientes: [
        { nombre: "Pollo entero", cantidad: 3, unidad: "KG" },
        { nombre: "Arroz largo fino", cantidad: 1, unidad: "KG" },
        { nombre: "Cebolla", cantidad: 0.5, unidad: "KG" },
        { nombre: "Pimiento rojo", cantidad: 0.3, unidad: "KG" },
        { nombre: "Tomate", cantidad: 0.5, unidad: "KG" },
        { nombre: "Ajo", cantidad: 15, unidad: "GR" },
        { nombre: "Aceite de girasol", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Caldo de verdura", cantidad: 3, unidad: "UNIDADES" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
        { nombre: "Pimentón dulce", cantidad: 10, unidad: "GR" },
      ],
    },
    {
      nombre: "Guiso de lentejas", dificultad: "FACIL", tiempo_min: 55, personas_base: 10,
      descripcion: "Guiso reconfortante y muy nutritivo. Las lentejas no necesitan remojo previo.",
      ingredientes: [
        { nombre: "Lentejas", cantidad: 1.2, unidad: "KG" },
        { nombre: "Chorizo", cantidad: 0.5, unidad: "KG" },
        { nombre: "Papa", cantidad: 1, unidad: "KG" },
        { nombre: "Zanahoria", cantidad: 0.5, unidad: "KG" },
        { nombre: "Cebolla", cantidad: 0.4, unidad: "KG" },
        { nombre: "Tomate", cantidad: 0.3, unidad: "KG" },
        { nombre: "Ajo", cantidad: 15, unidad: "GR" },
        { nombre: "Aceite de girasol", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Pimentón dulce", cantidad: 8, unidad: "GR" },
        { nombre: "Comino", cantidad: 5, unidad: "GR" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
      ],
    },
    {
      nombre: "Pollo al horno con papas", dificultad: "FACIL", tiempo_min: 75, personas_base: 10,
      descripcion: "Pollo trozado marinado con ajo, limón y pimentón, horneado junto a papas cortadas en gajos.",
      ingredientes: [
        { nombre: "Pollo entero", cantidad: 4, unidad: "KG" },
        { nombre: "Papa", cantidad: 2.5, unidad: "KG" },
        { nombre: "Ajo", cantidad: 30, unidad: "GR" },
        { nombre: "Limón", cantidad: 0.4, unidad: "KG" },
        { nombre: "Aceite de oliva", cantidad: 0.15, unidad: "LITROS" },
        { nombre: "Sal fina", cantidad: 20, unidad: "GR" },
        { nombre: "Pimienta negra", cantidad: 8, unidad: "GR" },
        { nombre: "Pimentón dulce", cantidad: 10, unidad: "GR" },
        { nombre: "Orégano", cantidad: 8, unidad: "GR" },
      ],
    },
    {
      nombre: "Tarta de verduras", dificultad: "MEDIO", tiempo_min: 65, personas_base: 10,
      descripcion: "Tarta casera rellena de espinaca, zapallito y queso. La masa se pre-cocina 10 min antes de rellenar.",
      ingredientes: [
        { nombre: "Harina 0000", cantidad: 0.8, unidad: "KG" },
        { nombre: "Manteca", cantidad: 150, unidad: "GR" },
        { nombre: "Espinaca", cantidad: 1, unidad: "KG" },
        { nombre: "Zapallito", cantidad: 0.8, unidad: "KG" },
        { nombre: "Cebolla", cantidad: 0.4, unidad: "KG" },
        { nombre: "Huevo", cantidad: 5, unidad: "UNIDADES" },
        { nombre: "Queso cremoso", cantidad: 0.4, unidad: "KG" },
        { nombre: "Aceite de girasol", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
      ],
    },
    {
      nombre: "Asado de tira con ensalada", dificultad: "MEDIO", tiempo_min: 90, personas_base: 10,
      descripcion: "Asado de tira a la parrilla o al horno. El secreto es la temperatura constante y no apurar la cocción.",
      ingredientes: [
        { nombre: "Asado de tira", cantidad: 4, unidad: "KG" },
        { nombre: "Sal fina", cantidad: 30, unidad: "GR" },
        { nombre: "Tomate", cantidad: 1, unidad: "KG" },
        { nombre: "Cebolla", cantidad: 0.5, unidad: "KG" },
        { nombre: "Ají molido", cantidad: 10, unidad: "GR" },
        { nombre: "Aceite de oliva", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Limón", cantidad: 0.3, unidad: "KG" },
      ],
    },
    {
      nombre: "Zapallo relleno", dificultad: "MEDIO", tiempo_min: 80, personas_base: 10,
      descripcion: "Mitades de zapallo asadas al horno y rellenas con una mezcla de arroz, verduras y queso gratinado.",
      ingredientes: [
        { nombre: "Zapallo", cantidad: 5, unidad: "KG" },
        { nombre: "Arroz largo fino", cantidad: 0.5, unidad: "KG" },
        { nombre: "Cebolla", cantidad: 0.3, unidad: "KG" },
        { nombre: "Zanahoria", cantidad: 0.3, unidad: "KG" },
        { nombre: "Queso cremoso", cantidad: 0.3, unidad: "KG" },
        { nombre: "Queso rallado", cantidad: 150, unidad: "GR" },
        { nombre: "Huevo", cantidad: 3, unidad: "UNIDADES" },
        { nombre: "Aceite de girasol", cantidad: 0.08, unidad: "LITROS" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
        { nombre: "Perejil", cantidad: 10, unidad: "GR" },
      ],
    },
    {
      nombre: "Fideos con atún", dificultad: "FACIL", tiempo_min: 25, personas_base: 10,
      descripcion: "Plato rápido y económico. El atún se incorpora fuera del fuego para no resecarlo.",
      ingredientes: [
        { nombre: "Fideos moñito", cantidad: 1.5, unidad: "KG" },
        { nombre: "Atún en lata", cantidad: 600, unidad: "GR" },
        { nombre: "Puré de tomate", cantidad: 400, unidad: "GR" },
        { nombre: "Cebolla", cantidad: 0.3, unidad: "KG" },
        { nombre: "Ajo", cantidad: 10, unidad: "GR" },
        { nombre: "Aceite de oliva", cantidad: 0.08, unidad: "LITROS" },
        { nombre: "Orégano", cantidad: 8, unidad: "GR" },
        { nombre: "Sal fina", cantidad: 10, unidad: "GR" },
      ],
    },
    {
      nombre: "Pechuga a la plancha con arroz", dificultad: "FACIL", tiempo_min: 40, personas_base: 10,
      descripcion: "Pechugas de pollo marinadas y cocinadas a la plancha, acompañadas de arroz blanco.",
      ingredientes: [
        { nombre: "Pechuga de pollo", cantidad: 2.5, unidad: "KG" },
        { nombre: "Arroz largo fino", cantidad: 1, unidad: "KG" },
        { nombre: "Ajo", cantidad: 20, unidad: "GR" },
        { nombre: "Limón", cantidad: 0.3, unidad: "KG" },
        { nombre: "Aceite de oliva", cantidad: 0.1, unidad: "LITROS" },
        { nombre: "Sal fina", cantidad: 15, unidad: "GR" },
        { nombre: "Pimienta negra", cantidad: 5, unidad: "GR" },
        { nombre: "Caldo de verdura", cantidad: 2, unidad: "UNIDADES" },
      ],
    },
  ];

  // -------------------------------------------------------------------------
  // Residencias (3)
  // -------------------------------------------------------------------------
  const adminHash = await bcrypt.hash("admin123", 10);

  const residenciasData = [
    { id: 1, nombre: "Residencia San Martín",   direccion: "Av. San Martín 1234",    ciudad: "Buenos Aires", provincia: "CABA",            capacidad_max: 50, rollback_horas: 2, adminEmail: "adminres@fundacion.com" },
    { id: 2, nombre: "Residencia Belgrano",      direccion: "Monroe 2500",             ciudad: "Córdoba",      provincia: "Córdoba",         capacidad_max: 30, rollback_horas: 3, adminEmail: "adminres2@fundacion.com" },
    { id: 3, nombre: "Residencia Las Heras",     direccion: "Las Heras 780",           ciudad: "Rosario",      provincia: "Santa Fe",        capacidad_max: 40, rollback_horas: 2, adminEmail: "adminres3@fundacion.com" },
  ];

  const residencias: Record<number, { id: number }> = {};
  for (const r of residenciasData) {
    const res = await prisma.residencia.upsert({
      where: { id: r.id },
      update: {},
      create: {
        nombre: r.nombre, direccion: r.direccion, ciudad: r.ciudad,
        provincia: r.provincia, capacidad_max: r.capacidad_max, rollback_horas: r.rollback_horas,
      },
    });
    residencias[r.id] = res;

    await prisma.user.upsert({
      where: { email: r.adminEmail },
      update: { password_hash: adminHash, first_login: false },
      create: {
        email: r.adminEmail, password_hash: adminHash,
        role: "ADMIN_RESIDENCIA", residencia_id: res.id, first_login: false, active: true,
      },
    });
  }

  // Admin Global
  await prisma.user.upsert({
    where: { email: "admin@fundacion.com" },
    update: { password_hash: adminHash, first_login: false },
    create: {
      email: "admin@fundacion.com", password_hash: adminHash,
      role: "ADMIN_GLOBAL", first_login: false, active: true,
    },
  });

  console.log(`${residenciasData.length} residencias + admins`);

  // -------------------------------------------------------------------------
  // Residentes (24 — 8 por residencia)
  // -------------------------------------------------------------------------
  const residentesHash = await bcrypt.hash("residente123", 10);

  const residentesData = [
    // Residencia 1 — San Martín
    { email: "residente@fundacion.com",        nombre: "Juan",      apellido: "Pérez",      dni: "12345678", edad: 22, tel: "+54 11 1234-5678", uni: "UBA",    carrera: "Ingeniería Informática", ciudad: "Córdoba",           provincia: "Córdoba",            ingreso: "2024-03-01", res: 1, firstLogin: true,  puedeStock: false },
    { email: "martin.garcia@fundacion.com",    nombre: "Martín",    apellido: "García",     dni: "23456789", edad: 21, tel: "+54 351 234-5678", uni: "UNC",    carrera: "Medicina",               ciudad: "Rosario",           provincia: "Santa Fe",           ingreso: "2024-03-01", res: 1, firstLogin: false, puedeStock: true  },
    { email: "sofia.lopez@fundacion.com",      nombre: "Sofía",     apellido: "López",      dni: "34567890", edad: 23, tel: "+54 261 345-6789", uni: "UNCUYO", carrera: "Derecho",                ciudad: "Mendoza",           provincia: "Mendoza",            ingreso: "2024-04-01", res: 1, firstLogin: false, puedeStock: false },
    { email: "lucas.fernandez@fundacion.com",  nombre: "Lucas",     apellido: "Fernández",  dni: "45678901", edad: 20, tel: "+54 341 456-7890", uni: "UNR",    carrera: "Arquitectura",           ciudad: "San Luis",          provincia: "San Luis",           ingreso: "2024-04-15", res: 1, firstLogin: false, puedeStock: false },
    { email: "valentina.torres@fundacion.com", nombre: "Valentina", apellido: "Torres",     dni: "56789012", edad: 22, tel: "+54 387 567-8901", uni: "UNSA",   carrera: "Psicología",             ciudad: "Salta",             provincia: "Salta",              ingreso: "2024-05-01", res: 1, firstLogin: false, puedeStock: false },
    { email: "nicolas.gomez@fundacion.com",    nombre: "Nicolás",   apellido: "Gómez",      dni: "67890123", edad: 24, tel: "+54 299 678-9012", uni: "UNCo",   carrera: "Geología",               ciudad: "Neuquén",           provincia: "Neuquén",            ingreso: "2024-05-15", res: 1, firstLogin: false, puedeStock: false },
    { email: "camila.rodriguez@fundacion.com", nombre: "Camila",    apellido: "Rodríguez",  dni: "78901234", edad: 21, tel: "+54 342 789-0123", uni: "UNL",    carrera: "Biotecnología",          ciudad: "Santa Fe",          provincia: "Santa Fe",           ingreso: "2024-06-01", res: 1, firstLogin: false, puedeStock: false },
    { email: "diego.martinez@fundacion.com",   nombre: "Diego",     apellido: "Martínez",   dni: "89012345", edad: 23, tel: "+54 221 890-1234", uni: "UNLP",   carrera: "Economía",               ciudad: "La Plata",          provincia: "Buenos Aires",       ingreso: "2024-06-15", res: 1, firstLogin: false, puedeStock: false },
    // Residencia 2 — Belgrano
    { email: "paula.ruiz@fundacion.com",       nombre: "Paula",     apellido: "Ruiz",       dni: "11223344", edad: 20, tel: "+54 351 111-2233", uni: "UNC",    carrera: "Psicopedagogía",         ciudad: "Villa María",       provincia: "Córdoba",            ingreso: "2024-03-01", res: 2, firstLogin: false, puedeStock: true  },
    { email: "andres.silva@fundacion.com",     nombre: "Andrés",    apellido: "Silva",      dni: "22334455", edad: 22, tel: "+54 351 222-3344", uni: "UNC",    carrera: "Física",                 ciudad: "Río Cuarto",        provincia: "Córdoba",            ingreso: "2024-03-15", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Luciana",  apellido: "Moreno",  email: "luciana.moreno@fundacion.com",  dni: "33445566", edad: 21, tel: "+54 351 333-4455", uni: "UNC",    carrera: "Nutrición",              ciudad: "Alta Gracia",       provincia: "Córdoba",            ingreso: "2024-04-01", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Tomás",    apellido: "Ríos",    email: "tomas.rios@fundacion.com",      dni: "44556677", edad: 23, tel: "+54 351 444-5566", uni: "UNC",    carrera: "Abogacía",               ciudad: "Carlos Paz",        provincia: "Córdoba",            ingreso: "2024-04-15", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Florencia", apellido: "Herrera", email: "florencia.herrera@fundacion.com", dni: "55667788", edad: 20, tel: "+54 351 555-6677", uni: "UNC", carrera: "Medicina",               ciudad: "San Francisco",     provincia: "Córdoba",            ingreso: "2024-05-01", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Ignacio",  apellido: "Vega",    email: "ignacio.vega@fundacion.com",    dni: "66778899", edad: 24, tel: "+54 351 666-7788", uni: "UNC",    carrera: "Ingeniería Civil",       ciudad: "Jesús María",       provincia: "Córdoba",            ingreso: "2024-05-15", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Rocío",    apellido: "Blanco",  email: "rocio.blanco@fundacion.com",    dni: "77889900", edad: 22, tel: "+54 351 777-8899", uni: "UNC",    carrera: "Arquitectura",           ciudad: "Bell Ville",        provincia: "Córdoba",            ingreso: "2024-06-01", res: 2, firstLogin: false, puedeStock: false },
    { nombre: "Mateo",    apellido: "Castro",  email: "mateo.castro@fundacion.com",    dni: "88990011", edad: 21, tel: "+54 351 888-9900", uni: "UNC",    carrera: "Comunicación Social",    ciudad: "Cruz del Eje",      provincia: "Córdoba",            ingreso: "2024-06-15", res: 2, firstLogin: false, puedeStock: false },
    // Residencia 3 — Las Heras
    { nombre: "Valentín", apellido: "Acosta",  email: "valentin.acosta@fundacion.com", dni: "99001122", edad: 22, tel: "+54 341 900-1122", uni: "UNR",    carrera: "Contador Público",       ciudad: "Pergamino",         provincia: "Buenos Aires",       ingreso: "2024-03-01", res: 3, firstLogin: false, puedeStock: true  },
    { nombre: "Mía",      apellido: "Ortega",  email: "mia.ortega@fundacion.com",      dni: "00112233", edad: 20, tel: "+54 341 001-1223", uni: "UNR",    carrera: "Bioquímica",             ciudad: "Rafaela",           provincia: "Santa Fe",           ingreso: "2024-03-15", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Franco",   apellido: "Navarro", email: "franco.navarro@fundacion.com",  dni: "10203040", edad: 23, tel: "+54 341 102-0304", uni: "UNR",    carrera: "Ingeniería Química",     ciudad: "Venado Tuerto",     provincia: "Santa Fe",           ingreso: "2024-04-01", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Agustina", apellido: "Sánchez", email: "agustina.sanchez@fundacion.com", dni: "90123456", edad: 20, tel: "+54 362 901-2345", uni: "UNSE",   carrera: "Sistemas de Información", ciudad: "Santiago del Estero", provincia: "Santiago del Estero", ingreso: "2024-07-01", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Federico", apellido: "Díaz",    email: "federico.diaz@fundacion.com",   dni: "01234567", edad: 25, tel: "+54 381 012-3456", uni: "UNT",    carrera: "Ingeniería Civil",       ciudad: "Tucumán",           provincia: "Tucumán",            ingreso: "2024-07-15", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Bianca",   apellido: "Molina",  email: "bianca.molina@fundacion.com",   dni: "20304050", edad: 21, tel: "+54 341 203-0405", uni: "UNR",    carrera: "Derecho",                ciudad: "Reconquista",       provincia: "Santa Fe",           ingreso: "2024-05-01", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Lautaro",  apellido: "Romero",  email: "lautaro.romero@fundacion.com",  dni: "30405060", edad: 22, tel: "+54 341 304-0506", uni: "UNR",    carrera: "Medicina",               ciudad: "Río Gallegos",      provincia: "Santa Cruz",         ingreso: "2024-05-15", res: 3, firstLogin: false, puedeStock: false },
    { nombre: "Sofía",    apellido: "Vargas",  email: "sofia.vargas@fundacion.com",    dni: "40506070", edad: 20, tel: "+54 341 405-0607", uni: "UNR",    carrera: "Psicología",             ciudad: "Santa Rosa",        provincia: "La Pampa",           ingreso: "2024-06-01", res: 3, firstLogin: false, puedeStock: false },
  ];

  const residenteIds: number[] = [];
  const residenteByRes: Record<number, number[]> = { 1: [], 2: [], 3: [] };

  for (const r of residentesData) {
    const existUser = await prisma.user.findUnique({ where: { email: r.email } });
    let userId: number;
    if (existUser) {
      userId = existUser.id;
      await prisma.user.update({ where: { id: userId }, data: { puede_cargar_stock: r.puedeStock, first_login: r.firstLogin, password_hash: residentesHash } });
    } else {
      const user = await prisma.user.create({
        data: {
          email: r.email, password_hash: residentesHash,
          role: "RESIDENTE", residencia_id: r.res,
          first_login: r.firstLogin, active: true,
          puede_cargar_stock: r.puedeStock,
        },
      });
      userId = user.id;
    }

    const existRes = await prisma.residente.findFirst({ where: { user_id: userId } });
    let resId: number;
    if (existRes) {
      resId = existRes.id;
    } else {
      const res = await prisma.residente.create({
        data: {
          user_id: userId, residencia_id: r.res,
          nombre: r.nombre, apellido: r.apellido, dni: r.dni, edad: r.edad,
          telefono: r.tel, universidad: r.uni, carrera: r.carrera,
          ciudad_origen: r.ciudad, provincia_origen: r.provincia,
          fecha_ingreso: new Date(r.ingreso),
        },
      });
      resId = res.id;
    }
    residenteIds.push(resId);
    residenteByRes[r.res].push(resId);
  }

  console.log(`${residentesData.length} residentes`);

  // -------------------------------------------------------------------------
  // Menús — crear para cada residencia
  // -------------------------------------------------------------------------
  const menuIdsByRes: Record<number, number[]> = { 1: [], 2: [], 3: [] };

  for (const residenciaId of [1, 2, 3]) {
    for (const m of menusData) {
      const existing = await prisma.menu.findFirst({ where: { nombre: m.nombre, residencia_id: residenciaId } });
      let menu;
      if (existing) {
        menu = existing;
      } else {
        menu = await prisma.menu.create({
          data: {
            nombre: m.nombre, descripcion: m.descripcion,
            dificultad: m.dificultad, tiempo_min: m.tiempo_min,
            personas_base: m.personas_base, residencia_id: residenciaId,
          },
        });
      }
      menuIdsByRes[residenciaId].push(menu.id);

      for (const ing of m.ingredientes) {
        const alimentoId = alimentoIds[ing.nombre];
        if (!alimentoId) continue;
        const existeIng = await prisma.menuIngrediente.findUnique({
          where: { menu_id_alimento_id: { menu_id: menu.id, alimento_id: alimentoId } },
        });
        if (!existeIng) {
          await prisma.menuIngrediente.create({
            data: {
              menu_id: menu.id, alimento_id: alimentoId,
              cantidad_base: ing.cantidad,
              cantidad_por_persona: ing.cantidad / m.personas_base,
              unidad: ing.unidad,
            },
          });
        }
      }
    }
  }

  console.log(`${menusData.length * 3} menús (10 × 3 residencias)`);

  // -------------------------------------------------------------------------
  // Stock — para cada residencia
  // -------------------------------------------------------------------------
  const stockTemplates: { nombre: string; cantidad: number; unidad: "KG" | "GR" | "LITROS" | "ML" | "UNIDADES"; minimo: number; vence: string | null }[] = [
    { nombre: "Pollo entero",        cantidad: 8,    unidad: "KG",       minimo: 3,   vence: "2026-08-15" },
    { nombre: "Pechuga de pollo",    cantidad: 5,    unidad: "KG",       minimo: 2,   vence: "2026-08-12" },
    { nombre: "Carne picada",        cantidad: 4,    unidad: "KG",       minimo: 2,   vence: "2026-08-10" },
    { nombre: "Asado de tira",       cantidad: 6,    unidad: "KG",       minimo: 2,   vence: "2026-08-20" },
    { nombre: "Milanesa de ternera", cantidad: 5,    unidad: "KG",       minimo: 2,   vence: "2026-08-11" },
    { nombre: "Chorizo",             cantidad: 2,    unidad: "KG",       minimo: 1,   vence: "2026-09-01" },
    { nombre: "Atún en lata",        cantidad: 1200, unidad: "GR",       minimo: 400, vence: "2027-03-01" },
    { nombre: "Papa",                cantidad: 10,   unidad: "KG",       minimo: 3,   vence: null },
    { nombre: "Cebolla",             cantidad: 5,    unidad: "KG",       minimo: 2,   vence: null },
    { nombre: "Tomate",              cantidad: 4,    unidad: "KG",       minimo: 1,   vence: "2026-06-25" },
    { nombre: "Zanahoria",           cantidad: 3,    unidad: "KG",       minimo: 1,   vence: null },
    { nombre: "Zapallo",             cantidad: 8,    unidad: "KG",       minimo: 2,   vence: null },
    { nombre: "Ajo",                 cantidad: 300,  unidad: "GR",       minimo: 100, vence: null },
    { nombre: "Pimiento rojo",       cantidad: 2,    unidad: "KG",       minimo: 0.5, vence: "2026-06-30" },
    { nombre: "Espinaca",            cantidad: 1.5,  unidad: "KG",       minimo: 0.5, vence: "2026-06-26" },
    { nombre: "Choclo",              cantidad: 12,   unidad: "UNIDADES", minimo: 4,   vence: null },
    { nombre: "Zapallito",           cantidad: 3,    unidad: "KG",       minimo: 1,   vence: "2026-06-28" },
    { nombre: "Berenjena",           cantidad: 2,    unidad: "KG",       minimo: 0.5, vence: null },
    { nombre: "Manzana",             cantidad: 4,    unidad: "KG",       minimo: 1,   vence: null },
    { nombre: "Banana",              cantidad: 3,    unidad: "KG",       minimo: 1,   vence: "2026-06-23" },
    { nombre: "Naranja",             cantidad: 5,    unidad: "KG",       minimo: 1,   vence: null },
    { nombre: "Limón",               cantidad: 2,    unidad: "KG",       minimo: 0.5, vence: null },
    { nombre: "Leche entera",        cantidad: 6,    unidad: "LITROS",   minimo: 2,   vence: "2026-06-30" },
    { nombre: "Queso cremoso",       cantidad: 1.2,  unidad: "KG",       minimo: 0.4, vence: "2026-07-14" },
    { nombre: "Queso rallado",       cantidad: 500,  unidad: "GR",       minimo: 150, vence: "2026-08-01" },
    { nombre: "Crema de leche",      cantidad: 400,  unidad: "ML",       minimo: 100, vence: "2026-07-09" },
    { nombre: "Huevo",               cantidad: 30,   unidad: "UNIDADES", minimo: 12,  vence: "2026-07-20" },
    { nombre: "Manteca",             cantidad: 400,  unidad: "GR",       minimo: 100, vence: "2026-08-15" },
    { nombre: "Harina 0000",         cantidad: 3,    unidad: "KG",       minimo: 1,   vence: "2026-10-01" },
    { nombre: "Pan rallado",         cantidad: 800,  unidad: "GR",       minimo: 200, vence: "2026-09-01" },
    { nombre: "Avena",               cantidad: 500,  unidad: "GR",       minimo: 150, vence: "2026-11-01" },
    { nombre: "Sal fina",            cantidad: 1500, unidad: "GR",       minimo: 300, vence: null },
    { nombre: "Pimienta negra",      cantidad: 150,  unidad: "GR",       minimo: 30,  vence: null },
    { nombre: "Orégano",             cantidad: 100,  unidad: "GR",       minimo: 20,  vence: null },
    { nombre: "Ají molido",          cantidad: 80,   unidad: "GR",       minimo: 20,  vence: null },
    { nombre: "Perejil",             cantidad: 50,   unidad: "GR",       minimo: 15,  vence: "2026-06-26" },
    { nombre: "Pimentón dulce",      cantidad: 120,  unidad: "GR",       minimo: 30,  vence: null },
    { nombre: "Comino",              cantidad: 80,   unidad: "GR",       minimo: 20,  vence: null },
    { nombre: "Caldo de verdura",    cantidad: 20,   unidad: "UNIDADES", minimo: 6,   vence: "2027-01-01" },
    { nombre: "Aceite de girasol",   cantidad: 3,    unidad: "LITROS",   minimo: 1,   vence: "2026-12-01" },
    { nombre: "Aceite de oliva",     cantidad: 1,    unidad: "LITROS",   minimo: 0.3, vence: "2027-01-01" },
    { nombre: "Lentejas",            cantidad: 2.5,  unidad: "KG",       minimo: 0.5, vence: "2027-06-01" },
    { nombre: "Garbanzos",           cantidad: 1.5,  unidad: "KG",       minimo: 0.5, vence: "2027-06-01" },
    { nombre: "Porotos negros",      cantidad: 1,    unidad: "KG",       minimo: 0.3, vence: "2027-06-01" },
    { nombre: "Arroz largo fino",    cantidad: 4,    unidad: "KG",       minimo: 1,   vence: "2027-03-01" },
    { nombre: "Fideos spaghetti",    cantidad: 3,    unidad: "KG",       minimo: 1,   vence: "2027-02-01" },
    { nombre: "Fideos moñito",       cantidad: 2,    unidad: "KG",       minimo: 0.5, vence: "2027-02-01" },
    { nombre: "Fideos tallarín",     cantidad: 2,    unidad: "KG",       minimo: 0.5, vence: "2027-02-01" },
    { nombre: "Puré de tomate",      cantidad: 1600, unidad: "GR",       minimo: 400, vence: "2027-01-01" },
    { nombre: "Salsa de tomate lista", cantidad: 1200, unidad: "GR",     minimo: 400, vence: "2027-01-01" },
  ];

  // Variaciones por residencia para que no sean idénticos
  const stockMultipliers: Record<number, number> = { 1: 1, 2: 0.7, 3: 1.2 };

  for (const residenciaId of [1, 2, 3]) {
    const mult = stockMultipliers[residenciaId];
    for (const s of stockTemplates) {
      const alimentoId = alimentoIds[s.nombre];
      if (!alimentoId) continue;
      const existing = await prisma.stock.findFirst({ where: { alimento_id: alimentoId, residencia_id: residenciaId } });
      if (!existing) {
        await prisma.stock.create({
          data: {
            alimento_id: alimentoId, residencia_id: residenciaId,
            cantidad: Math.round(s.cantidad * mult * 100) / 100,
            unidad: s.unidad,
            stock_minimo: s.minimo,
            fecha_vencimiento: s.vence ? new Date(s.vence) : null,
          },
        });
      }
    }
  }

  console.log(`${stockTemplates.length * 3} entradas de stock (50 × 3 residencias)`);

  // -------------------------------------------------------------------------
  // Grupos de cocina (2 por residencia)
  // -------------------------------------------------------------------------
  const grupoIdsByRes: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  const gruposNombres = [
    ["Grupo Alfa", "Grupo Beta"],
    ["Grupo Norte", "Grupo Sur"],
    ["Grupo Rojo", "Grupo Azul"],
  ];

  for (const residenciaId of [1, 2, 3]) {
    for (const nombre of gruposNombres[residenciaId - 1]) {
      const existing = await prisma.grupoCocina.findFirst({ where: { nombre, residencia_id: residenciaId } });
      const grupo = existing ?? await prisma.grupoCocina.create({
        data: { nombre, residencia_id: residenciaId },
      });
      grupoIdsByRes[residenciaId].push(grupo.id);
    }
  }

  console.log(`${Object.values(grupoIdsByRes).flat().length} grupos de cocina`);

  // -------------------------------------------------------------------------
  // Integrantes (dividir residentes en 2 grupos por residencia)
  // -------------------------------------------------------------------------
  for (const residenciaId of [1, 2, 3]) {
    const resIds = residenteByRes[residenciaId];
    const grupos = grupoIdsByRes[residenciaId];
    for (let i = 0; i < resIds.length; i++) {
      const grupoId = grupos[i % 2];
      const existing = await prisma.grupoIntegrante.findFirst({
        where: { grupo_id: grupoId, residente_id: resIds[i] },
      });
      if (!existing) {
        await prisma.grupoIntegrante.create({
          data: { grupo_id: grupoId, residente_id: resIds[i] },
        });
      }
    }
  }

  console.log("Integrantes asignados a grupos");

  // -------------------------------------------------------------------------
  // Turnos — FIJO (1 por grupo) + ROTATIVO (próximos 4 días)
  // -------------------------------------------------------------------------
  const hoy = new Date();

  for (const residenciaId of [1, 2, 3]) {
    const grupos = grupoIdsByRes[residenciaId];

    // Turnos fijos: Grupo 0 → lunes almuerzo, Grupo 1 → miércoles cena
    const turnosFijos = [
      { grupo_idx: 0, dia_semana: 1, franja: "ALMUERZO" as const },
      { grupo_idx: 1, dia_semana: 3, franja: "CENA" as const },
    ];
    for (const tf of turnosFijos) {
      const grupoId = grupos[tf.grupo_idx];
      const existing = await prisma.turnoCocina.findFirst({
        where: { grupo_id: grupoId, tipo: "FIJO", dia_semana: tf.dia_semana, franja: tf.franja },
      });
      if (!existing) {
        await prisma.turnoCocina.create({
          data: { grupo_id: grupoId, residencia_id: residenciaId, tipo: "FIJO", dia_semana: tf.dia_semana, franja: tf.franja },
        });
      }
    }

    // Turnos rotativos: próximos 4 días, alternando grupos y franjas
    for (let d = 0; d < 4; d++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + d);
      fecha.setHours(0, 0, 0, 0);

      const grupoId = grupos[d % 2];
      const franja = d % 2 === 0 ? "ALMUERZO" as const : "CENA" as const;

      const existing = await prisma.turnoCocina.findFirst({
        where: { grupo_id: grupoId, tipo: "ROTATIVO", fecha, franja },
      });
      if (!existing) {
        await prisma.turnoCocina.create({
          data: { grupo_id: grupoId, residencia_id: residenciaId, tipo: "ROTATIVO", fecha, franja },
        });
      }
    }
  }

  console.log("Turnos fijos y rotativos creados");

  // -------------------------------------------------------------------------
  // Selecciones de menú — turno de hoy para primer residente de cada grupo
  // -------------------------------------------------------------------------
  const fechaHoy = new Date(hoy);
  fechaHoy.setHours(0, 0, 0, 0);

  for (const residenciaId of [1, 2, 3]) {
    const grupos = grupoIdsByRes[residenciaId];
    const menus = menuIdsByRes[residenciaId];
    const resIds = residenteByRes[residenciaId];

    const turnoHoy = await prisma.turnoCocina.findFirst({
      where: { residencia_id: residenciaId, tipo: "ROTATIVO", fecha: fechaHoy },
    });
    if (!turnoHoy || !resIds[0] || !menus[0]) continue;

    const yaExiste = await prisma.seleccionMenu.findFirst({
      where: { turno_id: turnoHoy.id, residente_id: resIds[0] },
    });
    if (!yaExiste) {
      const residencia = await prisma.residencia.findUnique({ where: { id: residenciaId } });
      const rollback_deadline = new Date(fechaHoy.getTime() - (residencia?.rollback_horas ?? 2) * 60 * 60 * 1000);
      await prisma.seleccionMenu.create({
        data: {
          turno_id: turnoHoy.id, menu_id: menus[0],
          residente_id: resIds[0], personas: 8,
          estado: "PENDIENTE", rollback_deadline,
        },
      });
    }
  }

  console.log("Selecciones de ejemplo creadas");

  // -------------------------------------------------------------------------
  // Resumen final
  // -------------------------------------------------------------------------
  console.log("\n✓ Seed completado exitosamente.\n");
  console.log("Credenciales:");
  console.log("  Admin Global:          admin@fundacion.com           / admin123");
  console.log("  Admin San Martín:      adminres@fundacion.com        / admin123");
  console.log("  Admin Belgrano:        adminres2@fundacion.com       / admin123");
  console.log("  Admin Las Heras:       adminres3@fundacion.com       / admin123");
  console.log("  Residente (1er login): residente@fundacion.com       / residente123");
  console.log("  Residente c/ stock:    martin.garcia@fundacion.com   / residente123");
  console.log("  Todos los residentes:  <email>                       / residente123");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
