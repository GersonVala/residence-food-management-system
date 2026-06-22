import { turnosRepository, type CreateTurnoInput } from "./turnos.repository.js";
import { prisma } from "../../shared/prisma/client.js";

function notFound(mensaje: string): never {
  throw { statusCode: 404, error: "Not Found", mensaje };
}

function conflict(mensaje: string): never {
  throw { statusCode: 409, error: "Conflict", mensaje };
}

function badRequest(mensaje: string): never {
  throw { statusCode: 400, error: "Bad Request", mensaje };
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

    const residencia = await prisma.residencia.findUnique({
      where: { id: turno.residencia_id },
    });

    const rollback_horas = residencia?.rollback_horas ?? 2;
    const rollback_deadline = new Date(
      new Date(turno.fecha!).getTime() - rollback_horas * 60 * 60 * 1000
    );

    return turnosRepository.createSeleccion({
      turno_id,
      menu_id,
      residente_id,
      personas,
      rollback_deadline,
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

    return prisma.$transaction(async (tx) => {
      for (const ing of ingredientes) {
        const cantidad_calculada = ing.cantidad_base + ing.cantidad_por_persona * seleccion.personas;

        // Si hay ajuste manual para este ingrediente, usarlo; si no, usar el calculado
        const ajuste = ajustes_manuales?.find(a => a.alimento_id === ing.alimento_id);
        const cantidad_a_descontar = ajuste != null ? ajuste.cantidad : cantidad_calculada;

        if (cantidad_a_descontar <= 0) continue;

        // Sumar stock disponible a través de todos los lotes activos
        const lotes = await tx.stock.findMany({
          where: { alimento_id: ing.alimento_id, residencia_id, activo: true },
          orderBy: { fecha_vencimiento: "asc" }, // primero los que vencen antes
        });

        const disponible = lotes.reduce((acc, l) => acc + l.cantidad, 0);
        const cantidad_real = Math.min(disponible, cantidad_a_descontar);

        if (cantidad_real <= 0) {
          // No hay stock — registrar ajuste con 0 sin tocar stock
          await tx.seleccionAjuste.create({
            data: {
              seleccion_id,
              alimento_id: ing.alimento_id,
              cantidad_calculada,
              cantidad_real: 0,
              unidad: ing.unidad,
            },
          });
          continue;
        }

        // Descontar de lotes en orden (primero el que vence antes)
        let restante = cantidad_real;
        for (const lote of lotes) {
          if (restante <= 0) break;
          const descuento = Math.min(lote.cantidad, restante);
          await tx.stock.update({
            where: { id: lote.id },
            data: { cantidad: { decrement: descuento } },
          });
          await tx.movimientoStock.create({
            data: {
              stock_id: lote.id,
              tipo: "SALIDA",
              cantidad: descuento,
              turno_id: seleccion.turno_id,
              motivo: `Cocción selección #${seleccion_id}`,
            },
          });
          restante -= descuento;
        }

        await tx.seleccionAjuste.create({
          data: {
            seleccion_id,
            alimento_id: ing.alimento_id,
            cantidad_calculada,
            cantidad_real,
            unidad: ing.unidad,
          },
        });
      }

      // Procesar ingredientes extra (no están en la receta original)
      if (ajustes_manuales) {
        const ids_receta = new Set(ingredientes.map(i => i.alimento_id));
        const extras = ajustes_manuales.filter(a => !ids_receta.has(a.alimento_id) && a.cantidad > 0);

        for (const extra of extras) {
          const alimento = await prisma.alimento.findUnique({ where: { id: extra.alimento_id } });
          if (!alimento) continue;

          const lotes = await tx.stock.findMany({
            where: { alimento_id: extra.alimento_id, residencia_id, activo: true },
            orderBy: { fecha_vencimiento: "asc" },
          });
          const disponible = lotes.reduce((acc, l) => acc + l.cantidad, 0);
          const cantidad_real = Math.min(disponible, extra.cantidad);

          let restante = cantidad_real;
          for (const lote of lotes) {
            if (restante <= 0) break;
            const descuento = Math.min(lote.cantidad, restante);
            await tx.stock.update({
              where: { id: lote.id },
              data: { cantidad: { decrement: descuento } },
            });
            await tx.movimientoStock.create({
              data: {
                stock_id: lote.id,
                tipo: "SALIDA",
                cantidad: descuento,
                turno_id: seleccion.turno_id,
                motivo: `Cocción selección #${seleccion_id} (extra)`,
              },
            });
            restante -= descuento;
          }

          await tx.seleccionAjuste.create({
            data: {
              seleccion_id,
              alimento_id: extra.alimento_id,
              cantidad_calculada: 0,
              cantidad_real,
              unidad: alimento.unidad_base,
            },
          });
        }
      }

      return tx.seleccionMenu.update({
        where: { id: seleccion_id },
        data: { estado: "CONFIRMADO" },
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
    if (seleccion.estado === "CONFIRMADO" && ahora > seleccion.rollback_deadline) {
      badRequest("El plazo de rollback ya venció");
    }

    // Si estaba confirmada, devolver el stock descontado
    if (seleccion.estado === "CONFIRMADO") {
      const residencia_id = seleccion.turno.residencia_id;
      const ajustes = await prisma.seleccionAjuste.findMany({ where: { seleccion_id } });

      await prisma.$transaction(async (tx) => {
        for (const ajuste of ajustes) {
          const stock = await tx.stock.findFirst({
            where: { alimento_id: ajuste.alimento_id, residencia_id, activo: true },
          });
          if (!stock) return;

          await tx.stock.update({
            where: { id: stock.id },
            data: { cantidad: { increment: ajuste.cantidad_real } },
          });

          await tx.movimientoStock.create({
            data: {
              stock_id: stock.id,
              tipo: "ENTRADA",
              cantidad: ajuste.cantidad_real,
              turno_id: seleccion.turno_id,
              motivo: `Rollback selección #${seleccion_id}`,
            },
          });
        }

        await tx.seleccionMenu.update({
          where: { id: seleccion_id },
          data: { estado: "REVERTIDO" },
        });
      });

      return prisma.seleccionMenu.findUnique({ where: { id: seleccion_id } });
    }

    return turnosRepository.updateSeleccionEstado(seleccion_id, "REVERTIDO");
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
