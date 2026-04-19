// Single source of truth for "what to display for this team."
//
// The user picks an MLB team slot (e.g. "NYY") to take over with their
// Diamond Dynasty squad. The squad has its own name + abbreviation,
// configured at setup. Anywhere we'd otherwise show "New York Yankees"
// for the user's team, we should show their squad name instead.
//
// This helper centralizes that lookup so views don't independently
// branch on whether the team is the user's.

import { TEAM_BY_ID } from '../data/teamIdMap'
import type { Season } from './types'

export interface TeamDisplay {
  /** Short name to render. For the user, the DD squad name; otherwise the MLB team name. */
  name: string
  /** Compact abbreviation for chips and tables. */
  abbrev: string
  /** City. Empty string for the user's squad (it's their squad, not a city team). */
  city: string
  /** True if this teamId is the user team slot. */
  isUser: boolean
}

export function isUserTeam(season: Season, teamId: string): boolean {
  return season.userTeamId === teamId
}

export function getUserDisplay(season: Season, teamId: string): TeamDisplay {
  const isUser = isUserTeam(season, teamId)
  if (isUser && season.userSquad) {
    return {
      name: season.userSquad.name,
      abbrev: season.userSquad.abbrev,
      city: '',
      isUser: true,
    }
  }
  const team = TEAM_BY_ID.get(teamId)
  if (!team) {
    return { name: teamId, abbrev: teamId, city: '', isUser }
  }
  return {
    name: team.name,
    abbrev: team.id,
    city: team.city,
    isUser,
  }
}

/** Convenience: full label like "New York Yankees" or "Bombers" for the user. */
export function fullLabel(season: Season, teamId: string): string {
  const d = getUserDisplay(season, teamId)
  return d.city ? `${d.city} ${d.name}` : d.name
}
