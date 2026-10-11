import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }))

vi.mock('@/modules/auth/auth.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/auth/auth.utils')>()
  return { ...actual, isAuthenticated: vi.fn() }
})

import { isAuthenticated } from '@/modules/auth/auth.utils'
import ChangePasswordPage from './ChangePasswordPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/change-password']}>
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ChangePasswordPage', () => {
  it('manda al login si no hay sesión', () => {
    vi.mocked(isAuthenticated).mockReturnValue(false)
    renderPage()
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
  })

  it('muestra el formulario con sesión activa', () => {
    vi.mocked(isAuthenticated).mockReturnValue(true)
    renderPage()
    expect(screen.getByRole('heading', { name: /cambiar contraseña/i })).toBeInTheDocument()
  })
})
