import { prisma } from "../../shared/prisma/client.js";
import type { Franja } from "@prisma/client";

export type CreateTurnoInput = {
  grupo_id: number;
  residencia_id: number;
  fecha: Date;
  franja: Franja;
};

export type CreateSeleccionInput = {
  turno_id: number;
  menu_id: number;
  residente_id: number;
  personas: number;
  rollback_deadline: Date;
};

export const turnosRepository = {
  findAll(residencia_id: number) {
    return prisma.turnoCocina.findMany({
      where: { residencia_id, activo: true },
      orderBy: [{ fecha: "asc" }, { franja: "asc" }],
      include: {
        grupo: true,
        selecciones: { include: { menu: true, residente: true } },
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

  findByGrupoFechaFranja(grupo_id: number, fecha: Date, franja: Franja) {
    return prisma.turnoCocina.findUnique({
      where: { grupo_id_fecha_franja: { grupo_id, fecha, franja } },
    });
  },

  create(data: CreateTurnoInput) {
    return prisma.turnoCocina.create({
      data,
      include: { grupo: true, selecciones: true },
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
