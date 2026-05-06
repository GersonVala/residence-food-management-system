import { stockRepository, type CreateAlimentoInput, type CreateStockInput, type CreateMovimientoInput } from "./stock.repository.js";
import { prisma } from "../../shared/prisma/client.js";

function notFound(mensaje: string): never {
  throw { statusCode: 404, error: "Not Found", mensaje };
}

function conflict(mensaje: string): never {
  throw { statusCode: 409, error: "Conflict", mensaje };
}

function badRequest(mensaje: string): never {
  throw { statusCode: 400, error: "Bad Request", mensaje };
}

export const stockService = {
  // ── Categorías ──────────────────────────────────────────────

  async listarCategorias() {
    return stockRepository.findAllCategorias();
  },

  async crearCategoria(nombre: string) {
    const existente = await stockRepository.findCategoriaByNombre(nombre);
    if (existente) conflict("Ya existe una categoría con ese nombre");
    return stockRepository.createCategoria(nombre);
  },

  async actualizarCategoria(id: number, nombre: string) {
    const cat = await stockRepository.findCategoriaById(id);
    if (!cat) notFound("Categoría no encontrada");

    const existente = await stockRepository.findCategoriaByNombre(nombre);
    if (existente && existente.id !== id) conflict("Ya existe una categoría con ese nombre");

    return stockRepository.updateCategoria(id, nombre);
  },

  async eliminarCategoria(id: number) {
    const cat = await stockRepository.findCategoriaById(id);
    if (!cat) notFound("Categoría no encontrada");

    const conAlimentos = await prisma.alimento.count({ where: { categoria_id: id } });
    if (conAlimentos > 0) badRequest("No se puede eliminar una categoría con alimentos asociados");

    await stockRepository.deleteCategoria(id);
  },

  // ── Alimentos ────────────────────────────────────────────────

  async listarAlimentos() {
    return stockRepository.findAllAlimentos();
  },

  async obtenerAlimento(id: number) {
    const alimento = await stockRepository.findAlimentoById(id);
    if (!alimento) notFound("Alimento no encontrado");
    return alimento;
  },

  async crearAlimento(data: CreateAlimentoInput) {
    const cat = await stockRepository.findCategoriaById(data.categoria_id);
    if (!cat) notFound("Categoría no encontrada");
    return stockRepository.createAlimento(data);
  },

  async actualizarAlimento(id: number, data: Partial<CreateAlimentoInput>) {
    const alimento = await stockRepository.findAlimentoById(id);
    if (!alimento) notFound("Alimento no encontrado");

    if (data.categoria_id) {
      const cat = await stockRepository.findCategoriaById(data.categoria_id);
      if (!cat) notFound("Categoría no encontrada");
    }

    return stockRepository.updateAlimento(id, data);
  },

  async eliminarAlimento(id: number) {
    const alimento = await stockRepository.findAlimentoById(id);
    if (!alimento) notFound("Alimento no encontrado");

    const enUso = await prisma.stock.count({ where: { alimento_id: id, activo: true } });
    if (enUso > 0) badRequest("No se puede eliminar un alimento con stock activo");

    await stockRepository.deleteAlimento(id);
  },

  // ── Stock ────────────────────────────────────────────────────

  async listarStock(residencia_id: number) {
    return stockRepository.findAllStock(residencia_id);
  },

  async obtenerStock(id: number) {
    const stock = await stockRepository.findStockById(id);
    if (!stock || !stock.activo) notFound("Stock no encontrado");
    return stock;
  },

  async crearStock(data: CreateStockInput) {
    const residencia = await prisma.residencia.findUnique({ where: { id: data.residencia_id } });
    if (!residencia || !residencia.activo) notFound("Residencia no encontrada");

    const alimento = await stockRepository.findAlimentoById(data.alimento_id);
    if (!alimento) notFound("Alimento no encontrado");

    return stockRepository.createStock(data);
  },

  async actualizarStock(id: number, data: Partial<Omit<CreateStockInput, "alimento_id" | "residencia_id">>) {
    const stock = await stockRepository.findStockById(id);
    if (!stock || !stock.activo) notFound("Stock no encontrado");
    return stockRepository.updateStock(id, data);
  },

  async eliminarStock(id: number) {
    const stock = await stockRepository.findStockById(id);
    if (!stock || !stock.activo) notFound("Stock no encontrado");
    await stockRepository.softDeleteStock(id);
  },

  // ── Movimientos ──────────────────────────────────────────────

  async listarMovimientos(stock_id: number) {
    const stock = await stockRepository.findStockById(stock_id);
    if (!stock) notFound("Stock no encontrado");
    return stockRepository.findMovimientos(stock_id);
  },

  async registrarMovimiento(data: CreateMovimientoInput) {
    const stock = await stockRepository.findStockById(data.stock_id);
    if (!stock || !stock.activo) notFound("Stock no encontrado");

    if (data.tipo === "SALIDA" && stock.cantidad < data.cantidad) {
      badRequest("Stock insuficiente para registrar la salida");
    }

    const delta = data.tipo === "ENTRADA" ? data.cantidad : data.tipo === "SALIDA" ? -data.cantidad : 0;
    const nuevaCantidad = stock.cantidad + delta;

    await stockRepository.updateStock(data.stock_id, { cantidad: nuevaCantidad });
    return stockRepository.createMovimiento(data);
  },
};
