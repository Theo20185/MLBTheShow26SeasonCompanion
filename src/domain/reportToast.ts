// Builds the post-report toast text from the pre/post season state.
// Pure logic, called from Game.tsx after a report is committed.

import type { Season } from './types'
import type { ToastMessage } from '../views/Toast'

const MS_PER_DAY = 86_400_000
const ALL_STAR_GAP_DAYS = 2

export function buildReportToast(before: Season, after: Season): ToastMessage | null {
  const beforeWins = totalWins(before)
  const afterWins = totalWins(after)
  const dateChanged = before.currentDate !== after.currentDate
  const winsChanged = beforeWins !== afterWins
  if (!dateChanged && !winsChanged) return null

  const totalGamesPlayed = afterWins - beforeWins
  // We always commit one user game in a normal report, so simmed games
  // are everything beyond that. Bulk sim ahead can produce huge values
  // and that's fine — the toast just reports them.
  const simmedCount = Math.max(0, totalGamesPlayed - 1)

  const oldDateLabel = formatShortDate(before.currentDate)
  const newDateLabel = formatShortDate(after.currentDate)
  const dateRange = before.currentDate === after.currentDate
    ? newDateLabel
    : `${oldDateLabel} → ${newDateLabel}`

  // All-Star break detection: large date jump with very few games sim'd.
  // Real all-star break is 2-3 days; we use ≥2 day jump + extremely low
  // sim count to recognize it without hardcoding dates.
  const dayDelta = daysBetween(before.currentDate, after.currentDate)
  if (dayDelta >= ALL_STAR_GAP_DAYS && simmedCount <= 5) {
    return {
      id: Date.now(),
      text: `All-Star Break · resuming ${newDateLabel}`,
      durationMs: 4000,
    }
  }

  const simmedFragment = simmedCount === 0
    ? ''
    : ` · ${simmedCount} league game${simmedCount === 1 ? '' : 's'} simmed`

  return {
    id: Date.now(),
    text: `${dateRange}${simmedFragment}`,
    durationMs: 2000,
  }
}

function totalWins(season: Season): number {
  let sum = 0
  for (const r of season.teamRecords) {
    sum += r.firstHalfWins + r.secondHalfWins
  }
  return sum
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00Z').getTime()
  const b = new Date(bIso + 'T00:00:00Z').getTime()
  return Math.abs(Math.round((b - a) / MS_PER_DAY))
}
