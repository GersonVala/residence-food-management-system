import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { api } from '@/lib/api'
import ResidenciasPage from './ResidenciasPage'

const mockGet = vi.mocked(api.get)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const residenciaEjemplo = {
  id: 42,
  nombre: 'Casa Norte',
  ciudad: 'Rosario',
  provincia: 'Santa Fe',
  capacidad_max: 10,
  rollback_horas: 2,
  activo: true,
  imagen_url: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/residencias']}>
      <Routes>
        <Route path="/residencias" element={<ResidenciasPage />} />
        <Route path="/residencias/:id" element={<div>Detalle residencia</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResidenciasPage', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('muestra el botón "Nueva residencia"', async () => {
    mockGet.mockResolvedValueOnce([])
    renderPage()
    expect(await screen.findByRole('button', { name: /nueva residencia/i })).toBeInTheDocument()
  })

  it('muestra las cards de residencias cuando la API devuelve datos', async () => {
    mockGet.mockResolvedValueOnce([residenciaEjemplo])
    renderPage()
    expect(await screen.findByText('Casa Norte')).toBeInTheDocument()
  })

  it('cada card tiene un botón "Ver detalle"', async () => {
    mockGet.mockResolvedValueOnce([residenciaEjemplo])
    renderPage()
    expect(await screen.findByRole('button', { name: /ver detalle/i })).toBeInTheDocument()
  })

  it('navega a /residencias/:id al hacer clic en "Ver detalle"', async () => {
    mockGet.mockResolvedValueOnce([residenciaEjemplo])
    const user = userEvent.setup()
    renderPage()

    const btn = await screen.findByRole('button', { name: /ver detalle/i })
    await user.click(btn)

    expect(screen.getByText('Detalle residencia')).toBeInTheDocument()
  })

  it('cada card tiene un botón "Editar"', async () => {
    mockGet.mockResolvedValueOnce([residenciaEjemplo])
    renderPage()
    expect(await screen.findByRole('button', { name: /editar residencia/i })).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay residencias', async () => {
    mockGet.mockResolvedValueOnce([])
    renderPage()
    expect(await screen.findByText(/sin residencias/i)).toBeInTheDocument()
  })
})
