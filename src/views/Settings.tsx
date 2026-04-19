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
import { TEAM_MAP, TEAM_BY_ID } from '../data/teamIdMap'
import {
  ALLOWED_GAME_LENGTHS,
  DEFAULT_GAME_LENGTH,
  DEFAULT_SQUAD_PRIMARY,
  DEFAULT_SQUAD_SECONDARY,
  type Season,
  type GameLength,
} from '../domain/types'

export function Settings() {
  const navigate = useNavigate()
  const [season, setSeason] = useState<Season | null>(() => {
    const idx = listSeasons()
    const active = idx.find((e) => e.status !== 'complete')
    return active ? loadSeason(active.id) : null
  })

  const teams = useMemo(() => TEAM_MAP, [])

  if (!season) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
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

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link
            to="/game"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-emerald-700 bg-emerald-900/40 px-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/60 active:scale-[0.98]"
          >
            Back to game
          </Link>
        </header>

        <section className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            Squad colors
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Used for primary CTAs and the user-team highlight. Pick any
            MLB team's palette as a preset, or fine-tune the swatches.
          </p>
          <label className="block">
            <span className="text-xs text-slate-500">Use a team's colors</span>
            <select
              onChange={(e) => {
                if (e.target.value) applyTeamPreset(e.target.value)
                e.target.value = ''
              }}
              defaultValue=""
              className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-2 text-base"
            >
              <option value="">— pick a team —</option>
              {[...TEAM_MAP].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.city} {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-500">Primary</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={season.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY}
                  onChange={(e) => setSquadColors(e.target.value, undefined)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-600 bg-transparent"
                  aria-label="Primary squad color"
                />
                <input
                  type="text"
                  value={season.userSquad?.primaryColor ?? DEFAULT_SQUAD_PRIMARY}
                  onChange={(e) => setSquadColors(e.target.value, undefined)}
                  maxLength={7}
                  className="flex-1 rounded-lg bg-slate-700 px-3 py-2 font-mono text-sm uppercase"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Secondary</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={season.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY}
                  onChange={(e) => setSquadColors(undefined, e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-600 bg-transparent"
                  aria-label="Secondary squad color"
                />
                <input
                  type="text"
                  value={season.userSquad?.secondaryColor ?? DEFAULT_SQUAD_SECONDARY}
                  onChange={(e) => setSquadColors(undefined, e.target.value)}
                  maxLength={7}
                  className="flex-1 rounded-lg bg-slate-700 px-3 py-2 font-mono text-sm uppercase"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            Game length
          </h2>
          <p className="mb-3 text-xs text-slate-400">
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
                      : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
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

        <section className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            Save data
          </h2>
          <p className="mb-3 text-xs text-slate-400">
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
            <label className="cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-center font-semibold">
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

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            Team OVR overrides
          </h2>
          <p className="mb-3 text-xs text-slate-400">
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
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-700 bg-slate-800/50 p-2 text-sm"
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
                    className="w-16 rounded bg-slate-700 px-2 py-1 text-center"
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
