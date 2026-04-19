// Season factory. Given a user team id, builds a fully-initialized
// Season ready for persistence (PLAN.md §6.1).

import { TEAM_MAP, TEAM_BY_ID } from '../data/teamIdMap'
import { TEAM_BASE_OVRS } from '../data/bundledData'
import { BALLPARK_BY_TEAM_ID } from '../data/ballparks'
import { getTeamSchedule, getOpeningDay } from './scheduleLoader'
import type { Season, TeamRecord, Game, UserSquad, GameLength } from './types'

const ROSTER_SNAPSHOT_ID = '2026-launch'

export interface CreateSeasonOptions {
  userTeamId: string
  /** DD squad identity. If omitted, falls back to the MLB team's name/abbrev. */
  userSquad?: UserSquad
  /** DD squad OVR override; written into ovrOverrides[userTeamId] if provided. */
  userSquadOvr?: number
  /** Default regulation length for full-report box scores (3, 5, 7, 9). */
  defaultGameLength?: GameLength
  /** Optional fixed RNG seed for deterministic test runs. */
  rngSeed?: number
  /** Optional fixed createdAt for deterministic test runs. */
  createdAt?: Date
}

export function createSeason(opts: CreateSeasonOptions): Season {
  const { userTeamId } = opts
  if (!TEAM_BY_ID.has(userTeamId)) {
    throw new Error(`Unknown team id: ${userTeamId}`)
  }
  const openingDay = getOpeningDay(userTeamId)
  if (!openingDay) {
    throw new Error(`No schedule found for team ${userTeamId}`)
  }

  const rngSeed = opts.rngSeed ?? newSeed()
  const createdAt = (opts.createdAt ?? new Date()).toISOString()
  const id = `season-${createdAt}-${userTeamId}`

  const teamRecords: TeamRecord[] = TEAM_MAP.map((t) => ({
    teamId: t.id,
    firstHalfWins: 0,
    firstHalfLosses: 0,
    secondHalfWins: 0,
    secondHalfLosses: 0,
    divisionWins: 0,
    divisionLosses: 0,
  }))

  const baseOvrSnapshot: Record<string, number> = {}
  for (const t of TEAM_MAP) {
    baseOvrSnapshot[t.id] = TEAM_BASE_OVRS[t.id]
  }

  const ovrOverrides: Record<string, number> = {}
  if (typeof opts.userSquadOvr === 'number') {
    ovrOverrides[userTeamId] = clampOvr(opts.userSquadOvr)
  }

  const userGames: Game[] = getTeamSchedule(userTeamId).map((g) => {
    const park = BALLPARK_BY_TEAM_ID.get(g.homeTeamId)
    if (!park) {
      throw new Error(`No ballpark for home team ${g.homeTeamId}`)
    }
    return {
      gamePk: g.gamePk,
      date: g.officialDate,
      gameDate: g.gameDate,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      parkId: park.id,
      kind: 'userRegular',
      status: 'scheduled',
    }
  })

  return {
    id,
    year: 2026,
    userTeamId,
    userSquad: opts.userSquad,
    defaultGameLength: opts.defaultGameLength,
    startDate: openingDay,
    currentDate: openingDay,
    status: 'regular',
    rngSeed,
    baseOvrSnapshot,
    ovrOverrides,
    rosterSnapshotId: ROSTER_SNAPSHOT_ID,
    userGames,
    teamRecords,
    headToHead: {},
  }
}

function newSeed(): number {
  return Math.floor(Math.random() * 0xfffffff)
}

function clampOvr(n: number): number {
  if (Number.isNaN(n)) return 75
  return Math.max(40, Math.min(99, Math.round(n)))
}
