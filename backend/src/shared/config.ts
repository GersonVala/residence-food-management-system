export const JWT_SECRET_DEV_DEFAULT = "dev-secret-change-in-prod";
const JWT_SECRET_MIN_LENGTH = 32;
const FRONTEND_URL_DEV_DEFAULT = "http://localhost:3000";

type Env = Record<string, string | undefined>;

/**
 * Resuelve el secreto JWT. En producción NO se acepta el fallback de desarrollo:
 * un secreto público permitiría forjar tokens de cualquier rol.
 */
export function resolveJwtSecret(env: Env): string {
  const secret = env.JWT_SECRET;

  if (env.NODE_ENV === "production") {
    if (!secret || secret === JWT_SECRET_DEV_DEFAULT) {
      throw new Error(
        "JWT_SECRET es obligatorio en producción y no puede ser el valor por defecto."
      );
    }
    if (secret.length < JWT_SECRET_MIN_LENGTH) {
      throw new Error(
        `JWT_SECRET debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres en producción.`
      );
    }
    return secret;
  }

  return secret || JWT_SECRET_DEV_DEFAULT;
}

/** Resuelve el origen permitido por CORS. Obligatorio en producción. */
export function resolveFrontendUrl(env: Env): string {
  const url = env.FRONTEND_URL;

  if (env.NODE_ENV === "production" && !url) {
    throw new Error("FRONTEND_URL es obligatorio en producción (origen permitido por CORS).");
  }

  return url || FRONTEND_URL_DEV_DEFAULT;
}
