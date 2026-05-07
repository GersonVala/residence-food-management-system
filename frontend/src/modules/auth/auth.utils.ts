export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function removeToken(): void {
  localStorage.removeItem('token')
}

export function decodeToken(token: string): { id: number; email: string; role: string; residencia_id: number | null; iat?: number; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const payload = decodeToken(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 > Date.now()
}
