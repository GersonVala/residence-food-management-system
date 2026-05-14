import { prisma } from "../../shared/prisma/client.js";
import type { Residencia, ResidenciaFoto } from "@prisma/client";

// ============================================================
// Tipos
// ============================================================

export type CreateResidenciaData = {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  capacidad_max: number;
  rollback_horas?: number;
};

export type UpdateResidenciaData = Partial<CreateResidenciaData & { imagen_url: string | null }>;

type ResidenteBasico = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  edad: number;
  universidad: string;
  carrera: string;
  activo: boolean;
  fecha_ingreso: Date;
};

export type ResidenciaConRelaciones = Residencia & {
  fotos: ResidenciaFoto[];
  residentes: ResidenteBasico[];
  historicos: ResidenteBasico[];
  voluntarios: Array<{
    id: number;
    email: string;
    role: string;
    residencia_id: number | null;
    active: boolean;
    residente: { nombre: string; apellido: string } | null;
  }>;
};

// ============================================================
// Repository
// ============================================================

export const residenciasRepository = {
  findAll() {
    return prisma.residencia.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { residentes: { where: { activo: true } } },
        },
      },
    });
  },

  findById(id: number): Promise<Residencia | null> {
    return prisma.residencia.findUnique({ where: { id } });
  },

  async findByIdWithRelations(id: number): Promise<ResidenciaConRelaciones | null> {
    const residencia = await prisma.residencia.findUnique({
      where: { id },
      include: {
        fotos: {
          orderBy: [{ orden: "asc" }, { created_at: "asc" }],
        },
        residentes: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            edad: true,
            universidad: true,
            carrera: true,
            activo: true,
            fecha_ingreso: true,
          },
          orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
        },
        users: {
          where: { role: "ADMIN_RESIDENCIA", active: true },
          select: {
            id: true,
            email: true,
            role: true,
            residencia_id: true,
            active: true,
            residente: {
              select: { nombre: true, apellido: true },
            },
          },
        },
      },
    });

    if (!residencia) return null;

    const { users, residentes, ...rest } = residencia;
    return {
      ...rest,
      residentes: residentes.filter((r) => r.activo),
      historicos: residentes.filter((r) => !r.activo),
      voluntarios: users,
    } as ResidenciaConRelaciones;
  },

  create(data: CreateResidenciaData): Promise<Residencia> {
    return prisma.residencia.create({ data });
  },

  update(id: number, data: UpdateResidenciaData): Promise<Residencia> {
    return prisma.residencia.update({ where: { id }, data });
  },

  setImagenUrl(id: number, imagen_url: string | null): Promise<Residencia> {
    return prisma.residencia.update({ where: { id }, data: { imagen_url } });
  },

  softDelete(id: number): Promise<Residencia> {
    return prisma.residencia.update({
      where: { id },
      data: { activo: false },
    });
  },

  // ---- Fotos ----

  addFoto(residencia_id: number, url: string, orden: number = 0): Promise<ResidenciaFoto> {
    return prisma.residenciaFoto.create({
      data: { residencia_id, url, orden },
    });
  },

  removeFoto(fotoId: number): Promise<ResidenciaFoto> {
    return prisma.residenciaFoto.delete({ where: { id: fotoId } });
  },

  findFoto(fotoId: number): Promise<ResidenciaFoto | null> {
    return prisma.residenciaFoto.findUnique({ where: { id: fotoId } });
  },

  deleteFotosByResidencia(residencia_id: number): Promise<{ count: number }> {
    return prisma.residenciaFoto.deleteMany({ where: { residencia_id } });
  },

  findFotosByResidencia(residencia_id: number): Promise<ResidenciaFoto[]> {
    return prisma.residenciaFoto.findMany({
      where: { residencia_id },
      orderBy: [{ orden: "asc" }, { created_at: "asc" }],
    });
  },

  async reorderFotos(items: { id: number; orden: number }[]): Promise<ResidenciaFoto[]> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.residenciaFoto.update({
          where: { id: item.id },
          data: { orden: item.orden },
        })
      )
    );
    // Retornar las fotos actualizadas (IDs del batch)
    const ids = items.map((i) => i.id);
    return prisma.residenciaFoto.findMany({
      where: { id: { in: ids } },
      orderBy: [{ orden: "asc" }, { created_at: "asc" }],
    });
  },
};
