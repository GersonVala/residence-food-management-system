import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/modules/auth/auth.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/auth/auth.utils')>()
  return { ...actual, irACambioPassword: vi.fn() }
})

import { api } from './api'
import { irACambioPassword } from '@/modules/auth/auth.utils'

function respuesta(status: number, body: unknown): Response {
  return { ok: status < 400, status, json: async () => body } as Response
}

describe('api — cambio de contraseña obligatorio', () => {
  beforeEach(() => {
    vi.mocked(irACambioPassword).mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirige a /change-password cuando el backend responde 403 CAMBIO_PASSWORD_REQUERIDO', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respuesta(403, { error: 'CAMBIO_PASSWORD_REQUERIDO', mensaje: 'Tenés que cambiar tu contraseña' })
    )

    await expect(api.get('/residencias')).rejects.toMatchObject({ status: 403 })
    expect(irACambioPassword).toHaveBeenCalledTimes(1)
  })

  it('no redirige ante otros 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respuesta(403, { error: 'Acceso prohibido', mensaje: 'No tenés acceso' })
    )

    await expect(api.get('/residencias')).rejects.toMatchObject({ status: 403 })
    expect(irACambioPassword).not.toHaveBeenCalled()
  })
})
