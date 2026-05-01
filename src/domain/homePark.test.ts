// Tests for the user-home-park override resolver. The resolver is the
// single source of truth for "what park name + timezone do we display
// for a given game?" so all UI surfaces stay consistent.

import { describe, it, expect } from 'vitest'
import { resolveDisplayPark } from './homePark'
import type { Season, Game, UserSquad } from './types'
import { BALLPARK_BY_TEAM_ID, BALLPARK_BY_ID } from '../data/ballparks'

function makeSeason(squad: UserSquad | undefined): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
    userSquad: squad,
    startDate: '2026-04-01',
    currentDate: '2026-04-01',
    status: 'regular',
    rngSeed: 1,
    baseOvrSnapshot: {},
    ovrOverrides: {},
    rosterSnapshotId: 'r1',
    userGames: [],
    teamRecords: [],
    headToHead: {},
  } as Season
}

function makeGame(homeTeamId: string): Game {
  const park = BALLPARK_BY_TEAM_ID.get(homeTeamId)!
  return {
    gamePk: 1,
    date: '2026-04-01',
    gameDate: '2026-04-01T23:05:00Z',
    homeTeamId,
    awayTeamId: homeTeamId === 'NYY' ? 'BOS' : 'NYY',
    parkId: park.id,
    kind: 'userRegular',
    status: 'scheduled',
  }
}

describe('resolveDisplayPark', () => {
  describe('user is home', () => {
    it('returns the bundled park when no override is set', () => {
      const season = makeSeason({ name: 'Squad', abbrev: 'SQD' })
      const game = makeGame('NYY')
      const yankeeStadium = BALLPARK_BY_ID.get('yankee-stadium')!
      const result = resolveDisplayPark(season, game)
      expect(result.name).toBe(yankeeStadium.name)
      expect(result.timezone).toBe(yankeeStadium.timezone)
    })

    it('returns the chosen preset park name + its timezone when kind=preset', () => {
      const season = makeSeason({
        name: 'Squad',
        abbrev: 'SQD',
        homePark: { kind: 'preset', parkId: 'coors-field' },
      })
      const game = makeGame('NYY')
      const coors = BALLPARK_BY_ID.get('coors-field')!
      const result = resolveDisplayPark(season, game)
      expect(result.name).toBe(coors.name)
      expect(result.timezone).toBe(coors.timezone)
    })

    it('returns the custom name with the original park timezone when kind=custom', () => {
      const season = makeSeason({
        name: 'Squad',
        abbrev: 'SQD',
        homePark: { kind: 'custom', name: 'The Crater' },
      })
      const game = makeGame('NYY')
      const yankeeStadium = BALLPARK_BY_ID.get('yankee-stadium')!
      const result = resolveDisplayPark(season, game)
      expect(result.name).toBe('The Crater')
      // Custom parks have no real timezone — fall back so existing time
      // formatting keeps working.
      expect(result.timezone).toBe(yankeeStadium.timezone)
    })

    it('falls back gracefully when preset parkId is unknown (legacy / corrupted save)', () => {
      const season = makeSeason({
        name: 'Squad',
        abbrev: 'SQD',
        homePark: { kind: 'preset', parkId: 'no-such-park' },
      })
      const game = makeGame('NYY')
      const yankeeStadium = BALLPARK_BY_ID.get('yankee-stadium')!
      const result = resolveDisplayPark(season, game)
      expect(result.name).toBe(yankeeStadium.name)
      expect(result.timezone).toBe(yankeeStadium.timezone)
    })
  })

  describe('user is away', () => {
    it('always returns the actual home park (override never applies)', () => {
      const season = makeSeason({
        name: 'Squad',
        abbrev: 'SQD',
        homePark: { kind: 'custom', name: 'The Crater' },
      })
      // BOS hosts NYY: user is away.
      const game = makeGame('BOS')
      const fenway = BALLPARK_BY_ID.get('fenway-park')!
      const result = resolveDisplayPark(season, game)
      expect(result.name).toBe(fenway.name)
      expect(result.timezone).toBe(fenway.timezone)
    })
  })
})
