import { describe, it, expect } from 'vitest'
import { mulberry32, nextSeed } from './rng'

describe('mulberry32 (seeded RNG)', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces a different sequence for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    let differs = false
    for (let i = 0; i < 5; i++) {
      if (a() !== b()) differs = true
    }
    expect(differs).toBe(true)
  })

  it('returns numbers in [0, 1)', () => {
    const rng = mulberry32(123)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('over many draws, the mean approaches 0.5', () => {
    const rng = mulberry32(7)
    let sum = 0
    const n = 5000
    for (let i = 0; i < n; i++) sum += rng()
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.02)
  })
})

describe('nextSeed', () => {
  it('returns the same advanced seed for the same input', () => {
    expect(nextSeed(42)).toBe(nextSeed(42))
  })

  it('returns a different seed than the input', () => {
    expect(nextSeed(42)).not.toBe(42)
  })
})
