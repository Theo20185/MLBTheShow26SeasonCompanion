// Standings derivation (PLAN.md §6.6). Pure — given a Season's
// TeamRecord[] + HeadToHead, computes ranks, gamesBack, etc.
//
// The full 6-step tiebreaker stack from PLAN.md §6.7 only matters for
// playoff seeding edge cases. Mid-season standings use the simpler
// "winPct desc, gamesBack from leader" presentation.

import type { LeagueId, DivisionId } from '../data/teamIdMap'
import { TEAM_BY_ID, TEAM_MAP } from '../data/teamIdMap'
import type { Season, TeamRecord } from './types'

export interface StandingsEntry {
  teamId: string
  wins: number
  losses: number
  winPct: number
  gamesBack: number
  rank: number
  league: LeagueId
  division: DivisionId
}

export function computeStandings(season: Season): StandingsEntry[] {
  return TEAM_MAP.map((team) => {
    const record = season.teamRecords.find((r) => r.teamId === team.id)!
    const wins = totalWins(record)
    const losses = totalLosses(record)
    const games = wins + losses
    return {
      teamId: team.id,
      wins,
      losses,
      winPct: games === 0 ? 0 : wins / games,
      gamesBack: 0, // filled in per-division below
      rank: 0,
      league: team.league,
      division: team.division,
    }
  })
}

export function getStandingsForDivision(
  season: Season,
  league: LeagueId,
  division: DivisionId
): StandingsEntry[] {
  const all = computeStandings(season)
  const inDiv = all.filter((e) => e.league === league && e.division === division)
  inDiv.sort((a, b) => {
    if (a.winPct !== b.winPct) return b.winPct - a.winPct
    // Equal pct: fewer losses (so a 0-0 team beats a 0-5 team) → more wins → name.
    if (a.losses !== b.losses) return a.losses - b.losses
    if (a.wins !== b.wins) return b.wins - a.wins
    return a.teamId.localeCompare(b.teamId)
  })
  if (inDiv.length === 0) return []
  const leader = inDiv[0]
  return inDiv.map((e, i) => ({
    ...e,
    rank: i + 1,
    gamesBack: i === 0 ? 0 : ((leader.wins - e.wins) + (e.losses - leader.losses)) / 2,
  }))
}

export function getDivisionRankForTeam(
  season: Season,
  teamId: string
): { rank: number; gamesBack: number } | null {
  const team = TEAM_BY_ID.get(teamId)
  if (!team) return null
  const ranked = getStandingsForDivision(season, team.league, team.division)
  const entry = ranked.find((e) => e.teamId === teamId)
  if (!entry) return null
  return { rank: entry.rank, gamesBack: entry.gamesBack }
}

function totalWins(r: TeamRecord): number {
  return r.firstHalfWins + r.secondHalfWins
}

function totalLosses(r: TeamRecord): number {
  return r.firstHalfLosses + r.secondHalfLosses
}
