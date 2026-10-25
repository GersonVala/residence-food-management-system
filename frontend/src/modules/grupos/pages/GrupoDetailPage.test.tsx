import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/lib/api'
import { setToken } from '@/modules/auth/auth.utils'
import GrupoDetailPage from './GrupoDetailPage'

const apiGet = vi.mocked(api.get)
const apiPost = vi.mocked(api.post)

const GRUPO_ID = 5

function tokenDeAdminResidencia(): string {
  const payload = btoa(JSON.stringify({ id: 1, email: 'a@a.com', role: 'ADMIN_RESIDENCIA', residencia_id: 7 }))
  return `header.${payload}.sig`
}

type ResidenteMock = {
  id: number
  nombre: string
  apellido: string
  activo: boolean
  grupo_actual: { id: number; nombre: string } | null
}

function residente(id: number, nombre: string, grupo_actual: ResidenteMock['grupo_actual'] = null): ResidenteMock {
  return { id, nombre, apellido: 'Test', activo: true, grupo_actual }
}

function mockApi(residentes: ResidenteMock[], integrantes: unknown[] = []) {
  apiGet.mockImplementation(async (url: string) => {
    if (url === `/grupos/${GRUPO_ID}`) return { id: GRUPO_ID, nombre: 'Grupo Actual', activo: true }
    if (url === `/grupos/${GRUPO_ID}/integrantes`) return integrantes
    if (url === `/grupos/${GRUPO_ID}/menus`) return []
    if (url === '/residencias/7/historial') return { selecciones: [] }
    if (url === '/residencias/7/residentes') return residentes
    throw new Error(`GET inesperado: ${url}`)
  })
}

async function abrirModalAgregar() {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[`/grupos/${GRUPO_ID}`]}>
      <Routes>
        <Route path="/grupos/:id" element={<GrupoDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
  await user.click(await screen.findByRole('button', { name: /agregar integrante/i }))
  const dialog = await screen.findByRole('dialog', { name: /agregar integrante/i })
  return { user, dialog }
}

function filaDe(dialog: HTMLElement, nombre: string): HTMLElement {
  return within(dialog).getByText(new RegExp(nombre)).closest('li') as HTMLElement
}

describe('GrupoDetailPage — modal "Agregar integrante"', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    setToken(tokenDeAdminResidencia())
  })

  it('muestra en qué grupo está un residente que ya pertenece a otro y no ofrece agregarlo', async () => {
    mockApi([residente(1, 'Ocupado', { id: 9, nombre: 'Grupo B' })])
    const { dialog } = await abrirModalAgregar()

    const fila = filaDe(dialog, 'Ocupado')
    expect(within(fila).getByText('Ya está en «Grupo B»')).toBeInTheDocument()
    expect(within(fila).queryByRole('button', { name: /agregar/i })).not.toBeInTheDocument()
  })

  it('ofrece el botón Agregar habilitado a un residente sin grupo', async () => {
    mockApi([residente(2, 'Libre')])
    const { dialog } = await abrirModalAgregar()

    const fila = filaDe(dialog, 'Libre')
    expect(within(fila).getByRole('button', { name: /^agregar$/i })).toBeEnabled()
    expect(within(fila).queryByText(/ya está en/i)).not.toBeInTheDocument()
  })

  it('lista primero a los residentes sin grupo y después a los que ya están en otro', async () => {
    mockApi([
      residente(1, 'Ana', { id: 9, nombre: 'Grupo B' }),
      residente(2, 'Beto'),
      residente(3, 'Carla', { id: 9, nombre: 'Grupo B' }),
      residente(4, 'Dario'),
    ])
    const { dialog } = await abrirModalAgregar()

    const nombres = within(dialog).getAllByRole('listitem').map(li => li.textContent ?? '')
    const orden = ['Beto', 'Dario', 'Ana', 'Carla'].map(n => nombres.findIndex(t => t.includes(n)))
    expect(orden).toEqual([0, 1, 2, 3])
  })

  it('rotula como "Ya es integrante" a quien ya está en este grupo, sin botón Agregar', async () => {
    mockApi(
      [residente(3, 'Miembro', { id: GRUPO_ID, nombre: 'Grupo Actual' })],
      [{ id: 100, residente_id: 3, fecha_ingreso: '2024-03-01', residente: { id: 3, nombre: 'Miembro', apellido: 'Test' } }]
    )
    const { dialog } = await abrirModalAgregar()

    const fila = filaDe(dialog, 'Miembro')
    expect(within(fila).getByText('Ya es integrante')).toBeInTheDocument()
    expect(within(fila).queryByText(/ya está en/i)).not.toBeInTheDocument()
    expect(within(fila).queryByRole('button', { name: /agregar/i })).not.toBeInTheDocument()
  })

  it('mantiene el mensaje del backend como respaldo si hay una condición de carrera (409)', async () => {
    mockApi([residente(2, 'Libre')])
    apiPost.mockRejectedValueOnce({ mensaje: 'El residente ya pertenece al grupo Grupo B' })
    const { user, dialog } = await abrirModalAgregar()

    await user.click(within(filaDe(dialog, 'Libre')).getByRole('button', { name: /^agregar$/i }))

    expect(await within(dialog).findByText('El residente ya pertenece al grupo Grupo B')).toBeInTheDocument()
  })
})
