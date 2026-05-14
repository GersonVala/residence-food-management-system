import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, X } from 'lucide-react'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif']

interface ImageUploadProps {
  label?: string
  currentUrl?: string | null
  onUpload: (formData: FormData) => Promise<void>
}

export function ImageUpload({ label = 'Subir imagen', currentUrl, onUpload }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      setError(`Extensión no permitida. Usá: ${ALLOWED_EXT.join(', ')}`)
      return
    }

    if (file.size > MAX_BYTES) {
      setError('El archivo supera el límite de 5MB.')
      return
    }

    setPreview(URL.createObjectURL(file))
  }

  function handleClear() {
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setError(null)
    try {
      await onUpload(formData)
      handleClear()
    } catch (err: unknown) {
      const e = err as { mensaje?: string }
      setError(e.mensaje ?? 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = preview ?? currentUrl ?? null

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative w-full max-w-xs">
          <img
            src={displayUrl}
            alt="Preview"
            className="rounded-lg object-cover w-full h-40 border border-gray-200"
          />
          {preview && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full max-w-xs h-40 border-2 border-dashed border-gray-300 rounded-lg text-gray-400">
          <div className="flex flex-col items-center gap-1">
            <ImageIcon size={24} />
            <span className="text-xs">Sin imagen</span>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXT.map(e => `.${e}`).join(',')}
        onChange={handleFileChange}
        className="hidden"
        data-testid="image-file-input"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </Button>
        {preview && (
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : 'Confirmar'}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
      )}
    </div>
  )
}
