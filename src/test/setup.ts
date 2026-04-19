import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 22+ ships an experimental built-in `localStorage` (intended to be
// file-backed via --localstorage-file). Without that flag it's broken —
// `clear()` and other methods are missing. It also shadows whatever jsdom
// would provide on globalThis. Replace it with a clean in-memory polyfill
// so tests get predictable, fully-featured storage.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

beforeAll(() => {
  const memoryStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      configurable: true,
      writable: true,
    })
  }
})

// Reset DOM and localStorage between tests so persistence tests don't leak.
afterEach(() => {
  cleanup()
  localStorage.clear()
})
