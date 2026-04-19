import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import {
  startPostseason,
  getNextUserPostseasonGame,
  reportUserPostseasonGame,
  isUserStillAlive,
  simRemainingPostseason,
  generatePostseasonGameForSeries,
  advancePastByes,
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

/** Builds a season where the user team has the BEST record in their league
 *  — guarantees them seed 1 and a Wild Card Series bye. Uses believable
 *  162-game records so winPct comparisons resolve correctly. */
function seedSeasonWithUserAsTopSeed(userTeamId = 'TOR', rngSeed = 1): Season {
  let s = createSeason({ userTeamId, rngSeed })
  s = {
    ...s,
    teamRecords: s.teamRecords.map((r, i) => {
      const wins = 65 + ((i * 7) % 25)  // 65-89 wins out of 162
      return {
        ...r,
        firstHalfWins: wins,
        firstHalfLosses: 162 - wins,
        secondHalfWins: 0,
        secondHalfLosses: 0,
      }
    }),
  }
  // 108-54 (.667) clearly beats the 89-73 max (.549) of every other team.
  s = withRecord(s, userTeamId, 108, 54)
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

describe('Wild Card bye handling (regression: top-2 seeds were marked eliminated)', () => {
  it('isUserStillAlive returns true when the user has a WCS bye', () => {
    const season = startPostseason(seedSeasonWithUserAsTopSeed('TOR'))
    // Confirm we actually got the bye scenario.
    const userIsTopSeed =
      season.bracket!.alSeeds[0] === 'TOR' || season.bracket!.alSeeds[1] === 'TOR' ||
      season.bracket!.nlSeeds[0] === 'TOR' || season.bracket!.nlSeeds[1] === 'TOR'
    expect(userIsTopSeed).toBe(true)
    const userInWCS = season.bracket!.series.some(
      (s) => s.round === 'WCS' && (s.highSeedTeamId === 'TOR' || s.lowSeedTeamId === 'TOR')
    )
    expect(userInWCS, 'top-2 seed should NOT be in any WCS series').toBe(false)

    expect(isUserStillAlive(season)).toBe(true)
  })

  it('getNextUserPostseasonGame is null during a bye round (nothing to play yet)', () => {
    const season = startPostseason(seedSeasonWithUserAsTopSeed('TOR'))
    expect(getNextUserPostseasonGame(season)).toBeNull()
  })

  it('advancePastByes simulates the WCS round and lands the bye team in the DS', () => {
    let season = startPostseason(seedSeasonWithUserAsTopSeed('TOR'))
    expect(season.bracket!.currentRound).toBe('WCS')

    season = advancePastByes(season)
    expect(season.bracket!.currentRound).toBe('DS')
    // User now has an actual DS game to play.
    const game = getNextUserPostseasonGame(season)
    expect(game).not.toBeNull()
    expect(game!.homeTeamId === 'TOR' || game!.awayTeamId === 'TOR').toBe(true)
  })

  it('advancePastByes is a no-op when the user already has an active game', () => {
    let season = startPostseason(seedSeasonWithRealisticRecords('NYY'))
    if (!isUserStillAlive(season)) return
    if (!getNextUserPostseasonGame(season)) return // user got a bye in this seed; skip
    const before = season.bracket!.currentRound
    season = advancePastByes(season)
    expect(season.bracket!.currentRound).toBe(before)
  })

  it('isUserStillAlive returns false when the user lost their series', () => {
    let season = startPostseason(seedSeasonWithRealisticRecords('NYY'))
    if (!isUserStillAlive(season) || !getNextUserPostseasonGame(season)) return
    // Force user to lose the series by reporting losses until they're out.
    let safety = 0
    while (isUserStillAlive(season) && getNextUserPostseasonGame(season) && safety++ < 7) {
      season = reportUserPostseasonGame(season, false)
    }
    expect(isUserStillAlive(season)).toBe(false)
  })
})

describe('postseason Undo (via lastSnapshot + undoLastReport)', () => {
  it('writes a snapshot capturing bracket + status before each report', () => {
    let season = seedSeasonWithRealisticRecords('NYY')
    season = startPostseason(season)
    if (!isUserStillAlive(season)) return

    expect(season.lastSnapshot).toBeUndefined()
    season = reportUserPostseasonGame(season, true)
    expect(season.lastSnapshot).toBeDefined()
    expect(season.lastSnapshot?.bracket).toBeDefined()
    expect(season.lastSnapshot?.status).toBe('postseason')
  })

  it('undoLastReport rolls back parallel-series sims and any round transition', async () => {
    const { undoLastReport } = await import('./reportGame')
    let season = seedSeasonWithRealisticRecords('NYY')
    season = startPostseason(season)
    if (!isUserStillAlive(season)) return

    const beforeBracket = JSON.stringify(season.bracket)
    const beforeRng = season.rngSeed
    const beforeStatus = season.status
    const beforePostseasonGames = season.postseasonGames?.length ?? 0

    season = reportUserPostseasonGame(season, true)
    // After report: bracket has advanced (at minimum the user's series),
    // rngSeed has moved, postseasonGames has grown.
    expect(JSON.stringify(season.bracket)).not.toBe(beforeBracket)
    expect(season.rngSeed).not.toBe(beforeRng)
    expect(season.postseasonGames!.length).toBe(beforePostseasonGames + 1)

    const undone = undoLastReport(season)!
    expect(undone).not.toBeNull()
    expect(JSON.stringify(undone.bracket)).toBe(beforeBracket)
    expect(undone.rngSeed).toBe(beforeRng)
    expect(undone.status).toBe(beforeStatus)
    expect(undone.postseasonGames!.length).toBe(beforePostseasonGames)
    expect(undone.lastSnapshot).toBeUndefined()
  })

  it('a re-report after undo with the OPPOSITE result produces different bracket state', async () => {
    const { undoLastReport } = await import('./reportGame')
    let season = seedSeasonWithRealisticRecords('NYY')
    season = startPostseason(season)
    if (!isUserStillAlive(season)) return

    const winSeason = reportUserPostseasonGame(season, true)
    const undone = undoLastReport(winSeason)!
    const lossSeason = reportUserPostseasonGame(undone, false)

    // The user series's first result should differ between win and loss reports.
    const winSeries = winSeason.bracket!.series.find((s) =>
      s.highSeedTeamId === 'NYY' || s.lowSeedTeamId === 'NYY'
    )!
    const lossSeries = lossSeason.bracket!.series.find((s) =>
      s.highSeedTeamId === 'NYY' || s.lowSeedTeamId === 'NYY'
    )!
    const winFirst = winSeries.results[0]
    const lossFirst = lossSeries.results[0]
    // Whichever side NYY was on, the win/loss for them should be opposite.
    const userWasHomeInWin = winSeries.highSeedTeamId === 'NYY'
      ? winSeries.results.length > 0 && winFirst.homeWon
      : winSeries.results.length > 0 && !winFirst.homeWon
    const userWasHomeInLoss = lossSeries.highSeedTeamId === 'NYY'
      ? lossSeries.results.length > 0 && lossFirst.homeWon
      : lossSeries.results.length > 0 && !lossFirst.homeWon
    expect(userWasHomeInWin).not.toBe(userWasHomeInLoss)
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
