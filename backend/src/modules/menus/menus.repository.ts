import { prisma } from "../../shared/prisma/client.js";
import type { Dificultad, Unidad } from "@prisma/client";

export type CreateMenuInput = {
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  video_url?: string;
  dificultad: Dificultad;
  tiempo_min: number;
  personas_base: number;
  residencia_id: number;
};

export type UpdateMenuInput = Partial<Omit<CreateMenuInput, "residencia_id">>;

export type AddIngredienteInput = {
  alimento_id: number;
  cantidad_base: number;
  cantidad_por_persona: number;
  unidad: Unidad;
};

export const menusRepository = {
  findAll(residencia_id: number) {
    return prisma.menu.findMany({
      where: { residencia_id, activo: true },
      orderBy: { nombre: "asc" },
      include: {
        ingredientes: { include: { alimento: true } },
        grupos: { include: { grupo: true } },
      },
    });
  },

  findById(id: number) {
    return prisma.menu.findUnique({
      where: { id },
      include: {
        ingredientes: { include: { alimento: true } },
        grupos: { include: { grupo: true } },
      },
    });
  },

  create(data: CreateMenuInput) {
    return prisma.menu.create({ data });
  },

  update(id: number, data: UpdateMenuInput) {
    return prisma.menu.update({ where: { id }, data });
  },

  softDelete(id: number) {
    return prisma.menu.update({ where: { id }, data: { activo: false } });
  },

  findIngrediente(menu_id: number, alimento_id: number) {
    return prisma.menuIngrediente.findUnique({
      where: { menu_id_alimento_id: { menu_id, alimento_id } },
    });
  },

  addIngrediente(menu_id: number, data: AddIngredienteInput) {
    return prisma.menuIngrediente.create({ data: { menu_id, ...data } });
  },

  updateIngrediente(
    menu_id: number,
    alimento_id: number,
    data: Partial<Omit<AddIngredienteInput, "alimento_id">>
  ) {
    return prisma.menuIngrediente.update({
      where: { menu_id_alimento_id: { menu_id, alimento_id } },
      data,
    });
  },

  removeIngrediente(menu_id: number, alimento_id: number) {
    return prisma.menuIngrediente.delete({
      where: { menu_id_alimento_id: { menu_id, alimento_id } },
    });
  },

  findMenuGrupo(menu_id: number, grupo_id: number) {
    return prisma.menuGrupo.findUnique({
      where: { menu_id_grupo_id: { menu_id, grupo_id } },
    });
  },

  assignGrupo(menu_id: number, grupo_id: number) {
    return prisma.menuGrupo.create({ data: { menu_id, grupo_id } });
  },

  removeGrupo(menu_id: number, grupo_id: number) {
    return prisma.menuGrupo.delete({
      where: { menu_id_grupo_id: { menu_id, grupo_id } },
    });
  },

  findAlimento(id: number) {
    return prisma.alimento.findUnique({ where: { id } });
  },
};
