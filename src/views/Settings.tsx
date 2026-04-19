// Settings view (PLAN.md §7.2). OVR overrides per team, reset season,
// export/import save JSON. Multi-save management is a v1 stretch.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  loadSeason,
  saveSeason,
  listSeasons,
  deleteSeason,
} from '../domain/seasonStore'
import { effectiveOvr } from '../domain/simulator'
import { TEAM_MAP } from '../data/teamIdMap'
import type { Season } from '../domain/types'

export function Settings() {
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
        <Link to="/" className="text-emerald-400 underline">Home</Link>
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
    window.location.hash = '/'
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link to="/game" className="text-sm text-emerald-400 underline">
            Back to game
          </Link>
        </header>

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
