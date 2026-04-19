// Setup view (PLAN.md §6.1, §7.1 step 2). Two-step flow:
//   1. Pick the MLB team to replace (grid).
//   2. Configure your DD squad identity: name, abbrev, OVR.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TEAM_MAP,
  TEAM_BY_ID,
  type LeagueId,
  type DivisionId,
} from '../data/teamIdMap'
import { TEAM_BASE_OVRS } from '../data/bundledData'
import { createSeason } from '../domain/createSeason'
import { saveSeason } from '../domain/seasonStore'
import { ALLOWED_GAME_LENGTHS, DEFAULT_GAME_LENGTH, type GameLength } from '../domain/types'

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

export function Setup() {
  const navigate = useNavigate()
  const [picked, setPicked] = useState<string | null>(null)

  if (!picked) {
    return <TeamPicker onPick={setPicked} />
  }

  return (
    <SquadSetup
      teamId={picked}
      onBack={() => setPicked(null)}
      onStart={(name, abbrev, ovr, gameLength) => {
        const season = createSeason({
          userTeamId: picked,
          userSquad: { name, abbrev },
          userSquadOvr: ovr,
          defaultGameLength: gameLength,
        })
        saveSeason(season)
        navigate('/game')
      }}
    />
  )
}

function TeamPicker({ onPick }: { onPick: (teamId: string) => void }) {
  return (
    <main className="min-h-svh bg-slate-900 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Pick the team to replace
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400 md:text-base">
          Your DD squad will take this MLB team's slot — schedule, division,
          and ballpark. You'll set up your squad's name and OVR next.
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
                        onClick={() => onPick(team.id)}
                        className="min-h-[64px] rounded-lg border border-slate-700 bg-slate-800 p-3 text-left transition hover:border-slate-500 hover:bg-slate-700 active:scale-[0.98]"
                        aria-label={`Replace the ${team.name}`}
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

interface SquadSetupProps {
  teamId: string
  onBack: () => void
  onStart: (name: string, abbrev: string, ovr: number, gameLength: GameLength) => void
}

function SquadSetup({ teamId, onBack, onStart }: SquadSetupProps) {
  const team = TEAM_BY_ID.get(teamId)!
  const defaultOvr = TEAM_BASE_OVRS[teamId] ?? 75

  const [name, setName] = useState(team.name)
  const [abbrev, setAbbrev] = useState(team.id)
  const [ovr, setOvr] = useState<number>(defaultOvr)
  const [gameLength, setGameLength] = useState<GameLength>(DEFAULT_GAME_LENGTH)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    const trimmedName = name.trim()
    const trimmedAbbrev = abbrev.trim().toUpperCase()
    if (!trimmedName) {
      setError('Squad name is required')
      return
    }
    if (trimmedAbbrev.length < 2 || trimmedAbbrev.length > 4) {
      setError('Abbreviation must be 2-4 characters')
      return
    }
    if (!Number.isFinite(ovr) || ovr < 40 || ovr > 99) {
      setError('OVR must be between 40 and 99')
      return
    }
    setError(null)
    onStart(trimmedName, trimmedAbbrev, ovr, gameLength)
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Your Diamond Dynasty squad
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Replacing the <span className="font-semibold">{team.city} {team.name}</span>.
          Your squad keeps their schedule, division, and ballpark — but it's
          your team in the standings.
        </p>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-800 p-5">
          <label className="block">
            <span className="text-sm text-slate-300">Squad name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-2 text-base"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Abbreviation</span>
            <input
              type="text"
              value={abbrev}
              onChange={(e) => setAbbrev(e.target.value.toUpperCase())}
              maxLength={4}
              className="mt-1 w-32 rounded-lg bg-slate-700 px-3 py-2 text-base uppercase tracking-wider"
            />
            <span className="ml-2 text-xs text-slate-500">2-4 letters</span>
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Squad OVR</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={40}
                max={99}
                value={ovr}
                onChange={(e) => setOvr(Number(e.target.value))}
                className="w-24 rounded-lg bg-slate-700 px-3 py-2 text-base"
              />
              <span className="text-xs text-slate-500">
                MLB roster's base OVR for this team is {defaultOvr}.
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Default game length (innings)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALLOWED_GAME_LENGTHS.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setGameLength(len)}
                  className={`min-w-[56px] rounded-lg border px-3 py-2 font-semibold transition ${
                    gameLength === len
                      ? 'border-emerald-500 bg-emerald-700 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                  aria-label={`${len}-inning games`}
                  aria-pressed={gameLength === len}
                >
                  {len}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Match the inning count you'll use in MLB The Show's Vs. CPU
              settings. You can change this later in Settings.
            </p>
          </label>

          {error && (
            <p className="text-sm text-rose-400">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg bg-slate-700 px-4 py-3 font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
            >
              Start Season
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
