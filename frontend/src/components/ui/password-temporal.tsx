import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PasswordTemporalProps {
  password: string
  onClose: () => void
  /** A quién se le entrega la contraseña, ej. "al residente". */
  destinatario?: string
}

/**
 * Muestra una contraseña temporal recién generada. El backend la devuelve una
 * sola vez, por eso el aviso y el botón de copiar.
 */
export function PasswordTemporal({ password, onClose, destinatario = 'a la persona' }: PasswordTemporalProps) {
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(password)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      // Sin permisos de portapapeles: la contraseña sigue visible para copiarla a mano
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Anotala y entregásela {destinatario}: <strong>no se vuelve a mostrar</strong>. Va a tener que cambiarla en su primer ingreso.
      </p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
        <code className="flex-1 text-base font-mono text-gray-900 select-all">{password}</code>
        <button
          type="button"
          onClick={copiar}
          aria-label={copiada ? 'Contraseña copiada' : 'Copiar contraseña'}
          className="text-gray-400 hover:text-purple-600 transition-colors"
        >
          {copiada ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>
      </div>
      <Button className="w-full" onClick={onClose}>Listo</Button>
    </div>
  )
}
