// Postseason bracket (PLAN.md §6.7).
//
// 2026 MLB format per league:
//   - 3 division winners + 3 wild cards = 6 teams.
//   - Top 2 division winners (by record, with tiebreakers) get byes.
//   - Seed 3 (#3 division winner) hosts seed 6 (last wild card) in
//     a best-of-3 Wild Card Series.
//   - Seed 4 hosts seed 5 in the other WCS.
//   - WCS winners advance to face seeds 1, 2 in the Division Series
//     (best-of-5).
//   - DS winners → LCS (best-of-7) → World Series (best-of-7).

import type { Season } from './types'
import type { LeagueId } from '../data/teamIdMap'
import { TEAM_BY_ID, TEAM_MAP } from '../data/teamIdMap'
import { compareTeamsForSeeding } from './tiebreakers'

export type SeriesRound = 'WCS' | 'DS' | 'LCS' | 'WS'

export interface SeriesGameResult {
  homeWon: boolean
  homeScore: number
  awayScore: number
}

export interface Series {
  id: string
  round: SeriesRound
  league: LeagueId | 'inter'  // WS is inter
  bestOf: 3 | 5 | 7
  highSeedTeamId: string
  lowSeedTeamId: string
  highSeedRank: number
  lowSeedRank: number
  results: SeriesGameResult[]   // index 0 = game 1, etc.
  winnerId?: string
}

export interface Bracket {
  alSeeds: string[]   // length 6, ranked 1..6
  nlSeeds: string[]
  series: Series[]
  champion?: string
}

export function seedLeague(season: Season, league: LeagueId): string[] {
  const allInLeague = TEAM_MAP.filter((t) => t.league === league)

  // Step 1: identify division winners. For each of the 3 divisions, the
  // best team by tiebreaker is the division winner.
  const divWinners: string[] = []
  for (const division of ['East', 'Central', 'West'] as const) {
    const candidates = allInLeague.filter((t) => t.division === division)
    candidates.sort((a, b) => compareTeamsForSeeding(season, a.id, b.id))
    divWinners.push(candidates[0].id)
  }

  // Step 2: wild cards = 3 best non-division-winners across the league.
  const nonWinners = allInLeague
    .filter((t) => !divWinners.includes(t.id))
    .map((t) => t.id)
  nonWinners.sort((a, b) => compareTeamsForSeeding(season, a, b))
  const wildCards = nonWinners.slice(0, 3)

  // Sort the 3 division winners against each other for top-of-bracket seeds.
  const sortedDivWinners = [...divWinners].sort((a, b) =>
    compareTeamsForSeeding(season, a, b)
  )

  // Final seeding: 1, 2, 3 = sorted div winners; 4, 5, 6 = sorted wild cards.
  return [...sortedDivWinners, ...wildCards]
}

export function buildBracket(season: Season): Bracket {
  const alSeeds = seedLeague(season, 'AL')
  const nlSeeds = seedLeague(season, 'NL')

  const wcs: Series[] = []
  // WCS: seed 3 vs 6, seed 4 vs 5 in each league.
  for (const [seeds, league] of [
    [alSeeds, 'AL'],
    [nlSeeds, 'NL'],
  ] as const) {
    wcs.push(makeSeries('WCS', league, 3, seeds[2], seeds[5], 3, 6))
    wcs.push(makeSeries('WCS', league, 3, seeds[3], seeds[4], 4, 5))
  }

  return {
    alSeeds,
    nlSeeds,
    series: wcs,
  }
}

function makeSeries(
  round: SeriesRound,
  league: LeagueId | 'inter',
  bestOf: 3 | 5 | 7,
  highSeedTeamId: string,
  lowSeedTeamId: string,
  highSeedRank: number,
  lowSeedRank: number
): Series {
  return {
    id: `${round}-${league}-${highSeedRank}v${lowSeedRank}`,
    round,
    league,
    bestOf,
    highSeedTeamId,
    lowSeedTeamId,
    highSeedRank,
    lowSeedRank,
    results: [],
  }
}

export function seriesIsComplete(s: Series): boolean {
  if (s.winnerId) return true
  const wins = countWinsBy(s)
  const needed = Math.ceil(s.bestOf / 2)
  return wins.high >= needed || wins.low >= needed
}

export function recordSeriesGame(s: Series, result: SeriesGameResult): Series {
  const updated: Series = { ...s, results: [...s.results, result] }
  const wins = countWinsBy(updated)
  const needed = Math.ceil(s.bestOf / 2)
  if (wins.high >= needed) updated.winnerId = s.highSeedTeamId
  else if (wins.low >= needed) updated.winnerId = s.lowSeedTeamId
  return updated
}

function countWinsBy(s: Series): { high: number; low: number } {
  // Higher seed hosts games 1, 2 (and 6, 7 in best-of-7); lower seed hosts
  // 3, 4 (5). For W/L counting, we just need who won each game — homeWon
  // tells us, but we have to know who was home in that game.
  let high = 0
  let low = 0
  for (let i = 0; i < s.results.length; i++) {
    const r = s.results[i]
    const highWasHome = highSeedHostedGame(s, i)
    const highWon =
      (highWasHome && r.homeWon) || (!highWasHome && !r.homeWon)
    if (highWon) high++
    else low++
  }
  return { high, low }
}

function highSeedHostedGame(s: Series, gameIndex: number): boolean {
  // Best-of-3: 1, 2 at high; 3 at low.
  if (s.bestOf === 3) return gameIndex < 2
  // Best-of-5: 1, 2 at high; 3, 4 at low; 5 at high.
  if (s.bestOf === 5) return gameIndex !== 2 && gameIndex !== 3
  // Best-of-7: 1, 2, 6, 7 at high; 3, 4, 5 at low.
  return gameIndex < 2 || gameIndex >= 5
}

export function teamCityName(teamId: string): string {
  const t = TEAM_BY_ID.get(teamId)
  return t ? `${t.city} ${t.name}` : teamId
}
