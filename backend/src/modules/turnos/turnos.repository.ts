import { prisma } from "../../shared/prisma/client.js";
import type { Franja, TipoTurno } from "@prisma/client";

export type CreateTurnoInput = {
  grupo_id: number;
  residencia_id: number;
  tipo: TipoTurno;
  franja: Franja;
  dia_semana?: number;  // FIJO
  fecha?: Date;         // ROTATIVO
};

export type CreateSeleccionInput = {
  turno_id: number;
  menu_id: number;
  residente_id: number;
  personas: number;
  rollback_deadline: Date;
  nota?: string;
};

export const turnosRepository = {
  findAll(residencia_id: number) {
    return prisma.turnoCocina.findMany({
      where: { residencia_id, activo: true },
      orderBy: [{ tipo: "asc" }, { dia_semana: "asc" }, { fecha: "asc" }, { franja: "asc" }],
      include: {
        grupo: true,
        selecciones: {
          include: {
            menu: { include: { ingredientes: { include: { alimento: true } } } },
            residente: true,
          },
        },
      },
    });
  },

  findById(id: number) {
    return prisma.turnoCocina.findUnique({
      where: { id },
      include: {
        grupo: true,
        selecciones: { include: { menu: true, residente: true } },
      },
    });
  },

  findFijoConflicto(grupo_id: number, dia_semana: number, franja: Franja) {
    return prisma.turnoCocina.findFirst({
      where: { grupo_id, dia_semana, franja, tipo: "FIJO", activo: true },
    });
  },

  findRotativoConflicto(grupo_id: number, fecha: Date, franja: Franja) {
    return prisma.turnoCocina.findFirst({
      where: { grupo_id, fecha, franja, tipo: "ROTATIVO", activo: true },
    });
  },

  create(data: CreateTurnoInput) {
    return prisma.turnoCocina.create({
      data,
      include: { grupo: true },
    });
  },

  softDelete(id: number) {
    return prisma.turnoCocina.update({ where: { id }, data: { activo: false } });
  },

  findSeleccion(id: number) {
    return prisma.seleccionMenu.findUnique({
      where: { id },
      include: { menu: { include: { ingredientes: true } }, turno: true },
    });
  },

  findSeleccionByTurnoResidente(turno_id: number, residente_id: number) {
    return prisma.seleccionMenu.findFirst({
      where: { turno_id, residente_id },
    });
  },

  createSeleccion(data: CreateSeleccionInput) {
    return prisma.seleccionMenu.create({ data });
  },

  updateSeleccionEstado(id: number, estado: "PENDIENTE" | "CONFIRMADO" | "REVERTIDO") {
    return prisma.seleccionMenu.update({ where: { id }, data: { estado } });
  },

  deleteSeleccion(id: number) {
    return prisma.seleccionMenu.delete({ where: { id } });
  },
};
