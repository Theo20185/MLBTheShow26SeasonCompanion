import { describe, it, expect } from 'vitest'
import {
  themeForSeason,
  contrastTextFor,
  readableOn,
  contrastRatio,
  secondaryNavStyle,
  primaryTintStyle,
} from './squadTheme'
import type { Season } from '../domain/types'

function seasonWith(partial: Partial<Season>): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
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
    ...partial,
  } as Season
}

describe('squadTheme', () => {
  describe('themeForSeason', () => {
    it('defaults to dark mode when season has no themeMode (legacy save)', () => {
      const theme = themeForSeason(seasonWith({}))
      expect(theme.mode).toBe('dark')
    })

    it('defaults to dark mode when season is null', () => {
      const theme = themeForSeason(null)
      expect(theme.mode).toBe('dark')
    })

    it('reflects the season-saved theme mode when present', () => {
      const theme = themeForSeason(seasonWith({ themeMode: 'light' }))
      expect(theme.mode).toBe('light')
    })

    it('exposes primary, secondary, and contrast text colors', () => {
      const theme = themeForSeason(
        seasonWith({
          userSquad: { name: 'X', abbrev: 'X', primaryColor: '#003087', secondaryColor: '#ffd700' },
        })
      )
      expect(theme.primary).toBe('#003087')
      expect(theme.secondary).toBe('#ffd700')
      expect(theme.primaryText).toBe('white')
      expect(theme.secondaryText).toBe('black')
    })
  })

  describe('contrastTextFor', () => {
    it('picks white on a dark color', () => {
      expect(contrastTextFor('#003087')).toBe('white')
    })
    it('picks black on a light color', () => {
      expect(contrastTextFor('#ffd700')).toBe('black')
    })
  })

  describe('contrastRatio', () => {
    it('computes WCAG ratio between two colors (white on black ≈ 21)', () => {
      expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
    })
    it('same color has ratio 1', () => {
      expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 2)
    })
  })

  describe('readableOn', () => {
    it('keeps a high-contrast color as-is on dark bg', () => {
      // Bright yellow on dark bg: already legible.
      const out = readableOn('#ffd700', 'dark')
      expect(contrastRatio(out, '#0f172a')).toBeGreaterThanOrEqual(4.5)
    })

    it('lightens a dark color so it becomes readable on dark bg', () => {
      // Navy is unreadable on slate-900; readableOn must lighten it.
      const out = readableOn('#003087', 'dark')
      expect(contrastRatio(out, '#0f172a')).toBeGreaterThanOrEqual(4.5)
    })

    it('darkens a light color so it becomes readable on light bg', () => {
      // Bright yellow is unreadable on white; readableOn must darken it.
      const out = readableOn('#ffd700', 'light')
      expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    })

    it('keeps a dark color as-is on light bg', () => {
      const out = readableOn('#003087', 'light')
      expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    })

    it('returns a 6-digit hex string', () => {
      expect(readableOn('#003087', 'dark')).toMatch(/^#[0-9a-f]{6}$/i)
      expect(readableOn('#ffd700', 'light')).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('secondaryNavStyle', () => {
    it('uses the secondary color as background with contrasting text', () => {
      const theme = themeForSeason(
        seasonWith({
          userSquad: { name: 'X', abbrev: 'X', primaryColor: '#003087', secondaryColor: '#ffd700' },
        })
      )
      const style = secondaryNavStyle(theme)
      expect(style.backgroundColor).toBe('#ffd700')
      expect(style.color).toBe('black')
    })
  })

  describe('primaryTintStyle uses readable text against page bg', () => {
    it('produces text color with at least 4.5:1 contrast vs the dark page bg', () => {
      const theme = themeForSeason(
        seasonWith({
          themeMode: 'dark',
          userSquad: { name: 'X', abbrev: 'X', primaryColor: '#003087' },
        })
      )
      const style = primaryTintStyle(theme)
      expect(typeof style.color).toBe('string')
      expect(contrastRatio(style.color as string, '#0f172a')).toBeGreaterThanOrEqual(4.5)
    })

    it('produces text color with at least 4.5:1 contrast vs the light page bg', () => {
      const theme = themeForSeason(
        seasonWith({
          themeMode: 'light',
          userSquad: { name: 'X', abbrev: 'X', primaryColor: '#ffd700' },
        })
      )
      const style = primaryTintStyle(theme)
      expect(contrastRatio(style.color as string, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    })
  })
})
