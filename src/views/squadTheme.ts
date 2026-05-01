// Squad-color theming. The user picks a primary and secondary color
// plus a light/dark mode; the app applies them as inline styles on
// CTAs, navigation, and the user-team highlight.

import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { Season, ThemeMode } from '../domain/types'
import {
  DEFAULT_SQUAD_PRIMARY,
  DEFAULT_SQUAD_SECONDARY,
  DEFAULT_THEME_MODE,
} from '../domain/types'

export interface SquadTheme {
  primary: string
  primaryText: 'white' | 'black'
  secondary: string
  secondaryText: 'white' | 'black'
  mode: ThemeMode
}

/** Page background color per mode — used for contrast calculations. */
export const PAGE_BG: Record<ThemeMode, string> = {
  dark: '#0f172a', // slate-900
  light: '#ffffff',
}

/**
 * Resolves the active theme for a season — falls back to app defaults
 * when squad colors aren't set (legacy saves, or squads created before
 * theming shipped).
 */
export function themeForSeason(season: Season | null): SquadTheme {
  const primary = season?.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY
  const secondary = season?.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY
  const mode = season?.themeMode ?? DEFAULT_THEME_MODE
  return {
    primary,
    primaryText: contrastTextFor(primary),
    secondary,
    secondaryText: contrastTextFor(secondary),
    mode,
  }
}

/** Returns 'white' or 'black' depending on which has better contrast
 *  against the given hex color. */
export function contrastTextFor(hex: string): 'white' | 'black' {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#000000')
    ? 'white'
    : 'black'
}

/**
 * Returns a luminance-adjusted version of `color` that meets WCAG AA
 * (≥4.5:1) contrast against the page background for `mode`. Used so
 * user-picked team colors stay legible no matter what they pick.
 */
export function readableOn(color: string, mode: ThemeMode): string {
  const bg = PAGE_BG[mode]
  if (contrastRatio(color, bg) >= 4.5) return normalizeHex(color)
  // In dark mode, lift the color toward white; in light mode, push it
  // toward black. Iterate in 5% steps until contrast is satisfied or
  // we hit the endpoint (which always satisfies the threshold).
  const target = mode === 'dark' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
  const rgb = hexToRgb(color) ?? { r: 128, g: 128, b: 128 }
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = {
      r: Math.round(rgb.r + (target.r - rgb.r) * t),
      g: Math.round(rgb.g + (target.g - rgb.g) * t),
      b: Math.round(rgb.b + (target.b - rgb.b) * t),
    }
    const hex = rgbToHex(mixed)
    if (contrastRatio(hex, bg) >= 4.5) return hex
  }
  return rgbToHex(target)
}

/** WCAG contrast ratio between two hex colors. Returns 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
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

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function normalizeHex(hex: string): string {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(rgb) : hex
}

/** Inline style helper for primary buttons (background + contrasting text). */
export function primaryButtonStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: theme.primary,
    color: theme.primaryText,
  }
}

/** Inline style helper for secondary accents (e.g. the older usages). */
export function secondaryButtonStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: theme.secondary,
    color: theme.secondaryText,
  }
}

/** Style for non-accent navigation chips: secondary as background with
 *  contrasting text, plus a darker border for definition. */
export function secondaryNavStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: theme.secondary,
    color: theme.secondaryText,
    borderColor: theme.secondary,
  }
}

/** Faint primary tint, e.g. for the user-team row highlight in standings.
 *  Text color uses readableOn so it stays legible against the page bg
 *  regardless of the user's chosen primary color. */
export function primaryTintStyle(theme: SquadTheme): CSSProperties {
  return {
    backgroundColor: hexWithAlpha(theme.primary, 0.18),
    color: readableOn(theme.primary, theme.mode),
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Hook: applies the active theme mode to <html> by toggling the `dark`
 * class. Tailwind's `dark:` variant is wired to that class via
 * @custom-variant in index.css. Call this from any view that has a
 * resolved SquadTheme; cheap to call multiple times.
 */
export function useThemeMode(mode: ThemeMode): void {
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [mode])
}
