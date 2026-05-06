import { prisma } from "../../shared/prisma/client.js";
import type { GrupoCocina, GrupoIntegrante } from "@prisma/client";

export const gruposRepository = {
  findAllByResidencia(residencia_id: number): Promise<GrupoCocina[]> {
    return prisma.grupoCocina.findMany({
      where: { residencia_id, activo: true },
      orderBy: { nombre: "asc" },
    });
  },

  findById(id: number): Promise<GrupoCocina | null> {
    return prisma.grupoCocina.findUnique({ where: { id } });
  },

  create(nombre: string, residencia_id: number): Promise<GrupoCocina> {
    return prisma.grupoCocina.create({ data: { nombre, residencia_id } });
  },

  update(id: number, nombre: string): Promise<GrupoCocina> {
    return prisma.grupoCocina.update({ where: { id }, data: { nombre } });
  },

  softDelete(id: number): Promise<GrupoCocina> {
    return prisma.grupoCocina.update({ where: { id }, data: { activo: false } });
  },

  findIntegrantes(grupo_id: number): Promise<GrupoIntegrante[]> {
    return prisma.grupoIntegrante.findMany({
      where: { grupo_id, fecha_egreso: null },
      orderBy: { fecha_ingreso: "asc" },
    });
  },

  findIntegrante(grupo_id: number, residente_id: number): Promise<GrupoIntegrante | null> {
    return prisma.grupoIntegrante.findFirst({
      where: { grupo_id, residente_id, fecha_egreso: null },
    });
  },

  agregarIntegrante(grupo_id: number, residente_id: number): Promise<GrupoIntegrante> {
    return prisma.grupoIntegrante.create({ data: { grupo_id, residente_id } });
  },

  quitarIntegrante(id: number): Promise<GrupoIntegrante> {
    return prisma.grupoIntegrante.update({
      where: { id },
      data: { fecha_egreso: new Date() },
    });
  },
};
