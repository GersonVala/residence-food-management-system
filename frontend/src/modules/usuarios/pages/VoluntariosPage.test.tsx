import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/lib/api'
import VoluntariosPage from './VoluntariosPage'

const apiGet = vi.mocked(api.get)
const apiPost = vi.mocked(api.post)

async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /nuevo usuario/i }))
  return within(screen.getByRole('dialog'))
}

describe('VoluntariosPage — alta de usuario administrativo', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    apiGet.mockResolvedValue([])
  })

  it('envía la contraseña elegida y cierra el modal sin mostrar una contraseña generada', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValueOnce({ id: 5, email: 'vol@test.com', role: 'ADMIN_RESIDENCIA' })
    render(<VoluntariosPage />)

    const form = await abrirFormulario(user)
    await user.type(form.getByLabelText('Email'), 'vol@test.com')
    await user.type(form.getByLabelText('Contraseña inicial'), 'clave-elegida')
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(apiPost).toHaveBeenCalledWith('/usuarios', {
      email: 'vol@test.com',
      password: 'clave-elegida',
      role: 'ADMIN_RESIDENCIA',
    })
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText(/no se vuelve a mostrar/i)).not.toBeInTheDocument()
  })

  it('no envía el formulario si la contraseña es demasiado corta y muestra el error', async () => {
    const user = userEvent.setup()
    render(<VoluntariosPage />)

    const form = await abrirFormulario(user)
    await user.type(form.getByLabelText('Email'), 'vol@test.com')
    await user.type(form.getByLabelText('Contraseña inicial'), '12345')
    await user.click(form.getByRole('button', { name: /^crear$/i }))

    expect(apiPost).not.toHaveBeenCalled()
    expect(form.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument()
  })
})
