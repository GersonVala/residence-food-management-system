import { menusRepository, type CreateMenuInput, type UpdateMenuInput, type AddIngredienteInput } from "./menus.repository.js";
import { prisma } from "../../shared/prisma/client.js";

function notFound(mensaje: string): never {
  throw { statusCode: 404, error: "Not Found", mensaje };
}

function conflict(mensaje: string): never {
  throw { statusCode: 409, error: "Conflict", mensaje };
}

export const menusService = {
  async listar(residencia_id: number) {
    return menusRepository.findAll(residencia_id);
  },

  async obtener(id: number) {
    const menu = await menusRepository.findById(id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");
    return menu;
  },

  async crear(data: CreateMenuInput) {
    const residencia = await prisma.residencia.findUnique({
      where: { id: data.residencia_id },
    });
    if (!residencia || !residencia.activo) notFound("Residencia no encontrada");
    return menusRepository.create(data);
  },

  async actualizar(id: number, data: UpdateMenuInput) {
    const menu = await menusRepository.findById(id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");
    return menusRepository.update(id, data);
  },

  async eliminar(id: number) {
    const menu = await menusRepository.findById(id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");
    await menusRepository.softDelete(id);
  },

  async agregarIngrediente(menu_id: number, data: AddIngredienteInput) {
    const menu = await menusRepository.findById(menu_id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const alimento = await menusRepository.findAlimento(data.alimento_id);
    if (!alimento) notFound("Alimento no encontrado");

    const existente = await menusRepository.findIngrediente(menu_id, data.alimento_id);
    if (existente) conflict("El alimento ya está en este menú");

    return menusRepository.addIngrediente(menu_id, data);
  },

  async actualizarIngrediente(
    menu_id: number,
    alimento_id: number,
    data: Partial<Omit<AddIngredienteInput, "alimento_id">>
  ) {
    const menu = await menusRepository.findById(menu_id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const existente = await menusRepository.findIngrediente(menu_id, alimento_id);
    if (!existente) notFound("Ingrediente no encontrado en este menú");

    return menusRepository.updateIngrediente(menu_id, alimento_id, data);
  },

  async quitarIngrediente(menu_id: number, alimento_id: number) {
    const menu = await menusRepository.findById(menu_id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const existente = await menusRepository.findIngrediente(menu_id, alimento_id);
    if (!existente) notFound("Ingrediente no encontrado en este menú");

    await menusRepository.removeIngrediente(menu_id, alimento_id);
  },

  async asignarGrupo(menu_id: number, grupo_id: number) {
    const menu = await menusRepository.findById(menu_id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const grupo = await prisma.grupoCocina.findUnique({ where: { id: grupo_id } });
    if (!grupo || !grupo.activo) notFound("Grupo no encontrado");

    const existente = await menusRepository.findMenuGrupo(menu_id, grupo_id);
    if (existente) conflict("El grupo ya tiene asignado este menú");

    return menusRepository.assignGrupo(menu_id, grupo_id);
  },

  async quitarGrupo(menu_id: number, grupo_id: number) {
    const menu = await menusRepository.findById(menu_id);
    if (!menu || !menu.activo) notFound("Menú no encontrado");

    const existente = await menusRepository.findMenuGrupo(menu_id, grupo_id);
    if (!existente) notFound("El grupo no tiene asignado este menú");

    await menusRepository.removeGrupo(menu_id, grupo_id);
  },
};
