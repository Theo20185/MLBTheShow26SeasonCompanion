// Setup view (PLAN.md §6.1, §7.1 step 2). One screen — grid of 30 teams
// grouped by league + division. Tap a team to start a new season.

import { useNavigate } from 'react-router-dom'
import { TEAM_MAP, type LeagueId, type DivisionId } from '../data/teamIdMap'
import { createSeason } from '../domain/createSeason'
import { saveSeason } from '../domain/seasonStore'

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

export function Setup() {
  const navigate = useNavigate()

  function handlePick(teamId: string) {
    const season = createSeason({ userTeamId: teamId })
    saveSeason(season)
    navigate('/game')
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Pick Your Team
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400 md:text-base">
          You'll replace this MLB team with your Diamond Dynasty squad and play
          their full 162-game schedule.
        </p>

        <div className="mt-6 space-y-6">
          {LEAGUES.map((league) =>
            DIVISIONS.map((division) => {
              const teams = TEAM_MAP.filter(
                (t) => t.league === league && t.division === division
              )
              return (
                <section key={`${league}-${division}`}>
                  <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
                    {league} {division}
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handlePick(team.id)}
                        className="min-h-[64px] rounded-lg border border-slate-700 bg-slate-800 p-3 text-left transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                        aria-label={`Pick the ${team.name}`}
                      >
                        <div className="text-xs text-slate-400">
                          {team.city}
                        </div>
                        <div className="text-base font-semibold">
                          {team.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
