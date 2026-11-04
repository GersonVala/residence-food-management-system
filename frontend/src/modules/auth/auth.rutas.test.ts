import { describe, it, expect } from 'vitest'
import { rutaInicio } from './auth.rutas'

describe('rutaInicio', () => {
  it('lleva al Administrador Global a Analytics', () => {
    expect(rutaInicio('ADMIN_GLOBAL')).toBe('/analytics')
  })

  it('lleva al Administrador de Residencia a su dashboard', () => {
    expect(rutaInicio('ADMIN_RESIDENCIA')).toBe('/dashboard')
  })

  it('lleva al Residente a su residencia', () => {
    expect(rutaInicio('RESIDENTE')).toBe('/mi-residencia')
  })
})
