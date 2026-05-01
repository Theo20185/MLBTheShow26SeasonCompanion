// Resolves the display park (name + timezone) for a given game in the
// context of a season. Single source of truth so every home-game
// surface (Game card, PostseasonGame card) shows the same park name
// when the user has overridden their home park.

import type { Season, Game } from './types'
import { BALLPARK_BY_ID, BALLPARK_BY_TEAM_ID } from '../data/ballparks'

export interface DisplayPark {
  name: string
  timezone: string
}

/**
 * Returns the park to display for `game` from the user's perspective.
 *
 * When the user team is the home team AND the season's userSquad has
 * a `homePark` override:
 *   - kind='preset': use that park's name + timezone.
 *   - kind='custom': use the custom name; timezone falls back to the
 *     bundled park's timezone (custom parks have no real-world tz).
 *
 * Otherwise (away game, or no override): returns the game's actual park.
 */
export function resolveDisplayPark(season: Season, game: Game): DisplayPark {
  const fallback = bundledPark(game.parkId, game.homeTeamId)
  const userIsHome = game.homeTeamId === season.userTeamId
  const override = season.userSquad?.homePark
  if (!userIsHome || !override) return fallback

  if (override.kind === 'preset') {
    const preset = BALLPARK_BY_ID.get(override.parkId)
    if (!preset) return fallback
    return { name: preset.name, timezone: preset.timezone }
  }

  // kind === 'custom' — keep the original tz so date/time formatting still works.
  return { name: override.name, timezone: fallback.timezone }
}

function bundledPark(parkId: string, fallbackTeamId: string): DisplayPark {
  const direct = BALLPARK_BY_ID.get(parkId)
  if (direct) return { name: direct.name, timezone: direct.timezone }
  const byTeam = BALLPARK_BY_TEAM_ID.get(fallbackTeamId)
  if (byTeam) return { name: byTeam.name, timezone: byTeam.timezone }
  return { name: fallbackTeamId, timezone: 'America/New_York' }
}
