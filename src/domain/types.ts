// Domain types per PLAN.md §4. Persisted shapes are the source of
// truth for the save file format.

import type { NormalizedGame } from '../data/scheduleNormalize'
import type { LeagueId, DivisionId } from '../data/teamIdMap'
import type { Bracket } from './bracket'

export type SeasonStatus = 'setup' | 'regular' | 'postseason' | 'complete'

export type GameKind = 'userRegular' | 'postseason'

export interface BoxScoreInning {
  runs: number
}

export interface BoxScore {
  inningsHome: BoxScoreInning[]
  inningsAway: BoxScoreInning[]
  hitsHome: number
  hitsAway: number
  errorsHome: number
  errorsAway: number
}

export interface GameResult {
  homeScore: number
  awayScore: number
  quick: boolean   // true for Quick Report W/L; false for Full box-score Report
  simmed: boolean  // true if user chose "Sim this game"
  detail?: BoxScore
}

export interface Game {
  gamePk: number
  date: string         // officialDate; ISO (yyyy-mm-dd)
  gameDate: string     // ISO 8601 UTC datetime
  homeTeamId: string
  awayTeamId: string
  parkId: string       // ballpark id
  kind: GameKind
  status: 'scheduled' | 'played'
  result?: GameResult
}

export interface TeamRecord {
  teamId: string
  firstHalfWins: number
  firstHalfLosses: number
  secondHalfWins: number
  secondHalfLosses: number
  divisionWins: number
  divisionLosses: number
}

/** Sparse, by-team-id matrix of head-to-head wins.
 *  HEAD_TO_HEAD[teamA][teamB] = how many times teamA beat teamB. */
export type HeadToHead = Record<string, Record<string, number>>

export interface PreReportSnapshot {
  gameId: number
  currentDate: string
  rngSeed: number
  teamRecords: TeamRecord[]
  headToHead: HeadToHead
  priorResult?: GameResult
  // Postseason-only fields. Captured before lockstep parallel sims +
  // round transitions run so Undo can restore the entire bracket and
  // any status/champion change a WS-final report triggered.
  bracket?: Bracket
  postseasonGames?: Game[]
  status?: SeasonStatus
  champion?: string
}

export interface UserSquad {
  /** Display name of the user's Diamond Dynasty squad (e.g. "Bombers"). */
  name: string
  /** 2-4 letter abbreviation of the squad (e.g. "BMB"). */
  abbrev: string
  /** Primary squad color (hex like "#003087") — used for CTAs, the user-team
   *  highlight, and other "this is your team" affordances. Optional;
   *  legacy saves and unset squads fall back to the app default emerald. */
  primaryColor?: string
  /** Secondary squad color (hex) — used for accents like the postseason
   *  bracket nav chip and progress chip backgrounds. Falls back to amber. */
  secondaryColor?: string
  /** Override for the squad's home park. When unset, home games show the
   *  bundled park for the replaced MLB team. The game time/date formatter
   *  uses the override's timezone when it's a real preset; for custom
   *  parks (created in The Show), timezone falls back to the original. */
  homePark?: UserHomePark
}

export type UserHomePark =
  | { kind: 'preset'; parkId: string }
  | { kind: 'custom'; name: string }

/** App-default colors used when the user hasn't picked any. Emerald + amber
 *  match the original (pre-theming) visual style. */
export const DEFAULT_SQUAD_PRIMARY = '#059669'
export const DEFAULT_SQUAD_SECONDARY = '#d97706'

/**
 * Default regulation length for games the user plays. The Show lets
 * Vs. CPU games run as short as 3 innings; we let the user mirror that
 * setting so the box-score validator doesn't flag short reports as
 * incomplete. 9 is the MLB default.
 */
export type GameLength = 3 | 5 | 7 | 9
export const ALLOWED_GAME_LENGTHS: GameLength[] = [3, 5, 7, 9]
export const DEFAULT_GAME_LENGTH: GameLength = 9

/** App color scheme. Defaults to 'dark' when missing (legacy saves). */
export type ThemeMode = 'light' | 'dark'
export const DEFAULT_THEME_MODE: ThemeMode = 'dark'

export interface Season {
  id: string
  year: number
  userTeamId: string         // the MLB team slot the user replaced (e.g., "NYY")
  userSquad?: UserSquad      // user's DD identity; missing on legacy saves (falls back to MLB team)
  themeMode?: ThemeMode      // light/dark mode; defaults to 'dark' when missing
  defaultGameLength?: GameLength // user's preferred game length for full-report validation (default 9)
  startDate: string          // opening day for the user team
  currentDate: string
  status: SeasonStatus
  rngSeed: number
  baseOvrSnapshot: Record<string, number>
  ovrOverrides: Record<string, number>
  rosterSnapshotId: string
  userGames: Game[]
  teamRecords: TeamRecord[]
  headToHead: HeadToHead
  lastSnapshot?: PreReportSnapshot
  bracket?: Bracket          // populated when status >= 'postseason'
  postseasonGames?: Game[]   // synthesized user-played postseason games
  champion?: string          // teamId of WS winner; set when status === 'complete'
  recordSwapApplied?: boolean // true if simToPostseason record-swapped to guarantee playoffs
}

export interface SeasonIndexEntry {
  id: string
  userTeamId: string
  year: number
  createdAt: string
  status: SeasonStatus
}

// Re-export commonly used external types so callers can stay in `domain/`.
export type { NormalizedGame, LeagueId, DivisionId }
