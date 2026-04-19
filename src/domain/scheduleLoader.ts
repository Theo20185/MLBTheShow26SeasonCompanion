// Schedule loader (PLAN.md §6.2). Reads from the bundled 2026 schedule
// and produces per-team game lists. No I/O — purely a filter over the
// committed JSON.

import { SCHEDULE_2026 } from '../data/bundledData'
import type { NormalizedGame } from '../data/scheduleNormalize'
import { TEAM_BY_ID } from '../data/teamIdMap'

/** Minimum gap length (in days) we treat as an All-Star Break. */
export const ALL_STAR_BREAK_MIN_DAYS = 2

/**
 * Returns the user team's 162-game schedule, sorted by gameDate ascending
 * (stable for same-date doubleheaders, ordered by their gamePk fallback).
 */
export function getTeamSchedule(teamId: string): NormalizedGame[] {
  if (!TEAM_BY_ID.has(teamId)) return []
  const games = SCHEDULE_2026.filter(
    (g) => g.homeTeamId === teamId || g.awayTeamId === teamId
  )
  // Sort by gameDate, then by gamePk as a stable tiebreaker for doubleheaders.
  return [...games].sort((a, b) => {
    if (a.gameDate !== b.gameDate) return a.gameDate < b.gameDate ? -1 : 1
    return a.gamePk - b.gamePk
  })
}

/**
 * Returns the opening day (officialDate of the first game) for the team,
 * or null if the team has no schedule entries.
 */
export function getOpeningDay(teamId: string): string | null {
  const games = getTeamSchedule(teamId)
  return games.length > 0 ? games[0].officialDate : null
}

export interface ScheduleGap {
  startDate: string  // first day with no games (inclusive)
  endDate: string    // last day with no games (inclusive)
  lengthDays: number
}

/**
 * Detects multi-day gaps in the league-wide schedule (no games scheduled
 * across all of MLB). The 2026 schedule's biggest gap is the All-Star
 * Break in mid-July; this is what the Game screen's gap-aware toast
 * uses to show the "All-Star Break · July 14-16" message.
 */
export function detectScheduleGaps(): ScheduleGap[] {
  const dates = new Set(SCHEDULE_2026.map((g) => g.officialDate))
  if (dates.size === 0) return []

  const sorted = Array.from(dates).sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const gaps: ScheduleGap[] = []
  const cursor = new Date(first + 'T00:00:00Z')
  const end = new Date(last + 'T00:00:00Z')

  let gapStart: string | null = null
  while (cursor.getTime() < end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const iso = cursor.toISOString().slice(0, 10)
    if (dates.has(iso)) {
      if (gapStart) {
        const gapEnd = previousDay(iso)
        const length = daysBetween(gapStart, gapEnd) + 1
        if (length >= ALL_STAR_BREAK_MIN_DAYS) {
          gaps.push({ startDate: gapStart, endDate: gapEnd, lengthDays: length })
        }
        gapStart = null
      }
    } else {
      if (!gapStart) gapStart = iso
    }
  }
  return gaps
}

function previousDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}
