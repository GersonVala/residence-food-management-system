import { useState } from 'react'
import { api } from '@/lib/api'
import { RotateCcw } from 'lucide-react'

interface Props {
  seleccionId: number
  rollbackDeadline: string | null
  onReverted: () => void | Promise<void>
}

function formatLimite(limite: Date): string {
  const hora = limite.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (limite.toDateString() === new Date().toDateString()) return `las ${hora}`
  const dia = limite.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
  return `el ${dia} a las ${hora}`
}

// Permite deshacer una cocción confirmada hasta rollback_deadline (confirmación + horas de la residencia)
export function DeshacerSeleccion({ seleccionId, rollbackDeadline, onReverted }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!rollbackDeadline) return null
  const limite = new Date(rollbackDeadline)
  if (Date.now() >= limite.getTime()) return null

  async function deshacer() {
    if (!confirm('¿Deshacer esta cocción? Se va a devolver el stock descontado.')) return
    setEnviando(true)
    setError(null)
    try {
      await api.patch(`/selecciones/${seleccionId}/revertir`, {})
      await onReverted()
    } catch (err) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'No se pudo deshacer la cocción')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="px-4 pb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-gray-500">Podés deshacer hasta {formatLimite(limite)}</span>
      <button
        onClick={deshacer}
        disabled={enviando}
        className="flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        <RotateCcw size={12} /> {enviando ? 'Deshaciendo...' : 'Deshacer'}
      </button>
      {error && <p role="alert" className="w-full text-red-600">{error}</p>}
    </div>
  )
}
