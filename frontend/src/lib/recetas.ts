// cantidad_base es la cantidad de un ingrediente para personas_base comensales.
// Misma fórmula que usa el backend al confirmar una selección (turnos.service.ts).

const TOPE_PERSONAS = 200

export function calcularCantidad(cantidadBase: number, personas: number, personasBase: number): number {
  return Math.round((cantidadBase * personas / personasBase) * 100) / 100
}

export function calcularMaxPersonas(
  ingredientes: { cantidad_base: number; disponible: number }[],
  personasBase: number,
): number {
  let max = TOPE_PERSONAS
  for (const ing of ingredientes) {
    if (ing.cantidad_base <= 0) continue
    const posibles = Math.floor(ing.disponible * personasBase / ing.cantidad_base)
    max = Math.min(max, Math.max(0, posibles))
  }
  return max
}
