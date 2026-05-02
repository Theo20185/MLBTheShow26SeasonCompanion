// Settings view (PLAN.md §7.2). Accessible from anywhere, including
// the landing screen. Two tiers of sections:
//   - Always-on: Appearance (light/dark), Save data (saved seasons
//     list, Import).
//   - Save-specific (only when a season is loaded): Squad colors,
//     Home park, Game length, Team OVR overrides, Delete season.
// Theme mode follows the layered resolution from appPrefs: a season's
// themeMode (when set) wins; otherwise the app pref. Toggling theme
// here writes to BOTH layers when a season is loaded so the app pref
// always tracks the user's most recent choice.

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadSeason,
  saveSeason,
  listSeasons,
  deleteSeason,
} from '../domain/seasonStore'
import { effectiveOvr } from '../domain/simulator'
import { TEAM_MAP, TEAM_BY_ID, findTeamByColors } from '../data/teamIdMap'
import { BALLPARKS, BALLPARK_BY_TEAM_ID } from '../data/ballparks'
import { setAppThemeMode, resolveActiveThemeMode } from '../domain/appPrefs'
import {
  planRosterRefresh,
  applyRosterRefresh,
  type RosterRefreshPlan,
  type TeamOvrDelta,
} from '../domain/rosterRefresh'
import {
  ALLOWED_GAME_LENGTHS,
  DEFAULT_GAME_LENGTH,
  DEFAULT_SQUAD_PRIMARY,
  DEFAULT_SQUAD_SECONDARY,
  type Season,
  type SeasonIndexEntry,
  type GameLength,
  type ThemeMode,
  type UserHomePark,
} from '../domain/types'
import { useThemeMode } from './squadTheme'

export function Settings() {
  const navigate = useNavigate()
  const [season, setSeason] = useState<Season | null>(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  })
  const [savedSeasons, setSavedSeasons] = useState<SeasonIndexEntry[]>(() => listSeasons())
  const [rosterPlan, setRosterPlan] = useState<RosterRefreshPlan | null>(null)
  const [rosterFetching, setRosterFetching] = useState(false)
  const [rosterError, setRosterError] = useState<string | null>(null)

  const teams = useMemo(() => TEAM_MAP, [])

  useThemeMode(resolveActiveThemeMode(season))

  function refreshSavedList() {
    setSavedSeasons(listSeasons())
  }

  function setOvr(teamId: string, value: number) {
    if (!season) return
    const clamped = Math.max(40, Math.min(99, value))
    const updated: Season = {
      ...season,
      ovrOverrides: { ...season.ovrOverrides, [teamId]: clamped },
    }
    saveSeason(updated)
    setSeason(updated)
    refreshSavedList()
  }

  function setGameLength(len: GameLength) {
    if (!season) return
    const updated: Season = { ...season, defaultGameLength: len }
    saveSeason(updated)
    setSeason(updated)
  }

  function setThemeMode(mode: ThemeMode) {
    // Always update the app pref so it persists across saves.
    setAppThemeMode(mode)
    if (season) {
      const updated: Season = { ...season, themeMode: mode }
      saveSeason(updated)
      setSeason(updated)
      refreshSavedList()
    } else {
      // Trigger a re-render via state change so useThemeMode picks up
      // the new resolved mode.
      setSeason((s) => s)
      // Force the season state to a new reference (cheap; null stays null
      // structurally but the useState bail-out skips when same).
      setSavedSeasons((s) => [...s])
    }
  }

  function setHomePark(homePark: UserHomePark | undefined) {
    if (!season) return
    const currentSquad = season.userSquad ?? {
      name: TEAM_BY_ID.get(season.userTeamId)?.name ?? season.userTeamId,
      abbrev: season.userTeamId,
    }
    const updated: Season = {
      ...season,
      userSquad: { ...currentSquad, homePark },
    }
    saveSeason(updated)
    setSeason(updated)
  }

  function setSquadColors(primary?: string, secondary?: string) {
    if (!season) return
    const currentSquad = season.userSquad ?? {
      name: TEAM_BY_ID.get(season.userTeamId)?.name ?? season.userTeamId,
      abbrev: season.userTeamId,
    }
    const updated: Season = {
      ...season,
      userSquad: {
        ...currentSquad,
        primaryColor: primary ?? currentSquad.primaryColor,
        secondaryColor: secondary ?? currentSquad.secondaryColor,
      },
    }
    saveSeason(updated)
    setSeason(updated)
  }

  function applyTeamPreset(presetTeamId: string) {
    const preset = TEAM_BY_ID.get(presetTeamId)
    if (!preset) return
    setSquadColors(preset.colors.primary, preset.colors.secondary)
  }

  function clearOverride(teamId: string) {
    if (!season) return
    const next = { ...season.ovrOverrides }
    delete next[teamId]
    const updated: Season = { ...season, ovrOverrides: next }
    saveSeason(updated)
    setSeason(updated)
  }

  function exportSeasonById(id: string) {
    const s = loadSeason(id)
    if (!s) return
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${s.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importSave(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Season
        if (typeof parsed.id !== 'string' || typeof parsed.userTeamId !== 'string') {
          throw new Error('not a season save')
        }
        saveSeason(parsed)
        // If we were in a no-season state, adopt the imported season.
        if (!season || season.id === parsed.id) {
          setSeason(parsed)
        }
        refreshSavedList()
        alert('Save imported.')
      } catch (err) {
        alert(`Import failed: ${String(err)}`)
      }
    }
    reader.readAsText(file)
  }

  function deleteSeasonById(id: string) {
    if (!confirm('Delete this entire season? This cannot be undone.')) return
    deleteSeason(id)
    if (season?.id === id) {
      setSeason(null)
    }
    refreshSavedList()
  }

  function resetActiveSeason() {
    if (!season) return
    deleteSeasonById(season.id)
    navigate('/')
  }

  async function handleRefreshRoster() {
    if (!season || rosterFetching) return
    setRosterError(null)
    setRosterFetching(true)
    try {
      const plan = await planRosterRefresh(season)
      setRosterPlan(plan)
    } catch (err) {
      setRosterError(String((err as Error).message ?? err))
    } finally {
      setRosterFetching(false)
    }
  }

  function applyRosterPlan() {
    if (!season || !rosterPlan) return
    const updated = applyRosterRefresh(season, rosterPlan)
    saveSeason(updated)
    setSeason(updated)
    setRosterPlan(null)
  }

  const currentMode = resolveActiveThemeMode(season)
  const primaryColor = season?.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY
  const secondaryColor = season?.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY

  return (
    <main className="min-h-svh bg-white px-4 py-4 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="flex gap-2">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Home
            </Link>
            {season && (
              <Link
                to="/game"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-emerald-700 bg-emerald-100 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-200 active:scale-[0.98] dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
              >
                Back to game
              </Link>
            )}
          </div>
        </header>

        {/* ======================================================== */}
        {/* Always-on sections                                        */}
        {/* ======================================================== */}

        <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Appearance
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Light or dark mode. Default is dark. Your choice persists across
            saves and applies even before a season is loaded.
          </p>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setThemeMode(mode)}
                aria-pressed={currentMode === mode}
                className={`min-w-[80px] rounded-lg border px-3 py-2 font-semibold capitalize transition ${
                  currentMode === mode
                    ? 'border-emerald-500 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Save data
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Saves live in this browser's localStorage. If the browser clears
            site data, unexported saves are lost. Export any save you want to
            keep before that happens.
          </p>

          {savedSeasons.length === 0 ? (
            <p className="text-xs italic text-slate-500 dark:text-slate-400">
              No saved seasons yet.
            </p>
          ) : (
            <>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saved seasons
              </div>
              <ul className="space-y-2">
                {savedSeasons.map((entry) => (
                  <SavedSeasonRow
                    key={entry.id}
                    entry={entry}
                    isActive={season?.id === entry.id}
                    onExport={() => exportSeasonById(entry.id)}
                    onDelete={() => deleteSeasonById(entry.id)}
                  />
                ))}
              </ul>
            </>
          )}

          <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-slate-200 px-3 py-2 text-center font-semibold text-slate-900 dark:bg-slate-700 dark:text-white">
            Import a save…
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importSave(f)
              }}
            />
          </label>
        </section>

        {/* ======================================================== */}
        {/* Save-specific sections (only when a season is loaded)     */}
        {/* ======================================================== */}

        {season && (
          <>
            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Squad colors
              </h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Primary tints action buttons (Report, Win, Sim). Secondary tints
                navigation chips. Tap a swatch to pick any color, or pick an MLB
                preset.
              </p>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-500">Team color preset</span>
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
              <p className="mt-4 text-xs italic text-slate-500 dark:text-slate-400">
                Tap a swatch below to pick a color.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <SwatchField
                  label="Primary"
                  hint="Action buttons"
                  ariaLabel="Primary squad color"
                  value={primaryColor}
                  onChange={(v) => setSquadColors(v, undefined)}
                />
                <SwatchField
                  label="Secondary"
                  hint="Nav chips"
                  ariaLabel="Secondary squad color"
                  value={secondaryColor}
                  onChange={(v) => setSquadColors(undefined, v)}
                />
              </div>
            </section>

            <HomeParkSection season={season} onChange={setHomePark} />

            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Game length
              </h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Default regulation length for full-report box scores. Match the
                inning count you use in MLB The Show's Vs. CPU settings.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_GAME_LENGTHS.map((len) => {
                  const current = season.defaultGameLength ?? DEFAULT_GAME_LENGTH
                  return (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setGameLength(len)}
                      className={`min-w-[56px] rounded-lg border px-3 py-2 font-semibold transition ${
                        current === len
                          ? 'border-emerald-500 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                      }`}
                      aria-label={`${len}-inning games`}
                      aria-pressed={current === len}
                    >
                      {len}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Update roster data
              </h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Pulls the latest live-series cards from the MLB The Show 26 API
                and recomputes every team's OVR. Bulk-applies the changes as
                overrides on this season — your base snapshot stays frozen,
                so you can always undo an override by clearing it manually.
                Requires a network connection.
              </p>
              <button
                type="button"
                onClick={handleRefreshRoster}
                disabled={rosterFetching}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {rosterFetching ? 'Fetching…' : 'Refresh roster data'}
              </button>
              {rosterError && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                  Refresh failed: {rosterError}
                </p>
              )}
              {rosterPlan && !rosterFetching && (
                <RosterDiffPanel
                  plan={rosterPlan}
                  onApply={applyRosterPlan}
                  onCancel={() => setRosterPlan(null)}
                />
              )}
            </section>

            <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Team OVR overrides
              </h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Set a team's OVR manually. Affects future sims only — past results
                stay as committed.
              </p>
              <div className="space-y-2">
                {teams.map((t) => {
                  const override = season.ovrOverrides[t.id]
                  const eff = effectiveOvr(t.id, season)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.city} {t.name}</div>
                        <div className="text-xs text-slate-500">
                          base {season.baseOvrSnapshot[t.id]}
                          {override !== undefined && ` · override ${override}`}
                          {' '}· effective {eff}
                        </div>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={40}
                        max={99}
                        value={override ?? ''}
                        placeholder={String(season.baseOvrSnapshot[t.id])}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (!e.target.value) {
                            clearOverride(t.id)
                          } else if (!Number.isNaN(v)) {
                            setOvr(t.id, v)
                          }
                        }}
                        className="w-16 rounded bg-slate-100 px-2 py-1 text-center text-slate-900 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Danger zone
              </h2>
              <button
                type="button"
                onClick={resetActiveSeason}
                className="w-full rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white"
              >
                Delete this season
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

interface RosterDiffPanelProps {
  plan: RosterRefreshPlan
  onApply: () => void
  onCancel: () => void
}

function RosterDiffPanel({ plan, onApply, onCancel }: RosterDiffPanelProps) {
  if (plan.deltas.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-2">Latest roster data matches your current OVRs — nothing to apply.</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          Dismiss
        </button>
      </div>
    )
  }
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <p className="mb-2 font-semibold">
        {plan.deltas.length} team{plan.deltas.length === 1 ? '' : 's'} would change
      </p>
      <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
        {plan.deltas.map((d) => (
          <DiffRow key={d.teamId} d={d} />
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Apply changes
        </button>
      </div>
    </div>
  )
}

function DiffRow({ d }: { d: TeamOvrDelta }) {
  const team = TEAM_BY_ID.get(d.teamId)
  const sign = d.delta > 0 ? '+' : ''
  const cls = d.delta > 0
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400'
  return (
    <li className="flex items-center justify-between">
      <span className="truncate">{team ? `${team.city} ${team.name}` : d.teamId}</span>
      <span className="font-mono">
        {d.current} → {d.next} <span className={cls}>({sign}{d.delta})</span>
      </span>
    </li>
  )
}

interface SavedSeasonRowProps {
  entry: SeasonIndexEntry
  isActive: boolean
  onExport: () => void
  onDelete: () => void
}

function SavedSeasonRow({ entry, isActive, onExport, onDelete }: SavedSeasonRowProps) {
  const team = TEAM_BY_ID.get(entry.userTeamId)
  const status = entry.status === 'complete' ? 'Complete' :
    entry.status === 'postseason' ? 'Postseason' :
    entry.status === 'regular' ? 'Regular season' : 'Setup'
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {team ? `${team.city} ${team.name}` : entry.userTeamId} — {entry.year}
          {isActive && (
            <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">
              Active
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">{status}</div>
      </div>
      <button
        type="button"
        onClick={onExport}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      >
        Export
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md border border-rose-700 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.98] dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        Delete
      </button>
    </li>
  )
}

interface HomeParkSectionProps {
  season: Season
  onChange: (homePark: UserHomePark | undefined) => void
}

function HomeParkSection({ season, onChange }: HomeParkSectionProps) {
  const current = season.userSquad?.homePark
  const initialMode: 'default' | 'preset' | 'custom' = current?.kind ?? 'default'
  const defaultParkId = BALLPARK_BY_TEAM_ID.get(season.userTeamId)?.id ?? BALLPARKS[0].id
  const [mode, setMode] = useState<'default' | 'preset' | 'custom'>(initialMode)
  const [presetId, setPresetId] = useState<string>(
    current?.kind === 'preset' ? current.parkId : defaultParkId
  )
  const [customName, setCustomName] = useState<string>(
    current?.kind === 'custom' ? current.name : ''
  )
  const teamPark = BALLPARK_BY_TEAM_ID.get(season.userTeamId)

  function handleMode(next: 'default' | 'preset' | 'custom') {
    setMode(next)
    if (next === 'default') {
      onChange(undefined)
    } else if (next === 'preset') {
      onChange({ kind: 'preset', parkId: presetId })
    } else {
      const trimmed = customName.trim()
      if (trimmed) onChange({ kind: 'custom', name: trimmed })
    }
  }

  function handlePresetChange(next: string) {
    setPresetId(next)
    if (mode === 'preset') onChange({ kind: 'preset', parkId: next })
  }

  function handleCustomChange(next: string) {
    setCustomName(next)
    if (mode === 'custom') {
      const trimmed = next.trim()
      if (trimmed) onChange({ kind: 'custom', name: trimmed })
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Home park
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Defaults to {teamPark?.name ?? 'the replaced team\'s park'}. Pick a
        different MLB park or name a custom park you built in The Show.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(['default', 'preset', 'custom'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleMode(m)}
            aria-pressed={mode === m}
            className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              mode === m
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {m === 'default' ? 'Default' : m === 'preset' ? 'Pick MLB park' : 'Custom park'}
          </button>
        ))}
      </div>
      {mode === 'preset' && (
        <label className="mt-3 block">
          <span className="text-xs text-slate-600 dark:text-slate-400">Home park preset</span>
          <select
            value={presetId}
            onChange={(e) => handlePresetChange(e.target.value)}
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
      {mode === 'custom' && (
        <label className="mt-3 block">
          <span className="text-xs text-slate-600 dark:text-slate-400">Custom park name</span>
          <input
            type="text"
            value={customName}
            onChange={(e) => handleCustomChange(e.target.value)}
            maxLength={48}
            placeholder="e.g. The Crater"
            className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>
      )}
    </section>
  )
}

interface SwatchFieldProps {
  label: string
  hint: string
  ariaLabel: string
  value: string
  onChange: (next: string) => void
}

function SwatchField({ label, hint, ariaLabel, value, onChange }: SwatchFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">{hint}</div>
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
