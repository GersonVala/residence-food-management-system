import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/modules/auth/auth.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/auth/auth.utils')>()
  return { ...actual, isAuthenticated: vi.fn(() => false) }
})

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { api } from '@/lib/api'
import { isAuthenticated } from '@/modules/auth/auth.utils'
import LoginPage from './LoginPage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiPost = vi.mocked(api.post)
const isAuthMock = vi.mocked(isAuthenticated)

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage — rendering', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    apiPost.mockReset()
    isAuthMock.mockReturnValue(false)
  })

  it('renders email field, password field, and submit button', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
  })

  it('redirects to /dashboard when already authenticated', () => {
    isAuthMock.mockReturnValue(true)
    renderLogin()
    expect(screen.queryByRole('button', { name: /ingresar/i })).not.toBeInTheDocument()
  })
})

describe('LoginPage — submit behavior', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    apiPost.mockReset()
    isAuthMock.mockReturnValue(false)
  })

  it('navigates to /dashboard when primer_login is false', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValueOnce({ token: 'header.payload.sig', primer_login: false, usuario: { id: 1, email: 'u@u.com', role: 'ADMIN_GLOBAL', residencia_id: null } })

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('navigates to /change-password when primer_login is true', async () => {
    const user = userEvent.setup()
    apiPost.mockResolvedValueOnce({ token: 'header.payload.sig', primer_login: true, usuario: { id: 1, email: 'u@u.com', role: 'ADMIN_GLOBAL', residencia_id: null } })

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(navigateMock).toHaveBeenCalledWith('/change-password', { replace: true })
  })

  it('displays error message on API failure', async () => {
    const user = userEvent.setup()
    apiPost.mockRejectedValueOnce({ mensaje: 'Credenciales inválidas' })

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingresar/i })).not.toBeDisabled()
  })

  it('disables the submit button while the request is in-flight', async () => {
    const user = userEvent.setup()

    let resolveLogin!: (v: unknown) => void
    apiPost.mockReturnValueOnce(new Promise(res => { resolveLogin = res }))

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled()

    resolveLogin({ token: 'header.payload.sig', primer_login: false, usuario: { id: 1, email: 'u@u.com', role: 'ADMIN_GLOBAL', residencia_id: null } })
  })
})
