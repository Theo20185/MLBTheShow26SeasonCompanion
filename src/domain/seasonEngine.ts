// Season engine — pure functions that mutate Season state in response
// to game outcomes (PLAN.md §6.4 + §6.5). Two main entry points:
//
//   recordGameResult(season, ...) — apply a single W/L to TeamRecord +
//     HeadToHead, routing to first/second half based on date.
//
//   simulateNonUserGamesUpTo(season, date) — sim every league game (not
//     involving the user) on or before `date` that hasn't been simmed
//     yet, advancing rngSeed deterministically and folding outcomes
//     into TeamRecord + HeadToHead. Idempotent.

import { SCHEDULE_2026 } from '../data/bundledData'
import { TEAM_BY_ID } from '../data/teamIdMap'
import { mulberry32, nextSeed } from './rng'
import { simulateGame, effectiveOvr } from './simulator'
import type { HeadToHead, Season, TeamRecord } from './types'

/** First date of the second half of the season (post All-Star break). */
export const ALL_STAR_BREAK_END = '2026-07-17'

export function isFirstHalfDate(date: string): boolean {
  return date < ALL_STAR_BREAK_END
}

interface RecordOpts {
  date: string
  winnerId: string
  loserId: string
  isDivisionGame: boolean
}

export function recordGameResult(season: Season, opts: RecordOpts): Season {
  const { date, winnerId, loserId, isDivisionGame } = opts
  const firstHalf = isFirstHalfDate(date)

  const teamRecords = season.teamRecords.map((r): TeamRecord => {
    if (r.teamId === winnerId) {
      return {
        ...r,
        firstHalfWins: r.firstHalfWins + (firstHalf ? 1 : 0),
        secondHalfWins: r.secondHalfWins + (firstHalf ? 0 : 1),
        divisionWins: r.divisionWins + (isDivisionGame ? 1 : 0),
      }
    }
    if (r.teamId === loserId) {
      return {
        ...r,
        firstHalfLosses: r.firstHalfLosses + (firstHalf ? 1 : 0),
        secondHalfLosses: r.secondHalfLosses + (firstHalf ? 0 : 1),
        divisionLosses: r.divisionLosses + (isDivisionGame ? 1 : 0),
      }
    }
    return r
  })

  const headToHead = bumpH2H(season.headToHead, winnerId, loserId)
  return { ...season, teamRecords, headToHead }
}

function bumpH2H(
  h2h: HeadToHead,
  winnerId: string,
  loserId: string
): HeadToHead {
  const next: HeadToHead = { ...h2h }
  next[winnerId] = { ...(next[winnerId] ?? {}) }
  next[winnerId][loserId] = (next[winnerId][loserId] ?? 0) + 1
  return next
}

function isDivisionGame(homeId: string, awayId: string): boolean {
  const home = TEAM_BY_ID.get(homeId)
  const away = TEAM_BY_ID.get(awayId)
  if (!home || !away) return false
  return home.league === away.league && home.division === away.division
}

/**
 * Simulates every non-user league game scheduled on or before `targetDate`
 * that hasn't been simmed yet (tracked by Season.lastSimmedDate). Returns
 * a new Season with updated records, H2H, rngSeed, and lastSimmedDate.
 */
export function simulateNonUserGamesUpTo(
  season: Season,
  targetDate: string
): Season {
  // Track the last date we sim'd through to enforce idempotence. This
  // lives on the Season as a per-call cursor; we attach it lazily.
  const lastSimmedDate: string | undefined =
    (season as unknown as { lastSimmedDate?: string }).lastSimmedDate

  if (lastSimmedDate && lastSimmedDate >= targetDate) {
    return season
  }

  const cursorStart = lastSimmedDate
    ? nextDay(lastSimmedDate)
    : SCHEDULE_2026.reduce(
        (min, g) => (g.officialDate < min ? g.officialDate : min),
        '9999-12-31'
      )

  // Find all relevant games in [cursorStart, targetDate], excluding any
  // that involve the user team (those are user-reported).
  const relevant = SCHEDULE_2026.filter(
    (g) =>
      g.officialDate >= cursorStart &&
      g.officialDate <= targetDate &&
      g.homeTeamId !== season.userTeamId &&
      g.awayTeamId !== season.userTeamId
  ).sort((a, b) => {
    if (a.gameDate !== b.gameDate) return a.gameDate < b.gameDate ? -1 : 1
    return a.gamePk - b.gamePk
  })

  let working: Season = season
  let seed = season.rngSeed

  for (const game of relevant) {
    const rng = mulberry32(seed)
    const homeOvr = effectiveOvr(game.homeTeamId, working)
    const awayOvr = effectiveOvr(game.awayTeamId, working)
    const result = simulateGame({ homeOvr, awayOvr, rng })
    const winnerId = result.homeWon ? game.homeTeamId : game.awayTeamId
    const loserId = result.homeWon ? game.awayTeamId : game.homeTeamId
    working = recordGameResult(working, {
      date: game.officialDate,
      winnerId,
      loserId,
      isDivisionGame: isDivisionGame(game.homeTeamId, game.awayTeamId),
    })
    seed = nextSeed(seed)
  }

  return {
    ...working,
    rngSeed: seed,
    ...({ lastSimmedDate: targetDate } as object),
  }
}

function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
