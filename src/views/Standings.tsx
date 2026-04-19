// Standings view (PLAN.md §6.6 + §7.2). AL/NL × East/Central/West tables.
// Reads live from TeamRecord — single source of truth per §7.3.

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { loadSeason, listSeasons } from '../domain/seasonStore'
import { getStandingsForDivision } from '../domain/standings'
import { getUserDisplay } from '../domain/userDisplay'
import type { LeagueId, DivisionId } from '../data/teamIdMap'

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

export function Standings() {
  const season = useMemo(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  }, [])

  if (!season) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p>No active season.</p>
        <Link to="/" className="text-emerald-400 underline">Home</Link>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Standings</h1>
          <Link to="/game" className="text-sm text-emerald-400 underline">
            Back to game
          </Link>
        </header>

        <div className="space-y-6">
          {LEAGUES.map((league) =>
            DIVISIONS.map((division) => {
              const ranks = getStandingsForDivision(season, league, division)
              return (
                <section key={`${league}-${division}`}>
                  <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-400">
                    {league} {division}
                  </h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1">Team</th>
                        <th className="text-center">W</th>
                        <th className="text-center">L</th>
                        <th className="text-center">PCT</th>
                        <th className="text-center">GB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranks.map((e) => {
                        const display = getUserDisplay(season, e.teamId)
                        return (
                          <tr
                            key={e.teamId}
                            className={`border-t border-slate-800 ${
                              display.isUser ? 'bg-emerald-900/20 text-emerald-100' : ''
                            }`}
                          >
                            <td className="py-1.5">
                              {display.city ? `${display.city} ${display.name}` : display.name}
                              {display.isUser && (
                                <span className="ml-1 text-xs text-emerald-400">
                                  ({display.abbrev})
                                </span>
                              )}
                            </td>
                            <td className="text-center">{e.wins}</td>
                            <td className="text-center">{e.losses}</td>
                            <td className="text-center">
                              {e.winPct.toFixed(3).slice(1)}
                            </td>
                            <td className="text-center">
                              {e.gamesBack === 0 ? '—' : e.gamesBack.toFixed(1)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </section>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
