import { describe, it, expect, beforeEach } from 'vitest'
import { createSeason } from './createSeason'
import {
  saveSeason,
  loadSeason,
  deleteSeason,
  deleteAllInProgressSeasons,
  listSeasons,
  listInProgressSeasons,
} from './seasonStore'

describe('seasonStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a freshly-created season', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const loaded = loadSeason(season.id)
    expect(loaded).toEqual(season)
  })

  it('returns null for an unknown season id', () => {
    expect(loadSeason('nonexistent')).toBeNull()
  })

  it('lists all saved seasons in the index, newest first', () => {
    const a = createSeason({ userTeamId: 'NYY', createdAt: new Date('2026-04-01') })
    const b = createSeason({ userTeamId: 'BOS', createdAt: new Date('2026-04-02') })
    const c = createSeason({ userTeamId: 'LAD', createdAt: new Date('2026-04-03') })
    saveSeason(a)
    saveSeason(b)
    saveSeason(c)
    const index = listSeasons()
    expect(index.map((e) => e.userTeamId)).toEqual(['LAD', 'BOS', 'NYY'])
  })

  it('removes a season and its index entry on delete', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    saveSeason(season)
    deleteSeason(season.id)
    expect(loadSeason(season.id)).toBeNull()
    expect(listSeasons().find((e) => e.id === season.id)).toBeUndefined()
  })

  it('overwrites a previously-saved season with the same id', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const updated = { ...season, currentDate: '2026-05-01' }
    saveSeason(updated)
    expect(loadSeason(season.id)?.currentDate).toBe('2026-05-01')
    // No duplicate index entries
    expect(listSeasons().filter((e) => e.id === season.id)).toHaveLength(1)
  })

  it('persists a season across simulated reloads (localStorage survives)', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    saveSeason(season)
    // Simulate reload by re-importing the store (no-op in test) and reading again.
    expect(loadSeason(season.id)).not.toBeNull()
  })
})

describe('listInProgressSeasons + deleteAllInProgressSeasons', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('listInProgressSeasons returns only seasons whose status is not complete', () => {
    const a = createSeason({ userTeamId: 'NYY', createdAt: new Date('2026-04-01') })
    const b = { ...createSeason({ userTeamId: 'BOS', createdAt: new Date('2026-04-02') }), status: 'complete' as const }
    const c = createSeason({ userTeamId: 'LAD', createdAt: new Date('2026-04-03') })
    saveSeason(a)
    saveSeason(b)
    saveSeason(c)
    const ids = listInProgressSeasons().map((e) => e.id)
    expect(ids).toContain(a.id)
    expect(ids).toContain(c.id)
    expect(ids).not.toContain(b.id)
  })

  it('deleteAllInProgressSeasons removes only in-progress ones, preserves complete', () => {
    const a = createSeason({ userTeamId: 'NYY', createdAt: new Date('2026-04-01') })
    const b = { ...createSeason({ userTeamId: 'BOS', createdAt: new Date('2026-04-02') }), status: 'complete' as const }
    const c = createSeason({ userTeamId: 'LAD', createdAt: new Date('2026-04-03') })
    saveSeason(a)
    saveSeason(b)
    saveSeason(c)

    deleteAllInProgressSeasons()

    expect(loadSeason(a.id)).toBeNull()
    expect(loadSeason(b.id)).not.toBeNull() // complete preserved
    expect(loadSeason(c.id)).toBeNull()
    const indexIds = listSeasons().map((e) => e.id)
    expect(indexIds).toEqual([b.id])
  })
})

describe('listSeasons self-heals orphan index entries', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes index entries whose season data is missing', () => {
    const season = createSeason({ userTeamId: 'NYY' })
    saveSeason(season)
    // Manually nuke the season payload but leave the index entry — simulating a
    // partial corruption (e.g. someone cleared a single key in DevTools).
    localStorage.removeItem(`season:${season.id}`)
    // listSeasons should self-heal and return an empty list.
    expect(listSeasons()).toEqual([])
  })
})
