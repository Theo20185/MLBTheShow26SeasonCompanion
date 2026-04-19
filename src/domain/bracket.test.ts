import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import {
  seedLeague,
  buildBracket,
  seriesIsComplete,
  recordSeriesGame,
  type Series,
} from './bracket'
import type { Season } from './types'

function setRecord(
  season: Season,
  teamId: string,
  wins: number,
  losses: number
): Season {
  return {
    ...season,
    teamRecords: season.teamRecords.map((r) =>
      r.teamId === teamId
        ? { ...r, firstHalfWins: wins, firstHalfLosses: losses, secondHalfWins: 0, secondHalfLosses: 0 }
        : r
    ),
  }
}

describe('seedLeague', () => {
  it('returns 6 teams ordered by seed', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    // Make NYY the AL East winner with 100 wins.
    s = setRecord(s, 'NYY', 100, 30)
    s = setRecord(s, 'TOR', 50, 80)
    s = setRecord(s, 'BAL', 40, 90)
    s = setRecord(s, 'BOS', 70, 60)
    s = setRecord(s, 'TB', 60, 70)
    // CLE wins AL Central with 95.
    s = setRecord(s, 'CLE', 95, 35)
    // HOU wins AL West.
    s = setRecord(s, 'HOU', 90, 40)
    // Wild cards: best 3 non-division-winners.
    s = setRecord(s, 'BOS', 88, 42)
    s = setRecord(s, 'SEA', 85, 45)
    s = setRecord(s, 'DET', 80, 50)
    const seeds = seedLeague(s, 'AL')
    expect(seeds).toHaveLength(6)
    expect(seeds[0]).toBe('NYY')   // best div winner
    expect(seeds[1]).toBe('CLE')
    expect(seeds[2]).toBe('HOU')
    // Top wild cards in order
    expect(seeds[3]).toBe('BOS')
    expect(seeds[4]).toBe('SEA')
    expect(seeds[5]).toBe('DET')
  })
})

describe('buildBracket', () => {
  it('produces 4 Wild Card Series (2 per league)', () => {
    let s = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    // Just give every team a record so seeding is deterministic.
    s.teamRecords = s.teamRecords.map((r, i) => ({
      ...r,
      firstHalfWins: 50 + (i % 30),
      firstHalfLosses: 81 - (50 + (i % 30)),
    }))
    const bracket = buildBracket(s)
    expect(bracket.alSeeds).toHaveLength(6)
    expect(bracket.nlSeeds).toHaveLength(6)
    expect(bracket.series).toHaveLength(4)
    const wcs = bracket.series.filter((x) => x.round === 'WCS')
    expect(wcs).toHaveLength(4)
  })
})

describe('series progression', () => {
  it('recordSeriesGame records a result and detects the winner', () => {
    const series: Series = {
      id: 'WCS-AL-3v6',
      round: 'WCS',
      league: 'AL',
      bestOf: 3,
      highSeedTeamId: 'TOR',
      lowSeedTeamId: 'TB',
      highSeedRank: 3,
      lowSeedRank: 6,
      results: [],
    }
    let s = recordSeriesGame(series, { homeWon: true, homeScore: 4, awayScore: 2 })
    expect(seriesIsComplete(s)).toBe(false)
    s = recordSeriesGame(s, { homeWon: true, homeScore: 5, awayScore: 1 })
    // High seed hosted games 1+2 in best-of-3, won both → series over.
    expect(seriesIsComplete(s)).toBe(true)
    expect(s.winnerId).toBe('TOR')
  })

  it('low seed wins when they take the series', () => {
    let s: Series = {
      id: 'WCS',
      round: 'WCS',
      league: 'AL',
      bestOf: 3,
      highSeedTeamId: 'TOR',
      lowSeedTeamId: 'TB',
      highSeedRank: 3,
      lowSeedRank: 6,
      results: [],
    }
    // Low seed wins game 1 (high was home, away won)
    s = recordSeriesGame(s, { homeWon: false, homeScore: 1, awayScore: 5 })
    s = recordSeriesGame(s, { homeWon: false, homeScore: 2, awayScore: 4 })
    expect(s.winnerId).toBe('TB')
  })
})
