import { prisma } from "../../shared/prisma/client.js";
import type { Residente, Residencia } from "@prisma/client";

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

// T-1.1: residencia_id is now allowed in updates so ADMIN_GLOBAL can reassign residentes
export type UpdateResidenteData = Partial<Omit<CreateResidenteData, "email">>;

export type ResidenteListado = Residente & {
  residencia: Pick<Residencia, "id" | "nombre" | "ciudad">;
  user: { email: string };
};

export type ResidenteDetalle = Residente & {
  residencia: Pick<Residencia, "id" | "nombre" | "ciudad" | "provincia">;
  user: { email: string };
};

export const residentesRepository = {
  // T-2.1: List all active residentes across all residencias (ADMIN_GLOBAL only)
  findAll(): Promise<ResidenteListado[]> {
    return prisma.residente.findMany({
      where: { activo: true },
      include: {
        residencia: { select: { id: true, nombre: true, ciudad: true } },
        user: { select: { email: true } },
      },
      orderBy: [
        { residencia: { nombre: "asc" } },
        { apellido: "asc" },
        { nombre: "asc" },
      ],
    }) as Promise<ResidenteListado[]>;
  },

  findAllByResidencia(residencia_id: number): Promise<Residente[]> {
    return prisma.residente.findMany({
      where: { residencia_id, activo: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
  },

  findById(id: number): Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string } }) | null> {
    return prisma.residente.findUnique({
      where: { id },
      include: {
        residencia: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        user: { select: { email: true } },
      },
    }) as Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string } }) | null>;
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

  // T-2.4: Wrap update in a transaction to mirror residencia_id to User when provided
  async update(id: number, data: UpdateResidenteData): Promise<Residente> {
    return prisma.$transaction(async (tx) => {
      const residente = await tx.residente.update({
        where: { id },
        data,
      });

      if (data.residencia_id !== undefined) {
        await tx.user.update({
          where: { id: residente.user_id },
          data: { residencia_id: data.residencia_id },
        });
      }

      return residente;
    });
  },

  // T-2.5: Atomic soft delete — sets both Residente.activo and User.active to false
  async softDelete(id: number): Promise<Residente> {
    return prisma.$transaction(async (tx) => {
      const residente = await tx.residente.update({
        where: { id },
        data: { activo: false },
      });

      await tx.user.update({
        where: { id: residente.user_id },
        data: { active: false },
      });

      return residente;
    });
  },
};
