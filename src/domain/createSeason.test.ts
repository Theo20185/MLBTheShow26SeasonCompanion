import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import { TEAM_MAP } from '../data/teamIdMap'
import { TEAM_BASE_OVRS } from '../data/bundledData'

describe('createSeason', () => {
  it('returns a fully-initialized Season for a valid team', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(season.userTeamId).toBe('NYY')
    expect(season.year).toBe(2026)
    expect(season.status).toBe('regular')
    expect(season.id).toMatch(/^season-/)
  })

  it('initializes currentDate to the team opening day', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(season.currentDate).toBe(season.startDate)
    // Should be a real opening day in late March / early April 2026
    expect(season.currentDate >= '2026-03-25').toBe(true)
    expect(season.currentDate <= '2026-04-15').toBe(true)
  })

  it('initializes 30 TeamRecords at 0-0', () => {
    const season = createSeason({ userTeamId: 'BOS' })
    expect(season.teamRecords).toHaveLength(30)
    for (const r of season.teamRecords) {
      expect(r.firstHalfWins).toBe(0)
      expect(r.firstHalfLosses).toBe(0)
      expect(r.secondHalfWins).toBe(0)
      expect(r.secondHalfLosses).toBe(0)
      expect(r.divisionWins).toBe(0)
      expect(r.divisionLosses).toBe(0)
    }
    expect(season.teamRecords.map((r) => r.teamId).sort()).toEqual(
      TEAM_MAP.map((t) => t.id).sort()
    )
  })

  it('initializes an empty HeadToHead matrix', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(season.headToHead).toEqual({})
  })

  it('snapshots all 30 baseOvrs from the bundled source', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(Object.keys(season.baseOvrSnapshot).sort()).toEqual(
      TEAM_MAP.map((t) => t.id).sort()
    )
    expect(season.baseOvrSnapshot.NYY).toBe(TEAM_BASE_OVRS.NYY)
    expect(season.baseOvrSnapshot.LAD).toBe(TEAM_BASE_OVRS.LAD)
  })

  it('starts with no OVR overrides', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(season.ovrOverrides).toEqual({})
  })

  it('builds the user team\'s 162-game schedule (within +/- 1)', () => {
    const season = createSeason({ userTeamId: 'CHC' })
    expect(season.userGames.length).toBeGreaterThanOrEqual(161)
    expect(season.userGames.length).toBeLessThanOrEqual(163)
    for (const g of season.userGames) {
      expect(g.homeTeamId === 'CHC' || g.awayTeamId === 'CHC').toBe(true)
      expect(g.kind).toBe('userRegular')
      expect(g.status).toBe('scheduled')
      expect(g.result).toBeUndefined()
    }
  })

  it('every game has a real ballpark id (the home team\'s park)', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    for (const g of season.userGames) {
      expect(g.parkId).toBeTruthy()
    }
  })

  it('throws on an unknown team id', () => {
    expect(() => createSeason({ userTeamId: 'ZZZ' })).toThrow(/Unknown team id/)
  })

  it('uses a different rngSeed when called repeatedly (unless seed pinned)', () => {
    const a = createSeason({ userTeamId: 'NYY' })
    const b = createSeason({ userTeamId: 'NYY' })
    expect(a.rngSeed).not.toBe(b.rngSeed)
  })

  it('uses the provided rngSeed when one is supplied (deterministic for tests)', () => {
    const a = createSeason({ userTeamId: 'NYY', rngSeed: 42 })
    expect(a.rngSeed).toBe(42)
  })
})
