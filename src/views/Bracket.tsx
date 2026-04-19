// Postseason bracket view (PLAN.md §6.7).
// Live bracket: shows all rounds (WCS / DS / LCS / WS), per-series
// state (game-by-game), winners, and the champion. When the user is
// eliminated, offers a "Sim to World Series" button to silently
// finish out the postseason.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadSeason, listSeasons, saveSeason } from '../domain/seasonStore'
import {
  buildBracket,
  countWinsBy,
  type Series,
  type SeriesRound,
} from '../domain/bracket'
import { fullLabel, getUserDisplay } from '../domain/userDisplay'
import {
  isUserStillAlive,
  simRemainingPostseason,
  startPostseason,
} from '../domain/postseason'
import type { Season } from '../domain/types'

const ROUND_NAMES: Record<SeriesRound, string> = {
  WCS: 'Wild Card',
  DS: 'Division Series',
  LCS: 'Championship Series',
  WS: 'World Series',
}

const ROUND_ORDER: SeriesRound[] = ['WCS', 'DS', 'LCS', 'WS']

export function Bracket() {
  const [season, setSeason] = useState<Season | null>(() => {
    const idx = listSeasons()
    const active = idx[0]
    return active ? loadSeason(active.id) : null
  })

  // If we're still in regular season, show the projected bracket without
  // mutating state. If we're in postseason, use the persisted bracket.
  const bracket = useMemo(() => {
    if (!season) return null
    if (season.bracket) return season.bracket
    return buildBracket(season)
  }, [season])

  if (!season || !bracket) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p>No active season.</p>
        <Link to="/" className="text-emerald-400 underline">Home</Link>
      </main>
    )
  }

  function beginPostseason() {
    const updated = startPostseason(season!)
    saveSeason(updated)
    setSeason(updated)
  }

  function simToWorldSeries() {
    if (!confirm('Sim through the rest of the postseason?')) return
    const updated = simRemainingPostseason(season!)
    saveSeason(updated)
    setSeason(updated)
  }

  const champion = season.champion ?? bracket.champion
  const userAlive = isUserStillAlive(season)
  const userTeamId = season.userTeamId

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Postseason Bracket</h1>
          <div className="flex gap-3 text-sm">
            <Link to="/game" className="text-emerald-400 underline">Game</Link>
            <Link to="/" className="text-slate-400 underline">Home</Link>
          </div>
        </header>

        {champion && (
          <div className="mb-6 rounded-2xl border border-amber-500 bg-amber-900/30 p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-amber-200">
              World Series Champion
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-100">
              {fullLabel(season, champion)}
            </div>
            {champion === userTeamId && (
              <div className="mt-1 text-sm text-amber-200">— that's you</div>
            )}
          </div>
        )}

        {season.status === 'regular' && (
          <button
            type="button"
            onClick={beginPostseason}
            className="mb-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
          >
            Begin Postseason
          </button>
        )}

        {season.status === 'postseason' && !userAlive && !champion && (
          <button
            type="button"
            onClick={simToWorldSeries}
            className="mb-4 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white"
          >
            Sim to World Series
          </button>
        )}

        {/* Seedings */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {(['AL', 'NL'] as const).map((league) => {
            const seeds = league === 'AL' ? bracket.alSeeds : bracket.nlSeeds
            return (
              <section
                key={league}
                className="rounded-xl border border-slate-700 bg-slate-800 p-4"
              >
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
                  {league} Seeds
                </h2>
                <ol className="space-y-1 text-sm">
                  {seeds.map((teamId, i) => (
                    <li
                      key={teamId}
                      className={`flex items-center gap-2 ${
                        teamId === userTeamId ? 'font-semibold text-emerald-300' : ''
                      }`}
                    >
                      <span className="w-5 text-slate-500">#{i + 1}</span>
                      <span className="flex-1 truncate">{fullLabel(season, teamId)}</span>
                      {i < 2 && (
                        <span className="rounded-full bg-amber-700/40 px-2 py-0.5 text-xs text-amber-200">
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

        {/* Rounds */}
        <div className="space-y-6">
          {ROUND_ORDER.map((round) => {
            const seriesInRound = bracket.series.filter((s) => s.round === round)
            if (seriesInRound.length === 0) return null
            return (
              <section key={round}>
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
                  {ROUND_NAMES[round]}
                  {bracket.currentRound === round && season.status === 'postseason' && (
                    <span className="ml-2 rounded bg-amber-700 px-1.5 py-0.5 text-xs text-amber-100">
                      Current
                    </span>
                  )}
                </h2>
                <ul className="space-y-2">
                  {seriesInRound.map((s) => (
                    <SeriesCard
                      key={s.id}
                      series={s}
                      season={season}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function SeriesCard({ series, season }: { series: Series; season: Season }) {
  const wins = countWinsBy(series)
  const userTeamId = season.userTeamId
  const userInSeries =
    series.highSeedTeamId === userTeamId || series.lowSeedTeamId === userTeamId
  const high = getUserDisplay(season, series.highSeedTeamId)
  const low = getUserDisplay(season, series.lowSeedTeamId)
  return (
    <li
      className={`rounded-lg border p-3 text-sm ${
        userInSeries
          ? 'border-emerald-700 bg-emerald-900/20'
          : series.winnerId
            ? 'border-slate-700 bg-slate-800/40'
            : 'border-slate-700 bg-slate-800/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">
            #{series.highSeedRank} {series.league !== 'inter' ? series.league : ''}
            {series.league === 'inter' ? ' (host)' : ''}
          </div>
          <div className="truncate">
            {high.city ? `${high.city} ${high.name}` : high.name}
          </div>
        </div>
        <div className="px-3 text-center font-mono text-base">
          {wins.high}-{wins.low}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-xs text-slate-500">
            #{series.lowSeedRank} {series.league !== 'inter' ? series.league : ''}
          </div>
          <div className="truncate">
            {low.city ? `${low.city} ${low.name}` : low.name}
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>Best of {series.bestOf}</span>
        {series.winnerId ? (
          <span className="text-emerald-300">
            Winner: {fullLabel(season, series.winnerId)}
          </span>
        ) : (
          <span>{series.results.length === 0 ? 'Not started' : 'In progress'}</span>
        )}
      </div>
    </li>
  )
}
