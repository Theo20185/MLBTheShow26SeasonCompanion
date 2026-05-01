// Setup view (PLAN.md §6.1, §7.1 step 2). Two-step flow:
//   1. Pick the MLB team to replace (grid).
//   2. Configure your DD squad identity: name, abbrev, OVR.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TEAM_MAP,
  TEAM_BY_ID,
  findTeamByColors,
  type LeagueId,
  type DivisionId,
} from '../data/teamIdMap'
import { TEAM_BASE_OVRS } from '../data/bundledData'
import { createSeason } from '../domain/createSeason'
import {
  deleteAllInProgressSeasons,
  listInProgressSeasons,
  saveSeason,
} from '../domain/seasonStore'
import {
  ALLOWED_GAME_LENGTHS,
  DEFAULT_GAME_LENGTH,
  DEFAULT_THEME_MODE,
  type GameLength,
  type UserHomePark,
} from '../domain/types'
import { BALLPARKS, BALLPARK_BY_TEAM_ID } from '../data/ballparks'
import { useThemeMode } from './squadTheme'

const LEAGUES: LeagueId[] = ['AL', 'NL']
const DIVISIONS: DivisionId[] = ['East', 'Central', 'West']

export function Setup() {
  const navigate = useNavigate()
  const [picked, setPicked] = useState<string | null>(null)

  // Setup runs before a season exists, so honor the prior session's
  // theme if it's still on documentElement; otherwise default dark.
  const inferred = document.documentElement.classList.contains('dark') ? 'dark' : DEFAULT_THEME_MODE
  useThemeMode(inferred)

  if (!picked) {
    return <TeamPicker onPick={setPicked} />
  }

  return (
    <SquadSetup
      teamId={picked}
      onBack={() => setPicked(null)}
      onStart={(name, abbrev, ovr, gameLength, primaryColor, secondaryColor, homePark) => {
        // Wipe any in-progress seasons before creating the new one.
        // Single-active-season model — without this, "New Season" silently
        // accumulates entries and Settings → Delete leaves "Continue" still
        // visible on Home for the older one.
        deleteAllInProgressSeasons()
        const season = createSeason({
          userTeamId: picked,
          userSquad: { name, abbrev, primaryColor, secondaryColor, homePark },
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
    <main className="min-h-svh bg-white px-4 py-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Pick the team to replace
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 md:text-base dark:text-slate-400">
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
                  <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {league} {division}
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => onPick(team.id)}
                        className="min-h-[64px] rounded-lg border border-slate-300 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                        aria-label={`Replace the ${team.name}`}
                      >
                        <div className="text-xs text-slate-500 dark:text-slate-400">
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
  onStart: (
    name: string,
    abbrev: string,
    ovr: number,
    gameLength: GameLength,
    primaryColor: string,
    secondaryColor: string,
    homePark: UserHomePark | undefined
  ) => void
}

function SquadSetup({ teamId, onBack, onStart }: SquadSetupProps) {
  const team = TEAM_BY_ID.get(teamId)!
  const defaultOvr = TEAM_BASE_OVRS[teamId] ?? 75

  // Surface any in-progress save the user is about to overwrite.
  const inProgress = useMemo(() => listInProgressSeasons(), [])

  const [name, setName] = useState(team.name)
  const [abbrev, setAbbrev] = useState(team.id)
  const [ovr, setOvr] = useState<number>(defaultOvr)
  const [gameLength, setGameLength] = useState<GameLength>(DEFAULT_GAME_LENGTH)
  // Default to the replaced team's brand colors (most users will keep them).
  const [primaryColor, setPrimaryColor] = useState(team.colors.primary)
  const [secondaryColor, setSecondaryColor] = useState(team.colors.secondary)
  // Home park override. 'default' keeps the bundled MLB park.
  const defaultParkId = BALLPARK_BY_TEAM_ID.get(teamId)?.id ?? BALLPARKS[0].id
  const [homeParkMode, setHomeParkMode] = useState<'default' | 'preset' | 'custom'>('default')
  const [homeParkPresetId, setHomeParkPresetId] = useState<string>(defaultParkId)
  const [homeParkCustomName, setHomeParkCustomName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  function applyTeamPreset(presetTeamId: string) {
    const preset = TEAM_BY_ID.get(presetTeamId)
    if (!preset) return
    setPrimaryColor(preset.colors.primary)
    setSecondaryColor(preset.colors.secondary)
  }

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
    let homePark: UserHomePark | undefined
    if (homeParkMode === 'preset') {
      homePark = { kind: 'preset', parkId: homeParkPresetId }
    } else if (homeParkMode === 'custom') {
      const customName = homeParkCustomName.trim()
      if (!customName) {
        setError('Custom park name is required')
        return
      }
      homePark = { kind: 'custom', name: customName }
    }
    setError(null)
    onStart(trimmedName, trimmedAbbrev, ovr, gameLength, primaryColor, secondaryColor, homePark)
  }

  return (
    <main className="min-h-svh bg-white px-4 py-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Your Diamond Dynasty squad
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Replacing the <span className="font-semibold">{team.city} {team.name}</span>.
          Your squad keeps their schedule, division, and ballpark — but it's
          your team in the standings.
        </p>

        {inProgress.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-700 bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <strong className="block text-amber-800 dark:text-amber-200">
              You have {inProgress.length === 1 ? 'an' : `${inProgress.length}`} in-progress {inProgress.length === 1 ? 'season' : 'seasons'}.
            </strong>
            Starting a new season will <em>delete</em> {inProgress.length === 1 ? 'it' : 'them'} — this can't be undone. If you want to keep playing your existing season, hit Back and tap Continue from the Home screen instead.
          </div>
        )}

        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Squad name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Abbreviation</span>
            <input
              type="text"
              value={abbrev}
              onChange={(e) => setAbbrev(e.target.value.toUpperCase())}
              maxLength={4}
              className="mt-1 w-32 rounded-lg bg-white px-3 py-2 text-base uppercase tracking-wider text-slate-900 dark:bg-slate-700 dark:text-slate-100"
            />
            <span className="ml-2 text-xs text-slate-500">2-4 letters</span>
          </label>

          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Squad OVR</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={40}
                max={99}
                value={ovr}
                onChange={(e) => setOvr(Number(e.target.value))}
                className="w-24 rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">
                MLB roster's base OVR for this team is {defaultOvr}.
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Default game length (innings)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {ALLOWED_GAME_LENGTHS.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setGameLength(len)}
                  className={`min-w-[56px] rounded-lg border px-3 py-2 font-semibold transition ${
                    gameLength === len
                      ? 'border-emerald-500 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
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

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <span className="text-sm text-slate-700 dark:text-slate-300">Squad colors</span>
            <p className="mt-1 text-xs text-slate-500">
              Defaults to the {team.name}' colors. Pick any other MLB team's
              palette below, or tap a swatch to fine-tune.
            </p>
            <label className="mt-3 block">
              <span className="text-xs text-slate-600 dark:text-slate-400">Team color preset</span>
              <select
                value={findTeamByColors(primaryColor, secondaryColor)?.id ?? '__custom'}
                onChange={(e) => {
                  if (e.target.value !== '__custom') applyTeamPreset(e.target.value)
                }}
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="__custom">Custom colors</option>
                {[...TEAM_MAP].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.city} {t.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs italic text-slate-500">Tap a swatch below to pick a color.</p>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <SetupSwatchField
                label="Primary"
                hint="Action buttons"
                ariaLabel="Primary squad color"
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <SetupSwatchField
                label="Secondary"
                hint="Nav chips"
                ariaLabel="Secondary squad color"
                value={secondaryColor}
                onChange={setSecondaryColor}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <span className="text-sm text-slate-700 dark:text-slate-300">Home park</span>
            <p className="mt-1 text-xs text-slate-500">
              Defaults to {BALLPARK_BY_TEAM_ID.get(teamId)?.name ?? team.name}.
              Pick a different MLB park or name your custom park (a stadium
              you built and named in The Show).
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['default', 'preset', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setHomeParkMode(mode)}
                  aria-pressed={homeParkMode === mode}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    homeParkMode === mode
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {mode === 'default' ? 'Default' : mode === 'preset' ? 'Pick MLB park' : 'Custom park'}
                </button>
              ))}
            </div>
            {homeParkMode === 'preset' && (
              <label className="mt-3 block">
                <span className="text-xs text-slate-600 dark:text-slate-400">Home park preset</span>
                <select
                  value={homeParkPresetId}
                  onChange={(e) => setHomeParkPresetId(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                >
                  {[...BALLPARKS].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {homeParkMode === 'custom' && (
              <label className="mt-3 block">
                <span className="text-xs text-slate-600 dark:text-slate-400">Custom park name</span>
                <input
                  type="text"
                  value={homeParkCustomName}
                  onChange={(e) => setHomeParkCustomName(e.target.value)}
                  maxLength={48}
                  placeholder="e.g. The Crater"
                  className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg bg-slate-200 px-4 py-3 font-semibold text-slate-900 dark:bg-slate-700 dark:text-white"
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

interface SetupSwatchFieldProps {
  label: string
  hint: string
  ariaLabel: string
  value: string
  onChange: (next: string) => void
}

function SetupSwatchField({ label, hint, ariaLabel, value, onChange }: SetupSwatchFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <div className="mt-1 text-[10px] text-slate-500">{hint}</div>
      <div className="mt-2 flex items-center gap-3">
        <div
          className="relative h-16 w-16 shrink-0 rounded-lg border-2 border-slate-300 shadow-inner dark:border-slate-600"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="w-24 rounded-lg bg-white px-2 py-2 font-mono text-sm uppercase text-slate-900 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
    </label>
  )
}
