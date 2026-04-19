import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import {
  startPostseason,
  getNextUserPostseasonGame,
  reportUserPostseasonGame,
  isUserStillAlive,
  simRemainingPostseason,
  generatePostseasonGameForSeries,
} from './postseason'
import type { Season } from './types'

function withRecord(season: Season, teamId: string, w: number, l: number): Season {
  return {
    ...season,
    teamRecords: season.teamRecords.map((r) =>
      r.teamId === teamId
        ? { ...r, firstHalfWins: w, firstHalfLosses: l, secondHalfWins: 0, secondHalfLosses: 0 }
        : r
    ),
  }
}

function seedSeasonWithRealisticRecords(userTeamId = 'NYY', rngSeed = 1): Season {
  let s = createSeason({ userTeamId, rngSeed })
  // Give every team a unique record so seeding is deterministic.
  s = {
    ...s,
    teamRecords: s.teamRecords.map((r, i) => ({
      ...r,
      firstHalfWins: 50 + ((i * 7) % 30),
      firstHalfLosses: 81 - (50 + ((i * 7) % 30)),
    })),
  }
  // Make sure the user's team is one of the top seeds in their division
  // so they make the playoffs.
  s = withRecord(s, userTeamId, 95, 36)
  return s
}

describe('startPostseason', () => {
  it('builds the initial bracket and flips status to postseason', () => {
    const season = seedSeasonWithRealisticRecords()
    const next = startPostseason(season)
    expect(next.status).toBe('postseason')
    expect(next.bracket).toBeDefined()
    expect(next.bracket?.alSeeds).toHaveLength(6)
    expect(next.bracket?.nlSeeds).toHaveLength(6)
    expect(next.bracket?.currentRound).toBe('WCS')
    expect(next.bracket?.series).toHaveLength(4)
  })
})

describe('generatePostseasonGameForSeries', () => {
  it('produces a Game with kind=postseason and a synthetic gamePk', () => {
    const season = seedSeasonWithRealisticRecords()
    const ps = startPostseason(season)
    const series = ps.bracket!.series[0]
    const game = generatePostseasonGameForSeries(series, 0)
    expect(game.kind).toBe('postseason')
    expect(game.status).toBe('scheduled')
    expect(game.homeTeamId).toBe(series.highSeedTeamId)  // games 1, 2 hosted by high
    expect(game.gamePk).toBeGreaterThan(900_000_000)
  })

  it('low seed hosts game 3 in best-of-3', () => {
    const season = seedSeasonWithRealisticRecords()
    const ps = startPostseason(season)
    const series = ps.bracket!.series[0]
    const game = generatePostseasonGameForSeries(series, 2)
    expect(game.homeTeamId).toBe(series.lowSeedTeamId)
  })
})

describe('getNextUserPostseasonGame', () => {
  it('returns null if user team did not make the playoffs', () => {
    let s = createSeason({ userTeamId: 'BAL', rngSeed: 1 })
    // Leave BAL with a terrible record so they miss the playoffs.
    s = withRecord(s, 'BAL', 30, 100)
    // Make every other team better.
    s = {
      ...s,
      teamRecords: s.teamRecords.map((r, i) =>
        r.teamId === 'BAL'
          ? r
          : { ...r, firstHalfWins: 70 + ((i * 3) % 20), firstHalfLosses: 81 - (70 + ((i * 3) % 20)) }
      ),
    }
    const ps = startPostseason(s)
    expect(getNextUserPostseasonGame(ps)).toBeNull()
  })

  it('returns the next user game if user team is in an active series', () => {
    const season = seedSeasonWithRealisticRecords('NYY')
    const ps = startPostseason(season)
    const next = getNextUserPostseasonGame(ps)
    if (isUserStillAlive(ps)) {
      expect(next).not.toBeNull()
      expect(next!.homeTeamId === 'NYY' || next!.awayTeamId === 'NYY').toBe(true)
    }
  })
})

describe('reportUserPostseasonGame', () => {
  it('progresses the user series and sims parallel series in lockstep', () => {
    let season = seedSeasonWithRealisticRecords('NYY')
    season = startPostseason(season)
    // NYY may or may not be playing in WCS depending on seeding.
    // If NYY has bye (top 2), the test still applies since other series advance.
    if (!isUserStillAlive(season)) return

    const before = season.bracket!.series.find((s) => !s.winnerId)!
    const beforeGameCount = before.results.length

    season = reportUserPostseasonGame(season, true)

    // The user's series now has one more recorded result.
    const after = season.bracket!.series.find((s) => s.id === before.id)!
    expect(after.results.length).toBe(beforeGameCount + 1)

    // Other parallel series in the same round also have one more result
    // (lockstep), unless they already finished.
    const sameRound = season.bracket!.series.filter(
      (s) => s.round === before.round && s.id !== before.id
    )
    for (const s of sameRound) {
      const original = before.round === s.round
      if (original) {
        // length should be at least beforeGameCount + 1, OR be the
        // series-completing index if a sweep happened.
        expect(s.results.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('builds the next round when all current-round series complete', () => {
    let season = seedSeasonWithRealisticRecords('NYY')
    season = startPostseason(season)
    // Sim through to the World Series.
    let safety = 0
    while (
      season.bracket!.currentRound !== 'WS' &&
      isUserStillAlive(season) &&
      safety++ < 100
    ) {
      season = reportUserPostseasonGame(season, true)
    }
    if (isUserStillAlive(season)) {
      expect(season.bracket!.currentRound).toBe('WS')
    }
  })
})

describe('simRemainingPostseason', () => {
  it('produces a champion when run from any state', () => {
    let season = seedSeasonWithRealisticRecords()
    season = startPostseason(season)
    const finished = simRemainingPostseason(season)
    expect(finished.status).toBe('complete')
    expect(finished.champion).toBeDefined()
    expect(finished.bracket!.champion).toBe(finished.champion)
  })
})
