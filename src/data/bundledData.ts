// Typed accessors for the committed JSON data files. Keeps callers
// from importing the raw JSON with inferred-loose types.

import scheduleJson from './schedule2026.json'
import playersJson from './players.json'
import teamBaseOvrsJson from './teamBaseOvrs.json'
import type { NormalizedGame } from './scheduleNormalize'
import type { RosterPlayer } from './teamOvr'

export const SCHEDULE_2026: readonly NormalizedGame[] = scheduleJson.games
export const SCHEDULE_FETCHED_AT: string = scheduleJson.fetchedAt

export const PLAYERS: readonly RosterPlayer[] = playersJson.players as RosterPlayer[]
export const PLAYERS_FETCHED_AT: string = playersJson.fetchedAt

export const TEAM_BASE_OVRS: Readonly<Record<string, number>> =
  teamBaseOvrsJson.teamBaseOvrs
export const TEAM_BASE_OVRS_FETCHED_AT: string = teamBaseOvrsJson.fetchedAt
