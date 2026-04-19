import { describe, it, expect } from 'vitest'
import {
  getTeamSchedule,
  getOpeningDay,
  detectScheduleGaps,
  ALL_STAR_BREAK_MIN_DAYS,
} from './scheduleLoader'
import { TEAM_MAP } from '../data/teamIdMap'

describe('getTeamSchedule', () => {
  it('returns exactly 162 games for every team (within +/- 1 for tiebreakers)', () => {
    for (const t of TEAM_MAP) {
      const games = getTeamSchedule(t.id)
      expect(games.length, `${t.id} schedule length`).toBeGreaterThanOrEqual(161)
      expect(games.length, `${t.id} schedule length`).toBeLessThanOrEqual(163)
    }
  })

  it('returns games where the user team is either home or away (never neither)', () => {
    const games = getTeamSchedule('NYY')
    for (const g of games) {
      expect(
        g.homeTeamId === 'NYY' || g.awayTeamId === 'NYY',
        `NYY missing from game ${g.gamePk}`
      ).toBe(true)
    }
  })

  it('returns games sorted by gameDate ascending (stable for same-date doubleheaders)', () => {
    const games = getTeamSchedule('LAD')
    for (let i = 1; i < games.length; i++) {
      expect(games[i].gameDate >= games[i - 1].gameDate).toBe(true)
    }
  })

  it('returns the same games regardless of how many times called (pure)', () => {
    const a = getTeamSchedule('CHC')
    const b = getTeamSchedule('CHC')
    expect(a.map((g) => g.gamePk)).toEqual(b.map((g) => g.gamePk))
  })

  it('returns an empty array for an unknown team id', () => {
    expect(getTeamSchedule('ZZZ')).toEqual([])
  })
})

describe('getOpeningDay', () => {
  it('returns the date of the first scheduled game for the team', () => {
    const games = getTeamSchedule('NYY')
    const openingDay = getOpeningDay('NYY')
    expect(openingDay).toBe(games[0].officialDate)
  })

  it('returns null for an unknown team', () => {
    expect(getOpeningDay('ZZZ')).toBeNull()
  })

  it('every team has an opening day in late March or early April', () => {
    for (const t of TEAM_MAP) {
      const day = getOpeningDay(t.id)
      expect(day, `${t.id} has no opening day`).not.toBeNull()
      // Opening day should be 2026-03-25 to 2026-04-15 ish
      expect(day! >= '2026-03-20').toBe(true)
      expect(day! <= '2026-04-20').toBe(true)
    }
  })
})

describe('detectScheduleGaps', () => {
  it('finds the All-Star break (≥2 consecutive days with no games anywhere in MLB)', () => {
    const gaps = detectScheduleGaps()
    // The 2026 All-Star break is mid-July.
    const summerGaps = gaps.filter(
      (g) => g.startDate >= '2026-07-10' && g.startDate <= '2026-07-20'
    )
    expect(summerGaps.length).toBeGreaterThanOrEqual(1)
    const longest = gaps.reduce((max, g) =>
      g.lengthDays > max.lengthDays ? g : max
    )
    expect(longest.lengthDays).toBeGreaterThanOrEqual(ALL_STAR_BREAK_MIN_DAYS)
  })
})
