import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/modules/auth/auth.utils', () => ({
  getToken: vi.fn(() => 'valid.token.here'),
  decodeToken: vi.fn(),
  removeToken: vi.fn(),
}))

import { decodeToken } from '@/modules/auth/auth.utils'
import { Sidebar } from './Sidebar'

const mockDecodeToken = vi.mocked(decodeToken)

function renderSidebar(role: string) {
  mockDecodeToken.mockReturnValue({ id: 1, email: 'x@test.com', role, residencia_id: role === 'ADMIN_GLOBAL' ? null : 1 })
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  beforeEach(() => mockDecodeToken.mockReset())

  it('no muestra Dashboard al Administrador Global, que entra por Estadísticas', () => {
    renderSidebar('ADMIN_GLOBAL')
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /estadísticas/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /analytics/i })).not.toBeInTheDocument()
  })

  it('muestra Dashboard al Administrador de Residencia', () => {
    renderSidebar('ADMIN_RESIDENCIA')
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })
})
