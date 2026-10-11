import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import ResidenteHistorialPage from './ResidenteHistorialPage'

const mockGet = vi.mocked(api.get)
const mockPatch = vi.mocked(api.patch)

const AHORA = new Date('2026-07-07T18:00:00')

function seleccion(id: number, nombre: string, estado: 'PENDIENTE' | 'CONFIRMADO' | 'REVERTIDO', rollback_deadline: string | null) {
  return {
    id,
    personas: 4,
    nota: null,
    estado,
    created_at: '2026-07-07T17:00:00.000Z',
    rollback_deadline,
    menu: { id: id * 10, nombre, dificultad: 'FACIL', tiempo_min: 30, imagen_url: null },
    turno: { id: id * 100, tipo: 'FIJO', fecha: null, dia_semana: 2, franja: 'ALMUERZO', grupo: { id: 1, nombre: 'Grupo A' } },
    ajustes: [],
  }
}

// Vence a las 20:00 locales, ya con la hora fija en 18:00 (quedan 2 h)
const venceEn2h = new Date(AHORA.getTime() + 2 * 60 * 60 * 1000).toISOString()
const yaVencio = new Date(AHORA.getTime() - 60 * 1000).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ResidenteHistorialPage — deshacer cocción', () => {
  it('ofrece "Deshacer" solo en confirmadas dentro del plazo', async () => {
    mockGet.mockResolvedValueOnce([
      seleccion(1, 'Milanesas', 'CONFIRMADO', venceEn2h),
      seleccion(2, 'Guiso', 'CONFIRMADO', yaVencio),
      seleccion(3, 'Tarta', 'PENDIENTE', null),
      seleccion(4, 'Pizza', 'REVERTIDO', venceEn2h),
    ])
    render(<ResidenteHistorialPage />)

    expect(await screen.findByText('Milanesas')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /deshacer/i })).toHaveLength(1)
    expect(screen.getByText(/podés deshacer hasta las/i)).toBeInTheDocument()
  })

  it('pide confirmación, llama a revertir y recarga el historial', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirmSpy)
    mockGet
      .mockResolvedValueOnce([seleccion(1, 'Milanesas', 'CONFIRMADO', venceEn2h)])
      .mockResolvedValueOnce([seleccion(1, 'Milanesas', 'REVERTIDO', venceEn2h)])
    mockPatch.mockResolvedValueOnce({})
    render(<ResidenteHistorialPage />)

    await user.click(await screen.findByRole('button', { name: /deshacer/i }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(mockPatch).toHaveBeenCalledWith('/selecciones/1/revertir', {})
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument())
  })

  it('no revierte si el residente cancela la confirmación', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    mockGet.mockResolvedValueOnce([seleccion(1, 'Milanesas', 'CONFIRMADO', venceEn2h)])
    render(<ResidenteHistorialPage />)

    await user.click(await screen.findByRole('button', { name: /deshacer/i }))

    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('muestra el error del servidor si no se pudo deshacer', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    mockGet.mockResolvedValueOnce([seleccion(1, 'Milanesas', 'CONFIRMADO', venceEn2h)])
    mockPatch.mockRejectedValueOnce({ status: 400, mensaje: 'El plazo para deshacer esta cocción ya venció' })
    render(<ResidenteHistorialPage />)

    await user.click(await screen.findByRole('button', { name: /deshacer/i }))

    const alerta = await screen.findByRole('alert')
    expect(within(alerta).getByText(/ya venció/i)).toBeInTheDocument()
  })
})
