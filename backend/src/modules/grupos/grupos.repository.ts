import { prisma } from "../../shared/prisma/client.js";
import type { GrupoCocina, GrupoIntegrante } from "@prisma/client";

export const gruposRepository = {
  findAllByResidencia(residencia_id: number) {
    return prisma.grupoCocina.findMany({
      where: { residencia_id, activo: true },
      include: {
        _count: { select: { integrantes: { where: { fecha_egreso: null } } } },
      },
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

  findIntegrantes(grupo_id: number) {
    return prisma.grupoIntegrante.findMany({
      where: { grupo_id, fecha_egreso: null },
      include: {
        residente: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { fecha_ingreso: "asc" },
    });
  },

  findIntegrante(grupo_id: number, residente_id: number): Promise<GrupoIntegrante | null> {
    return prisma.grupoIntegrante.findFirst({
      where: { grupo_id, residente_id, fecha_egreso: null },
    });
  },

  findIntegranteEnCualquierGrupo(residente_id: number): Promise<(GrupoIntegrante & { grupo: { id: number; nombre: string } }) | null> {
    return prisma.grupoIntegrante.findFirst({
      where: { residente_id, fecha_egreso: null, grupo: { activo: true } },
      include: { grupo: { select: { id: true, nombre: true } } },
    }) as Promise<(GrupoIntegrante & { grupo: { id: number; nombre: string } }) | null>;
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

  findMenus(grupo_id: number) {
    return prisma.menuGrupo.findMany({
      where: { grupo_id },
      include: { menu: { select: { id: true, nombre: true, dificultad: true, tiempo_min: true, activo: true } } },
      orderBy: { menu: { nombre: 'asc' } },
    });
  },

  findMenuGrupo(grupo_id: number, menu_id: number) {
    return prisma.menuGrupo.findUnique({ where: { menu_id_grupo_id: { menu_id, grupo_id } } });
  },

  agregarMenu(grupo_id: number, menu_id: number) {
    return prisma.menuGrupo.create({ data: { grupo_id, menu_id } });
  },

  quitarMenu(grupo_id: number, menu_id: number) {
    return prisma.menuGrupo.delete({ where: { menu_id_grupo_id: { menu_id, grupo_id } } });
  },
};
