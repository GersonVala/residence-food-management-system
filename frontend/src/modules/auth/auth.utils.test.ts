import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getToken,
  setToken,
  removeToken,
  decodeToken,
  isAuthenticated,
} from './auth.utils'

// Helper: build a minimal valid JWT with a given exp (in seconds).
// atob/btoa work with standard base64 — jsdom provides both.
function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({ id: 1, email: 'test@test.com', role: 'ADMIN_GLOBAL', residencia_id: null, exp })
  )
  return `${header}.${payload}.fakesignature`
}

describe('auth.utils — token storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getToken returns null when storage is empty', () => {
    expect(getToken()).toBeNull()
  })

  it('getToken returns the stored token', () => {
    localStorage.setItem('token', 'my.jwt.token')
    expect(getToken()).toBe('my.jwt.token')
  })

  it('setToken stores the token in localStorage', () => {
    setToken('some.jwt.token')
    expect(localStorage.getItem('token')).toBe('some.jwt.token')
  })

  it('removeToken removes the token from localStorage', () => {
    setToken('some.jwt.token')
    removeToken()
    expect(localStorage.getItem('token')).toBeNull()
    expect(getToken()).toBeNull()
  })
})

describe('auth.utils — decodeToken', () => {
  it('returns the payload for a valid JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt(exp)
    const payload = decodeToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.email).toBe('test@test.com')
    expect(payload?.role).toBe('ADMIN_GLOBAL')
    expect(payload?.exp).toBe(exp)
  })

  it('returns null for a malformed string (not a JWT)', () => {
    expect(decodeToken('not.a.jwt')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(decodeToken('')).toBeNull()
  })

  it('returns null for a string with no dots', () => {
    expect(decodeToken('garbage')).toBeNull()
  })
})

describe('auth.utils — isAuthenticated', () => {
  const FIXED_NOW_MS = 1_700_000_000_000 // fixed point in time

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when there is no token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('returns false when the token is malformed', () => {
    localStorage.setItem('token', 'not-a-valid-jwt')
    expect(isAuthenticated()).toBe(false)
  })

  it('returns false when the token is expired', () => {
    const expiredExp = Math.floor(FIXED_NOW_MS / 1000) - 1 // 1 second in the past
    setToken(makeJwt(expiredExp))
    expect(isAuthenticated()).toBe(false)
  })

  it('returns true when the token is valid and not expired', () => {
    const futureExp = Math.floor(FIXED_NOW_MS / 1000) + 3600 // 1 hour in the future
    setToken(makeJwt(futureExp))
    expect(isAuthenticated()).toBe(true)
  })
})
