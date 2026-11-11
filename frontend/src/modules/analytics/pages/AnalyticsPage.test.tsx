import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/lib/api'
import AnalyticsPage from './AnalyticsPage'

const apiGet = vi.mocked(api.get)

const datos = {
  stats: {
    total_cocciones: 10,
    total_personas_alimentadas: 80,
    total_residencias: 18,
    total_residencias_registradas: 22,
    total_residentes: 300,
  },
  top_menus: [],
  top_ingredientes: [],
  evolucion_semanal: [],
  por_residencia: [],
}

describe('AnalyticsPage — residencias activas', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiGet.mockImplementation((url: string) =>
      Promise.resolve(url.startsWith('/analytics/cocina') ? datos : [])
    )
  })

  it('muestra las residencias activas como un mini gráfico sobre el total registrado', async () => {
    render(<AnalyticsPage />)

    expect(await screen.findByRole('img', { name: '18 de 22 residencias activas' })).toBeInTheDocument()
    expect(screen.getByText('4 dadas de baja')).toBeInTheDocument()
  })
})
