// Game simulator (PLAN.md §6.5).
//
// Pure functions over (OVR, RNG). The seeded RNG is the only source of
// randomness, so a Season + a sim invocation is fully reproducible.
// OVR overrides do NOT touch the RNG stream — they're inputs to the
// probability calculation only (per the §6.5 determinism invariant).

import type { Season } from './types'
import type { Rng } from './rng'

/**
 * How much "OVR matters" in the win probability. Higher = more deterministic.
 * Tuned to ~3 so a 90-OVR team vs a 65-OVR team wins ~75-78% of games — about
 * what the best-vs-worst MLB matchup actually produces, leaving the noise
 * pattern realistic for the rest of the league.
 */
export const OVR_EXPONENT = 3

/** Home-field bonus added to the home team's win probability. */
export const HOME_FIELD_BONUS = 0.04

/** Penalty applied to the user's team OVR when they choose "Sim this game". */
export const USER_SIM_PENALTY = -10

/** Effective OVR for a team in a given season (override > snapshot). */
export function effectiveOvr(
  teamId: string,
  season: Pick<Season, 'baseOvrSnapshot' | 'ovrOverrides'>
): number {
  return season.ovrOverrides[teamId] ?? season.baseOvrSnapshot[teamId]
}

/**
 * P(home team wins). Logistic-style mix of OVR^k ratios plus a small
 * home-field bonus. Tuned so an OVR-edge team wins around 55-65% over
 * many trials, matching the noisy real-MLB feel.
 */
export function homeWinProbability(homeOvr: number, awayOvr: number): number {
  const home = Math.pow(homeOvr, OVR_EXPONENT)
  const away = Math.pow(awayOvr, OVR_EXPONENT)
  const base = home / (home + away)
  const withHfa = base + HOME_FIELD_BONUS
  return Math.max(0.01, Math.min(0.99, withHfa))
}

export interface SimulateGameOptions {
  homeOvr: number
  awayOvr: number
  rng: Rng
  /** If true, the user is the home team and gets the sim penalty. */
  userIsHome?: boolean
  /** If true, the user is the away team and gets the sim penalty. */
  userIsAway?: boolean
  /** When true, applies USER_SIM_PENALTY to whichever side is the user's. */
  applyUserSimPenalty?: boolean
}

export interface SimulateGameResult {
  homeWon: boolean
  homeScore: number
  awayScore: number
}

export function simulateGame(opts: SimulateGameOptions): SimulateGameResult {
  let { homeOvr, awayOvr } = opts
  if (opts.applyUserSimPenalty) {
    if (opts.userIsHome) homeOvr += USER_SIM_PENALTY
    if (opts.userIsAway) awayOvr += USER_SIM_PENALTY
  }
  const p = homeWinProbability(homeOvr, awayOvr)
  const roll = opts.rng()
  const homeWon = roll < p

  // Plausible scores. Average MLB game ~4.5 runs/team. Winner gets a small
  // bump; loser is bounded by winner's score.
  const baseRuns = () => Math.floor(opts.rng() * 7) + 1 // 1-7
  const winnerRuns = baseRuns() + 2 // 3-9
  const loserRuns = Math.min(winnerRuns - 1, baseRuns())
  const homeScore = homeWon ? winnerRuns : loserRuns
  const awayScore = homeWon ? loserRuns : winnerRuns

  return { homeWon, homeScore, awayScore }
}
