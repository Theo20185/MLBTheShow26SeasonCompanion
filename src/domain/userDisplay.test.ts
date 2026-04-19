import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import { getUserDisplay, isUserTeam } from './userDisplay'

describe('getUserDisplay', () => {
  it('falls back to the MLB team name when no userSquad is set (legacy save)', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    const d = getUserDisplay(season, 'NYY')
    expect(d.name).toBe('Yankees')
    expect(d.abbrev).toBe('NYY')
    expect(d.city).toBe('New York')
    expect(d.isUser).toBe(true)
  })

  it('uses the userSquad name and abbrev for the user team', () => {
    const season = {
      ...createSeason({ userTeamId: 'NYY' }),
      userSquad: { name: 'Bombers', abbrev: 'BMB' },
    }
    const d = getUserDisplay(season, 'NYY')
    expect(d.name).toBe('Bombers')
    expect(d.abbrev).toBe('BMB')
    expect(d.isUser).toBe(true)
    // City is suppressed for the user squad — it's their squad, not a city team.
    expect(d.city).toBe('')
  })

  it('returns the MLB identity for non-user teams regardless of squad config', () => {
    const season = {
      ...createSeason({ userTeamId: 'NYY' }),
      userSquad: { name: 'Bombers', abbrev: 'BMB' },
    }
    const d = getUserDisplay(season, 'BAL')
    expect(d.name).toBe('Orioles')
    expect(d.abbrev).toBe('BAL')
    expect(d.city).toBe('Baltimore')
    expect(d.isUser).toBe(false)
  })

  it('returns a sane default for an unknown team id', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    const d = getUserDisplay(season, 'ZZZ')
    expect(d.name).toBe('ZZZ')
    expect(d.abbrev).toBe('ZZZ')
    expect(d.isUser).toBe(false)
  })
})

describe('isUserTeam', () => {
  it('returns true for the user team id', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(isUserTeam(season, 'NYY')).toBe(true)
  })
  it('returns false for any other team', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    expect(isUserTeam(season, 'BOS')).toBe(false)
  })
})
