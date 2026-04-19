// Invariant battery for the playthrough harness.
//
// Each invariant takes a Season at some point in its life cycle and
// returns null if the invariant holds, or an InvariantFailure describing
// what went wrong. Invariants are intentionally narrow — one checks one
// thing — so failure messages stay actionable.

import { TEAM_BY_ID } from '../../src/data/teamIdMap'
import { computeStandings, getStandingsForDivision } from '../../src/domain/standings'
import {
  advancePastByes,
  getNextUserPostseasonGame,
  isUserStillAlive,
} from '../../src/domain/postseason'
import { getNextUserGame } from '../../src/domain/reportGame'
import type { Season } from '../../src/domain/types'
import type { LeagueId, DivisionId } from '../../src/data/teamIdMap'

export interface InvariantFailure {
  name: string
  message: string
}

export type Invariant = (season: Season) => InvariantFailure | null

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

/** League-wide wins == losses. Each game increments one team's W and another's L. */
export const conservation: Invariant = (season) => {
  let totalW = 0
  let totalL = 0
  for (const r of season.teamRecords) {
    totalW += r.firstHalfWins + r.secondHalfWins
    totalL += r.firstHalfLosses + r.secondHalfLosses
  }
  if (totalW !== totalL) {
    return {
      name: 'conservation',
      message: `League wins (${totalW}) != losses (${totalL}); should always be equal`,
    }
  }
  return null
}

/** No team has played more than 165 games (162 + small slack for tiebreaker games). */
export const noOverPlayedTeams: Invariant = (season) => {
  for (const r of season.teamRecords) {
    const played = r.firstHalfWins + r.firstHalfLosses + r.secondHalfWins + r.secondHalfLosses
    if (played > 165) {
      return {
        name: 'noOverPlayedTeams',
        message: `Team ${r.teamId} has played ${played} games (limit 165)`,
      }
    }
  }
  return null
}

/** Every team's record matches the games it has played in user-game results.
 *  Skipped after a record swap (simToPostseason can deliberately substitute
 *  the user's record with a borderline playoff team's to guarantee
 *  postseason eligibility — by design, breaks this invariant). */
export const userGameAccounting: Invariant = (season) => {
  if (season.recordSwapApplied) return null
  // Tally the user team's W/L from played user games.
  let userW = 0
  let userL = 0
  for (const g of season.userGames) {
    if (g.status !== 'played' || !g.result) continue
    const userIsHome = g.homeTeamId === season.userTeamId
    const userScore = userIsHome ? g.result.homeScore : g.result.awayScore
    const oppScore = userIsHome ? g.result.awayScore : g.result.homeScore
    if (userScore > oppScore) userW++
    else userL++
  }
  // The user team's TeamRecord must include AT LEAST these wins/losses
  // (it'll usually equal them — non-user games don't touch the user record).
  const userRec = season.teamRecords.find((r) => r.teamId === season.userTeamId)
  if (!userRec) {
    return { name: 'userGameAccounting', message: 'No TeamRecord for user team' }
  }
  const recordedW = userRec.firstHalfWins + userRec.secondHalfWins
  const recordedL = userRec.firstHalfLosses + userRec.secondHalfLosses
  if (recordedW < userW || recordedL < userL) {
    return {
      name: 'userGameAccounting',
      message: `User team record (${recordedW}-${recordedL}) is less than the W/L tally from played user games (${userW}-${userL})`,
    }
  }
  return null
}

/** Standings: 5 teams per division, ranks 1-5 unique, no team in two divisions. */
export const standingsSanity: Invariant = (season) => {
  const all = computeStandings(season)
  if (all.length !== 30) {
    return { name: 'standingsSanity', message: `Expected 30 standings rows, got ${all.length}` }
  }
  for (const league of LEAGUES) {
    for (const division of DIVISIONS) {
      const ranks = getStandingsForDivision(season, league, division)
      if (ranks.length !== 5) {
        return {
          name: 'standingsSanity',
          message: `${league} ${division} has ${ranks.length} teams (expected 5)`,
        }
      }
      const ranksSeen = new Set(ranks.map((r) => r.rank))
      if (ranksSeen.size !== 5 || !([1, 2, 3, 4, 5].every((n) => ranksSeen.has(n)))) {
        return {
          name: 'standingsSanity',
          message: `${league} ${division} ranks are not 1-5 unique: ${[...ranksSeen]}`,
        }
      }
      // Cross-check: every team in this division should resolve to this division.
      for (const r of ranks) {
        const team = TEAM_BY_ID.get(r.teamId)
        if (!team || team.league !== league || team.division !== division) {
          return {
            name: 'standingsSanity',
            message: `Team ${r.teamId} appears in ${league} ${division} standings but its actual division is ${team?.league}/${team?.division}`,
          }
        }
      }
    }
  }
  return null
}

/** Postseason: bracket structure + valid teams + advancement chain. */
export const postseasonCoherence: Invariant = (season) => {
  if (!season.bracket) return null  // n/a outside postseason

  const b = season.bracket
  if (b.alSeeds.length !== 6 || b.nlSeeds.length !== 6) {
    return {
      name: 'postseasonCoherence',
      message: `Expected 6 seeds per league (got AL=${b.alSeeds.length}, NL=${b.nlSeeds.length})`,
    }
  }

  // Each AL seed is in the AL; each NL seed is in the NL.
  for (const id of b.alSeeds) {
    const t = TEAM_BY_ID.get(id)
    if (!t || t.league !== 'AL') {
      return { name: 'postseasonCoherence', message: `AL seed ${id} is not in the AL` }
    }
  }
  for (const id of b.nlSeeds) {
    const t = TEAM_BY_ID.get(id)
    if (!t || t.league !== 'NL') {
      return { name: 'postseasonCoherence', message: `NL seed ${id} is not in the NL` }
    }
  }

  // No duplicate seeds.
  if (new Set(b.alSeeds).size !== 6 || new Set(b.nlSeeds).size !== 6) {
    return { name: 'postseasonCoherence', message: 'Duplicate seed in alSeeds or nlSeeds' }
  }

  // Top 3 seeds in each league must be the division winners (= the 3 best
  // by record across the league's 3 divisions). Verify that the seeds[0..2]
  // contain exactly one team from each division.
  for (const league of LEAGUES) {
    const seeds = league === 'AL' ? b.alSeeds : b.nlSeeds
    const top3Divisions = seeds.slice(0, 3).map((id) => TEAM_BY_ID.get(id)!.division)
    const uniqueDivisions = new Set(top3Divisions)
    if (uniqueDivisions.size !== 3) {
      return {
        name: 'postseasonCoherence',
        message: `${league} top-3 seeds should be one team per division; got divisions ${[...top3Divisions]}`,
      }
    }
  }

  // For every series with a winnerId, that winner must be one of the two
  // participants.
  for (const s of b.series) {
    if (s.winnerId && s.winnerId !== s.highSeedTeamId && s.winnerId !== s.lowSeedTeamId) {
      return {
        name: 'postseasonCoherence',
        message: `Series ${s.id} has winner ${s.winnerId} who isn't a participant`,
      }
    }
  }

  // Advancement chain: every DS / LCS / WS participant must be a winner of
  // a previous round (or a top-2 bye seed for DS).
  const seedsByLeague: Record<LeagueId, string[]> = {
    AL: b.alSeeds,
    NL: b.nlSeeds,
  }
  for (const s of b.series) {
    if (s.round === 'WCS') continue
    const participants = [s.highSeedTeamId, s.lowSeedTeamId]
    for (const p of participants) {
      const fromBye =
        s.round === 'DS' &&
        s.league !== 'inter' &&
        seedsByLeague[s.league as LeagueId].slice(0, 2).includes(p)
      if (fromBye) continue
      // Otherwise must be a winner of a prior series.
      const wonPrior = b.series.some(
        (prior) => prior.id !== s.id && prior.winnerId === p
      )
      if (!wonPrior) {
        return {
          name: 'postseasonCoherence',
          message: `${s.round} participant ${p} did not win a prior series and didn't have a bye`,
        }
      }
    }
  }

  return null
}

/**
 * The user always has a sensible state to render — never a dead end.
 * This is the invariant that would have caught the bye bug.
 */
export const userStateMachine: Invariant = (season) => {
  if (season.status === 'complete') return null  // user lands on champion screen

  if (season.status === 'regular') {
    // Either there's a next game, or the season should have flipped to
    // postseason already.
    if (!getNextUserGame(season)) {
      return {
        name: 'userStateMachine',
        message: 'status=regular but no next user game (should have flipped to postseason)',
      }
    }
    return null
  }

  if (season.status === 'postseason') {
    if (!season.bracket) {
      return { name: 'userStateMachine', message: 'status=postseason but no bracket' }
    }
    if (!isUserStillAlive(season)) {
      return null  // eliminated screen — valid state
    }
    if (getNextUserPostseasonGame(season)) {
      return null  // active game — valid state
    }
    // User is alive in postseason with no active game. This is the bye case.
    // advancePastByes must produce a state where the user has a game OR is
    // eliminated OR season completes — never an infinite loop or dead end.
    const advanced = advancePastByes(season)
    if (
      advanced.status === 'complete' ||
      !isUserStillAlive(advanced) ||
      getNextUserPostseasonGame(advanced)
    ) {
      return null
    }
    return {
      name: 'userStateMachine',
      message: `User is alive in postseason at ${season.bracket.currentRound} with no game; advancePastByes did not produce a playable / terminal state`,
    }
  }

  return null
}

/** Save round-trip: serialize, deserialize, deepEqual. */
export const saveRoundTrip: Invariant = (season) => {
  const json = JSON.stringify(season)
  const parsed = JSON.parse(json) as Season
  if (JSON.stringify(parsed) !== json) {
    return {
      name: 'saveRoundTrip',
      message: 'Season did not survive JSON round-trip unchanged',
    }
  }
  return null
}

/** simToPostseason / simToWorldSeries must never grant the user a Wild Card bye. */
export const noByeAfterRecordSwap: Invariant = (season) => {
  if (!season.bracket || !season.recordSwapApplied) return null
  const userTeam = TEAM_BY_ID.get(season.userTeamId)
  if (!userTeam) return null
  const seeds = userTeam.league === 'AL' ? season.bracket.alSeeds : season.bracket.nlSeeds
  if (seeds[0] === season.userTeamId || seeds[1] === season.userTeamId) {
    return {
      name: 'noByeAfterRecordSwap',
      message: `User ${season.userTeamId} got a bye seed after simToPostseason — should always land at seed 3-6 (no bye)`,
    }
  }
  return null
}

/** All teams with division winners are actually division winners (top of their division). */
export const divisionWinnersAreDivisionWinners: Invariant = (season) => {
  if (!season.bracket) return null
  for (const league of LEAGUES) {
    const seeds = league === 'AL' ? season.bracket.alSeeds : season.bracket.nlSeeds
    const top3 = seeds.slice(0, 3)
    for (const id of top3) {
      const team = TEAM_BY_ID.get(id)!
      const divStandings = getStandingsForDivision(season, team.league, team.division)
      if (divStandings[0].teamId !== id) {
        return {
          name: 'divisionWinnersAreDivisionWinners',
          message: `${id} is seeded as a ${league} division winner but isn't top of ${team.division} (top is ${divStandings[0].teamId})`,
        }
      }
    }
  }
  return null
}

export const ALL_INVARIANTS: Invariant[] = [
  conservation,
  noOverPlayedTeams,
  userGameAccounting,
  standingsSanity,
  postseasonCoherence,
  userStateMachine,
  saveRoundTrip,
  divisionWinnersAreDivisionWinners,
  noByeAfterRecordSwap,
]
