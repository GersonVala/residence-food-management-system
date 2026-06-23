import { prisma } from "../../shared/prisma/client.js";
import type { Role } from "@prisma/client";

export type UsuarioAdmin = {
  id: number;
  email: string;
  role: Role;
  active: boolean;
  residencia_id: number | null;
  residencia: { id: number; nombre: string; ciudad: string } | null;
  created_at: Date;
};

const select = {
  id: true,
  email: true,
  role: true,
  active: true,
  residencia_id: true,
  created_at: true,
  residencia: { select: { id: true, nombre: true, ciudad: true } },
};

export const usuariosRepository = {
  async findAll(): Promise<UsuarioAdmin[]> {
    return prisma.user.findMany({
      where: { role: { in: ["ADMIN_GLOBAL", "ADMIN_RESIDENCIA"] } },
      select,
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });
  },

  async findById(id: number): Promise<UsuarioAdmin | null> {
    return prisma.user.findUnique({ where: { id }, select });
  },

  async findByEmail(email: string): Promise<{ id: number } | null> {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  },

  async create(data: {
    email: string;
    password_hash: string;
    role: Role;
    residencia_id?: number | null;
  }): Promise<UsuarioAdmin> {
    return prisma.user.create({
      data: {
        email: data.email,
        password_hash: data.password_hash,
        role: data.role,
        residencia_id: data.residencia_id ?? null,
        first_login: true,
      },
      select,
    });
  },

  async update(
    id: number,
    data: { residencia_id?: number | null; active?: boolean }
  ): Promise<UsuarioAdmin> {
    return prisma.user.update({ where: { id }, data, select });
  },
};
