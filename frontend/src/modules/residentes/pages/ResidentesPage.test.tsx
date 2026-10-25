import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/lib/api'
import { setToken } from '@/modules/auth/auth.utils'
import ResidentesPage from './ResidentesPage'

const apiGet = vi.mocked(api.get)
const apiPost = vi.mocked(api.post)

function tokenDeAdminResidencia(): string {
  const payload = btoa(JSON.stringify({ id: 1, email: 'a@a.com', role: 'ADMIN_RESIDENCIA', residencia_id: 7 }))
  return `header.${payload}.sig`
}

async function completarFormulario(user: ReturnType<typeof userEvent.setup>) {
  const form = within(screen.getByRole('dialog'))
  await user.type(form.getByLabelText('Nombre'), 'Juan')
  await user.type(form.getByLabelText('Apellido'), 'Pérez')
  await user.type(form.getByLabelText('Email'), 'juan@test.com')
  await user.type(form.getByLabelText('DNI'), '12345678')
  await user.type(form.getByLabelText('Edad'), '22')
  await user.type(form.getByLabelText('Teléfono'), '1155550000')
  await user.type(form.getByLabelText('Universidad'), 'UBA')
  await user.type(form.getByLabelText('Carrera'), 'Ingeniería')
  await user.type(form.getByLabelText('Ciudad de origen'), 'Córdoba')
  await user.type(form.getByLabelText('Fecha de ingreso'), '2024-03-01')
  await user.selectOptions(form.getByLabelText('Provincia de origen'), 'Córdoba')
  return form
}

describe('ResidentesPage — alta de residente', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    apiGet.mockResolvedValue([])
    setToken(tokenDeAdminResidencia())
  })

  it('muestra la contraseña inicial (el DNI) una sola vez tras crear el residente', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValueOnce({ id: 99, nombre: 'Juan', password_temporal: '12345678' })
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user)
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(await screen.findByText('12345678')).toBeInTheDocument()
    expect(screen.getByText(/es su dni/i)).toBeInTheDocument()
    expect(screen.getByText(/no se vuelve a mostrar/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /listo/i }))
    expect(screen.queryByText('12345678')).not.toBeInTheDocument()
  })
})
