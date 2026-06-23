import { prisma } from "../../shared/prisma/client.js";
import { Prisma } from "@prisma/client";

interface FiltroStats {
  residencia_id?: number;
  desde?: Date;
  hasta?: Date;
}

export const analyticsService = {
  async getCocinaStats({ residencia_id, desde, hasta }: FiltroStats) {
    const seleccionWhere: Prisma.SeleccionMenuWhereInput = {
      estado: "CONFIRMADO",
      ...(desde || hasta
        ? {
            created_at: {
              ...(desde && { gte: desde }),
              ...(hasta && { lte: hasta }),
            },
          }
        : {}),
      ...(residencia_id ? { turno: { residencia_id } } : {}),
    };

    // ── 1. Stats globales ──────────────────────────────────────────
    const [totalCocciones, totalResidencias, totalResidentes, personasResult] =
      await Promise.all([
        prisma.seleccionMenu.count({ where: seleccionWhere }),
        prisma.residencia.count({ where: { activo: true } }),
        prisma.residente.count({ where: { activo: true } }),
        prisma.seleccionMenu.aggregate({
          _sum: { personas: true },
          where: seleccionWhere,
        }),
      ]);

    // ── 2. Top menús más preparados ───────────────────────────────
    const seleccionesPorMenu = await prisma.seleccionMenu.groupBy({
      by: ["menu_id"],
      _count: { id: true },
      _sum: { personas: true },
      where: seleccionWhere,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const menuIds = seleccionesPorMenu.map((s) => s.menu_id);
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
      select: { id: true, nombre: true, dificultad: true },
    });
    const menuMap = new Map(menus.map((m) => [m.id, m]));

    const topMenus = seleccionesPorMenu.map((s) => ({
      menu_id: s.menu_id,
      nombre: menuMap.get(s.menu_id)?.nombre ?? "Desconocido",
      dificultad: menuMap.get(s.menu_id)?.dificultad ?? null,
      cocciones: s._count.id,
      personas_total: s._sum.personas ?? 0,
    }));

    // ── 3. Ingredientes más consumidos ────────────────────────────
    // Usa MovimientoStock SALIDA con turno_id (cocciones), agrupado por alimento
    const movimientoWhere: Prisma.MovimientoStockWhereInput = {
      tipo: "SALIDA",
      turno_id: { not: null },
      ...(desde || hasta
        ? {
            created_at: {
              ...(desde && { gte: desde }),
              ...(hasta && { lte: hasta }),
            },
          }
        : {}),
      ...(residencia_id ? { stock: { residencia_id } } : {}),
    };

    const movimientos = await prisma.movimientoStock.findMany({
      where: movimientoWhere,
      include: {
        stock: {
          select: {
            unidad: true,
            alimento: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    // Acumular por alimento_id (mismo alimento puede tener distintos lotes/unidades)
    const acumIngredientes = new Map<
      number,
      { nombre: string; unidad: string; total: number }
    >();
    for (const m of movimientos) {
      const id = m.stock.alimento.id;
      const prev = acumIngredientes.get(id) ?? {
        nombre: m.stock.alimento.nombre,
        unidad: m.stock.unidad,
        total: 0,
      };
      prev.total += m.cantidad;
      acumIngredientes.set(id, prev);
    }

    const topIngredientes = [...acumIngredientes.entries()]
      .map(([alimento_id, v]) => ({ alimento_id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── 4. Evolución semanal (últimas 12 semanas) ─────────────────
    const doceSemanasAtras = new Date();
    doceSemanasAtras.setDate(doceSemanasAtras.getDate() - 84);

    const seleccionesRecientes = await prisma.seleccionMenu.findMany({
      where: {
        ...seleccionWhere,
        created_at: {
          gte: desde && desde > doceSemanasAtras ? desde : doceSemanasAtras,
          ...(hasta && { lte: hasta }),
        },
      },
      select: { created_at: true, personas: true },
    });

    // Agrupar por semana (lunes de la semana)
    const semanaMap = new Map<string, { cocciones: number; personas: number }>();
    for (const s of seleccionesRecientes) {
      const d = new Date(s.created_at);
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // ISO Monday
      const key = lunes.toISOString().slice(0, 10);
      const prev = semanaMap.get(key) ?? { cocciones: 0, personas: 0 };
      prev.cocciones += 1;
      prev.personas += s.personas;
      semanaMap.set(key, prev);
    }

    const evolucion = [...semanaMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, v]) => ({ semana, ...v }));

    // ── 5. Distribución por residencia ───────────────────────────
    const residencias = await prisma.residencia.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
    });

    const seleccionesPorResidencia = await prisma.seleccionMenu.groupBy({
      by: ["turno_id"],
      _count: { id: true },
      _sum: { personas: true },
      where: seleccionWhere,
    });

    // Necesitamos el residencia_id de cada turno
    const turnoIds = seleccionesPorResidencia.map((s) => s.turno_id);
    const turnos = await prisma.turnoCocina.findMany({
      where: { id: { in: turnoIds } },
      select: { id: true, residencia_id: true },
    });
    const turnoResidenciaMap = new Map(turnos.map((t) => [t.id, t.residencia_id]));

    const residenciaAcum = new Map<number, { cocciones: number; personas: number }>();
    for (const s of seleccionesPorResidencia) {
      const rid = turnoResidenciaMap.get(s.turno_id);
      if (!rid) continue;
      const prev = residenciaAcum.get(rid) ?? { cocciones: 0, personas: 0 };
      prev.cocciones += s._count.id;
      prev.personas += s._sum.personas ?? 0;
      residenciaAcum.set(rid, prev);
    }

    const porResidencia = residencias.map((r) => ({
      residencia_id: r.id,
      nombre: r.nombre,
      cocciones: residenciaAcum.get(r.id)?.cocciones ?? 0,
      personas: residenciaAcum.get(r.id)?.personas ?? 0,
    }));

    return {
      stats: {
        total_cocciones: totalCocciones,
        total_personas_alimentadas: personasResult._sum.personas ?? 0,
        total_residencias: totalResidencias,
        total_residentes: totalResidentes,
      },
      top_menus: topMenus,
      top_ingredientes: topIngredientes,
      evolucion_semanal: evolucion,
      por_residencia: porResidencia,
    };
  },

  async getResidenciasResumen() {
    return prisma.residencia.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, ciudad: true, provincia: true },
      orderBy: { nombre: "asc" },
    });
  },
};
