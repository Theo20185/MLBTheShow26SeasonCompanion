import { describe, it, expect } from 'vitest'
import {
  SCHEDULE_2026,
  PLAYERS,
  TEAM_BASE_OVRS,
} from './bundledData'
import { TEAM_MAP, TEAM_BY_ID } from './teamIdMap'
import { BALLPARK_BY_TEAM_ID } from './ballparks'

// Integrity tests on the committed bundled JSON. These are the
// "data is sane" checks PLAN.md §9 phase 3 requires before we trust
// the data downstream.

describe('bundled team / division metadata', () => {
  it('has exactly 30 teams', () => {
    expect(TEAM_MAP).toHaveLength(30)
  })

  it('has 6 divisions of 5 teams each', () => {
    const counts = new Map<string, number>()
    for (const t of TEAM_MAP) {
      const key = `${t.league}-${t.division}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    for (const [key, count] of counts) {
      expect(count, `expected ${key} to have 5 teams`).toBe(5)
    }
  })

  it('every team has a home ballpark', () => {
    for (const t of TEAM_MAP) {
      expect(
        BALLPARK_BY_TEAM_ID.get(t.id),
        `missing ballpark for ${t.id}`
      ).toBeDefined()
    }
  })

  it('team ids are unique', () => {
    const ids = TEAM_MAP.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mlbStatsId values are unique', () => {
    const ids = TEAM_MAP.map((t) => t.mlbStatsId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('showShortName values are unique', () => {
    const ids = TEAM_MAP.map((t) => t.showShortName)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('bundled players + team OVRs', () => {
  it('every team has at least 25 live-series players', () => {
    const counts = new Map<string, number>()
    for (const p of PLAYERS) {
      counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1)
    }
    for (const t of TEAM_MAP) {
      expect(
        counts.get(t.id) ?? 0,
        `team ${t.id} has too few players`
      ).toBeGreaterThanOrEqual(25)
    }
  })

  it('player uuids are unique', () => {
    const uuids = PLAYERS.map((p) => p.uuid)
    expect(new Set(uuids).size).toBe(uuids.length)
  })

  it('every team has a base OVR', () => {
    for (const t of TEAM_MAP) {
      expect(TEAM_BASE_OVRS[t.id], `missing baseOvr for ${t.id}`).toBeGreaterThan(0)
    }
  })

  it('base OVRs are within a sensible MLB range (60-90)', () => {
    for (const t of TEAM_MAP) {
      const ovr = TEAM_BASE_OVRS[t.id]
      expect(ovr, `OVR out of range for ${t.id}: ${ovr}`).toBeGreaterThanOrEqual(60)
      expect(ovr, `OVR out of range for ${t.id}: ${ovr}`).toBeLessThanOrEqual(90)
    }
  })
})

describe('bundled 2026 schedule', () => {
  it('has roughly 2430 regular-season games (162 × 30 / 2 = 2430)', () => {
    // Allow a little slack for tiebreaker games and schedule oddities.
    expect(SCHEDULE_2026.length).toBeGreaterThan(2400)
    expect(SCHEDULE_2026.length).toBeLessThan(2480)
  })

  it('every team plays exactly 81 home games (within +/- 1 for tiebreakers)', () => {
    const homeCounts = new Map<string, number>()
    for (const g of SCHEDULE_2026) {
      homeCounts.set(g.homeTeamId, (homeCounts.get(g.homeTeamId) ?? 0) + 1)
    }
    for (const t of TEAM_MAP) {
      const c = homeCounts.get(t.id) ?? 0
      expect(c, `${t.id} home games`).toBeGreaterThanOrEqual(80)
      expect(c, `${t.id} home games`).toBeLessThanOrEqual(82)
    }
  })

  it('every team plays exactly 81 away games (within +/- 1 for tiebreakers)', () => {
    const awayCounts = new Map<string, number>()
    for (const g of SCHEDULE_2026) {
      awayCounts.set(g.awayTeamId, (awayCounts.get(g.awayTeamId) ?? 0) + 1)
    }
    for (const t of TEAM_MAP) {
      const c = awayCounts.get(t.id) ?? 0
      expect(c, `${t.id} away games`).toBeGreaterThanOrEqual(80)
      expect(c, `${t.id} away games`).toBeLessThanOrEqual(82)
    }
  })

  it('every gamePk is unique', () => {
    const pks = SCHEDULE_2026.map((g) => g.gamePk)
    expect(new Set(pks).size).toBe(pks.length)
  })

  it('every team appears as both home and away across the season', () => {
    const home = new Set(SCHEDULE_2026.map((g) => g.homeTeamId))
    const away = new Set(SCHEDULE_2026.map((g) => g.awayTeamId))
    for (const t of TEAM_MAP) {
      expect(home.has(t.id), `${t.id} never plays at home`).toBe(true)
      expect(away.has(t.id), `${t.id} never plays away`).toBe(true)
    }
  })

  it('every game references a real team id', () => {
    for (const g of SCHEDULE_2026) {
      expect(TEAM_BY_ID.has(g.homeTeamId), `bad home: ${g.homeTeamId}`).toBe(true)
      expect(TEAM_BY_ID.has(g.awayTeamId), `bad away: ${g.awayTeamId}`).toBe(true)
    }
  })
})
