// Postseason bracket view (PLAN.md §6.7).
// Minimal v1: show the seedings for both leagues + the round-1 matchups.
// Game-by-game playthrough + lockstep parallel-series simming is a
// follow-up enhancement.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadSeason, listSeasons, saveSeason } from '../domain/seasonStore'
import { buildBracket, teamCityName } from '../domain/bracket'
import type { Season } from '../domain/types'

export function Bracket() {
  const [season, setSeason] = useState<Season | null>(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  })

  const bracket = useMemo(() => (season ? buildBracket(season) : null), [season])

  if (!season || !bracket) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p>No active season.</p>
        <Link to="/" className="text-emerald-400 underline">Home</Link>
      </main>
    )
  }

  function markPostseasonReached() {
    if (season!.status === 'regular') {
      const updated: Season = { ...season!, status: 'postseason' }
      saveSeason(updated)
      setSeason(updated)
    }
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Postseason Bracket</h1>
          <Link to="/" className="text-sm text-emerald-400 underline">Home</Link>
        </header>

        {season.status === 'regular' && (
          <button
            type="button"
            onClick={markPostseasonReached}
            className="mb-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
          >
            Begin Postseason
          </button>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {(['AL', 'NL'] as const).map((league) => {
            const seeds = league === 'AL' ? bracket.alSeeds : bracket.nlSeeds
            return (
              <section key={league} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">
                  {league} Seeds
                </h2>
                <ol className="space-y-1 text-sm">
                  {seeds.map((teamId, i) => (
                    <li
                      key={teamId}
                      className={`flex items-center gap-2 ${
                        teamId === season.userTeamId ? 'text-emerald-300 font-semibold' : ''
                      }`}
                    >
                      <span className="w-5 text-slate-500">#{i + 1}</span>
                      <span>{teamCityName(teamId)}</span>
                      {i < 2 && (
                        <span className="ml-auto rounded-full bg-amber-700/40 px-2 py-0.5 text-xs text-amber-200">
                          Bye
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">
            Wild Card Series
          </h2>
          <ul className="space-y-2 text-sm">
            {bracket.series.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-slate-700 bg-slate-800/40 p-3"
              >
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-slate-500">{s.league} ·</span>{' '}
                    #{s.highSeedRank} {teamCityName(s.highSeedTeamId)}
                    {' vs '}
                    #{s.lowSeedRank} {teamCityName(s.lowSeedTeamId)}
                  </span>
                  <span className="text-xs text-slate-500">Best of {s.bestOf}</span>
                </div>
                {s.winnerId && (
                  <div className="mt-1 text-xs text-emerald-300">
                    Winner: {teamCityName(s.winnerId)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          Game-by-game postseason playthrough with lockstep parallel-series
          simming is a follow-up enhancement.
        </p>
      </div>
    </main>
  )
}
