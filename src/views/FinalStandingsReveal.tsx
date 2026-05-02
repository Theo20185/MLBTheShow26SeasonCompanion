// Final Standings + Bracket Reveal screen (PLAN.md §6.7).
// Shown when season.status === 'awaitingPostseason'. Lets the user
// review the final regular-season standings before tapping "Begin
// Postseason," which calls startPostseason() and flips status to
// 'postseason'.

import { Link } from 'react-router-dom'
import { saveSeason } from '../domain/seasonStore'
import { startPostseason, simRemainingPostseason } from '../domain/postseason'
import { getStandingsForDivision } from '../domain/standings'
import { getUserDisplay, fullLabel } from '../domain/userDisplay'
import { buildBracket } from '../domain/bracket'
import { primaryButtonStyle, primaryTintStyle, themeForSeason, useThemeMode, readableOn } from './squadTheme'
import type { Season, LeagueId, DivisionId } from '../domain/types'

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

interface Props {
  season: Season
  onSeasonUpdate: (s: Season) => void
}

export function FinalStandingsReveal({ season, onSeasonUpdate }: Props) {
  const theme = themeForSeason(season)
  useThemeMode(theme.mode)

  // Project the bracket without committing it so we can show seeds.
  const bracket = buildBracket(season)
  const userTeamId = season.userTeamId
  const userMadeIt =
    bracket.alSeeds.includes(userTeamId) || bracket.nlSeeds.includes(userTeamId)

  function beginPostseason() {
    const begun = startPostseason(season)
    saveSeason(begun)
    onSeasonUpdate(begun)
  }

  function simToWorldSeries() {
    if (!confirm('Sim through the rest of the postseason?')) return
    // simRemainingPostseason expects status === 'postseason', so begin
    // first then sim from there.
    const begun = startPostseason(season)
    const finished = simRemainingPostseason(begun)
    saveSeason(finished)
    onSeasonUpdate(finished)
  }

  return (
    <main
      data-testid="final-standings-reveal"
      className="min-h-svh bg-white px-4 py-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Regular season complete
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Final Standings
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            162 games are in the books. Review the field, then start the postseason.
          </p>
        </header>

        <div className="space-y-5">
          {LEAGUES.map((league) =>
            DIVISIONS.map((division) => {
              const ranks = getStandingsForDivision(season, league, division)
              return (
                <section
                  key={`${league}-${division}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {league} {division}
                  </h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1">Team</th>
                        <th className="text-center">W</th>
                        <th className="text-center">L</th>
                        <th className="text-center">PCT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranks.map((e) => {
                        const display = getUserDisplay(season, e.teamId)
                        return (
                          <tr
                            key={e.teamId}
                            className="border-t border-slate-200 dark:border-slate-800"
                            style={display.isUser ? primaryTintStyle(theme) : undefined}
                          >
                            <td className="py-1.5">
                              {display.city ? `${display.city} ${display.name}` : display.name}
                              {display.isUser && (
                                <span
                                  className="ml-1 text-xs"
                                  style={{ color: readableOn(theme.primary, theme.mode) }}
                                >
                                  ({display.abbrev})
                                </span>
                              )}
                            </td>
                            <td className="text-center">{e.wins}</td>
                            <td className="text-center">{e.losses}</td>
                            <td className="text-center">
                              {e.winPct.toFixed(3).slice(1)}
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

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          {(['AL', 'NL'] as const).map((lg) => {
            const seeds = lg === 'AL' ? bracket.alSeeds : bracket.nlSeeds
            return (
              <div
                key={lg}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lg} Playoff seeds
                </h3>
                <ol className="space-y-1 text-sm">
                  {seeds.map((teamId, i) => {
                    const isUser = teamId === userTeamId
                    return (
                      <li
                        key={teamId}
                        className="flex items-center gap-2 rounded px-1"
                        style={isUser ? primaryTintStyle(theme) : undefined}
                      >
                        <span className="w-5 text-slate-500">#{i + 1}</span>
                        <span
                          className={`flex-1 truncate ${isUser ? 'font-semibold' : ''}`}
                          style={isUser ? { color: readableOn(theme.primary, theme.mode) } : undefined}
                        >
                          {fullLabel(season, teamId)}
                        </span>
                        {i < 2 && (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-700/40 dark:text-amber-200">
                            Bye
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
        </section>

        <div className="mt-6 flex w-full max-w-md flex-col gap-3 self-center">
          {userMadeIt ? (
            <button
              type="button"
              onClick={beginPostseason}
              style={primaryButtonStyle(theme)}
              className="w-full rounded-xl px-6 py-4 text-lg font-semibold shadow-lg active:scale-[0.98]"
            >
              Begin Postseason
            </button>
          ) : (
            <>
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                Your squad missed the playoffs. Watch the postseason play out
                or jump to the bracket.
              </p>
              <button
                type="button"
                onClick={simToWorldSeries}
                className="w-full rounded-xl bg-amber-600 px-6 py-4 text-lg font-semibold text-white shadow-lg active:scale-[0.98]"
              >
                Sim to World Series
              </button>
            </>
          )}
          <Link
            to="/standings"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Open standings
          </Link>
        </div>
      </div>
    </main>
  )
}
