// Centralized date/time formatters for game cards. Times always display
// in the venue's local timezone (not the user's browser TZ) — when the
// user is setting up a Vs. CPU game in The Show, the time on the card
// should match what they'd see at the actual ballpark.

import { BALLPARK_BY_ID } from '../data/ballparks'

/**
 * Formats a game's calendar date in the venue's local timezone.
 * Falls back to UTC midday if the park can't be resolved.
 */
export function formatGameDate(officialDate: string, parkId: string): string {
  const tz = BALLPARK_BY_ID.get(parkId)?.timezone
  // Anchor to noon UTC so DST quirks at midnight don't roll the date.
  const d = new Date(officialDate + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  })
}

/**
 * Formats a game's start time in the venue's local timezone.
 * Renders e.g. "7:08 PM" regardless of where the user is browsing from.
 */
export function formatGameTime(gameDateIso: string, parkId: string): string {
  const tz = BALLPARK_BY_ID.get(parkId)?.timezone
  const d = new Date(gameDateIso)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  })
}
