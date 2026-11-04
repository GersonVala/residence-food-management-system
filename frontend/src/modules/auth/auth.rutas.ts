/** Pantalla de inicio de cada rol: a donde se lo lleva al iniciar sesión o al entrar a una ruta que no le corresponde. */
export function rutaInicio(role: string): string {
  if (role === 'RESIDENTE') return '/mi-residencia'
  if (role === 'ADMIN_GLOBAL') return '/analytics'
  return '/dashboard'
}
