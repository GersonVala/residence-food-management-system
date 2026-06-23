import bcrypt from "bcrypt";
import { usuariosRepository, type UsuarioAdmin } from "./usuarios.repository.js";
import { residenciasRepository } from "../residencias/residencias.repository.js";
import type { Role } from "@prisma/client";

function notFound(): never {
  throw Object.assign(new Error("Usuario no encontrado"), {
    statusCode: 404,
    error: "Not Found",
    mensaje: "Usuario no encontrado",
  });
}

function conflict(mensaje: string): never {
  throw Object.assign(new Error(mensaje), {
    statusCode: 409,
    error: "Conflict",
    mensaje,
  });
}

function generarPasswordTemporal(): string {
  const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const usuariosService = {
  async listar(): Promise<UsuarioAdmin[]> {
    return usuariosRepository.findAll();
  },

  async obtener(id: number): Promise<UsuarioAdmin> {
    const u = await usuariosRepository.findById(id);
    if (!u) notFound();
    return u;
  },

  async crear(data: {
    email: string;
    role: Role;
    residencia_id?: number | null;
  }): Promise<{ usuario: UsuarioAdmin; password_temporal: string }> {
    const existente = await usuariosRepository.findByEmail(data.email);
    if (existente) conflict("Ya existe un usuario con ese email");

    if (data.residencia_id) {
      const residencia = await residenciasRepository.findById(data.residencia_id);
      if (!residencia || !residencia.activo) {
        throw Object.assign(new Error("Residencia no encontrada"), {
          statusCode: 404,
          error: "Not Found",
          mensaje: "Residencia no encontrada",
        });
      }
    }

    if (data.role === "ADMIN_GLOBAL" && data.residencia_id) {
      throw Object.assign(new Error("ADMIN_GLOBAL no puede tener residencia asignada"), {
        statusCode: 400,
        error: "Bad Request",
        mensaje: "ADMIN_GLOBAL no puede tener residencia asignada",
      });
    }

    const password_temporal = generarPasswordTemporal();
    const password_hash = await bcrypt.hash(password_temporal, 10);

    const usuario = await usuariosRepository.create({
      email: data.email,
      password_hash,
      role: data.role,
      residencia_id: data.residencia_id ?? null,
    });

    return { usuario, password_temporal };
  },

  async actualizar(
    id: number,
    data: { residencia_id?: number | null; active?: boolean }
  ): Promise<UsuarioAdmin> {
    const usuario = await usuariosService.obtener(id);

    if (data.residencia_id && usuario.role === "ADMIN_GLOBAL") {
      throw Object.assign(new Error("ADMIN_GLOBAL no puede tener residencia asignada"), {
        statusCode: 400,
        error: "Bad Request",
        mensaje: "ADMIN_GLOBAL no puede tener residencia asignada",
      });
    }

    if (data.residencia_id) {
      const residencia = await residenciasRepository.findById(data.residencia_id);
      if (!residencia || !residencia.activo) {
        throw Object.assign(new Error("Residencia no encontrada"), {
          statusCode: 404,
          error: "Not Found",
          mensaje: "Residencia no encontrada",
        });
      }
    }

    return usuariosRepository.update(id, data);
  },

  async desactivar(id: number): Promise<void> {
    await usuariosService.obtener(id);
    await usuariosRepository.update(id, { active: false });
  },
};
