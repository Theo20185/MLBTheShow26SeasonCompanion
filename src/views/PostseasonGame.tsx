// Postseason game card (PLAN.md §6.7). Rendered by Game.tsx when
// season.status === 'postseason' and user team is alive in an
// active series. Same report semantics as the regular-season card,
// minus Undo (postseason results cascade across series — easier to
// keep the rule "Undo only works in regular season" than to fully
// snapshot the bracket).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveDisplayPark } from '../domain/homePark'
import {
  getNextUserPostseasonGame,
  getUserActiveSeries,
  reportUserPostseasonGame,
} from '../domain/postseason'
import { undoLastReport } from '../domain/reportGame'
import { saveSeason } from '../domain/seasonStore'
import { countWinsBy } from '../domain/bracket'
import { getUserDisplay, fullLabel } from '../domain/userDisplay'
import { formatGameDate, formatGameTime } from './formatGameTime'
import { primaryButtonStyle, themeForSeason } from './squadTheme'
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
  const opponent = getUserDisplay(season, opponentId)
  const userDisplay = getUserDisplay(season, userTeamId)
  const displayPark = resolveDisplayPark(season, game)
  const theme = themeForSeason(season)

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

  function handleUndo() {
    const undone = undoLastReport(season)
    if (undone) commit(undone)
  }

  return (
    <>
      {/* Dramatic progress chip per PLAN.md §6.7 */}
      <div
        data-testid="progress-chip"
        className="mb-4 rounded-full bg-amber-100 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
      >
        {ROUND_NAMES[series.round]} · Game {gameNumber} · {seriesStateText(userWins, oppWins, opponent.name)}
        {stakes && <span className="ml-1 font-semibold">{stakes}</span>}
      </div>

      {/* Game card */}
      <section
        data-testid="game-card"
        className="rounded-2xl border border-amber-700 bg-slate-50 p-5 shadow-lg dark:bg-slate-800"
      >
        <div className="text-center text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
          {userDisplay.name} {userIsHome ? 'host' : '@'}{' '}
          <span data-testid="opponent-name">{opponent.name}</span>
        </div>
        <div className="mt-2 text-center text-base text-slate-700 dark:text-slate-300">
          {fullLabel(season, opponentId)}
        </div>
        <div className="my-4 text-center text-2xl font-semibold">
          <span data-testid="venue-name">{displayPark.name}</span>
        </div>
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          {formatGameDate(game.date, game.parkId, displayPark.timezone)} · {formatGameTime(game.gameDate, game.parkId, displayPark.timezone)}
        </div>
      </section>

      <div className="mt-6">
        {!reportOpen ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            style={primaryButtonStyle(theme)}
            className="w-full rounded-xl px-6 py-4 text-lg font-semibold shadow-lg active:scale-[0.98]"
          >
            Report Result
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Tap W or L to commit. Undo is available for the most recent
              postseason game if you misclick.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleReport(true)}
                style={primaryButtonStyle(theme)}
                className="rounded-xl px-6 py-5 text-xl font-bold active:scale-[0.98]"
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
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        )}

        {season.lastSnapshot && (
          <button
            type="button"
            onClick={handleUndo}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-amber-700 bg-amber-100 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-200 active:scale-[0.98] dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            Undo last game
          </button>
        )}

        <Link
          to="/bracket"
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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

// Date/time helpers moved to formatGameTime.ts.
