// Domain types per PLAN.md §4. Persisted shapes are the source of
// truth for the save file format.

import type { NormalizedGame } from '../data/scheduleNormalize'
import type { LeagueId, DivisionId } from '../data/teamIdMap'

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
}

export interface Season {
  id: string
  year: number
  userTeamId: string
  startDate: string       // opening day for the user team
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
