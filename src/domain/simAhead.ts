// Bulk simulation helpers (PLAN-extension). Three "skip ahead" options:
//
//   simToAllStarBreak(season)  — sims every user game with the user-sim
//     penalty applied, stops on the first user game past the All-Star
//     break.
//   simToPostseason(season)    — sims every remaining regular-season
//     user game with the penalty, then guarantees the user team a
//     playoff seed (record-swap with the lowest playoff team in the
//     user's league if needed), and starts the postseason.
//   simToWorldSeries(season)   — runs simToPostseason, then sims all
//     postseason rounds, force-flipping any series the user lost so
//     they always reach the World Series. Stops at game 1 of the WS.
//
// Each function returns a new Season with lastSnapshot cleared (the
// user can't undo a bulk sim — the warning modal makes this explicit).

import { TEAM_BY_ID, TEAM_MAP } from '../data/teamIdMap'
import { mulberry32, nextSeed } from './rng'
import {
  USER_SIM_PENALTY,
  effectiveOvr,
  homeWinProbability,
} from './simulator'
import { getNextUserGame, reportUserGame } from './reportGame'
import {
  isUserStillAlive,
  maybeAdvanceRound,
  simOutCurrentRound,
  startPostseason,
} from './postseason'
import { recordSeriesGame, seriesIsComplete } from './bracket'
import { compareTeamsForSeeding } from './tiebreakers'
import type { LeagueId } from '../data/teamIdMap'
import type { Season, TeamRecord } from './types'
import type { Series } from './bracket'

export const ALL_STAR_BREAK_END = '2026-07-17'

/**
 * Decide W/L for a user game using the simulator with USER_SIM_PENALTY
 * applied. Deterministic given the input seed. Returns the outcome and
 * the next seed to use for downstream calls.
 */
function biasedUserOutcome(
  season: Season,
  game: { homeTeamId: string; awayTeamId: string },
  rngSeed: number
): { didUserWin: boolean; advancedSeed: number } {
  const userIsHome = game.homeTeamId === season.userTeamId
  const opponentId = userIsHome ? game.awayTeamId : game.homeTeamId
  const userOvr = Math.max(40, effectiveOvr(season.userTeamId, season) + USER_SIM_PENALTY)
  const oppOvr = effectiveOvr(opponentId, season)
  const homeOvr = userIsHome ? userOvr : oppOvr
  const awayOvr = userIsHome ? oppOvr : userOvr
  // We don't need the score here, just the probability roll.
  const rng = mulberry32(rngSeed)
  const p = homeWinProbability(homeOvr, awayOvr)
  const homeWon = rng() < p
  const didUserWin =
    (homeWon && userIsHome) || (!homeWon && !userIsHome)
  return { didUserWin, advancedSeed: nextSeed(rngSeed) }
}

function clearSnapshot(season: Season): Season {
  return { ...season, lastSnapshot: undefined }
}

export function simToAllStarBreak(season: Season): Season {
  let working = season
  let safety = 0
  while (safety++ < 200) {
    const next = getNextUserGame(working)
    if (!next) break
    if (next.date >= ALL_STAR_BREAK_END) break
    const { didUserWin, advancedSeed } = biasedUserOutcome(working, next, working.rngSeed)
    // Reseat rngSeed on the season so reportUserGame's internal score
    // generation starts from the post-decision seed (avoids reusing the
    // same RNG state for both decision and score).
    working = { ...working, rngSeed: advancedSeed }
    working = reportUserGame(working, {
      gamePk: next.gamePk,
      didUserWin,
      isSim: true,
    })
  }
  return clearSnapshot(working)
}

export function simToPostseason(season: Season): Season {
  // 1. Sim every remaining regular-season user game. Note: reportUserGame
  //    auto-flips status → postseason when the last user game is reported
  //    (the engine owns that transition). So `working` may already have a
  //    bracket by the end of this loop.
  let working = season
  let safety = 0
  while (working.status === 'regular' && safety++ < 200) {
    const next = getNextUserGame(working)
    if (!next) break
    const { didUserWin, advancedSeed } = biasedUserOutcome(working, next, working.rngSeed)
    working = { ...working, rngSeed: advancedSeed }
    working = reportUserGame(working, {
      gamePk: next.gamePk,
      didUserWin,
      isSim: true,
    })
  }

  // 2. Guarantee playoff eligibility — record-swap with the lowest
  //    playoff team in the user's league if user fell short.
  working = ensureUserMakesPlayoffs(working)

  // 3. (Re)build the bracket so it reflects the post-swap records. If a
  //    bracket was auto-built during step 1, discard it first — its
  //    seeding may not include the user team after the swap.
  working = {
    ...working,
    status: 'regular',
    bracket: undefined,
    postseasonGames: undefined,
  }
  working = startPostseason(working)

  return clearSnapshot(working)
}

export function simToWorldSeries(season: Season): Season {
  // 1. Get to the postseason with user guaranteed in.
  let working = simToPostseason(season)

  // 2. Sim each round, force-flipping any series the user lost so they
  //    always advance. Stop at the WS (don't sim it — leave it to the
  //    user to play).
  let safety = 0
  while (working.bracket && working.bracket.currentRound !== 'WS' && safety++ < 10) {
    // Sim out the current round.
    working = simOutCurrentRound(working)
    // If the user lost their series this round, force them to win
    // (rewrite the series winner).
    working = forceUserAdvancement(working)
    // Build next round.
    working = maybeAdvanceRound(working)
  }

  // 3. If user somehow isn't in the WS (e.g., they had a bye and the
  //    natural bracket landed them elsewhere), force the WS to include
  //    them by overriding the AL or NL champion.
  if (working.bracket && working.bracket.currentRound === 'WS' && !isUserStillAlive(working)) {
    working = forceUserIntoWS(working)
  }

  return clearSnapshot(working)
}

/**
 * If the user team isn't a top-6 seed in their league, swap their
 * regular-season record with the lowest-seeded playoff team. This
 * keeps total wins/losses balanced and gives a believable "barely
 * made it" outcome.
 */
function ensureUserMakesPlayoffs(season: Season): Season {
  const userTeam = TEAM_BY_ID.get(season.userTeamId)
  if (!userTeam) return season

  // simToPostseason should always land the user at a non-bye seed (3-6).
  // Top-2 seeds get a Wild Card bye — and the user explicitly opted to
  // skip games, so granting them a bye on top of that is double-dipping.
  // Try the lowest seed (6 = third wild card) first; escalate up to
  // seed 3 (lowest division winner that still plays the WCS) only if
  // tiebreakers keep leaving the user out. Never escalate to 1 or 2.
  let working = season
  let swapped = false

  for (let targetSeed = 6; targetSeed >= 3; targetSeed--) {
    const seeds = computeLeagueSeeds(working, userTeam.league)
    const userIdx = seeds.indexOf(season.userTeamId)
    if (userIdx >= 2) {
      // User is in playoffs at a non-bye seed — done.
      return swapped ? { ...working, recordSwapApplied: true } : working
    }

    // User is either out (idx -1) or has a bye (idx 0/1). Force a swap
    // with the team currently at `targetSeed`.
    const targetIdx = targetSeed - 1
    if (targetIdx >= seeds.length) continue
    const replaceTeamId = seeds[targetIdx]
    if (replaceTeamId === season.userTeamId) {
      // User is already at the target seed (shouldn't happen given
      // userIdx check above, but safe guard).
      continue
    }
    working = swapTeamRecords(working, season.userTeamId, replaceTeamId)
    swapped = true
  }

  // Edge case: user is somehow still top-2 after exhausting escalation.
  // Accept it — refusing would either crash or leave them out entirely.
  return swapped ? { ...working, recordSwapApplied: true } : working
}

function computeLeagueSeeds(season: Season, league: LeagueId): string[] {
  const teams = TEAM_MAP.filter((t) => t.league === league).map((t) => t.id)
  // Per-division winners
  const divWinners: string[] = []
  for (const division of ['East', 'Central', 'West'] as const) {
    const candidates = TEAM_MAP.filter(
      (t) => t.league === league && t.division === division
    ).map((t) => t.id)
    candidates.sort((a, b) => compareTeamsForSeeding(season, a, b))
    divWinners.push(candidates[0])
  }
  const nonWinners = teams.filter((id) => !divWinners.includes(id))
  nonWinners.sort((a, b) => compareTeamsForSeeding(season, a, b))
  const wildCards = nonWinners.slice(0, 3)
  const sortedDivWinners = [...divWinners].sort((a, b) =>
    compareTeamsForSeeding(season, a, b)
  )
  return [...sortedDivWinners, ...wildCards]
}

function swapTeamRecords(
  season: Season,
  teamAId: string,
  teamBId: string
): Season {
  const teamRecords = season.teamRecords.map((r): TeamRecord => {
    if (r.teamId === teamAId) {
      const other = season.teamRecords.find((x) => x.teamId === teamBId)!
      return { ...other, teamId: teamAId }
    }
    if (r.teamId === teamBId) {
      const other = season.teamRecords.find((x) => x.teamId === teamAId)!
      return { ...other, teamId: teamBId }
    }
    return r
  })
  // Swap H2H rows + columns too so totals stay consistent.
  const headToHead = swapH2H(season.headToHead, teamAId, teamBId)
  return { ...season, teamRecords, headToHead }
}

function swapH2H(
  h2h: Season['headToHead'],
  a: string,
  b: string
): Season['headToHead'] {
  const out: Season['headToHead'] = {}
  for (const winnerId of Object.keys(h2h)) {
    const remappedWinner = winnerId === a ? b : winnerId === b ? a : winnerId
    out[remappedWinner] = {}
    for (const loserId of Object.keys(h2h[winnerId])) {
      const remappedLoser = loserId === a ? b : loserId === b ? a : loserId
      out[remappedWinner][remappedLoser] = h2h[winnerId][loserId]
    }
  }
  return out
}

/**
 * If the user is in the current round and lost their series, flip the
 * series result so the user advances. Used by simToWorldSeries.
 */
function forceUserAdvancement(season: Season): Season {
  if (!season.bracket) return season
  const userTeamId = season.userTeamId
  const round = season.bracket.currentRound
  const updatedSeries = season.bracket.series.map((s) => {
    if (s.round !== round) return s
    if (
      s.winnerId &&
      s.winnerId !== userTeamId &&
      (s.highSeedTeamId === userTeamId || s.lowSeedTeamId === userTeamId)
    ) {
      // Rewrite this series so the user wins. Easiest way: clear results
      // and re-record with all user wins for the minimum needed.
      return forceSeriesWinner(s, userTeamId)
    }
    return s
  })
  return { ...season, bracket: { ...season.bracket, series: updatedSeries } }
}

function forceSeriesWinner(series: Series, winnerId: string): Series {
  const needed = Math.ceil(series.bestOf / 2)
  const userIsHigh = series.highSeedTeamId === winnerId
  let rebuilt: Series = { ...series, results: [], winnerId: undefined }
  for (let i = 0; i < needed; i++) {
    // Every game: the high seed home/away alternation matters only for
    // the inferred winner. recordSeriesGame uses highSeedHostsGame to
    // figure out who hosted each game, so we just need homeWon to map
    // to "high seed wins" if user is high seed.
    const winsByHigh = userIsHigh
    const result = winsByHigh
      ? { homeWon: true, homeScore: 5, awayScore: 2 }
      : { homeWon: false, homeScore: 2, awayScore: 5 }
    // For games hosted by the LOW seed, "homeWon" maps to the LOW seed
    // winning. Since user always wins, flip when low seed hosts.
    rebuilt = recordSeriesGame(rebuilt, alignedResult(rebuilt, result))
    if (seriesIsComplete(rebuilt)) break
  }
  return rebuilt
}

function alignedResult(
  _series: Series,
  desired: { homeWon: boolean; homeScore: number; awayScore: number }
): { homeWon: boolean; homeScore: number; awayScore: number } {
  // No-op shim today (we always want winner = high seed in our caller's
  // current branch). Kept for future flexibility.
  return desired
}

/**
 * Last-resort: rewrite the WS series so the user is one of the two
 * participants. Called when the user wasn't in either LCS naturally.
 */
function forceUserIntoWS(season: Season): Season {
  if (!season.bracket) return season
  const userTeamId = season.userTeamId
  const userTeam = TEAM_BY_ID.get(userTeamId)
  if (!userTeam) return season

  const updatedSeries = season.bracket.series.map((s) => {
    if (s.round !== 'WS') return s
    // Replace the same-league participant with the user.
    const userLeague = userTeam.league
    const highTeam = TEAM_BY_ID.get(s.highSeedTeamId)
    const lowTeam = TEAM_BY_ID.get(s.lowSeedTeamId)
    if (highTeam?.league === userLeague) {
      return { ...s, highSeedTeamId: userTeamId, results: [], winnerId: undefined }
    }
    if (lowTeam?.league === userLeague) {
      return { ...s, lowSeedTeamId: userTeamId, results: [], winnerId: undefined }
    }
    return s
  })
  return { ...season, bracket: { ...season.bracket, series: updatedSeries } }
}
