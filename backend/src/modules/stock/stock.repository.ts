import { prisma } from "../../shared/prisma/client.js";
import type { Unidad, TipoMovimiento } from "@prisma/client";

export type CreateAlimentoInput = {
  nombre: string;
  marca?: string;
  unidad_base: Unidad;
  categoria_id: number;
  calorias?: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
};

export type CreateStockInput = {
  alimento_id: number;
  residencia_id: number;
  cantidad: number;
  unidad: Unidad;
  fecha_vencimiento?: Date;
  stock_minimo?: number;
};

export type CreateMovimientoInput = {
  stock_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  residente_id?: number;
  turno_id?: number;
  motivo?: string;
};

export const stockRepository = {
  // ── Categorías ──────────────────────────────────────────────

  findAllCategorias() {
    return prisma.categoria.findMany({ orderBy: { nombre: "asc" } });
  },

  findCategoriaById(id: number) {
    return prisma.categoria.findUnique({ where: { id } });
  },

  findCategoriaByNombre(nombre: string) {
    return prisma.categoria.findUnique({ where: { nombre } });
  },

  createCategoria(nombre: string) {
    return prisma.categoria.create({ data: { nombre } });
  },

  updateCategoria(id: number, nombre: string) {
    return prisma.categoria.update({ where: { id }, data: { nombre } });
  },

  deleteCategoria(id: number) {
    return prisma.categoria.delete({ where: { id } });
  },

  // ── Alimentos ────────────────────────────────────────────────

  findAllAlimentos() {
    return prisma.alimento.findMany({
      orderBy: { nombre: "asc" },
      include: { categoria: true },
    });
  },

  findAlimentoById(id: number) {
    return prisma.alimento.findUnique({
      where: { id },
      include: { categoria: true },
    });
  },

  createAlimento(data: CreateAlimentoInput) {
    return prisma.alimento.create({ data, include: { categoria: true } });
  },

  updateAlimento(id: number, data: Partial<CreateAlimentoInput>) {
    return prisma.alimento.update({ where: { id }, data, include: { categoria: true } });
  },

  deleteAlimento(id: number) {
    return prisma.alimento.delete({ where: { id } });
  },

  // ── Stock ────────────────────────────────────────────────────

  findAllStock(residencia_id: number) {
    return prisma.stock.findMany({
      where: { residencia_id, activo: true },
      orderBy: { created_at: "desc" },
      include: { alimento: { include: { categoria: true } } },
    });
  },

  findStockById(id: number) {
    return prisma.stock.findUnique({
      where: { id },
      include: { alimento: { include: { categoria: true } } },
    });
  },

  createStock(data: CreateStockInput) {
    return prisma.stock.create({
      data,
      include: { alimento: { include: { categoria: true } } },
    });
  },

  updateStock(id: number, data: Partial<Omit<CreateStockInput, "alimento_id" | "residencia_id">>) {
    return prisma.stock.update({
      where: { id },
      data,
      include: { alimento: { include: { categoria: true } } },
    });
  },

  softDeleteStock(id: number) {
    return prisma.stock.update({ where: { id }, data: { activo: false } });
  },

  // ── Movimientos ──────────────────────────────────────────────

  findMovimientos(stock_id: number) {
    return prisma.movimientoStock.findMany({
      where: { stock_id },
      orderBy: { created_at: "desc" },
    });
  },

  createMovimiento(data: CreateMovimientoInput) {
    return prisma.movimientoStock.create({ data });
  },
};
