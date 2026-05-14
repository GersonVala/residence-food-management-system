import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.categoria.findMany();
  const byName = Object.fromEntries(cats.map(c => [c.nombre, c.id]));

  // Ampliar categorías si falta alguna
  const needed = ["Carnes", "Verduras", "Frutas", "Lácteos", "Cereales", "Condimentos", "Legumbres", "Bebidas", "Panadería", "Aceites y grasas"];
  for (const nombre of needed) {
    if (!byName[nombre]) {
      const c = await prisma.categoria.upsert({ where: { nombre }, update: {}, create: { nombre } });
      byName[nombre] = c.id;
    }
  }

  const alimentos: Parameters<typeof prisma.alimento.create>[0]["data"][] = [
    // Carnes
    { nombre: "Pechuga de pollo", unidad_base: "KG", categoria_id: byName["Carnes"], calorias: 165, proteinas: 31, carbohidratos: 0, grasas: 3.6 },
    { nombre: "Carne picada", marca: "La Cooperativa", unidad_base: "KG", categoria_id: byName["Carnes"], calorias: 254, proteinas: 26, carbohidratos: 0, grasas: 17 },
    { nombre: "Milanesas de res", unidad_base: "KG", categoria_id: byName["Carnes"], calorias: 229, proteinas: 28, carbohidratos: 0, grasas: 12 },
    { nombre: "Salchicha de Viena", marca: "Vienissima", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Carnes"], calorias: 290, proteinas: 11, carbohidratos: 2, grasas: 26 },
    { nombre: "Filet de merluza", unidad_base: "KG", categoria_id: byName["Carnes"], calorias: 92, proteinas: 18, carbohidratos: 0, grasas: 2 },

    // Verduras
    { nombre: "Papa", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 77, proteinas: 2, carbohidratos: 17, grasas: 0.1 },
    { nombre: "Cebolla", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 40, proteinas: 1.1, carbohidratos: 9.3, grasas: 0.1 },
    { nombre: "Tomate", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 18, proteinas: 0.9, carbohidratos: 3.9, grasas: 0.2 },
    { nombre: "Zanahoria", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 41, proteinas: 0.9, carbohidratos: 9.6, grasas: 0.2 },
    { nombre: "Lechuga", unidad_base: "UNIDADES", categoria_id: byName["Verduras"], calorias: 15, proteinas: 1.4, carbohidratos: 2.9, grasas: 0.2 },
    { nombre: "Zapallo", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 26, proteinas: 1, carbohidratos: 6.5, grasas: 0.1 },
    { nombre: "Pimiento rojo", unidad_base: "KG", categoria_id: byName["Verduras"], calorias: 31, proteinas: 1, carbohidratos: 6, grasas: 0.3 },
    { nombre: "Choclo", unidad_base: "UNIDADES", categoria_id: byName["Verduras"], calorias: 86, proteinas: 3.3, carbohidratos: 19, grasas: 1.4 },

    // Frutas
    { nombre: "Banana", unidad_base: "KG", categoria_id: byName["Frutas"], calorias: 89, proteinas: 1.1, carbohidratos: 23, grasas: 0.3 },
    { nombre: "Manzana", unidad_base: "KG", categoria_id: byName["Frutas"], calorias: 52, proteinas: 0.3, carbohidratos: 14, grasas: 0.2 },
    { nombre: "Naranja", unidad_base: "KG", categoria_id: byName["Frutas"], calorias: 47, proteinas: 0.9, carbohidratos: 12, grasas: 0.1 },
    { nombre: "Durazno en almíbar", marca: "La Campagnola", unidad_base: "PAQUETES", contenido_neto: 820, unidad_contenido: "GR", categoria_id: byName["Frutas"], calorias: 68, proteinas: 0.5, carbohidratos: 17, grasas: 0.1 },

    // Lácteos
    { nombre: "Leche entera", marca: "La Serenísima", unidad_base: "LITROS", categoria_id: byName["Lácteos"], calorias: 61, proteinas: 3.2, carbohidratos: 4.8, grasas: 3.3 },
    { nombre: "Yogur natural", marca: "Danone", unidad_base: "PAQUETES", contenido_neto: 190, unidad_contenido: "GR", categoria_id: byName["Lácteos"], calorias: 59, proteinas: 3.5, carbohidratos: 6.5, grasas: 1.7 },
    { nombre: "Queso cremoso", marca: "Verónica", unidad_base: "KG", categoria_id: byName["Lácteos"], calorias: 300, proteinas: 18, carbohidratos: 2, grasas: 25 },
    { nombre: "Queso rallado", marca: "Sancor", unidad_base: "PAQUETES", contenido_neto: 200, unidad_contenido: "GR", categoria_id: byName["Lácteos"], calorias: 396, proteinas: 36, carbohidratos: 1.3, grasas: 28 },
    { nombre: "Manteca", marca: "La Serenísima", unidad_base: "PAQUETES", contenido_neto: 200, unidad_contenido: "GR", categoria_id: byName["Lácteos"], calorias: 717, proteinas: 0.9, carbohidratos: 0.1, grasas: 81 },
    { nombre: "Crema de leche", marca: "Sancor", unidad_base: "PAQUETES", contenido_neto: 200, unidad_contenido: "ML", categoria_id: byName["Lácteos"], calorias: 340, proteinas: 2.4, carbohidratos: 3.3, grasas: 36 },

    // Cereales
    { nombre: "Arroz largo fino", marca: "Molinos Ala", unidad_base: "PAQUETES", contenido_neto: 1000, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 360, proteinas: 7, carbohidratos: 79, grasas: 0.6 },
    { nombre: "Fideos spaghetti", marca: "Matarazzo", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 357, proteinas: 13, carbohidratos: 71, grasas: 1.5 },
    { nombre: "Fideos moño", marca: "Marolio", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 357, proteinas: 13, carbohidratos: 71, grasas: 1.5 },
    { nombre: "Harina 000", marca: "Cañuelas", unidad_base: "PAQUETES", contenido_neto: 1000, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 364, proteinas: 10, carbohidratos: 76, grasas: 1 },
    { nombre: "Avena", marca: "Quaker", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 379, proteinas: 13, carbohidratos: 68, grasas: 7 },
    { nombre: "Pan lactal", marca: "Bimbo", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Panadería"], calorias: 265, proteinas: 9, carbohidratos: 49, grasas: 3.5 },
    { nombre: "Galletitas de agua", marca: "Criollitas", unidad_base: "PAQUETES", contenido_neto: 240, unidad_contenido: "GR", categoria_id: byName["Panadería"], calorias: 430, proteinas: 9, carbohidratos: 68, grasas: 14 },

    // Legumbres
    { nombre: "Lentejas", marca: "Marolio", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Legumbres"], calorias: 352, proteinas: 25, carbohidratos: 60, grasas: 1 },
    { nombre: "Garbanzos", marca: "La Egipcia", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Legumbres"], calorias: 364, proteinas: 19, carbohidratos: 61, grasas: 6 },
    { nombre: "Porotos negros", unidad_base: "KG", categoria_id: byName["Legumbres"], calorias: 341, proteinas: 21, carbohidratos: 62, grasas: 1.4 },
    { nombre: "Arvejas secas", marca: "Marolio", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Legumbres"], calorias: 341, proteinas: 25, carbohidratos: 60, grasas: 1.2 },

    // Condimentos
    { nombre: "Sal fina", marca: "Celusal", unidad_base: "PAQUETES", contenido_neto: 500, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Pimienta negra molida", marca: "Alicante", unidad_base: "PAQUETES", contenido_neto: 50, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Orégano", marca: "Alicante", unidad_base: "PAQUETES", contenido_neto: 25, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Pimentón dulce", marca: "Alicante", unidad_base: "PAQUETES", contenido_neto: 50, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Ajo en polvo", marca: "Alicante", unidad_base: "PAQUETES", contenido_neto: 50, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Caldo de verdura", marca: "Knorr", unidad_base: "PAQUETES", contenido_neto: 90, unidad_contenido: "GR", categoria_id: byName["Condimentos"] },
    { nombre: "Salsa de tomate", marca: "Arcor", unidad_base: "PAQUETES", contenido_neto: 520, unidad_contenido: "GR", categoria_id: byName["Condimentos"], calorias: 45, proteinas: 1.8, carbohidratos: 8, grasas: 0.5 },
    { nombre: "Mayonesa", marca: "Hellmann's", unidad_base: "PAQUETES", contenido_neto: 450, unidad_contenido: "GR", categoria_id: byName["Condimentos"], calorias: 680, proteinas: 1.2, carbohidratos: 2, grasas: 75 },

    // Aceites y grasas
    { nombre: "Aceite de girasol", marca: "Natura", unidad_base: "LITROS", categoria_id: byName["Aceites y grasas"], calorias: 884, proteinas: 0, carbohidratos: 0, grasas: 100 },
    { nombre: "Aceite de oliva extra virgen", marca: "Carbonell", unidad_base: "LITROS", categoria_id: byName["Aceites y grasas"], calorias: 884, proteinas: 0, carbohidratos: 0, grasas: 100 },

    // Bebidas
    { nombre: "Agua mineral", marca: "Villavicencio", unidad_base: "LITROS", categoria_id: byName["Bebidas"], calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
    { nombre: "Jugo en polvo naranja", marca: "Tang", unidad_base: "PAQUETES", contenido_neto: 18, unidad_contenido: "GR", categoria_id: byName["Bebidas"], calorias: 370, proteinas: 0, carbohidratos: 93, grasas: 0 },
    { nombre: "Té en saquitos", marca: "Lipton", unidad_base: "PAQUETES", contenido_neto: 50, unidad_contenido: "UNIDADES", categoria_id: byName["Bebidas"] },
    { nombre: "Azúcar", marca: "Ledesma", unidad_base: "PAQUETES", contenido_neto: 1000, unidad_contenido: "GR", categoria_id: byName["Cereales"], calorias: 387, proteinas: 0, carbohidratos: 100, grasas: 0 },
    { nombre: "Mate cocido", marca: "Taragüi", unidad_base: "PAQUETES", contenido_neto: 50, unidad_contenido: "UNIDADES", categoria_id: byName["Bebidas"] },

    // Panadería
    { nombre: "Tapas para empanadas", marca: "La Salteña", unidad_base: "PAQUETES", contenido_neto: 12, unidad_contenido: "UNIDADES", categoria_id: byName["Panadería"], calorias: 280, proteinas: 8, carbohidratos: 48, grasas: 6 },
  ];

  let creados = 0;
  let omitidos = 0;

  for (const data of alimentos) {
    const existe = await prisma.alimento.findFirst({
      where: {
        nombre: data.nombre as string,
        ...(data.marca ? { marca: data.marca as string } : {}),
      },
    });

    if (!existe) {
      await prisma.alimento.create({ data });
      creados++;
    } else {
      omitidos++;
    }
  }

  console.log(`\nAlimentos creados: ${creados}`);
  console.log(`Alimentos omitidos (ya existían): ${omitidos}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
