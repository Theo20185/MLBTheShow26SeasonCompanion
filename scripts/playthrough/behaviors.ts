// User-behavior profiles for the playthrough harness.
//
// Each profile is a function that, given the current Season, returns
// the next Season — i.e., it makes one move (or one bulk-sim move).
// Returns null when there's no more action to take (season complete or
// stuck).

import { mulberry32 } from '../../src/domain/rng'
import { getNextUserGame, reportUserGame } from '../../src/domain/reportGame'
import {
  advancePastByes,
  getNextUserPostseasonGame,
  isUserStillAlive,
  reportUserPostseasonGame,
  simRemainingPostseason,
  startPostseason,
} from '../../src/domain/postseason'
import {
  simToAllStarBreak,
  simToPostseason,
  simToWorldSeries,
} from '../../src/domain/simAhead'
import type { Season } from '../../src/domain/types'

export type Behavior = (season: Season) => Season | null

export interface BehaviorProfile {
  name: string
  step: Behavior
}

/**
 * Picks the next regular- or postseason action and applies it. The
 * decideOutcome callback decides W/L for the user game; the rest of
 * the orchestration (round transitions, bye advancement, etc.) is
 * handled here so each profile only has to define the W/L policy.
 */
function withDecide(
  name: string,
  decideRegular: (season: Season, rng: () => number) => 'win' | 'loss',
  decidePostseason: (season: Season, rng: () => number) => 'win' | 'loss'
): BehaviorProfile {
  return {
    name,
    step: (season: Season): Season | null => {
      if (season.status === 'complete') return null

      // Awaiting postseason: the engine paused after the 162nd report
      // so the UI can show the Final Standings reveal. The harness has
      // no UI, so just advance.
      if (season.status === 'awaitingPostseason') {
        return startPostseason(season)
      }

      // Regular season.
      if (season.status === 'regular') {
        const nextGame = getNextUserGame(season)
        if (!nextGame) {
          // Defensive: shouldn't happen now (engine sets awaitingPostseason
          // first), but kept for migrating in-flight saves.
          return startPostseason(season)
        }
        const rng = mulberry32(season.rngSeed ^ 0xa11ce)
        const didUserWin = decideRegular(season, rng) === 'win'
        return reportUserGame(season, {
          gamePk: nextGame.gamePk,
          didUserWin,
        })
      }

      // Postseason.
      if (season.status === 'postseason') {
        if (!isUserStillAlive(season)) {
          // Eliminated — sim every remaining round to crown a champion.
          // (advancePastByes is a no-op once the user is out, so we use
          // simRemainingPostseason here instead.)
          return simRemainingPostseason(season)
        }
        const nextGame = getNextUserPostseasonGame(season)
        if (!nextGame) {
          // Bye round — advance past it.
          return advancePastByes(season)
        }
        const rng = mulberry32(season.rngSeed ^ 0xb0b)
        const didUserWin = decidePostseason(season, rng) === 'win'
        return reportUserPostseasonGame(season, didUserWin)
      }

      return null
    },
  }
}

export const alwaysWin: BehaviorProfile = withDecide(
  'alwaysWin',
  () => 'win',
  () => 'win'
)

export const alwaysLose: BehaviorProfile = withDecide(
  'alwaysLose',
  () => 'loss',
  () => 'loss'
)

export const mixed5050: BehaviorProfile = withDecide(
  'mixed5050',
  (_s, rng) => (rng() < 0.5 ? 'win' : 'loss'),
  (_s, rng) => (rng() < 0.5 ? 'win' : 'loss')
)

/** Plays as a "good but not great" team: wins ~60% in regular season, 50/50 in playoffs. */
export const goodTeam: BehaviorProfile = withDecide(
  'goodTeam',
  (_s, rng) => (rng() < 0.6 ? 'win' : 'loss'),
  (_s, rng) => (rng() < 0.5 ? 'win' : 'loss')
)

/** Bulk-sims to All-Star Break (using the actual sim-ahead API), then
 *  alternates W/L through the rest of the regular season + playoffs. */
export const simAheadToAllStar: BehaviorProfile = {
  name: 'simAheadToAllStar',
  step: (season) => {
    if (season.status === 'complete') return null
    if (season.status === 'regular') {
      // Trigger the bulk sim once on the very first call (currentDate ==
      // startDate). After that, fall back to mixed5050 behavior.
      if (season.currentDate === season.startDate) {
        return simToAllStarBreak(season)
      }
      const next = getNextUserGame(season)
      if (!next) return startPostseason(season)
      const rng = mulberry32(season.rngSeed ^ 0xfeed)
      return reportUserGame(season, {
        gamePk: next.gamePk,
        didUserWin: rng() < 0.5,
      })
    }
    return mixed5050.step(season)
  },
}

/** Bulk-sims directly to Postseason, then plays the bracket. */
export const simAheadToPostseason: BehaviorProfile = {
  name: 'simAheadToPostseason',
  step: (season) => {
    if (season.status === 'complete') return null
    if (season.status === 'regular') {
      return simToPostseason(season)
    }
    return mixed5050.step(season)
  },
}

/** Bulk-sims all the way to the World Series, then plays the WS. */
export const simAheadToWorldSeries: BehaviorProfile = {
  name: 'simAheadToWorldSeries',
  step: (season) => {
    if (season.status === 'complete') return null
    if (season.status === 'regular') {
      return simToWorldSeries(season)
    }
    return mixed5050.step(season)
  },
}

export const ALL_PROFILES: BehaviorProfile[] = [
  alwaysWin,
  alwaysLose,
  mixed5050,
  goodTeam,
  simAheadToAllStar,
  simAheadToPostseason,
  simAheadToWorldSeries,
]
