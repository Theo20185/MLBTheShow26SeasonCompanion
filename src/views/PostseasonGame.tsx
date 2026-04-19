// Postseason game card (PLAN.md §6.7). Rendered by Game.tsx when
// season.status === 'postseason' and user team is alive in an
// active series. Same report semantics as the regular-season card,
// minus Undo (postseason results cascade across series — easier to
// keep the rule "Undo only works in regular season" than to fully
// snapshot the bracket).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TEAM_BY_ID } from '../data/teamIdMap'
import { BALLPARK_BY_ID } from '../data/ballparks'
import {
  getNextUserPostseasonGame,
  getUserActiveSeries,
  reportUserPostseasonGame,
} from '../domain/postseason'
import { saveSeason } from '../domain/seasonStore'
import { countWinsBy } from '../domain/bracket'
import type { Season } from '../domain/types'

const ROUND_NAMES: Record<string, string> = {
  WCS: 'Wild Card Series',
  DS: 'Division Series',
  LCS: 'Championship Series',
  WS: 'World Series',
}

interface Props {
  season: Season
  onSeasonUpdate: (s: Season) => void
}

export function PostseasonGame({ season, onSeasonUpdate }: Props) {
  const [reportOpen, setReportOpen] = useState(false)
  const game = getNextUserPostseasonGame(season)
  const series = getUserActiveSeries(season)

  if (!game || !series) {
    return null
  }

  const userTeamId = season.userTeamId
  const userIsHome = game.homeTeamId === userTeamId
  const opponentId = userIsHome ? game.awayTeamId : game.homeTeamId
  const opponent = TEAM_BY_ID.get(opponentId)!
  const park = BALLPARK_BY_ID.get(game.parkId)

  const wins = countWinsBy(series)
  const userIsHigh = series.highSeedTeamId === userTeamId
  const userWins = userIsHigh ? wins.high : wins.low
  const oppWins = userIsHigh ? wins.low : wins.high
  const gameNumber = series.results.length + 1
  const elimination = oppWins === Math.ceil(series.bestOf / 2) - 1 && oppWins > userWins
  const stakes = stakesLine(userWins, oppWins, series.bestOf, elimination)

  function commit(updated: Season) {
    saveSeason(updated)
    onSeasonUpdate(updated)
    setReportOpen(false)
  }

  function handleReport(didUserWin: boolean) {
    commit(reportUserPostseasonGame(season, didUserWin))
  }

  return (
    <>
      {/* Dramatic progress chip per PLAN.md §6.7 */}
      <div
        data-testid="progress-chip"
        className="mb-4 rounded-full bg-amber-900/40 px-4 py-2 text-center text-xs text-amber-200"
      >
        {ROUND_NAMES[series.round]} · Game {gameNumber} · {seriesStateText(userWins, oppWins, opponent.name)}
        {stakes && <span className="ml-1 font-semibold">{stakes}</span>}
      </div>

      {/* Game card */}
      <section
        data-testid="game-card"
        className="rounded-2xl border border-amber-700 bg-slate-800 p-5 shadow-lg"
      >
        <div className="text-center text-xs uppercase tracking-wider text-amber-300">
          {userIsHome ? 'vs.' : '@'}{' '}
          <span data-testid="opponent-name">{opponent.name}</span>
        </div>
        <div className="mt-2 text-center text-base text-slate-300">
          {opponent.city} {opponent.name}
        </div>
        <div className="my-4 text-center text-2xl font-semibold">
          <span data-testid="venue-name">{park?.name ?? game.homeTeamId}</span>
        </div>
        <div className="text-center text-sm text-slate-400">
          {formatDate(game.date)} · Postseason
        </div>
      </section>

      <div className="mt-6">
        {!reportOpen ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="w-full rounded-xl bg-amber-600 px-6 py-4 text-lg font-semibold text-white shadow-lg active:scale-[0.98]"
          >
            Report Result
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-400">
              Tap W or L. Postseason reports cascade through the bracket and
              cannot be undone — be sure.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleReport(true)}
                className="rounded-xl bg-emerald-600 px-6 py-5 text-xl font-bold text-white active:scale-[0.98]"
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => handleReport(false)}
                className="rounded-xl bg-rose-600 px-6 py-5 text-xl font-bold text-white active:scale-[0.98]"
              >
                Loss
              </button>
            </div>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="mt-1 block w-full text-center text-xs text-slate-500 underline"
            >
              Cancel
            </button>
          </div>
        )}

        <Link
          to="/bracket"
          className="mt-3 block w-full text-center text-xs text-slate-400 underline"
        >
          See the bracket
        </Link>
      </div>
    </>
  )
}

function stakesLine(
  userWins: number,
  oppWins: number,
  bestOf: number,
  isElim: boolean
): string {
  const need = Math.ceil(bestOf / 2)
  if (isElim) return '· Win to survive'
  if (userWins === need - 1 && oppWins < need - 1) return '· Win to advance'
  if (userWins === oppWins && userWins === need - 1) return '· Winner-take-all'
  return ''
}

function seriesStateText(userWins: number, oppWins: number, opponentName: string): string {
  if (userWins === 0 && oppWins === 0) return 'Series even'
  if (userWins > oppWins) return `You lead ${userWins}-${oppWins}`
  if (userWins < oppWins) return `${opponentName} lead ${oppWins}-${userWins}`
  return `Tied ${userWins}-${oppWins}`
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
