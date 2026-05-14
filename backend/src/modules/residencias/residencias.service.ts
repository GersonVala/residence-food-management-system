import {
  residenciasRepository,
  type CreateResidenciaData,
  type UpdateResidenciaData,
  type ResidenciaConRelaciones,
} from "./residencias.repository.js";
import type { Residencia, ResidenciaFoto } from "@prisma/client";
import { saveUpload, unlinkSafe } from "../uploads/uploads.helper.js";
import type { MultipartFile } from "@fastify/multipart";

// ============================================================
// Errores
// ============================================================

function notFound(entidad = "Residencia"): never {
  const err = Object.assign(new Error(`${entidad} no encontrada`), {
    statusCode: 404,
    error: "Not Found",
    mensaje: `${entidad} no encontrada`,
  });
  throw err;
}

// ============================================================
// Service
// ============================================================

export const residenciasService = {
  async listar(): Promise<Residencia[]> {
    return residenciasRepository.findAll();
  },

  async obtener(id: number): Promise<Residencia> {
    const residencia = await residenciasRepository.findById(id);
    if (!residencia || !residencia.activo) notFound();
    return residencia;
  },

  async obtenerConRelaciones(id: number): Promise<ResidenciaConRelaciones> {
    const residencia = await residenciasRepository.findByIdWithRelations(id);
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
    const residencia = await residenciasService.obtenerConRelaciones(id);

    // Cleanup de archivos en disco antes del soft-delete
    if (residencia.imagen_url) {
      await unlinkSafe(residencia.imagen_url);
    }
    for (const foto of residencia.fotos) {
      await unlinkSafe(foto.url);
    }

    // Eliminar registros ResidenciaFoto de la DB explícitamente: el soft-delete
    // no dispara onDelete:Cascade (el registro Residencia nunca se hard-deletes).
    await residenciasRepository.deleteFotosByResidencia(id);

    await residenciasRepository.softDelete(id);
  },

  // ---- Imagen principal ----

  async subirImagen(id: number, file: MultipartFile): Promise<Residencia> {
    const residencia = await residenciasService.obtener(id);

    const url = await saveUpload({ file, subfolder: "residencias" });

    // Si había imagen previa, limpiar disco (best-effort)
    if (residencia.imagen_url) {
      await unlinkSafe(residencia.imagen_url);
    }

    return residenciasRepository.setImagenUrl(id, url);
  },

  // ---- Galería ----

  async agregarFoto(id: number, file: MultipartFile): Promise<ResidenciaFoto> {
    await residenciasService.obtener(id);

    const url = await saveUpload({ file, subfolder: "residencias" });

    // Calcular siguiente orden
    const fotos = await residenciasRepository.findFotosByResidencia(id);
    const maxOrden = fotos.length > 0 ? Math.max(...fotos.map((f) => f.orden)) : -1;

    return residenciasRepository.addFoto(id, url, maxOrden + 1);
  },

  async eliminarFoto(id: number, fotoId: number): Promise<void> {
    // Verificar que la residencia existe
    await residenciasService.obtener(id);

    const foto = await residenciasRepository.findFoto(fotoId);
    if (!foto || foto.residencia_id !== id) notFound("Foto");

    // Limpiar disco antes de borrar registro (best-effort)
    await unlinkSafe(foto.url);
    await residenciasRepository.removeFoto(fotoId);
  },

  async listarFotos(id: number): Promise<ResidenciaFoto[]> {
    await residenciasService.obtener(id);
    return residenciasRepository.findFotosByResidencia(id);
  },

  async reordenarFotos(
    id: number,
    items: { id: number; orden: number }[]
  ): Promise<ResidenciaFoto[]> {
    await residenciasService.obtener(id);
    return residenciasRepository.reorderFotos(items);
  },
};
