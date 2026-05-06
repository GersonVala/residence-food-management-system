import { residenciasRepository, type CreateResidenciaData, type UpdateResidenciaData } from "./residencias.repository.js";
import type { Residencia } from "@prisma/client";

function notFound(): never {
  const err = Object.assign(new Error("Residencia no encontrada"), {
    statusCode: 404,
    error: "Not Found",
    mensaje: "Residencia no encontrada",
  });
  throw err;
}

export const residenciasService = {
  async listar(): Promise<Residencia[]> {
    return residenciasRepository.findAll();
  },

  async obtener(id: number): Promise<Residencia> {
    const residencia = await residenciasRepository.findById(id);
    if (!residencia || !residencia.activo) notFound();
    return residencia;
  },

  async crear(data: CreateResidenciaData): Promise<Residencia> {
    return residenciasRepository.create(data);
  },

  async actualizar(id: number, data: UpdateResidenciaData): Promise<Residencia> {
    await residenciasService.obtener(id);
    return residenciasRepository.update(id, data);
  },

  async eliminar(id: number): Promise<void> {
    await residenciasService.obtener(id);
    await residenciasRepository.softDelete(id);
  },
};
