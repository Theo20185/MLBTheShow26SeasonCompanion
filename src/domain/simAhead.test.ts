import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import { startPostseason } from './postseason'
import {
  simToAllStarBreak,
  simToPostseason,
  simToWorldSeries,
  ALL_STAR_BREAK_END,
} from './simAhead'

function freshSeason(userTeamId = 'NYY', rngSeed = 42) {
  return createSeason({ userTeamId, rngSeed })
}

describe('simToAllStarBreak', () => {
  it('plays every user game whose date is before the All-Star break', () => {
    const original = freshSeason()
    const after = simToAllStarBreak(original)
    const next = after.userGames.find((g) => g.status === 'scheduled')
    // Either no user games left at all (unlikely), or the next scheduled
    // game is on/after the All-Star break.
    if (next) {
      expect(next.date >= ALL_STAR_BREAK_END).toBe(true)
    }
    const playedBeforeBreak = after.userGames.filter(
      (g) => g.status === 'played' && g.date < ALL_STAR_BREAK_END
    )
    expect(playedBeforeBreak.length).toBeGreaterThan(0)
    for (const g of playedBeforeBreak) {
      expect(g.result?.simmed).toBe(true)
    }
  })

  it('clears lastSnapshot so Undo cannot reverse the bulk sim', () => {
    const after = simToAllStarBreak(freshSeason())
    expect(after.lastSnapshot).toBeUndefined()
  })

  it('is deterministic for a given input rngSeed', () => {
    const a = simToAllStarBreak(freshSeason('NYY', 100))
    const b = simToAllStarBreak(freshSeason('NYY', 100))
    expect(a.teamRecords).toEqual(b.teamRecords)
    expect(a.rngSeed).toBe(b.rngSeed)
  })

  it('the user team takes more losses on average than wins (CPU bias active)', () => {
    // Average across many seeds: with -10 OVR penalty, user team should
    // win meaningfully less than 50%.
    let totalUserWins = 0
    let totalUserLosses = 0
    for (let seed = 1; seed <= 6; seed++) {
      const after = simToAllStarBreak(freshSeason('NYY', seed))
      const rec = after.teamRecords.find((r) => r.teamId === 'NYY')!
      totalUserWins += rec.firstHalfWins + rec.secondHalfWins
      totalUserLosses += rec.firstHalfLosses + rec.secondHalfLosses
    }
    expect(totalUserLosses).toBeGreaterThan(totalUserWins)
  })
})

describe('simToPostseason', () => {
  it('plays every remaining regular-season user game', () => {
    const after = simToPostseason(freshSeason())
    const stillScheduled = after.userGames.filter((g) => g.status === 'scheduled')
    expect(stillScheduled).toHaveLength(0)
  })

  it('flips status to postseason and builds a bracket', () => {
    const after = simToPostseason(freshSeason())
    expect(after.status).toBe('postseason')
    expect(after.bracket).toBeDefined()
  })

  it('guarantees the user team makes the playoffs', () => {
    // Repeat across seeds; user should always end up in their league's
    // top 6 seeds.
    for (let seed = 1; seed <= 5; seed++) {
      const after = simToPostseason(freshSeason('NYY', seed))
      const userInAL = after.bracket?.alSeeds.includes('NYY')
      const userInNL = after.bracket?.nlSeeds.includes('NYY')
      expect(userInAL || userInNL, `seed ${seed}: user not in playoffs`).toBe(true)
    }
  })

  it('never grants a Wild Card bye (top-2 seed) — even to teams that would naturally earn it', () => {
    // simToPostseason is opt-in: the user explicitly chose to skip games.
    // We don't reward that with a bye; they should always have to play
    // the Wild Card Series at minimum.
    for (let seed = 1; seed <= 5; seed++) {
      const after = simToPostseason(freshSeason('NYY', seed))
      const seeds = (after.bracket?.alSeeds ?? []).includes('NYY')
        ? after.bracket!.alSeeds
        : after.bracket!.nlSeeds
      expect(seeds[0]).not.toBe('NYY')
      expect(seeds[1]).not.toBe('NYY')
    }
  })

  it('clears lastSnapshot', () => {
    const after = simToPostseason(freshSeason())
    expect(after.lastSnapshot).toBeUndefined()
  })
})

describe('simToWorldSeries', () => {
  it('lands the user in the World Series (currentRound === WS, user alive)', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const after = simToWorldSeries(freshSeason('NYY', seed))
      expect(after.bracket).toBeDefined()
      expect(after.bracket?.currentRound).toBe('WS')
      const ws = after.bracket!.series.find((s) => s.round === 'WS')!
      expect(
        ws.highSeedTeamId === 'NYY' || ws.lowSeedTeamId === 'NYY',
        `seed ${seed}: user team not in WS`
      ).toBe(true)
    }
  })

  it('does not pre-decide the WS itself (winnerId still undefined)', () => {
    const after = simToWorldSeries(freshSeason())
    const ws = after.bracket!.series.find((s) => s.round === 'WS')!
    expect(ws.winnerId).toBeUndefined()
    expect(ws.results).toHaveLength(0)
    expect(after.status).toBe('postseason')
  })

  it('clears lastSnapshot', () => {
    const after = simToWorldSeries(freshSeason())
    expect(after.lastSnapshot).toBeUndefined()
  })

  it('does NOT mutate the input season', () => {
    const original = freshSeason()
    const originalRng = original.rngSeed
    simToWorldSeries(original)
    expect(original.rngSeed).toBe(originalRng)
    expect(original.status).toBe('regular')
  })

  it('works correctly when called from an already-started postseason', () => {
    const ps = startPostseason(freshSeason())
    const after = simToWorldSeries(ps)
    expect(after.bracket?.currentRound).toBe('WS')
  })
})
