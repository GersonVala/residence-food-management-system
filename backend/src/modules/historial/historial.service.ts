import { prisma } from "../../shared/prisma/client.js";

export const historialService = {
  async obtener(residencia_id: number, desde?: Date, hasta?: Date) {
    const selecciones = await prisma.seleccionMenu.findMany({
      where: {
        estado: "CONFIRMADO",
        turno: { residencia_id },
        ...(desde || hasta
          ? { created_at: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
          : {}),
      },
      include: {
        menu: { select: { id: true, nombre: true, dificultad: true, tiempo_min: true } },
        residente: { select: { id: true, nombre: true, apellido: true } },
        turno: {
          select: {
            id: true,
            tipo: true,
            dia_semana: true,
            fecha: true,
            franja: true,
            grupo: { select: { id: true, nombre: true } },
          },
        },
        ajustes: {
          include: { alimento: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Resumen de recursos: agrupa por alimento sumando cantidades reales
    const recursosMap = new Map<number, { nombre: string; cantidad: number; unidad: string }>();
    for (const sel of selecciones) {
      for (const ajuste of sel.ajustes) {
        const existing = recursosMap.get(ajuste.alimento_id);
        if (existing) {
          existing.cantidad += ajuste.cantidad_real;
        } else {
          recursosMap.set(ajuste.alimento_id, {
            nombre: ajuste.alimento.nombre,
            cantidad: ajuste.cantidad_real,
            unidad: ajuste.unidad,
          });
        }
      }
    }

    return {
      selecciones,
      resumen: {
        total_cocciones: selecciones.length,
        total_personas: selecciones.reduce((acc, s) => acc + s.personas, 0),
        recursos: Array.from(recursosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      },
    };
  },
};
