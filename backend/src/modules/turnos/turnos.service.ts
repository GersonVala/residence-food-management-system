import { turnosRepository, type CreateTurnoInput } from "./turnos.repository.js";
import { prisma } from "../../shared/prisma/client.js";
import type { Prisma, Unidad } from "@prisma/client";

function notFound(mensaje: string): never {
  throw { statusCode: 404, error: "Not Found", mensaje };
}

function conflict(mensaje: string): never {
  throw { statusCode: 409, error: "Conflict", mensaje };
}

function badRequest(mensaje: string): never {
  throw { statusCode: 400, error: "Bad Request", mensaje };
}

type Tx = Prisma.TransactionClient;

interface ConsumoStock {
  alimento_id: number;
  cantidad_calculada: number;
  cantidad_a_descontar: number;
  unidad: Unidad;
  motivo: string;
}

// Evita residuos de punto flotante (p. ej. 1e-17) al restar cantidades
const redondear = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Descuenta `cantidad` de los lotes activos de un alimento, primero los que vencen antes (FEFO).
 * Descuento parcial: si no alcanza el stock, descuenta lo disponible y devuelve esa cantidad real.
 *
 * Los lotes se bloquean con SELECT ... FOR UPDATE: una transacción concurrente sobre los mismos
 * lotes espera al commit y recién ahí lee las cantidades ya descontadas. Sin el lock, dos
 * confirmaciones leerían el mismo stock y lo consumirían dos veces.
 */
async function descontarFefo(
  tx: Tx,
  p: { alimento_id: number; residencia_id: number; cantidad: number; turno_id: number; motivo: string }
): Promise<number> {
  const lotes = await tx.$queryRaw<{ id: number; cantidad: number }[]>`
    SELECT id, cantidad FROM stock
    WHERE alimento_id = ${p.alimento_id} AND residencia_id = ${p.residencia_id} AND activo = true
    ORDER BY fecha_vencimiento ASC, id ASC
    FOR UPDATE`;

  const disponible = redondear(lotes.reduce((acc, l) => acc + l.cantidad, 0));
  const cantidad_real = redondear(Math.min(disponible, p.cantidad));
  if (cantidad_real <= 0) return 0;

  let restante = cantidad_real;
  for (const lote of lotes) {
    if (restante <= 0) break;
    const descuento = Math.min(lote.cantidad, restante);
    if (descuento <= 0) continue;
    await tx.stock.update({
      where: { id: lote.id },
      data: { cantidad: { decrement: descuento } },
    });
    await tx.movimientoStock.create({
      data: {
        stock_id: lote.id,
        tipo: "SALIDA",
        cantidad: descuento,
        turno_id: p.turno_id,
        motivo: p.motivo,
      },
    });
    restante = redondear(restante - descuento);
  }

  return cantidad_real;
}

export const turnosService = {
  async listar(residencia_id: number) {
    return turnosRepository.findAll(residencia_id);
  },

  async obtener(id: number) {
    const turno = await turnosRepository.findById(id);
    if (!turno || !turno.activo) notFound("Turno no encontrado");
    return turno;
  },

  async crear(data: CreateTurnoInput) {
    const residencia = await prisma.residencia.findUnique({ where: { id: data.residencia_id } });
    if (!residencia || !residencia.activo) notFound("Residencia no encontrada");

    const grupo = await prisma.grupoCocina.findUnique({ where: { id: data.grupo_id } });
    if (!grupo || !grupo.activo) notFound("Grupo no encontrado");
    if (grupo.residencia_id !== data.residencia_id) badRequest("El grupo no pertenece a esta residencia");

    if (data.tipo === "FIJO") {
      if (data.dia_semana === undefined) badRequest("Los turnos fijos requieren dia_semana");
      const existente = await turnosRepository.findFijoConflicto(data.grupo_id, data.dia_semana, data.franja);
      if (existente) conflict("Este grupo ya tiene un turno fijo ese día y franja");
    } else {
      if (!data.fecha) badRequest("Los turnos rotativos requieren una fecha");
      const existente = await turnosRepository.findRotativoConflicto(data.grupo_id, data.fecha, data.franja);
      if (existente) conflict("Ya existe un turno para este grupo en esa fecha y franja");
    }

    return turnosRepository.create(data);
  },

  async cancelar(id: number) {
    const turno = await turnosRepository.findById(id);
    if (!turno || !turno.activo) notFound("Turno no encontrado");
    await turnosRepository.softDelete(id);
  },

  async seleccionarMenu(
    turno_id: number,
    residente_id: number,
    menu_id: number,
    personas: number,
    nota?: string
  ) {
    const turno = await turnosRepository.findById(turno_id);
    if (!turno || !turno.activo) notFound("Turno no encontrado");

    const residente = await prisma.residente.findUnique({ where: { id: residente_id } });
    if (!residente || !residente.activo) notFound("Residente no encontrado");

    const menu = await prisma.menu.findUnique({ where: { id: menu_id } });
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const yaSeleccionado = await turnosRepository.findSeleccionByTurnoResidente(
      turno_id,
      residente_id
    );
    if (yaSeleccionado) conflict("El residente ya tiene una selección para este turno");

    return turnosRepository.createSeleccion({
      turno_id,
      menu_id,
      residente_id,
      personas,
      ...(nota ? { nota } : {}),
    });
  },

  async obtenerSeleccion(seleccion_id: number) {
    return turnosRepository.findSeleccion(seleccion_id);
  },

  async confirmarSeleccion(
    seleccion_id: number,
    ajustes_manuales?: { alimento_id: number; cantidad: number }[]
  ) {
    const seleccion = await turnosRepository.findSeleccion(seleccion_id);
    if (!seleccion) notFound("Selección no encontrada");
    if (seleccion.estado !== "PENDIENTE") {
      badRequest("Solo se puede confirmar una selección en estado PENDIENTE");
    }

    const ingredientes = seleccion.menu.ingredientes;
    const residencia_id = seleccion.turno.residencia_id;

    // El residente puede deshacer hasta rollback_horas DESPUÉS de confirmar
    const residencia = await prisma.residencia.findUnique({ where: { id: residencia_id } });
    const rollback_horas = residencia?.rollback_horas ?? 2;
    const rollback_deadline = new Date(Date.now() + rollback_horas * 60 * 60 * 1000);

    // Consumos a descontar: ingredientes de la receta + extras manuales
    const consumos: ConsumoStock[] = [];
    for (const ing of ingredientes) {
      // cantidad_base es la cantidad de la receta para menu.personas_base comensales
      const cantidad_calculada = (ing.cantidad_base * seleccion.personas) / seleccion.menu.personas_base;

      // Si hay ajuste manual para este ingrediente, usarlo; si no, usar el calculado
      const ajuste = ajustes_manuales?.find(a => a.alimento_id === ing.alimento_id);
      const cantidad_a_descontar = ajuste != null ? ajuste.cantidad : cantidad_calculada;
      if (cantidad_a_descontar <= 0) continue;

      consumos.push({
        alimento_id: ing.alimento_id,
        cantidad_calculada,
        cantidad_a_descontar,
        unidad: ing.unidad,
        motivo: `Cocción selección #${seleccion_id}`,
      });
    }

    if (ajustes_manuales) {
      const ids_receta = new Set(ingredientes.map(i => i.alimento_id));
      const extras = ajustes_manuales.filter(a => !ids_receta.has(a.alimento_id) && a.cantidad > 0);

      for (const extra of extras) {
        const alimento = await prisma.alimento.findUnique({ where: { id: extra.alimento_id } });
        if (!alimento) continue;
        consumos.push({
          alimento_id: extra.alimento_id,
          cantidad_calculada: 0,
          cantidad_a_descontar: extra.cantidad,
          unidad: alimento.unidad_base,
          motivo: `Cocción selección #${seleccion_id} (extra)`,
        });
      }
    }

    // Orden global por alimento: dos confirmaciones concurrentes toman los locks
    // de los lotes en el mismo orden y no pueden bloquearse mutuamente (deadlock)
    consumos.sort((a, b) => a.alimento_id - b.alimento_id);

    return prisma.$transaction(async (tx) => {
      // Transición atómica: solo una confirmación concurrente pasa de PENDIENTE a CONFIRMADO.
      // La otra espera el lock de la fila, ve CONFIRMADO y no actualiza nada.
      const { count } = await tx.seleccionMenu.updateMany({
        where: { id: seleccion_id, estado: "PENDIENTE" },
        data: { estado: "CONFIRMADO", rollback_deadline },
      });
      if (count !== 1) conflict("Esta cocción ya fue confirmada");

      for (const consumo of consumos) {
        const cantidad_real = await descontarFefo(tx, {
          alimento_id: consumo.alimento_id,
          residencia_id,
          cantidad: consumo.cantidad_a_descontar,
          turno_id: seleccion.turno_id,
          motivo: consumo.motivo,
        });

        // Se registra siempre, incluso con 0 si no había stock
        await tx.seleccionAjuste.create({
          data: {
            seleccion_id,
            alimento_id: consumo.alimento_id,
            cantidad_calculada: consumo.cantidad_calculada,
            cantidad_real,
            unidad: consumo.unidad,
          },
        });
      }

      return tx.seleccionMenu.findUniqueOrThrow({
        where: { id: seleccion_id },
        include: {
          ajustes: { include: { alimento: { select: { nombre: true } } } },
        },
      });
    });
  },

  async revertirSeleccion(seleccion_id: number) {
    const seleccion = await turnosRepository.findSeleccion(seleccion_id);
    if (!seleccion) notFound("Selección no encontrada");
    if (seleccion.estado === "REVERTIDO") {
      badRequest("La selección ya fue revertida");
    }

    const ahora = new Date();
    if (
      seleccion.estado === "CONFIRMADO" &&
      seleccion.rollback_deadline &&
      ahora > seleccion.rollback_deadline
    ) {
      badRequest("El plazo para deshacer esta cocción ya venció");
    }

    const motivoCoccion = `Cocción selección #${seleccion_id}`;

    await prisma.$transaction(async (tx) => {
      // Transición atómica desde el estado leído: si otra reversión (o una
      // confirmación) ganó la carrera, el estado cambió y no se toca el stock.
      const { count } = await tx.seleccionMenu.updateMany({
        where: { id: seleccion_id, estado: seleccion.estado },
        data: { estado: "REVERTIDO" },
      });
      if (count !== 1) conflict("La selección cambió de estado, reintentá la operación");

      // Si estaba confirmada, deshacer cada salida de stock en el mismo lote del que salió
      if (seleccion.estado !== "CONFIRMADO") return;

      const salidas = await tx.movimientoStock.findMany({
        where: {
          turno_id: seleccion.turno_id,
          tipo: "SALIDA",
          motivo: { in: [motivoCoccion, `${motivoCoccion} (extra)`] },
        },
      });

      for (const salida of salidas) {
        // Si el lote fue dado de baja, se reactiva: vuelve a tener mercadería
        await tx.stock.update({
          where: { id: salida.stock_id },
          data: { cantidad: { increment: salida.cantidad }, activo: true },
        });

        await tx.movimientoStock.create({
          data: {
            stock_id: salida.stock_id,
            tipo: "ENTRADA",
            cantidad: salida.cantidad,
            turno_id: seleccion.turno_id,
            motivo: `Rollback selección #${seleccion_id}`,
          },
        });
      }
    });

    return prisma.seleccionMenu.findUnique({ where: { id: seleccion_id } });
  },

  async eliminarSeleccion(seleccion_id: number) {
    const seleccion = await turnosRepository.findSeleccion(seleccion_id);
    if (!seleccion) notFound("Selección no encontrada");
    if (seleccion.estado === "CONFIRMADO") {
      badRequest("No se puede eliminar una selección confirmada");
    }
    await turnosRepository.deleteSeleccion(seleccion_id);
  },
};
