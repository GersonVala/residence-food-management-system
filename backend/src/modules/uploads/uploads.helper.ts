import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { MultipartFile } from "@fastify/multipart";

// ============================================================
// Constantes
// ============================================================

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

// Directorio base relativo a la raíz del proceso backend
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// ============================================================
// Tipos
// ============================================================

export type SaveUploadOptions = {
  file: MultipartFile;
  subfolder?: string;
};

// ============================================================
// Helpers
// ============================================================

/**
 * Valida extensión y tamaño, guarda el archivo en uploads/{subfolder}/{uuid}.{ext}
 * y retorna la URL relativa al servidor (e.g. /uploads/residencias/uuid.jpg).
 *
 * Nombres de archivo originales son DESCARTADOS — se usa sólo UUID para evitar
 * path traversal y colisiones.
 */
export async function saveUpload({ file, subfolder = "" }: SaveUploadOptions): Promise<string> {
  // Validar extensión
  const originalName = file.filename ?? "";
  const ext = path.extname(originalName).replace(".", "").toLowerCase();

  if (!ALLOWED_EXT.has(ext)) {
    // Drenar el stream para no dejar la conexión colgada
    await file.toBuffer().catch(() => null);
    const err = Object.assign(new Error("Extensión de archivo no permitida"), {
      statusCode: 400,
      error: "Bad Request",
      mensaje: `Extensión no permitida. Permitidas: ${[...ALLOWED_EXT].join(", ")}`,
    });
    throw err;
  }

  // Leer el buffer y validar tamaño
  const buffer = await file.toBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    const err = Object.assign(new Error("Archivo demasiado grande"), {
      statusCode: 413,
      error: "Payload Too Large",
      mensaje: "El archivo supera el límite de 5 MB",
    });
    throw err;
  }

  // Construir ruta destino con UUID
  const uuid = randomUUID();
  const filename = `${uuid}.${ext}`;
  const targetDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, buffer);

  // URL relativa al servidor
  const urlPath = subfolder ? `/uploads/${subfolder}/${filename}` : `/uploads/${filename}`;
  return urlPath;
}

/**
 * Elimina un archivo de disco de forma best-effort.
 * Si el archivo no existe o la URL es inválida, sólo loguea el error.
 */
export async function unlinkSafe(url: string | null | undefined): Promise<void> {
  if (!url) return;

  try {
    // Convertir URL relativa /uploads/... a ruta de filesystem
    const relativePart = url.startsWith("/") ? url.slice(1) : url;
    const filePath = path.resolve(process.cwd(), relativePart);

    // Seguridad: asegurar que el path queda dentro de UPLOADS_DIR
    if (!filePath.startsWith(UPLOADS_DIR)) {
      console.error(`[unlinkSafe] Path fuera de uploads, ignorado: ${filePath}`);
      return;
    }

    await fs.unlink(filePath);
  } catch (err) {
    console.error(`[unlinkSafe] No se pudo eliminar archivo: ${url}`, err);
  }
}
