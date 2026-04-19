// Postseason engine (PLAN.md §6.7).
//
// Reads from / writes back to a Season's bracket field. Three core
// flows:
//   - startPostseason(season): builds the WCS bracket and flips status.
//   - reportUserPostseasonGame(season, didUserWin): records the user's
//     game, sims one game in each parallel series in the current round
//     (lockstep), checks for round completion, and builds the next
//     round when ready. Sims any leftover parallel series silently
//     when the user's series ends.
//   - simRemainingPostseason(season): silent finish for users who have
//     been eliminated (or who want to skip ahead).
//
// All randomness uses Season.rngSeed so replays/imports are
// reproducible.

import { TEAM_BY_ID } from '../data/teamIdMap'
import { BALLPARK_BY_TEAM_ID } from '../data/ballparks'
import { mulberry32, nextSeed } from './rng'
import { simulateGame, effectiveOvr } from './simulator'
import {
  buildBracket,
  buildNextRoundSeries,
  highSeedHostsGame,
  recordSeriesGame,
  seriesIsComplete,
  type Bracket,
  type Series,
  type SeriesGameResult,
  type SeriesRound,
} from './bracket'
import type { Game, PreReportSnapshot, Season } from './types'

// Synthetic gamePk namespace for postseason games (avoids collisions
// with MLB's regular-season gamePks which top out around 800k).
const POSTSEASON_GAMEPK_BASE = 900_000_000
const ROUND_OFFSETS: Record<SeriesRound, number> = {
  WCS: 0,
  DS: 100_000,
  LCS: 200_000,
  WS: 300_000,
}

// Round start dates. Each round leaves at least one rest day after the
// maximum possible end date of the previous round. WCS max ends Day 0+2,
// DS max ends Day 0+6, LCS / WS max end Day 0+8 (see GAME_DAY_OFFSETS).
const ROUND_START_DATES: Record<SeriesRound, string> = {
  WCS: '2026-10-01',
  DS: '2026-10-05',
  LCS: '2026-10-13',
  WS: '2026-10-24',
}

// Day offsets per game index, mirroring real MLB postseason formats:
//   WCS  (best-of-3, 1-1-1): consecutive days, no travel.
//   DS   (best-of-5, 2-2-1): games at high seed, travel, games at low
//                            seed, travel, deciding game at high seed.
//   LCS  (best-of-7, 2-3-2): games 1-2 high, travel, 3-4-5 low, travel, 6-7 high.
//   WS   (best-of-7, 2-3-2): same as LCS.
const GAME_DAY_OFFSETS: Record<SeriesRound, readonly number[]> = {
  WCS: [0, 1, 2],
  DS:  [0, 1, 3, 4, 6],
  LCS: [0, 1, 3, 4, 5, 7, 8],
  WS:  [0, 1, 3, 4, 5, 7, 8],
}

export function startPostseason(season: Season): Season {
  const bracket = buildBracket(season)
  return {
    ...season,
    status: 'postseason',
    bracket,
    postseasonGames: [],
  }
}

export function isUserStillAlive(season: Season): boolean {
  if (!season.bracket) return false
  const userTeamId = season.userTeamId

  // Did the user qualify for the postseason? Any seed in either league
  // counts — including a top-2 bye, where the user isn't yet listed in
  // any constructed series.
  const inPlayoffs =
    season.bracket.alSeeds.includes(userTeamId) ||
    season.bracket.nlSeeds.includes(userTeamId)
  if (!inPlayoffs) return false

  // Have they lost a series? If any series the user appeared in has a
  // winner that isn't them, they're eliminated.
  for (const s of season.bracket.series) {
    if (
      (s.highSeedTeamId === userTeamId || s.lowSeedTeamId === userTeamId) &&
      s.winnerId &&
      s.winnerId !== userTeamId
    ) {
      return false
    }
  }
  return true
}

/**
 * Sims the current round and advances the bracket while the user is in
 * the postseason but has no game to play (most commonly: a top-2 seed
 * with a Wild Card bye, or the gap between completing a series and the
 * next round being constructed). Stops as soon as the user has an
 * active game OR the postseason ends.
 */
export function advancePastByes(season: Season): Season {
  let working = season
  let safety = 0
  while (
    working.bracket &&
    working.status === 'postseason' &&
    isUserStillAlive(working) &&
    !getNextUserPostseasonGame(working) &&
    safety++ < 10
  ) {
    working = simOutCurrentRound(working)
    working = maybeAdvanceRound(working)
  }
  return working
}

/**
 * Returns the user's currently-active series in the bracket's current
 * round, or null if user isn't in this round (bye or eliminated).
 */
export function getUserActiveSeries(season: Season): Series | null {
  if (!season.bracket) return null
  const userTeamId = season.userTeamId
  for (const s of season.bracket.series) {
    if (
      s.round === season.bracket.currentRound &&
      (s.highSeedTeamId === userTeamId || s.lowSeedTeamId === userTeamId) &&
      !s.winnerId
    ) {
      return s
    }
  }
  return null
}

export function getNextUserPostseasonGame(season: Season): Game | null {
  if (!season.bracket) return null
  const userSeries = getUserActiveSeries(season)
  if (!userSeries) return null
  if (seriesIsComplete(userSeries)) return null
  const gameIndex = userSeries.results.length
  return generatePostseasonGameForSeries(userSeries, gameIndex)
}

export function generatePostseasonGameForSeries(
  series: Series,
  gameIndex: number
): Game {
  const highHosts = highSeedHostsGame(series, gameIndex)
  const homeTeamId = highHosts ? series.highSeedTeamId : series.lowSeedTeamId
  const awayTeamId = highHosts ? series.lowSeedTeamId : series.highSeedTeamId
  const park = BALLPARK_BY_TEAM_ID.get(homeTeamId)!
  const date = postseasonDateFor(series.round, gameIndex)
  const gameDate = postseasonGameDateTime(date)

  return {
    gamePk:
      POSTSEASON_GAMEPK_BASE +
      ROUND_OFFSETS[series.round] +
      seriesIndexHash(series) * 10 +
      gameIndex,
    date,
    gameDate,
    homeTeamId,
    awayTeamId,
    parkId: park.id,
    kind: 'postseason',
    status: 'scheduled',
  }
}

function postseasonDateFor(round: SeriesRound, gameIndex: number): string {
  const offsets = GAME_DAY_OFFSETS[round]
  // Defensive: clamp to the last offset if a caller asks for a beyond-
  // bestOf game index (shouldn't happen, but keeps things safe).
  const offset = offsets[Math.min(gameIndex, offsets.length - 1)]
  const start = new Date(ROUND_START_DATES[round] + 'T00:00:00Z')
  start.setUTCDate(start.getUTCDate() + offset)
  return start.toISOString().slice(0, 10)
}

/**
 * Picks a realistic game start time for a postseason date. Weekday
 * games get prime-time evening (≈8 PM ET); weekend games get afternoon
 * (≈3 PM ET) to mirror MLB's broadcast windows. All times stored as
 * UTC; the UI's toLocaleTimeString renders them in the user's local TZ.
 */
function postseasonGameDateTime(date: string): string {
  // 23:08 UTC ≈ 7:08 PM EDT / 4:08 PM PDT (evening across all US TZs).
  // 19:08 UTC ≈ 3:08 PM EDT / 12:08 PM PDT (afternoon weekend slot).
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay() // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const utcHour = isWeekend ? '19' : '23'
  return `${date}T${utcHour}:08:00Z`
}

function seriesIndexHash(s: Series): number {
  let h = 0
  for (const c of s.id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h % 100
}

interface SimulatedSeriesStep {
  series: Series
  result: SeriesGameResult
  newSeed: number
}

/**
 * Sims one game in the given series. Returns the updated series, the
 * generated result, and the advanced rngSeed.
 */
function simOneSeriesGame(
  season: Season,
  series: Series,
  rngSeed: number
): SimulatedSeriesStep {
  const gameIndex = series.results.length
  const game = generatePostseasonGameForSeries(series, gameIndex)
  const rng = mulberry32(rngSeed)
  const sim = simulateGame({
    homeOvr: effectiveOvr(game.homeTeamId, season),
    awayOvr: effectiveOvr(game.awayTeamId, season),
    rng,
  })
  const result: SeriesGameResult = {
    homeWon: sim.homeWon,
    homeScore: sim.homeScore,
    awayScore: sim.awayScore,
  }
  const updated = recordSeriesGame(series, result)
  return { series: updated, result, newSeed: nextSeed(rngSeed) }
}

export function reportUserPostseasonGame(
  season: Season,
  didUserWin: boolean
): Season {
  if (!season.bracket) return season
  const userSeries = getUserActiveSeries(season)
  if (!userSeries) return season

  const next = getNextUserPostseasonGame(season)
  if (!next) return season

  // Snapshot pre-report state so Undo can roll back the user game,
  // every parallel-series sim, any round transition, and the WS-final
  // status/champion flip in one operation.
  const snapshot: PreReportSnapshot = {
    gameId: next.gamePk,
    currentDate: season.currentDate,
    rngSeed: season.rngSeed,
    teamRecords: season.teamRecords.map((r) => ({ ...r })),
    headToHead: deepCloneH2H(season.headToHead),
    bracket: deepCloneBracket(season.bracket),
    postseasonGames: (season.postseasonGames ?? []).map((g) => ({ ...g })),
    status: season.status,
    champion: season.champion,
  }

  const userTeamId = season.userTeamId
  const userIsHome = next.homeTeamId === userTeamId

  // Ask the simulator for plausible scores; flip if the user reported
  // a different winner than the sim guessed.
  const rng = mulberry32(season.rngSeed)
  const sim = simulateGame({
    homeOvr: effectiveOvr(next.homeTeamId, season),
    awayOvr: effectiveOvr(next.awayTeamId, season),
    rng,
  })
  const winnerScore = Math.max(sim.homeScore, sim.awayScore)
  const loserScore = Math.min(sim.homeScore, sim.awayScore)
  const homeWon =
    (didUserWin && userIsHome) || (!didUserWin && !userIsHome)
  const homeScore = homeWon ? winnerScore : loserScore
  const awayScore = homeWon ? loserScore : winnerScore

  let seed = nextSeed(season.rngSeed)

  // Record the user's series result.
  const userSeriesUpdated = recordSeriesGame(userSeries, {
    homeWon,
    homeScore,
    awayScore,
  })

  // Build the persisted Game record for the user's postseason game.
  const userGameRecord: Game = {
    ...next,
    status: 'played',
    result: {
      homeScore,
      awayScore,
      quick: true,
      simmed: false,
    },
  }

  // Lockstep: sim ONE game in each other parallel series in the same round
  // that hasn't finished yet.
  const updatedSeries: Series[] = []
  for (const s of season.bracket.series) {
    if (s.id === userSeries.id) {
      updatedSeries.push(userSeriesUpdated)
    } else if (s.round === userSeries.round && !seriesIsComplete(s)) {
      const step = simOneSeriesGame(season, s, seed)
      seed = step.newSeed
      updatedSeries.push(step.series)
    } else {
      updatedSeries.push(s)
    }
  }

  let bracket: Bracket = { ...season.bracket, series: updatedSeries }
  let workingSeason: Season = {
    ...season,
    rngSeed: seed,
    bracket,
    postseasonGames: [...(season.postseasonGames ?? []), userGameRecord],
    lastSnapshot: snapshot,
  }

  // If the user's series ended this turn, silently sim out any
  // still-unfinished parallel series so the round can advance.
  if (seriesIsComplete(userSeriesUpdated)) {
    workingSeason = simOutCurrentRound(workingSeason)
  }

  // Advance round / build next bracket if current round is fully done.
  workingSeason = maybeAdvanceRound(workingSeason)

  return workingSeason
}

export function simOutCurrentRound(season: Season): Season {
  if (!season.bracket) return season
  let seed = season.rngSeed
  const round = season.bracket.currentRound
  const updatedSeries = season.bracket.series.map((s) => {
    if (s.round !== round) return s
    let working = s
    while (!seriesIsComplete(working)) {
      const step = simOneSeriesGame(season, working, seed)
      seed = step.newSeed
      working = step.series
    }
    return working
  })
  return {
    ...season,
    rngSeed: seed,
    bracket: { ...season.bracket, series: updatedSeries },
  }
}

export function maybeAdvanceRound(season: Season): Season {
  if (!season.bracket) return season
  const currentRound = season.bracket.currentRound
  const inRound = season.bracket.series.filter((s) => s.round === currentRound)
  if (inRound.some((s) => !seriesIsComplete(s))) return season

  // Round done. If WS, mark complete with champion.
  if (currentRound === 'WS') {
    const ws = inRound[0]
    return {
      ...season,
      status: 'complete',
      champion: ws.winnerId,
      bracket: {
        ...season.bracket,
        champion: ws.winnerId,
      },
    }
  }

  // Otherwise, build next round.
  const next = buildNextRoundSeries(season.bracket)
  if (next.length === 0) return season

  // Pick the next round name from the first new series.
  const nextRoundName = next[0].round
  return {
    ...season,
    bracket: {
      ...season.bracket,
      series: [...season.bracket.series, ...next],
      currentRound: nextRoundName,
    },
  }
}

export function simRemainingPostseason(season: Season): Season {
  if (!season.bracket) return season
  let working: Season = season
  let safety = 0
  while (working.status === 'postseason' && safety++ < 50) {
    working = simOutCurrentRound(working)
    working = maybeAdvanceRound(working)
  }
  return working
}

export function teamLabel(teamId: string): string {
  const t = TEAM_BY_ID.get(teamId)
  return t ? t.name : teamId
}

function deepCloneH2H(h2h: Season['headToHead']): Season['headToHead'] {
  const out: Season['headToHead'] = {}
  for (const a of Object.keys(h2h)) {
    out[a] = { ...h2h[a] }
  }
  return out
}

function deepCloneBracket(b: Bracket): Bracket {
  return {
    alSeeds: [...b.alSeeds],
    nlSeeds: [...b.nlSeeds],
    series: b.series.map((s) => ({
      ...s,
      results: s.results.map((r) => ({ ...r })),
    })),
    currentRound: b.currentRound,
    champion: b.champion,
  }
}
