import { prisma } from "../../shared/prisma/client.js";
import type { Residente } from "@prisma/client";

export type CreateResidenteData = {
  email: string;
  residencia_id: number;
  nombre: string;
  apellido: string;
  dni: string;
  edad: number;
  telefono?: string;
  universidad: string;
  carrera: string;
  ciudad_origen: string;
  fecha_ingreso: Date;
};

export type UpdateResidenteData = Partial<Omit<CreateResidenteData, "email" | "residencia_id">>;

export const residentesRepository = {
  findAllByResidencia(residencia_id: number): Promise<Residente[]> {
    return prisma.residente.findMany({
      where: { residencia_id, activo: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
  },

  findById(id: number): Promise<Residente | null> {
    return prisma.residente.findUnique({ where: { id } });
  },

  findByDni(dni: string): Promise<Residente | null> {
    return prisma.residente.findUnique({ where: { dni } });
  },

  async create(data: CreateResidenteData, password_hash: string): Promise<Residente> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password_hash,
          role: "RESIDENTE",
          first_login: true,
          residencia_id: data.residencia_id,
        },
      });

      return tx.residente.create({
        data: {
          user_id: user.id,
          residencia_id: data.residencia_id,
          nombre: data.nombre,
          apellido: data.apellido,
          dni: data.dni,
          edad: data.edad,
          telefono: data.telefono,
          universidad: data.universidad,
          carrera: data.carrera,
          ciudad_origen: data.ciudad_origen,
          fecha_ingreso: data.fecha_ingreso,
        },
      });
    });
  },

  update(id: number, data: UpdateResidenteData): Promise<Residente> {
    return prisma.residente.update({ where: { id }, data });
  },

  softDelete(id: number): Promise<Residente> {
    return prisma.residente.update({
      where: { id },
      data: { activo: false },
    });
  },
};
