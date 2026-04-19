// Normalizer for the MLB Stats API schedule response.
// Pure functions, no I/O — the fetch script (scripts/fetchSchedule.ts)
// pulls the raw JSON and feeds it here. Tests cover this in isolation.

import { TEAM_BY_MLB_STATS_ID } from './teamIdMap'

// Subset of fields we care about from statsapi.mlb.com /api/v1/schedule.
// Other response fields are tolerated but ignored.
export interface RawTeamRef {
  team: { id: number; name: string }
  isWinner?: boolean
}

export interface RawGame {
  gamePk: number
  gameDate: string       // ISO 8601 UTC
  officialDate: string   // calendar date in the venue's timezone
  gameType: string       // 'R' regular, 'A' all-star, 'P' postseason, etc.
  doubleHeader: string   // 'N' (not), 'Y' (traditional), 'S' (split)
  status: { abstractGameState: string }
  venue: { id: number; name: string }
  teams: { home: RawTeamRef; away: RawTeamRef }
}

export interface RawScheduleResponse {
  dates: { date: string; games: RawGame[] }[]
}

export interface NormalizedGame {
  gamePk: number
  officialDate: string
  gameDate: string
  homeTeamId: string
  awayTeamId: string
  venueId: number
  venueName: string
  doubleHeader: string
}

export function normalizeScheduleResponse(
  raw: RawScheduleResponse
): NormalizedGame[] {
  // The MLB Stats API occasionally returns the same gamePk across multiple
  // date blocks (rescheduled games shown on both their original and new
  // dates). Dedupe by gamePk; the first occurrence wins.
  const byGamePk = new Map<number, NormalizedGame>()
  for (const dateBlock of raw.dates) {
    for (const game of dateBlock.games) {
      if (game.gameType !== 'R') continue
      if (byGamePk.has(game.gamePk)) continue
      const home = TEAM_BY_MLB_STATS_ID.get(game.teams.home.team.id)
      const away = TEAM_BY_MLB_STATS_ID.get(game.teams.away.team.id)
      if (!home) {
        throw new Error(
          `Unknown MLB Stats team id: ${game.teams.home.team.id} (${game.teams.home.team.name})`
        )
      }
      if (!away) {
        throw new Error(
          `Unknown MLB Stats team id: ${game.teams.away.team.id} (${game.teams.away.team.name})`
        )
      }
      byGamePk.set(game.gamePk, {
        gamePk: game.gamePk,
        officialDate: game.officialDate,
        gameDate: game.gameDate,
        homeTeamId: home.id,
        awayTeamId: away.id,
        venueId: game.venue.id,
        venueName: game.venue.name,
        doubleHeader: game.doubleHeader,
      })
    }
  }
  return Array.from(byGamePk.values())
}
