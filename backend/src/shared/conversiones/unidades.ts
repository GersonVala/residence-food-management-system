/**
 * Conversiones entre unidades del sistema.
 * Todas las conversiones son a la unidad base (KG para masa, LITROS para volumen).
 * Las unidades no convertibles (UNIDADES, PAQUETES) solo aceptan conversiones
 * entre la misma unidad.
 */

export type Unidad = "KG" | "GR" | "LITROS" | "ML" | "UNIDADES" | "PAQUETES";

/** Factores de conversión a la unidad base de cada grupo */
const FACTORES_A_BASE: Record<string, number> = {
  // Masa (base: KG)
  KG: 1,
  GR: 0.001,

  // Volumen (base: LITROS)
  LITROS: 1,
  ML: 0.001,

  // Discretas (base: ellas mismas, factor 1)
  UNIDADES: 1,
  PAQUETES: 1,
};

/** Grupos de unidades compatibles entre sí */
const GRUPOS_COMPATIBLES: Record<string, Unidad[]> = {
  masa: ["KG", "GR"],
  volumen: ["LITROS", "ML"],
  discreta_unidades: ["UNIDADES"],
  discreta_paquetes: ["PAQUETES"],
};

function getGrupo(unidad: Unidad): string | null {
  for (const [grupo, unidades] of Object.entries(GRUPOS_COMPATIBLES)) {
    if (unidades.includes(unidad)) return grupo;
  }
  return null;
}

/**
 * Convierte una cantidad de una unidad a otra.
 * Lanza un error si las unidades no son compatibles.
 *
 * @example
 * convertir(500, "GR", "KG") // 0.5
 * convertir(1.5, "LITROS", "ML") // 1500
 */
export function convertir(
  cantidad: number,
  desde: Unidad,
  hasta: Unidad
): number {
  if (desde === hasta) return cantidad;

  const grupoDesde = getGrupo(desde);
  const grupoHasta = getGrupo(hasta);

  if (grupoDesde === null || grupoHasta === null) {
    throw new Error(`Unidad desconocida: ${desde} o ${hasta}`);
  }

  if (grupoDesde !== grupoHasta) {
    throw new Error(
      `No se puede convertir entre unidades incompatibles: ${desde} → ${hasta}`
    );
  }

  // Convertir a base y luego a la unidad destino
  const enBase = cantidad * FACTORES_A_BASE[desde];
  const enDestino = enBase / FACTORES_A_BASE[hasta];

  // Redondear a 6 decimales para evitar floating point drift
  return Math.round(enDestino * 1_000_000) / 1_000_000;
}

/**
 * Verifica si dos unidades son compatibles (pertenecen al mismo grupo).
 */
export function sonCompatibles(a: Unidad, b: Unidad): boolean {
  if (a === b) return true;
  const grupoA = getGrupo(a);
  const grupoB = getGrupo(b);
  return grupoA !== null && grupoA === grupoB;
}

/**
 * Normaliza una cantidad a la unidad base del grupo.
 * Útil para comparar cantidades de diferentes unidades.
 *
 * @example
 * normalizarABase(500, "GR") // { cantidad: 0.5, unidad: "KG" }
 */
export function normalizarABase(
  cantidad: number,
  unidad: Unidad
): { cantidad: number; unidad: Unidad } {
  const grupo = getGrupo(unidad);

  if (grupo === null) {
    throw new Error(`Unidad desconocida: ${unidad}`);
  }

  const base = GRUPOS_COMPATIBLES[grupo][0];
  return {
    cantidad: convertir(cantidad, unidad, base),
    unidad: base,
  };
}
