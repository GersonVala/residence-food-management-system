import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordTemporal } from './password-temporal'

describe('PasswordTemporal', () => {
  it('muestra la contraseña y el aviso de que no se vuelve a mostrar', () => {
    render(<PasswordTemporal password="Abc123xyz9" onClose={vi.fn()} />)

    expect(screen.getByText('Abc123xyz9')).toBeInTheDocument()
    expect(screen.getByText(/no se vuelve a mostrar/i)).toBeInTheDocument()
    expect(screen.getByText(/anotala y entregásela/i)).toBeInTheDocument()
  })

  it('copia la contraseña al portapapeles', async () => {
    const user = userEvent.setup()
    // userEvent.setup() instala su propio stub de navigator.clipboard
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<PasswordTemporal password="Abc123xyz9" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /copiar contraseña/i }))

    expect(writeText).toHaveBeenCalledWith('Abc123xyz9')
    expect(await screen.findByRole('button', { name: /contraseña copiada/i })).toBeInTheDocument()
  })

  it('llama a onClose al tocar "Listo"', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PasswordTemporal password="Abc123xyz9" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /listo/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
