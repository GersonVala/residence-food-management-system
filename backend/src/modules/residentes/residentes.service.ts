import bcrypt from "bcrypt";
import { residentesRepository, type CreateResidenteData, type UpdateResidenteData, type ResidenteListado, type ResidenteDetalle } from "./residentes.repository.js";
import { residenciasRepository } from "../residencias/residencias.repository.js";
import type { Residente } from "@prisma/client";

const PASSWORD_DEFAULT = "Fundacion2024";

function notFound(): never {
  throw Object.assign(new Error("Residente no encontrado"), {
    statusCode: 404,
    error: "Not Found",
    mensaje: "Residente no encontrado",
  });
}

function conflict(mensaje: string): never {
  throw Object.assign(new Error(mensaje), {
    statusCode: 409,
    error: "Conflict",
    mensaje,
  });
}

export const residentesService = {
  // T-2.2: List all residentes across all residencias (ADMIN_GLOBAL only)
  async listarTodos(): Promise<ResidenteListado[]> {
    return residentesRepository.findAll();
  },

  async listar(residencia_id: number): Promise<Residente[]> {
    return residentesRepository.findAllByResidencia(residencia_id);
  },

  async obtener(id: number): Promise<ResidenteDetalle> {
    const residente = await residentesRepository.findById(id);
    if (!residente || !residente.activo) notFound();
    return residente;
  },

  async crear(data: CreateResidenteData): Promise<Residente> {
    const residencia = await residenciasRepository.findById(data.residencia_id);
    if (!residencia || !residencia.activo) {
      throw Object.assign(new Error("Residencia no encontrada"), {
        statusCode: 404,
        error: "Not Found",
        mensaje: "Residencia no encontrada",
      });
    }

    const existente = await residentesRepository.findByDni(data.dni);
    if (existente) conflict("Ya existe un residente con ese DNI");

    const password_hash = await bcrypt.hash(PASSWORD_DEFAULT, 10);
    return residentesRepository.create(data, password_hash);
  },

  async actualizar(id: number, data: UpdateResidenteData): Promise<Residente> {
    await residentesService.obtener(id);

    if (data.dni) {
      const existente = await residentesRepository.findByDni(data.dni);
      if (existente && existente.id !== id) conflict("Ya existe un residente con ese DNI");
    }

    // T-2.5 (service): validate target residencia exists when changing
    if (data.residencia_id !== undefined) {
      const residencia = await residenciasRepository.findById(data.residencia_id);
      if (!residencia || !residencia.activo) {
        throw Object.assign(new Error("Residencia no encontrada"), {
          statusCode: 404,
          error: "Not Found",
          mensaje: "Residencia no encontrada",
        });
      }
    }

    return residentesRepository.update(id, data);
  },

  async eliminar(id: number): Promise<void> {
    await residentesService.obtener(id);
    await residentesRepository.softDelete(id);
  },
};
