// Launch screen (PLAN.md §7.1 step 1).
// - If no save exists: single "New Season" CTA.
// - If a save exists: "Continue" as primary, "New Season" as secondary.

import { Link } from 'react-router-dom'
import { listSeasons, loadSeason } from '../domain/seasonStore'
import { TEAM_BY_ID } from '../data/teamIdMap'
import { primaryButtonStyle, themeForSeason } from './squadTheme'

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

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-900 px-6 py-10 text-slate-100">
      <h1 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
        MLB The Show 26 Season Companion
      </h1>
      <p className="max-w-md text-center text-base text-slate-400 md:text-lg">
        Run a custom 162-game Diamond Dynasty season. Pick a team, play the
        schedule Vs. CPU, and let the app handle the rest of the league.
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
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
              ? 'border border-slate-600 bg-slate-800 hover:bg-slate-700'
              : 'bg-emerald-600 shadow-lg hover:bg-emerald-500'
          } px-6 py-4 text-center text-lg font-semibold text-white transition active:scale-[0.98]`}
        >
          New Season
        </Link>
      </div>
    </main>
  )
}
