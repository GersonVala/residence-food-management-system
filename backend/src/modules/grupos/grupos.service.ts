import { gruposRepository } from "./grupos.repository.js";
import { residenciasRepository } from "../residencias/residencias.repository.js";
import { residentesRepository } from "../residentes/residentes.repository.js";
import type { GrupoCocina, GrupoIntegrante } from "@prisma/client";

function notFound(mensaje = "Grupo no encontrado"): never {
  throw Object.assign(new Error(mensaje), {
    statusCode: 404,
    error: "Not Found",
    mensaje,
  });
}

function conflict(mensaje: string): never {
  throw Object.assign(new Error(mensaje), {
    statusCode: 409,
    error: "Conflict",
    mensaje,
  });
}

export const gruposService = {
  async listar(residencia_id: number): Promise<GrupoCocina[]> {
    return gruposRepository.findAllByResidencia(residencia_id);
  },

  async obtener(id: number): Promise<GrupoCocina> {
    const grupo = await gruposRepository.findById(id);
    if (!grupo || !grupo.activo) notFound();
    return grupo;
  },

  async crear(nombre: string, residencia_id: number): Promise<GrupoCocina> {
    const residencia = await residenciasRepository.findById(residencia_id);
    if (!residencia || !residencia.activo) notFound("Residencia no encontrada");
    return gruposRepository.create(nombre, residencia_id);
  },

  async actualizar(id: number, nombre: string): Promise<GrupoCocina> {
    await gruposService.obtener(id);
    return gruposRepository.update(id, nombre);
  },

  async disolver(id: number): Promise<void> {
    await gruposService.obtener(id);
    await gruposRepository.softDelete(id);
  },

  async listarIntegrantes(grupo_id: number): Promise<GrupoIntegrante[]> {
    await gruposService.obtener(grupo_id);
    return gruposRepository.findIntegrantes(grupo_id);
  },

  async agregarIntegrante(grupo_id: number, residente_id: number): Promise<GrupoIntegrante> {
    await gruposService.obtener(grupo_id);

    const residente = await residentesRepository.findById(residente_id);
    if (!residente || !residente.activo) notFound("Residente no encontrado");

    const yaEsMiembro = await gruposRepository.findIntegrante(grupo_id, residente_id);
    if (yaEsMiembro) conflict("El residente ya es integrante activo de este grupo");

    return gruposRepository.agregarIntegrante(grupo_id, residente_id);
  },

  async quitarIntegrante(grupo_id: number, residente_id: number): Promise<void> {
    await gruposService.obtener(grupo_id);

    const integrante = await gruposRepository.findIntegrante(grupo_id, residente_id);
    if (!integrante) notFound("El residente no es integrante activo de este grupo");

    await gruposRepository.quitarIntegrante(integrante.id);
  },
};
