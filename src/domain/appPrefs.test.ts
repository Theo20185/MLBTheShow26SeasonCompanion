import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadAppPrefs,
  saveAppPrefs,
  setAppThemeMode,
  resolveActiveThemeMode,
  DEFAULT_APP_PREFS,
} from './appPrefs'
import type { Season } from './types'

function seasonWith(themeMode?: 'light' | 'dark'): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
    startDate: '2026-04-01',
    currentDate: '2026-04-01',
    status: 'regular',
    rngSeed: 1,
    themeMode,
    baseOvrSnapshot: {},
    ovrOverrides: {},
    rosterSnapshotId: 'r1',
    userGames: [],
    teamRecords: [],
    headToHead: {},
  } as Season
}

describe('appPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadAppPrefs', () => {
    it('returns the defaults when no prefs are stored', () => {
      expect(loadAppPrefs()).toEqual(DEFAULT_APP_PREFS)
    })

    it('round-trips through localStorage', () => {
      saveAppPrefs({ themeMode: 'light' })
      expect(loadAppPrefs().themeMode).toBe('light')
    })

    it('returns defaults when stored JSON is corrupted', () => {
      localStorage.setItem('app:prefs', '{not-json')
      expect(loadAppPrefs()).toEqual(DEFAULT_APP_PREFS)
    })
  })

  describe('setAppThemeMode', () => {
    it('updates only themeMode and preserves other prefs', () => {
      saveAppPrefs({ themeMode: 'dark' })
      setAppThemeMode('light')
      expect(loadAppPrefs().themeMode).toBe('light')
    })
  })

  describe('resolveActiveThemeMode', () => {
    it('uses season.themeMode when the season has one set (in-game override)', () => {
      saveAppPrefs({ themeMode: 'light' })
      const mode = resolveActiveThemeMode(seasonWith('dark'))
      expect(mode).toBe('dark')
    })

    it('falls back to app pref when season has no themeMode', () => {
      saveAppPrefs({ themeMode: 'light' })
      const mode = resolveActiveThemeMode(seasonWith(undefined))
      expect(mode).toBe('light')
    })

    it('falls back to app pref when there is no season at all', () => {
      saveAppPrefs({ themeMode: 'light' })
      expect(resolveActiveThemeMode(null)).toBe('light')
    })

    it('falls back to default dark when neither season nor app pref is set', () => {
      expect(resolveActiveThemeMode(null)).toBe('dark')
    })
  })
})
