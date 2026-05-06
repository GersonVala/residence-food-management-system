import { prisma } from "../../shared/prisma/client.js";
import type { Residencia } from "@prisma/client";

export type CreateResidenciaData = {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  capacidad_max: number;
  rollback_horas?: number;
};

export type UpdateResidenciaData = Partial<CreateResidenciaData>;

export const residenciasRepository = {
  findAll(): Promise<Residencia[]> {
    return prisma.residencia.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
  },

  findById(id: number): Promise<Residencia | null> {
    return prisma.residencia.findUnique({ where: { id } });
  },

  create(data: CreateResidenciaData): Promise<Residencia> {
    return prisma.residencia.create({ data });
  },

  update(id: number, data: UpdateResidenciaData): Promise<Residencia> {
    return prisma.residencia.update({ where: { id }, data });
  },

  softDelete(id: number): Promise<Residencia> {
    return prisma.residencia.update({
      where: { id },
      data: { activo: false },
    });
  },
};
