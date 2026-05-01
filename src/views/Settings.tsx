// Settings view (PLAN.md §7.2). OVR overrides per team, reset season,
// export/import save JSON. Multi-save management is a v1 stretch.

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
import {
  ALLOWED_GAME_LENGTHS,
  DEFAULT_GAME_LENGTH,
  DEFAULT_SQUAD_PRIMARY,
  DEFAULT_SQUAD_SECONDARY,
  DEFAULT_THEME_MODE,
  type Season,
  type GameLength,
  type ThemeMode,
} from '../domain/types'
import { useThemeMode } from './squadTheme'

export function Settings() {
  const navigate = useNavigate()
  const [season, setSeason] = useState<Season | null>(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  })

  const teams = useMemo(() => TEAM_MAP, [])

  useThemeMode(season?.themeMode ?? DEFAULT_THEME_MODE)

  if (!season) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white px-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <p>No active season.</p>
        <Link
          to="/"
          className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white active:scale-[0.98]"
        >
          Home
        </Link>
      </main>
    )
  }

  function setOvr(teamId: string, value: number) {
    const clamped = Math.max(40, Math.min(99, value))
    const updated: Season = {
      ...season!,
      ovrOverrides: { ...season!.ovrOverrides, [teamId]: clamped },
    }
    saveSeason(updated)
    setSeason(updated)
  }

  function setGameLength(len: GameLength) {
    const updated: Season = { ...season!, defaultGameLength: len }
    saveSeason(updated)
    setSeason(updated)
  }

  function setThemeMode(mode: ThemeMode) {
    const updated: Season = { ...season!, themeMode: mode }
    saveSeason(updated)
    setSeason(updated)
  }

  function setSquadColors(primary?: string, secondary?: string) {
    const currentSquad = season!.userSquad ?? {
      name: TEAM_BY_ID.get(season!.userTeamId)?.name ?? season!.userTeamId,
      abbrev: season!.userTeamId,
    }
    const updated: Season = {
      ...season!,
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
    const next = { ...season!.ovrOverrides }
    delete next[teamId]
    const updated: Season = { ...season!, ovrOverrides: next }
    saveSeason(updated)
    setSeason(updated)
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(season, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${season!.id}.json`
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
        setSeason(parsed)
        alert('Save imported.')
      } catch (err) {
        alert(`Import failed: ${String(err)}`)
      }
    }
    reader.readAsText(file)
  }

  function resetSeason() {
    if (!confirm('Delete this entire season? This cannot be undone.')) return
    deleteSeason(season!.id)
    setSeason(null)
    navigate('/')
  }

  const currentMode = season.themeMode ?? DEFAULT_THEME_MODE
  const primaryColor = season.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY
  const secondaryColor = season.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY

  return (
    <main className="min-h-svh bg-white px-4 py-4 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link
            to="/game"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-emerald-700 bg-emerald-100 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-200 active:scale-[0.98] dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          >
            Back to game
          </Link>
        </header>

        <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Appearance
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Light or dark mode. Default is dark.
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
            Save data
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Your save lives in this browser's localStorage. If the browser
            clears site data, the save is lost. Export occasionally for backup.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={exportSave}
              className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white"
            >
              Export season
            </button>
            <label className="cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-center font-semibold text-slate-900 dark:bg-slate-700 dark:text-white">
              Import season
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
          </div>
          <button
            type="button"
            onClick={resetSeason}
            className="mt-3 w-full rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Delete this season
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
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
      </div>
    </main>
  )
}

interface SwatchFieldProps {
  label: string
  hint: string
  ariaLabel: string
  value: string
  onChange: (next: string) => void
}

/** Prominent color swatch + hex display. The swatch is large and labeled
 *  so users discover the picker; the hex is a read-only-feeling display
 *  that shows the chosen value. */
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
