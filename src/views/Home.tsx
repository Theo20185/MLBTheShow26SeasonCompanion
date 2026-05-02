// Launch screen (PLAN.md §7.1 step 1).
// - If no save exists: single "New Season" CTA.
// - If a save exists: "Continue" as primary, "New Season" as secondary.

import { Link } from 'react-router-dom'
import { listSeasons, loadSeason } from '../domain/seasonStore'
import { TEAM_BY_ID } from '../data/teamIdMap'
import { primaryButtonStyle, secondaryNavStyle, themeForSeason, useThemeMode } from './squadTheme'

export function Home() {
  const seasons = listSeasons()
  const activeEntry = seasons.find((s) => s.status !== 'complete')
  const activeSeason = activeEntry ? loadSeason(activeEntry.id) : null
  const mlbSlot = activeSeason
    ? TEAM_BY_ID.get(activeSeason.userTeamId)
    : undefined
  const continueLabel = activeSeason?.userSquad?.name
    ?? (mlbSlot ? `${mlbSlot.city} ${mlbSlot.name}` : 'Continue')
  const theme = themeForSeason(activeSeason)
  useThemeMode(theme.mode)

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-white px-6 py-10 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Top bar shares the panel's max-width so the chip right-aligns
          with the panel's right edge — same alignment rule as the
          in-game NavBar (which sits inside max-w-md). */}
      <div className="pointer-events-none absolute inset-x-0 top-4 px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md justify-end">
          <Link
            to="/settings"
            style={secondaryNavStyle(theme)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-3 text-xs font-semibold uppercase tracking-wider active:scale-[0.98]"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Content panel — same shape as the in-game game-card so the
          landing screen looks like the same family. */}
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          MLB The Show 26 Season Companion
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600 md:text-base dark:text-slate-400">
          Run a custom 162-game Diamond Dynasty season. Pick a team, play the
          schedule Vs. CPU, and let the app handle the rest of the league.
        </p>

        <div className="mx-auto mt-6 flex w-full max-w-xs flex-col gap-3">
          {activeSeason && (
            <Link
              to="/game"
              style={primaryButtonStyle(theme)}
              className="rounded-lg px-6 py-4 text-center text-lg font-semibold shadow-lg transition active:scale-[0.98]"
            >
              Continue
              <div className="mt-1 text-xs font-normal opacity-80">
                {continueLabel}
                {mlbSlot && activeSeason.userSquad && (
                  <span className="opacity-75">
                    {' '}— in for {mlbSlot.name}
                  </span>
                )}
              </div>
            </Link>
          )}
          <Link
            to="/setup"
            className={`rounded-lg ${
              activeSeason
                ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                : 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-500'
            } px-6 py-4 text-center text-lg font-semibold transition active:scale-[0.98]`}
          >
            New Season
          </Link>
        </div>
      </section>
    </main>
  )
}
