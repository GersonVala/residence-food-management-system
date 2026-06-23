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
  provincia_origen: string;
  fecha_ingreso: Date;
};

export type UpdateResidenteData = Partial<Omit<CreateResidenteData, "email">> & {
  activo?: boolean;
  fecha_retiro?: Date | null;
  motivo_baja?: string | null;
};

export type ResidenteListado = Residente & {
  residencia: Pick<Residencia, "id" | "nombre" | "ciudad">;
  user: { email: string };
};

export type ResidenteDetalle = Residente & {
  residencia: Pick<Residencia, "id" | "nombre" | "ciudad" | "provincia">;
  user: { email: string };
  motivo_baja: string | null;
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

  findAllByResidencia(residencia_id: number, soloActivos = false): Promise<Residente[]> {
    return prisma.residente.findMany({
      where: { residencia_id, ...(soloActivos ? { activo: true } : {}) },
      orderBy: [{ activo: "desc" }, { apellido: "asc" }, { nombre: "asc" }],
    });
  },

  findById(id: number): Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string; puede_cargar_stock: boolean } }) | null> {
    return prisma.residente.findUnique({
      where: { id },
      include: {
        residencia: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        user: { select: { email: true, puede_cargar_stock: true } },
      },
    }) as Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string; puede_cargar_stock: boolean } }) | null>;
  },

  findByDni(dni: string): Promise<Residente | null> {
    return prisma.residente.findUnique({ where: { dni } });
  },

  findByEmail(email: string): Promise<{ id: number } | null> {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  },

  findByUserId(user_id: number): Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string; puede_cargar_stock: boolean } }) | null> {
    return prisma.residente.findFirst({
      where: { user_id, activo: true },
      include: {
        residencia: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        user: { select: { email: true, puede_cargar_stock: true } },
      },
    }) as Promise<(Residente & { residencia: Pick<Residencia, 'id' | 'nombre' | 'ciudad' | 'provincia'>; user: { email: string; puede_cargar_stock: boolean } }) | null>;
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
          provincia_origen: data.provincia_origen,
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
  async softDelete(id: number, motivo_baja: string): Promise<Residente> {
    return prisma.$transaction(async (tx) => {
      const residente = await tx.residente.update({
        where: { id },
        data: { activo: false, fecha_retiro: new Date(), motivo_baja },
      });

      await tx.user.update({
        where: { id: residente.user_id },
        data: { active: false },
      });

      return residente;
    });
  },
};
