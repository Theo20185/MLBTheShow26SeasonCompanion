import { describe, it, expect } from 'vitest'
import {
  validateBoxScore,
  inferWinnerFromBoxScore,
  totalRuns,
  type BoxScoreInput,
} from './boxScore'

const VALID: BoxScoreInput = {
  inningsHome: [0, 1, 0, 0, 2, 0, 0, 0, 0],
  inningsAway: [0, 0, 1, 0, 0, 0, 0, 0, 0],
  hitsHome: 7,
  hitsAway: 5,
  errorsHome: 0,
  errorsAway: 1,
  shortened: false,
}

describe('validateBoxScore', () => {
  it('accepts a valid 9-inning box score', () => {
    expect(validateBoxScore(VALID).ok).toBe(true)
  })

  it('rejects fewer than 9 innings unless shortened is true', () => {
    const short: BoxScoreInput = {
      ...VALID,
      inningsHome: VALID.inningsHome.slice(0, 7),
      inningsAway: VALID.inningsAway.slice(0, 7),
    }
    expect(validateBoxScore(short).ok).toBe(false)
    expect(validateBoxScore({ ...short, shortened: true }).ok).toBe(true)
  })

  it('rejects negative inning runs', () => {
    const bad: BoxScoreInput = {
      ...VALID,
      inningsHome: [...VALID.inningsHome.slice(0, 8), -1],
    }
    expect(validateBoxScore(bad).ok).toBe(false)
  })

  it('rejects negative hits or errors', () => {
    expect(validateBoxScore({ ...VALID, hitsHome: -1 }).ok).toBe(false)
    expect(validateBoxScore({ ...VALID, errorsAway: -1 }).ok).toBe(false)
  })

  it('rejects ties at the end of regulation (no extra-innings ties allowed)', () => {
    const tied: BoxScoreInput = {
      ...VALID,
      inningsHome: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      inningsAway: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
    expect(validateBoxScore(tied).ok).toBe(false)
  })

  it('accepts extra-inning games (10+ innings) when winner is decided', () => {
    const extras: BoxScoreInput = {
      ...VALID,
      inningsHome: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      inningsAway: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
    expect(validateBoxScore(extras).ok).toBe(true)
  })

  it('requires both teams to have the same number of innings', () => {
    const mismatched: BoxScoreInput = {
      ...VALID,
      inningsHome: VALID.inningsHome.slice(0, 8),
    }
    expect(validateBoxScore(mismatched).ok).toBe(false)
  })
})

describe('inferWinnerFromBoxScore', () => {
  it('returns "home" when home outscores away', () => {
    expect(inferWinnerFromBoxScore(VALID)).toBe('home')
  })

  it('returns "away" when away outscores home', () => {
    expect(
      inferWinnerFromBoxScore({
        ...VALID,
        inningsHome: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        inningsAway: [0, 0, 0, 0, 0, 0, 0, 0, 5],
      })
    ).toBe('away')
  })
})

describe('totalRuns', () => {
  it('sums per-inning runs', () => {
    expect(totalRuns([0, 1, 2, 3, 0])).toBe(6)
  })
})
