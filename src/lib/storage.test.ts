import { describe, it, expect, beforeEach } from 'vitest'
import {
  createStore,
  StoredSchemaError,
  StoredVersionError,
} from './storage'

interface TestValue {
  name: string
  count: number
}

function validateTestValue(raw: unknown): TestValue {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof (raw as TestValue).name !== 'string' ||
    typeof (raw as TestValue).count !== 'number'
  ) {
    throw new Error('not a TestValue')
  }
  return raw as TestValue
}

describe('createStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes and reads back a typed value', () => {
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })

    store.set({ name: 'orioles', count: 42 })
    expect(store.get()).toEqual({ name: 'orioles', count: 42 })
  })

  it('returns null when no value is stored', () => {
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })
    expect(store.get()).toBeNull()
  })

  it('removes a stored value', () => {
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })
    store.set({ name: 'yankees', count: 7 })
    store.remove()
    expect(store.get()).toBeNull()
  })

  it('persists the version alongside the data', () => {
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 3,
      validate: validateTestValue,
    })
    store.set({ name: 'mets', count: 1 })

    const raw = JSON.parse(localStorage.getItem('test:value')!)
    expect(raw.version).toBe(3)
    expect(raw.data).toEqual({ name: 'mets', count: 1 })
  })

  it('runs migrations when reading an older version', () => {
    // Manually plant a v1 record.
    localStorage.setItem(
      'test:value',
      JSON.stringify({ version: 1, data: { name: 'cubs' } })
    )

    const store = createStore<TestValue>({
      key: 'test:value',
      version: 2,
      validate: validateTestValue,
      migrations: {
        2: (oldData: unknown) => ({
          ...(oldData as { name: string }),
          count: 0,
        }),
      },
    })

    expect(store.get()).toEqual({ name: 'cubs', count: 0 })
    // Migration should have rewritten storage to the new version.
    const raw = JSON.parse(localStorage.getItem('test:value')!)
    expect(raw.version).toBe(2)
  })

  it('throws StoredVersionError when reading a newer version with no migration', () => {
    localStorage.setItem(
      'test:value',
      JSON.stringify({ version: 99, data: { name: 'rays', count: 5 } })
    )
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })
    expect(() => store.get()).toThrow(StoredVersionError)
  })

  it('throws StoredSchemaError when the stored data fails validation', () => {
    localStorage.setItem(
      'test:value',
      JSON.stringify({ version: 1, data: { name: 123, count: 'nope' } })
    )
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })
    expect(() => store.get()).toThrow(StoredSchemaError)
  })

  it('writes are atomic — a failed serialize does not corrupt prior state', () => {
    const store = createStore<TestValue>({
      key: 'test:value',
      version: 1,
      validate: validateTestValue,
    })
    store.set({ name: 'red sox', count: 10 })

    // Force a write of an unserializable value (circular reference).
    const cyclic: { self?: unknown; name: string; count: number } = {
      name: 'circular',
      count: 0,
    }
    cyclic.self = cyclic

    expect(() => store.set(cyclic as unknown as TestValue)).toThrow()
    // Prior data is intact.
    expect(store.get()).toEqual({ name: 'red sox', count: 10 })
  })
})
