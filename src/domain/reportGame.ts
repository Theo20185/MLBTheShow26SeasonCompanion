// User-game report flow (PLAN.md §6.3 + §6.4) plus single-level Undo.
//
// reportUserGame(season, ...) — snapshots pre-report state, marks the
// game as played, updates records + H2H, advances currentDate, and sims
// non-user games up to the new currentDate.
//
// undoLastReport(season) — restores from lastSnapshot, flips the game
// back to scheduled, clears lastSnapshot. One-shot (no double-undo).

import { TEAM_BY_ID } from '../data/teamIdMap'
import { mulberry32, nextSeed } from './rng'
import {
  recordGameResult,
  simulateNonUserGamesUpTo,
} from './seasonEngine'
import { simulateGame, effectiveOvr } from './simulator'
import { startPostseason } from './postseason'
import type { Game, GameResult, PreReportSnapshot, Season } from './types'

export function getNextUserGame(season: Season): Game | null {
  return season.userGames.find((g) => g.status === 'scheduled') ?? null
}

export interface ReportOptions {
  gamePk: number
  didUserWin: boolean
  isSim?: boolean
  /** Optional pinned scores (for full box score reports). */
  homeScore?: number
  awayScore?: number
}

export function reportUserGame(
  season: Season,
  opts: ReportOptions
): Season {
  const next = getNextUserGame(season)
  if (!next || next.gamePk !== opts.gamePk) {
    throw new Error(
      `reportUserGame: expected next game ${next?.gamePk}, got ${opts.gamePk}`
    )
  }

  const snapshot: PreReportSnapshot = {
    gameId: next.gamePk,
    currentDate: season.currentDate,
    rngSeed: season.rngSeed,
    teamRecords: season.teamRecords.map((r) => ({ ...r })),
    headToHead: deepCloneH2H(season.headToHead),
  }

  const userIsHome = next.homeTeamId === season.userTeamId
  const userTeamId = season.userTeamId
  const opponentId = userIsHome ? next.awayTeamId : next.homeTeamId

  // Determine score: use caller-provided values if any, otherwise generate
  // a plausible score using the simulator (deterministic, seeded).
  let homeScore: number
  let awayScore: number
  let advancedSeed = season.rngSeed
  if (opts.homeScore !== undefined && opts.awayScore !== undefined) {
    homeScore = opts.homeScore
    awayScore = opts.awayScore
  } else {
    const rng = mulberry32(season.rngSeed)
    const sim = simulateGame({
      homeOvr: effectiveOvr(next.homeTeamId, season),
      awayOvr: effectiveOvr(next.awayTeamId, season),
      rng,
      userIsHome,
      userIsAway: !userIsHome,
      applyUserSimPenalty: !!opts.isSim,
    })
    advancedSeed = nextSeed(season.rngSeed)
    // We force the userWin outcome (user reports the truth). Build a
    // sensible score from the sim's magnitudes by assigning the larger
    // total to whichever side actually won.
    const winnerScore = Math.max(sim.homeScore, sim.awayScore)
    const loserScore = Math.min(sim.homeScore, sim.awayScore)
    if ((opts.didUserWin && userIsHome) || (!opts.didUserWin && !userIsHome)) {
      homeScore = winnerScore
      awayScore = loserScore
    } else {
      homeScore = loserScore
      awayScore = winnerScore
    }
  }

  const winnerId = opts.didUserWin ? userTeamId : opponentId
  const loserId = opts.didUserWin ? opponentId : userTeamId

  const result: GameResult = {
    homeScore,
    awayScore,
    quick: opts.homeScore === undefined,
    simmed: !!opts.isSim,
  }

  let updated: Season = {
    ...season,
    rngSeed: advancedSeed,
    lastSnapshot: snapshot,
    userGames: season.userGames.map((g) =>
      g.gamePk === next.gamePk
        ? { ...g, status: 'played', result }
        : g
    ),
  }

  updated = recordGameResult(updated, {
    date: next.date,
    winnerId,
    loserId,
    isDivisionGame: isDivisionGame(next.homeTeamId, next.awayTeamId),
  })

  // Advance currentDate to the played game's date, then sim everything
  // through that date.
  updated = { ...updated, currentDate: next.date }
  updated = simulateNonUserGamesUpTo(updated, next.date)

  // If that was the user's last regular-season game, flip the season
  // to postseason so callers never see "status=regular but no next
  // user game." Owns the transition in the engine; views don't have
  // to special-case it.
  if (updated.status === 'regular' && !updated.userGames.some((g) => g.status === 'scheduled')) {
    updated = startPostseason(updated)
  }

  return updated
}

export function undoLastReport(season: Season): Season | null {
  const snap = season.lastSnapshot
  if (!snap) return null

  // Regular-season game: flip the user game back to scheduled.
  const userGames = season.userGames.map((g) =>
    g.gamePk === snap.gameId
      ? { ...g, status: 'scheduled' as const, result: undefined }
      : g
  )

  const restored: Season = {
    ...season,
    currentDate: snap.currentDate,
    rngSeed: snap.rngSeed,
    teamRecords: snap.teamRecords.map((r) => ({ ...r })),
    headToHead: deepCloneH2H(snap.headToHead),
    userGames,
    lastSnapshot: undefined,
  }

  // Postseason fields, if the snapshot captured them. The user might have
  // been on the WS-final game, in which case status flipped from
  // 'postseason' to 'complete' and champion was set; restore both.
  if (snap.bracket !== undefined) {
    restored.bracket = snap.bracket
  }
  if (snap.postseasonGames !== undefined) {
    restored.postseasonGames = snap.postseasonGames
  }
  if (snap.status !== undefined) {
    restored.status = snap.status
  }
  // Champion is set to undefined when restoring a pre-WS-final state.
  if (snap.bracket !== undefined) {
    restored.champion = snap.champion
  }

  // Also clear the lastSimmedDate cursor so simulateNonUserGamesUpTo
  // re-derives correctly on the next report.
  delete (restored as unknown as { lastSimmedDate?: string }).lastSimmedDate
  return restored
}

function isDivisionGame(homeId: string, awayId: string): boolean {
  const home = TEAM_BY_ID.get(homeId)
  const away = TEAM_BY_ID.get(awayId)
  if (!home || !away) return false
  return home.league === away.league && home.division === away.division
}

function deepCloneH2H(h2h: Season['headToHead']): Season['headToHead'] {
  const out: Season['headToHead'] = {}
  for (const a of Object.keys(h2h)) {
    out[a] = { ...h2h[a] }
  }
  return out
}
