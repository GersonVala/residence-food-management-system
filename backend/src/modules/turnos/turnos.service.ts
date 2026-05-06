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
    const residencia = await prisma.residencia.findUnique({
      where: { id: data.residencia_id },
    });
    if (!residencia || !residencia.activo) notFound("Residencia no encontrada");

    const grupo = await prisma.grupoCocina.findUnique({ where: { id: data.grupo_id } });
    if (!grupo || !grupo.activo) notFound("Grupo no encontrado");

    if (grupo.residencia_id !== data.residencia_id) {
      badRequest("El grupo no pertenece a esta residencia");
    }

    const existente = await turnosRepository.findByGrupoFechaFranja(
      data.grupo_id,
      data.fecha,
      data.franja
    );
    if (existente) conflict("Ya existe un turno para este grupo en esa fecha y franja");

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
    personas: number
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
      new Date(turno.fecha).getTime() - rollback_horas * 60 * 60 * 1000
    );

    return turnosRepository.createSeleccion({
      turno_id,
      menu_id,
      residente_id,
      personas,
      rollback_deadline,
    });
  },

  async confirmarSeleccion(seleccion_id: number) {
    const seleccion = await turnosRepository.findSeleccion(seleccion_id);
    if (!seleccion) notFound("Selección no encontrada");
    if (seleccion.estado !== "PENDIENTE") {
      badRequest("Solo se puede confirmar una selección en estado PENDIENTE");
    }

    const ingredientes = seleccion.menu.ingredientes;
    const residencia_id = seleccion.turno.residencia_id;

    // Verificar stock suficiente para todos los ingredientes antes de tocar nada
    for (const ing of ingredientes) {
      const cantidad_necesaria = ing.cantidad_base + ing.cantidad_por_persona * seleccion.personas;
      const stock = await prisma.stock.findFirst({
        where: { alimento_id: ing.alimento_id, residencia_id, activo: true },
      });
      if (!stock || stock.cantidad < cantidad_necesaria) {
        badRequest(
          `Stock insuficiente para el ingrediente con id ${ing.alimento_id}. Disponible: ${stock?.cantidad ?? 0}, requerido: ${cantidad_necesaria}`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      for (const ing of ingredientes) {
        const cantidad_calculada = ing.cantidad_base + ing.cantidad_por_persona * seleccion.personas;

        const stock = await tx.stock.findFirst({
          where: { alimento_id: ing.alimento_id, residencia_id, activo: true },
        });
        if (!stock) badRequest(`Stock no encontrado para el ingrediente ${ing.alimento_id}`);

        await tx.stock.update({
          where: { id: stock.id },
          data: { cantidad: { decrement: cantidad_calculada } },
        });

        await tx.movimientoStock.create({
          data: {
            stock_id: stock.id,
            tipo: "SALIDA",
            cantidad: cantidad_calculada,
            turno_id: seleccion.turno_id,
            motivo: `Confirmación selección #${seleccion_id}`,
          },
        });

        await tx.seleccionAjuste.create({
          data: {
            seleccion_id,
            alimento_id: ing.alimento_id,
            cantidad_calculada,
            cantidad_real: cantidad_calculada,
            unidad: ing.unidad,
          },
        });
      }

      return tx.seleccionMenu.update({
        where: { id: seleccion_id },
        data: { estado: "CONFIRMADO" },
        include: { ajustes: true },
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
