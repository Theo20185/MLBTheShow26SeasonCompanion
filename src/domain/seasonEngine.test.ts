import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import {
  recordGameResult,
  simulateNonUserGamesUpTo,
  isFirstHalfDate,
  ALL_STAR_BREAK_END,
} from './seasonEngine'
import type { Season } from './types'

function freshSeason(teamId = 'NYY'): Season {
  return createSeason({ userTeamId: teamId, rngSeed: 1 })
}

describe('isFirstHalfDate', () => {
  it('returns true for early-season dates', () => {
    expect(isFirstHalfDate('2026-04-15')).toBe(true)
  })
  it('returns false for late-season dates', () => {
    expect(isFirstHalfDate('2026-09-15')).toBe(false)
  })
  it('uses the All-Star break boundary', () => {
    expect(isFirstHalfDate(ALL_STAR_BREAK_END)).toBe(false)
  })
})

describe('recordGameResult', () => {
  it('updates winner and loser TeamRecords (first half)', () => {
    const season = freshSeason()
    const updated = recordGameResult(season, {
      date: '2026-04-15',
      winnerId: 'NYY',
      loserId: 'BAL',
      isDivisionGame: true,
    })
    const yankees = updated.teamRecords.find((r) => r.teamId === 'NYY')!
    const orioles = updated.teamRecords.find((r) => r.teamId === 'BAL')!
    expect(yankees.firstHalfWins).toBe(1)
    expect(yankees.firstHalfLosses).toBe(0)
    expect(yankees.divisionWins).toBe(1)
    expect(orioles.firstHalfLosses).toBe(1)
    expect(orioles.divisionLosses).toBe(1)
  })

  it('routes second-half results to the secondHalf counters', () => {
    const season = freshSeason()
    const updated = recordGameResult(season, {
      date: '2026-08-15',
      winnerId: 'NYY',
      loserId: 'BAL',
      isDivisionGame: true,
    })
    const yankees = updated.teamRecords.find((r) => r.teamId === 'NYY')!
    expect(yankees.firstHalfWins).toBe(0)
    expect(yankees.secondHalfWins).toBe(1)
  })

  it('does not increment division counters for non-division matchups', () => {
    const season = freshSeason()
    const updated = recordGameResult(season, {
      date: '2026-04-15',
      winnerId: 'NYY',
      loserId: 'LAD',
      isDivisionGame: false,
    })
    const yankees = updated.teamRecords.find((r) => r.teamId === 'NYY')!
    expect(yankees.firstHalfWins).toBe(1)
    expect(yankees.divisionWins).toBe(0)
  })

  it('updates the head-to-head matrix', () => {
    const season = freshSeason()
    const updated = recordGameResult(season, {
      date: '2026-04-15',
      winnerId: 'NYY',
      loserId: 'BAL',
      isDivisionGame: true,
    })
    expect(updated.headToHead.NYY?.BAL).toBe(1)
    // Two more games, BAL takes one back.
    const after = recordGameResult(updated, {
      date: '2026-04-16',
      winnerId: 'BAL',
      loserId: 'NYY',
      isDivisionGame: true,
    })
    expect(after.headToHead.NYY?.BAL).toBe(1)
    expect(after.headToHead.BAL?.NYY).toBe(1)
  })
})

describe('simulateNonUserGamesUpTo', () => {
  it('sims all league games on/before the target date for non-user teams', () => {
    const season = freshSeason('NYY')
    const updated = simulateNonUserGamesUpTo(season, '2026-04-05')
    // Sum of all team wins should equal sum of all team losses.
    const totalWins = updated.teamRecords.reduce(
      (sum, r) => sum + r.firstHalfWins + r.secondHalfWins,
      0
    )
    const totalLosses = updated.teamRecords.reduce(
      (sum, r) => sum + r.firstHalfLosses + r.secondHalfLosses,
      0
    )
    expect(totalWins).toBe(totalLosses)
    expect(totalWins).toBeGreaterThan(0)
  })

  it('does NOT touch the user team\'s record (user reports their own games)', () => {
    const season = freshSeason('NYY')
    const updated = simulateNonUserGamesUpTo(season, '2026-05-01')
    const yankees = updated.teamRecords.find((r) => r.teamId === 'NYY')!
    expect(yankees.firstHalfWins + yankees.firstHalfLosses).toBe(0)
  })

  it('advances the rngSeed deterministically', () => {
    const a = simulateNonUserGamesUpTo(freshSeason(), '2026-04-05')
    const b = simulateNonUserGamesUpTo(freshSeason(), '2026-04-05')
    expect(a.rngSeed).toBe(b.rngSeed)
    expect(a.teamRecords).toEqual(b.teamRecords)
  })

  it('is idempotent — re-running through the same date does not double-count', () => {
    const season = freshSeason()
    const once = simulateNonUserGamesUpTo(season, '2026-04-05')
    const twice = simulateNonUserGamesUpTo(once, '2026-04-05')
    expect(twice.teamRecords).toEqual(once.teamRecords)
    expect(twice.headToHead).toEqual(once.headToHead)
  })
})
