import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma/client.js";

/**
 * Devuelve la residencia a la que pertenece el recurso pedido:
 * - number    → id de la residencia dueña del recurso
 * - null      → recurso compartido entre residencias (menú de biblioteca)
 * - undefined → el recurso no existe; se deja que el handler responda 404
 */
type ResolverResidencia = (request: FastifyRequest) => Promise<number | null | undefined>;

/**
 * Verifica que el recurso pertenezca a la residencia del usuario autenticado.
 * ADMIN_GLOBAL no tiene restricción. Debe ir después de authMiddleware.
 */
export function requireMismaResidencia(
  resolver: ResolverResidencia,
  { permitirCompartido = true }: { permitirCompartido?: boolean } = {}
) {
  return async function residenciaScopeMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const usuario = request.usuario;
    if (!usuario) {
      reply.status(401).send({ error: "No autorizado", mensaje: "Autenticación requerida" });
      return;
    }
    if (usuario.role === "ADMIN_GLOBAL") return;

    const residenciaId = await resolver(request);
    if (residenciaId === undefined) return;
    if (residenciaId === null ? !permitirCompartido : residenciaId !== usuario.residencia_id) {
      reply.status(403).send({ error: "Acceso prohibido", mensaje: "No tenés acceso a recursos de otra residencia" });
    }
  };
}

function idDe(fuente: unknown, campo: string): number | undefined {
  const valor = Number((fuente as Record<string, unknown> | undefined)?.[campo]);
  return Number.isInteger(valor) && valor > 0 ? valor : undefined;
}

const desdeParam = (campo: string) => (request: FastifyRequest) => idDe(request.params, campo);
const desdeBody = (campo: string) => (request: FastifyRequest) => idDe(request.body, campo);

type ObtenerId = (request: FastifyRequest) => number | undefined;

function buscar(obtenerId: ObtenerId, consulta: (id: number) => Promise<number | null | undefined>): ResolverResidencia {
  return async (request) => {
    const id = obtenerId(request);
    return id === undefined ? undefined : consulta(id);
  };
}

const residenciaDeResidente = (id: number) =>
  prisma.residente.findUnique({ where: { id }, select: { residencia_id: true } }).then((r) => r?.residencia_id);
const residenciaDeGrupo = (id: number) =>
  prisma.grupoCocina.findUnique({ where: { id }, select: { residencia_id: true } }).then((g) => g?.residencia_id);
const residenciaDeMenu = (id: number) =>
  prisma.menu.findUnique({ where: { id }, select: { residencia_id: true } }).then((m) => (m ? m.residencia_id : undefined));
const residenciaDeStock = (id: number) =>
  prisma.stock.findUnique({ where: { id }, select: { residencia_id: true } }).then((s) => s?.residencia_id);
const residenciaDeTurno = (id: number) =>
  prisma.turnoCocina.findUnique({ where: { id }, select: { residencia_id: true } }).then((t) => t?.residencia_id);
const residenciaDeSeleccion = (id: number) =>
  prisma.seleccionMenu
    .findUnique({ where: { id }, select: { turno: { select: { residencia_id: true } } } })
    .then((s) => s?.turno.residencia_id);

/** Resolvers listos para usar en las rutas. */
export const residenciaDe = {
  param: (campo = "residencia_id"): ResolverResidencia => async (request) => desdeParam(campo)(request),
  body: (campo = "residencia_id"): ResolverResidencia => async (request) => desdeBody(campo)(request),
  residente: (campo = "id") => buscar(desdeParam(campo), residenciaDeResidente),
  residenteEnBody: (campo = "residente_id") => buscar(desdeBody(campo), residenciaDeResidente),
  grupo: (campo = "id") => buscar(desdeParam(campo), residenciaDeGrupo),
  grupoEnBody: (campo = "grupo_id") => buscar(desdeBody(campo), residenciaDeGrupo),
  menu: (campo = "id") => buscar(desdeParam(campo), residenciaDeMenu),
  menuEnBody: (campo = "menu_id") => buscar(desdeBody(campo), residenciaDeMenu),
  stock: (campo = "id") => buscar(desdeParam(campo), residenciaDeStock),
  turno: (campo = "id") => buscar(desdeParam(campo), residenciaDeTurno),
  seleccion: (campo = "id") => buscar(desdeParam(campo), residenciaDeSeleccion),
};
