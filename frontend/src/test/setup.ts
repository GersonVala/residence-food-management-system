import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom under Vitest/Windows can receive an invalid --localstorage-file path,
// which breaks localStorage entirely. Replace it with a reliable in-memory stub.
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key) => localStorageStore[key] ?? null,
  setItem: (key, value) => { localStorageStore[key] = String(value) },
  removeItem: (key) => { delete localStorageStore[key] },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) },
  get length() { return Object.keys(localStorageStore).length },
  key: (index) => Object.keys(localStorageStore)[index] ?? null,
}
vi.stubGlobal('localStorage', localStorageMock)

afterEach(() => {
  cleanup()
  localStorageMock.clear()
})
