import { describe, it, expect } from 'vitest'
import { compareTeamsForSeeding } from './tiebreakers'
import { createSeason } from './createSeason'
import type { Season } from './types'

function setRecord(
  season: Season,
  teamId: string,
  fhw: number, fhl: number, shw: number, shl: number,
  divW: number, divL: number
): Season {
  return {
    ...season,
    teamRecords: season.teamRecords.map((r) =>
      r.teamId === teamId
        ? { ...r, firstHalfWins: fhw, firstHalfLosses: fhl, secondHalfWins: shw, secondHalfLosses: shl, divisionWins: divW, divisionLosses: divL }
        : r
    ),
  }
}

function setH2H(season: Season, winnerId: string, loserId: string, count: number): Season {
  return {
    ...season,
    headToHead: {
      ...season.headToHead,
      [winnerId]: { ...(season.headToHead[winnerId] ?? {}), [loserId]: count },
    },
  }
}

describe('compareTeamsForSeeding', () => {
  it('better overall winPct wins (step 1)', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    s = setRecord(s, 'NYY', 50, 31, 30, 20, 25, 10)  // 80-51, .611
    s = setRecord(s, 'BOS', 45, 36, 30, 20, 25, 10)  // 75-56, .573
    expect(compareTeamsForSeeding(s, 'NYY', 'BOS')).toBeLessThan(0)
  })

  it('uses head-to-head when overall winPct is tied (step 2)', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    s = setRecord(s, 'NYY', 45, 36, 35, 15, 20, 15)
    s = setRecord(s, 'BOS', 45, 36, 35, 15, 20, 15)
    s = setH2H(s, 'NYY', 'BOS', 8)
    s = setH2H(s, 'BOS', 'NYY', 5)
    expect(compareTeamsForSeeding(s, 'NYY', 'BOS')).toBeLessThan(0)
  })

  it('uses division record when overall + H2H are tied (step 3)', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    s = setRecord(s, 'NYY', 45, 36, 35, 15, 30, 10)
    s = setRecord(s, 'BOS', 45, 36, 35, 15, 25, 15)
    s = setH2H(s, 'NYY', 'BOS', 6)
    s = setH2H(s, 'BOS', 'NYY', 6)
    expect(compareTeamsForSeeding(s, 'NYY', 'BOS')).toBeLessThan(0)
  })

  it('falls through to second-half record (step 5) when prior steps tied', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    // Same overall, same H2H, same division, but different second-half splits.
    s = setRecord(s, 'NYY', 30, 51, 50, 0, 25, 15)  // second half 50-0
    s = setRecord(s, 'BOS', 50, 31, 30, 20, 25, 15) // second half 30-20
    // Override H2H to a tie so we fall past step 2.
    s = setH2H(s, 'NYY', 'BOS', 6)
    s = setH2H(s, 'BOS', 'NYY', 6)
    expect(compareTeamsForSeeding(s, 'NYY', 'BOS')).toBeLessThan(0)
  })

  it('uses deterministic fallback (step 6) when everything is identical', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    s = setRecord(s, 'NYY', 40, 41, 40, 10, 25, 15)
    s = setRecord(s, 'BOS', 40, 41, 40, 10, 25, 15)
    s = setH2H(s, 'NYY', 'BOS', 6)
    s = setH2H(s, 'BOS', 'NYY', 6)
    // Should not throw, and should be deterministic
    const a = compareTeamsForSeeding(s, 'NYY', 'BOS')
    const b = compareTeamsForSeeding(s, 'NYY', 'BOS')
    expect(a).toBe(b)
    expect(a).not.toBe(0)
  })
})
