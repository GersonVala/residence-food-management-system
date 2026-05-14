import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getResidenciaDetalle: vi.fn(),
    uploadImagenPrincipal: vi.fn(),
    addFoto: vi.fn(),
    deleteFoto: vi.fn(),
    reorderFotos: vi.fn(),
    api: {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      upload: vi.fn(),
    },
  }
})

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { getResidenciaDetalle } from '@/lib/api'
import ResidenciaDetailPage from './ResidenciaDetailPage'

const mockGetResidenciaDetalle = vi.mocked(getResidenciaDetalle)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const residenciaBase = {
  id: 1,
  nombre: 'Casa Central',
  ciudad: 'Buenos Aires',
  provincia: 'Buenos Aires',
  capacidad_max: 20,
  rollback_horas: 2,
  activo: true,
  imagen_url: null,
  fotos: [],
  residentes: [],
  historicos: [],
  voluntarios: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/residencias/${id}`]}>
      <Routes>
        <Route path="/residencias/:id" element={<ResidenciaDetailPage />} />
        <Route path="/residencias" element={<div>Lista residencias</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// Espera a que el nombre aparezca en el h1 del header
async function waitForHeader() {
  return screen.findByRole('heading', { name: 'Casa Central' })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResidenciaDetailPage — carga inicial', () => {
  beforeEach(() => {
    mockGetResidenciaDetalle.mockReset()
  })

  it('muestra loading mientras carga', () => {
    mockGetResidenciaDetalle.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('muestra el nombre de la residencia cuando carga exitosamente', async () => {
    mockGetResidenciaDetalle.mockResolvedValueOnce(residenciaBase)
    renderPage()
    expect(await waitForHeader()).toBeInTheDocument()
  })

  it('muestra error cuando el servidor devuelve 404', async () => {
    mockGetResidenciaDetalle.mockRejectedValueOnce({ status: 404 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Residencia no encontrada.')).toBeInTheDocument()
    })
  })
})

describe('ResidenciaDetailPage — tabs', () => {
  beforeEach(() => {
    mockGetResidenciaDetalle.mockReset()
    mockGetResidenciaDetalle.mockResolvedValue(residenciaBase)
  })

  it('muestra el tab Información por defecto', async () => {
    renderPage()
    await waitForHeader()
    expect(screen.getByRole('tab', { name: 'Información' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renderiza los 8 tabs', async () => {
    renderPage()
    await waitForHeader()
    const tabNames = ['Información', 'Residentes', 'Voluntarios', 'Grupos', 'Turnos', 'Menús', 'Stock', 'Galería']
    for (const name of tabNames) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
    }
  })

  it('cambia al tab Residentes al hacer clic', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitForHeader()

    await user.click(screen.getByRole('tab', { name: 'Residentes' }))

    expect(screen.getByText('Esta residencia no tiene residentes.')).toBeInTheDocument()
  })

  it('cambia al tab Voluntarios al hacer clic', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitForHeader()

    await user.click(screen.getByRole('tab', { name: 'Voluntarios' }))

    expect(screen.getByText('Esta residencia no tiene voluntarios asignados.')).toBeInTheDocument()
  })

  it('cambia al tab Galería al hacer clic', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitForHeader()

    await user.click(screen.getByRole('tab', { name: 'Galería' }))

    expect(screen.getByText('No hay fotos en la galería.')).toBeInTheDocument()
  })
})

describe('ResidenciaDetailPage — tab Residentes con datos', () => {
  it('muestra tabla con nombre, DNI, universidad y carrera', async () => {
    mockGetResidenciaDetalle.mockResolvedValueOnce({
      ...residenciaBase,
      residentes: [
        { id: 10, nombre: 'María', apellido: 'García', dni: '12345678', universidad: 'UBA', carrera: 'Medicina', activo: true, fecha_ingreso: '2024-01-01' },
        { id: 11, nombre: 'Juan', apellido: 'Pérez', dni: '87654321', universidad: null, carrera: null, activo: true, fecha_ingreso: '2024-01-01' },
      ],
    })
    const user = userEvent.setup()
    renderPage()
    await waitForHeader()

    await user.click(screen.getByRole('tab', { name: 'Residentes' }))

    expect(screen.getByText('María García')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
    expect(screen.getByText('UBA')).toBeInTheDocument()
    expect(screen.getByText('Medicina')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('ResidenciaDetailPage — tab Voluntarios con datos', () => {
  it('muestra lista de voluntarios con email', async () => {
    mockGetResidenciaDetalle.mockResolvedValueOnce({
      ...residenciaBase,
      voluntarios: [
        { id: 20, email: 'laura@test.com', role: 'ADMIN_RESIDENCIA', active: true, residente: { nombre: 'Laura', apellido: 'Soto' } },
      ],
    })
    const user = userEvent.setup()
    renderPage()
    await waitForHeader()

    await user.click(screen.getByRole('tab', { name: 'Voluntarios' }))

    expect(screen.getByText('laura@test.com')).toBeInTheDocument()
  })
})
