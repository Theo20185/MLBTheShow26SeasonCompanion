// Schedule view (PLAN.md §7.2). Read-only list of the user's 162 games.
// Each row shows opponent, home/away, ballpark, date, and either the
// final score (played) or the opponent's current W/L record (upcoming).

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { loadSeason, listSeasons } from '../domain/seasonStore'
import { getUserDisplay } from '../domain/userDisplay'
import { formatGameDate } from './formatGameTime'

export function Schedule() {
  const season = useMemo(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  }, [])

  if (!season) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p>No active season.</p>
        <Link
          to="/"
          className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white active:scale-[0.98]"
        >
          Home
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Schedule</h1>
          <Link
            to="/game"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-emerald-700 bg-emerald-900/40 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/60 active:scale-[0.98]"
          >
            Back to game
          </Link>
        </header>
        <ul className="space-y-1 text-sm">
          {season.userGames.map((g) => {
            const userIsHome = g.homeTeamId === season.userTeamId
            const oppId = userIsHome ? g.awayTeamId : g.homeTeamId
            const opp = getUserDisplay(season, oppId)
            const oppRec = season.teamRecords.find((r) => r.teamId === oppId)!
            const oppW = oppRec.firstHalfWins + oppRec.secondHalfWins
            const oppL = oppRec.firstHalfLosses + oppRec.secondHalfLosses

            return (
              <li
                key={g.gamePk}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  g.status === 'played'
                    ? g.result?.homeScore !== undefined &&
                      ((userIsHome && g.result.homeScore > g.result.awayScore) ||
                        (!userIsHome && g.result.awayScore > g.result.homeScore))
                      ? 'border-emerald-700 bg-emerald-900/30'
                      : 'border-rose-700 bg-rose-900/30'
                    : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="text-xs text-slate-400">
                    {formatGameDate(g.date, g.parkId)} · {userIsHome ? 'vs' : '@'} {opp.name}
                  </div>
                  <div className="text-sm">
                    {g.status === 'played' && g.result
                      ? `${userIsHome ? g.result.homeScore : g.result.awayScore}-${userIsHome ? g.result.awayScore : g.result.homeScore}`
                      : `(${oppW}-${oppL})`}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {g.status === 'played' ? (
                    g.result?.simmed ? 'simmed' : 'played'
                  ) : (
                    'scheduled'
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}

// Date formatter moved to formatGameTime.ts.
