import { describe, it, expect } from 'vitest'
import { calcularCantidad, calcularMaxPersonas } from './recetas'

describe('calcularCantidad', () => {
  it('devuelve la cantidad de la receta cuando se cocina para personas_base', () => {
    // 1.5 kg para 10 personas, cocinando para 10
    expect(calcularCantidad(1.5, 10, 10)).toBe(1.5)
  })

  it('escala proporcionalmente a la cantidad de personas', () => {
    expect(calcularCantidad(2, 20, 10)).toBe(4)
    expect(calcularCantidad(2, 5, 10)).toBe(1)
  })

  it('redondea a dos decimales', () => {
    expect(calcularCantidad(1, 1, 3)).toBe(0.33)
  })
})

describe('calcularMaxPersonas', () => {
  it('limita por el ingrediente con menos stock relativo', () => {
    // receta para 10: 2 kg de A (hay 4 → alcanza para 20) y 1 kg de B (hay 1.5 → alcanza para 15)
    const max = calcularMaxPersonas(
      [
        { cantidad_base: 2, disponible: 4 },
        { cantidad_base: 1, disponible: 1.5 },
      ],
      10,
    )
    expect(max).toBe(15)
  })

  it('devuelve 0 si falta un ingrediente por completo', () => {
    expect(calcularMaxPersonas([{ cantidad_base: 2, disponible: 0 }], 10)).toBe(0)
  })

  it('ignora ingredientes sin cantidad y usa el tope de 200 si nada limita', () => {
    expect(calcularMaxPersonas([{ cantidad_base: 0, disponible: 0 }], 10)).toBe(200)
  })
})
