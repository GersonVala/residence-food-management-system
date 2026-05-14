import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/modules/auth/auth.utils', () => ({
  getToken: vi.fn(),
  decodeToken: vi.fn(),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { getToken, decodeToken } from '@/modules/auth/auth.utils'
import { RequireRole } from './RequireRole'

const mockGetToken = vi.mocked(getToken)
const mockDecodeToken = vi.mocked(decodeToken)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RequireRole roles={['ADMIN_GLOBAL']} />}>
          <Route path="/residencias" element={<div>Contenido protegido</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RequireRole', () => {
  beforeEach(() => {
    mockGetToken.mockReset()
    mockDecodeToken.mockReset()
  })

  it('renderiza los children cuando el rol coincide', () => {
    mockGetToken.mockReturnValue('valid.token.here')
    mockDecodeToken.mockReturnValue({
      id: 1,
      email: 'admin@test.com',
      role: 'ADMIN_GLOBAL',
      residencia_id: null,
    })

    renderWithRouter('/residencias')

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('redirige a /dashboard cuando el rol no coincide', () => {
    mockGetToken.mockReturnValue('valid.token.here')
    mockDecodeToken.mockReturnValue({
      id: 2,
      email: 'voluntario@test.com',
      role: 'ADMIN_RESIDENCIA',
      residencia_id: 1,
    })

    renderWithRouter('/residencias')

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirige a /login cuando no hay token', () => {
    mockGetToken.mockReturnValue(null)

    renderWithRouter('/residencias')

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('redirige a /login cuando el token no se puede decodificar', () => {
    mockGetToken.mockReturnValue('token.invalido')
    mockDecodeToken.mockReturnValue(null)

    renderWithRouter('/residencias')

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('usa redirectTo personalizado cuando se provee', () => {
    render(
      <MemoryRouter initialEntries={['/residencias']}>
        <Routes>
          <Route element={<RequireRole roles={['ADMIN_GLOBAL']} redirectTo="/dashboard" />}>
            <Route path="/residencias" element={<div>Protegido</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard personalizado</div>} />
        </Routes>
      </MemoryRouter>
    )

    // no token → goes to /login (default), but since no /login route here → nothing
    // let's test with wrong role
    mockGetToken.mockReturnValue('t.o.k')
    mockDecodeToken.mockReturnValue({
      id: 3, email: 'r@r.com', role: 'RESIDENTE', residencia_id: 1,
    })

    render(
      <MemoryRouter initialEntries={['/residencias']}>
        <Routes>
          <Route element={<RequireRole roles={['ADMIN_GLOBAL']} redirectTo="/dashboard" />}>
            <Route path="/residencias" element={<div>Protegido</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard personalizado</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard personalizado')).toBeInTheDocument()
  })
})
