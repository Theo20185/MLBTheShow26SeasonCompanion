import { describe, it, expect } from 'vitest'
import {
  homeWinProbability,
  simulateGame,
  effectiveOvr,
  HOME_FIELD_BONUS,
  USER_SIM_PENALTY,
} from './simulator'
import { mulberry32 } from './rng'
import type { Season } from './types'

const stubSeason: Pick<Season, 'baseOvrSnapshot' | 'ovrOverrides'> = {
  baseOvrSnapshot: { NYY: 80, BAL: 70 },
  ovrOverrides: {},
}

describe('effectiveOvr', () => {
  it('returns the base OVR when no override exists', () => {
    expect(effectiveOvr('NYY', stubSeason)).toBe(80)
  })

  it('returns the override when one is set', () => {
    expect(
      effectiveOvr('NYY', { ...stubSeason, ovrOverrides: { NYY: 90 } })
    ).toBe(90)
  })
})

describe('homeWinProbability', () => {
  it('gives equal teams roughly a HOME_FIELD_BONUS edge', () => {
    const p = homeWinProbability(75, 75)
    expect(p).toBeGreaterThan(0.5)
    expect(p).toBeCloseTo(0.5 + HOME_FIELD_BONUS, 2)
  })

  it('gives the better-OVR team a higher probability', () => {
    const pStrong = homeWinProbability(85, 70)
    const pWeak = homeWinProbability(70, 85)
    expect(pStrong).toBeGreaterThan(pWeak)
  })

  it('clamps probability to (0, 1)', () => {
    expect(homeWinProbability(99, 50)).toBeLessThan(1)
    expect(homeWinProbability(50, 99)).toBeGreaterThan(0)
  })
})

describe('simulateGame', () => {
  it('produces deterministic results for the same seed', () => {
    const rng1 = mulberry32(7)
    const rng2 = mulberry32(7)
    const a = simulateGame({ homeOvr: 80, awayOvr: 70, rng: rng1 })
    const b = simulateGame({ homeOvr: 80, awayOvr: 70, rng: rng2 })
    expect(a).toEqual(b)
  })

  it('over many trials, a heavily-favored home team wins ~70%+', () => {
    const rng = mulberry32(1)
    let homeWins = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const r = simulateGame({ homeOvr: 90, awayOvr: 65, rng })
      if (r.homeWon) homeWins++
    }
    const pct = homeWins / n
    expect(pct).toBeGreaterThan(0.65)
    expect(pct).toBeLessThan(0.85)
  })

  it('over many trials, equal OVRs hover near 50% (with home-field tilt)', () => {
    const rng = mulberry32(99)
    let homeWins = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      const r = simulateGame({ homeOvr: 75, awayOvr: 75, rng })
      if (r.homeWon) homeWins++
    }
    const pct = homeWins / n
    expect(pct).toBeGreaterThan(0.5)
    expect(pct).toBeLessThan(0.6)
  })

  it('produces sensible scores (positive, winner > loser)', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 200; i++) {
      const r = simulateGame({ homeOvr: 80, awayOvr: 70, rng })
      expect(r.homeScore).toBeGreaterThanOrEqual(0)
      expect(r.awayScore).toBeGreaterThanOrEqual(0)
      if (r.homeWon) {
        expect(r.homeScore).toBeGreaterThan(r.awayScore)
      } else {
        expect(r.awayScore).toBeGreaterThan(r.homeScore)
      }
    }
  })

  it('user-disadvantage mode tilts the user team toward losing', () => {
    const rng1 = mulberry32(1234)
    const rng2 = mulberry32(1234)
    let normalWins = 0
    let nerfedWins = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      // Two teams both at 75. Normal: ~55% home wins (with HF bonus).
      if (simulateGame({ homeOvr: 75, awayOvr: 75, rng: rng1 }).homeWon) {
        normalWins++
      }
      // Same matchup but home is the user's team in user-disadvantage mode.
      if (
        simulateGame({
          homeOvr: 75,
          awayOvr: 75,
          rng: rng2,
          userIsHome: true,
          applyUserSimPenalty: true,
        }).homeWon
      ) {
        nerfedWins++
      }
    }
    expect(nerfedWins).toBeLessThan(normalWins)
  })
})

describe('USER_SIM_PENALTY constant', () => {
  it('is negative (a penalty, not a bonus)', () => {
    expect(USER_SIM_PENALTY).toBeLessThan(0)
  })
})
