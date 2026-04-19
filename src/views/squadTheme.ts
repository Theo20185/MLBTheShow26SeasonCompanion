// Squad-color theming (PLAN-extension): the user picks a primary and
// secondary color; the app applies them as inline styles on the key
// CTAs, the user-team highlight in standings, and other "this is your
// team" affordances.

import type { CSSProperties } from 'react'
import type { Season } from '../domain/types'
import {
  DEFAULT_SQUAD_PRIMARY,
  DEFAULT_SQUAD_SECONDARY,
} from '../domain/types'

export interface SquadTheme {
  primary: string
  primaryText: string  // 'white' or 'black' for contrast against primary
  secondary: string
  secondaryText: string
}

/**
 * Resolves the active theme for a season — falls back to app defaults
 * when squad colors aren't set (legacy saves, or squads created before
 * theming shipped).
 */
export function themeForSeason(season: Season | null): SquadTheme {
  const primary = season?.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY
  const secondary = season?.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY
  return {
    primary,
    primaryText: contrastTextFor(primary),
    secondary,
    secondaryText: contrastTextFor(secondary),
  }
}

/** Returns 'white' or 'black' depending on which has better contrast
 *  against the given hex color. Standard luminance formula. */
export function contrastTextFor(hex: string): 'white' | 'black' {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'white'
  // Relative luminance (sRGB).
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? 'black' : 'white'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, '')
  if (cleaned.length !== 6) return null
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  if ([r, g, b].some((v) => Number.isNaN(v))) return null
  return { r, g, b }
}

/** Inline style helper for primary buttons (background + contrasting text). */
export function primaryButtonStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: theme.primary,
    color: theme.primaryText,
  }
}

/** Inline style helper for secondary accents. */
export function secondaryButtonStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: theme.secondary,
    color: theme.secondaryText,
  }
}

/** Faint primary tint, e.g. for the user-team row highlight in standings. */
export function primaryTintStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: hexWithAlpha(theme.primary, 0.18),
    color: theme.primary,
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

