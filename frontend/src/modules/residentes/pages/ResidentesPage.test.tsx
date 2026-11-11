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

// Completar el formulario entero con userEvent es lento: con toda la suite en paralelo supera los 5 s por defecto
vi.setConfig({ testTimeout: 15_000 })

const apiGet = vi.mocked(api.get)
const apiPost = vi.mocked(api.post)

function tokenDeAdminResidencia(): string {
  const payload = btoa(JSON.stringify({ id: 1, email: 'a@a.com', role: 'ADMIN_RESIDENCIA', residencia_id: 7 }))
  return `header.${payload}.sig`
}

async function completarFormulario(
  user: ReturnType<typeof userEvent.setup>,
  { dni = '12345678', area = '11', numero = '55550000', edad = '22', fecha = '2024-03-01' } = {}
) {
  const form = within(screen.getByRole('dialog'))
  await user.type(form.getByLabelText('Nombre'), 'Juan')
  await user.type(form.getByLabelText('Apellido'), 'Pérez')
  await user.type(form.getByLabelText('Email'), 'juan@test.com')
  await user.type(form.getByLabelText('DNI'), dni)
  await user.type(form.getByLabelText('Edad'), edad)
  await user.type(form.getByLabelText('Código de área'), area)
  await user.type(form.getByLabelText('Número de teléfono'), numero)
  await user.type(form.getByLabelText('Universidad'), 'UBA')
  await user.type(form.getByLabelText('Carrera'), 'Ingeniería')
  await user.type(form.getByLabelText('Ciudad de origen'), 'Córdoba')
  await user.type(form.getByLabelText('Fecha de ingreso'), fecha)
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

  it('envía el teléfono armado con código de área y número', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValueOnce({ id: 99, nombre: 'Juan', password_temporal: '12345678' })
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user)
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(apiPost).toHaveBeenCalledWith(
      '/residencias/7/residentes',
      expect.objectContaining({ telefono: '11 55550000' })
    )
  })

  it('muestra ejemplos en los campos de teléfono', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = within(screen.getByRole('dialog'))

    expect(form.getByLabelText('Código de área')).toHaveAttribute('placeholder', 'Ej: 11')
    expect(form.getByLabelText('Número de teléfono')).toHaveAttribute('placeholder', 'Ej: 12345678')
  })

  it('no crea el residente si el DNI no tiene 8 dígitos', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user, { dni: '1234567' })
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(await screen.findByText(/el dni debe tener 8 dígitos/i)).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('no crea el residente si el teléfono tiene letras o un largo inválido', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user, { area: '11', numero: '123' })
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(await screen.findByText(/el número de teléfono/i)).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
  })

  it.each(['16', '27'])('no crea el residente si la edad está fuera de 17 a 26 años (%s)', async (edad) => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user, { edad })
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(apiPost).not.toHaveBeenCalled()
  })

  it('limita la edad a 17-26 años en el campo', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const edad = within(screen.getByRole('dialog')).getByLabelText('Edad')

    expect(edad).toHaveAttribute('min', '17')
    expect(edad).toHaveAttribute('max', '26')
  })

  it('no crea el residente si la fecha de ingreso es absurda (año 2600)', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const form = await completarFormulario(user, { fecha: '2600-03-01' })
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(apiPost).not.toHaveBeenCalled()
  })

  it('limita la fecha de ingreso a un año desde hoy en el campo', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ResidentesPage /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /nuevo residente/i }))
    const fecha = within(screen.getByRole('dialog')).getByLabelText('Fecha de ingreso')
    const enUnAnio = new Date()
    enUnAnio.setFullYear(enUnAnio.getFullYear() + 1)
    const esperado = `${enUnAnio.getFullYear()}-${String(enUnAnio.getMonth() + 1).padStart(2, '0')}-${String(enUnAnio.getDate()).padStart(2, '0')}`

    expect(fecha).toHaveAttribute('max', esperado)
  })
})
