import { useState } from 'react'
import {
  validateBoxScore,
  inferWinnerFromBoxScore,
  totalRuns,
  type BoxScoreInput,
} from '../domain/boxScore'

interface Props {
  onSubmit: (didUserWin: boolean, homeScore: number, awayScore: number, detail: BoxScoreInput) => void
  onCancel: () => void
  userIsHome: boolean
}

const STANDARD_INNINGS = 9

export function BoxScorePanel({ onSubmit, onCancel, userIsHome }: Props) {
  const [innings, setInnings] = useState<number>(STANDARD_INNINGS)
  const [home, setHome] = useState<number[]>(Array(STANDARD_INNINGS).fill(0))
  const [away, setAway] = useState<number[]>(Array(STANDARD_INNINGS).fill(0))
  const [hitsHome, setHitsHome] = useState(0)
  const [hitsAway, setHitsAway] = useState(0)
  const [errorsHome, setErrorsHome] = useState(0)
  const [errorsAway, setErrorsAway] = useState(0)
  const [shortened, setShortened] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setInningsCount(n: number) {
    const clamped = Math.max(1, Math.min(15, n))
    setInnings(clamped)
    setHome((h) => resize(h, clamped))
    setAway((a) => resize(a, clamped))
  }

  function update(side: 'home' | 'away', i: number, value: number) {
    const setter = side === 'home' ? setHome : setAway
    const arr = side === 'home' ? home : away
    const next = [...arr]
    next[i] = Math.max(0, value || 0)
    setter(next)
  }

  function handleSubmit() {
    const input: BoxScoreInput = {
      inningsHome: home,
      inningsAway: away,
      hitsHome,
      hitsAway,
      errorsHome,
      errorsAway,
      shortened,
    }
    const v = validateBoxScore(input)
    if (!v.ok) {
      setError(v.error ?? 'Invalid box score')
      return
    }
    const winner = inferWinnerFromBoxScore(input)
    const didUserWin = (winner === 'home') === userIsHome
    onSubmit(didUserWin, totalRuns(home), totalRuns(away), input)
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-slate-400">Innings:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInningsCount(innings - 1)}
            className="rounded bg-slate-700 px-2 py-1"
          >−</button>
          <span className="w-6 text-center">{innings}</span>
          <button
            type="button"
            onClick={() => setInningsCount(innings + 1)}
            className="rounded bg-slate-700 px-2 py-1"
          >+</button>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shortened}
            onChange={(e) => setShortened(e.target.checked)}
          />
          Shortened
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left">Team</th>
              {Array.from({ length: innings }, (_, i) => (
                <th key={i}>{i + 1}</th>
              ))}
              <th className="font-bold">R</th>
              <th>H</th>
              <th>E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-left text-slate-300">Away</td>
              {away.map((r, i) => (
                <td key={i}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={r}
                    onChange={(e) => update('away', i, Number(e.target.value))}
                    className="w-8 rounded bg-slate-700 text-center text-sm"
                  />
                </td>
              ))}
              <td className="font-bold">{totalRuns(away)}</td>
              <td>
                <input type="number" inputMode="numeric" value={hitsAway} onChange={(e) => setHitsAway(Number(e.target.value))} className="w-10 rounded bg-slate-700 text-center text-sm" />
              </td>
              <td>
                <input type="number" inputMode="numeric" value={errorsAway} onChange={(e) => setErrorsAway(Number(e.target.value))} className="w-10 rounded bg-slate-700 text-center text-sm" />
              </td>
            </tr>
            <tr>
              <td className="text-left text-slate-300">Home</td>
              {home.map((r, i) => (
                <td key={i}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={r}
                    onChange={(e) => update('home', i, Number(e.target.value))}
                    className="w-8 rounded bg-slate-700 text-center text-sm"
                  />
                </td>
              ))}
              <td className="font-bold">{totalRuns(home)}</td>
              <td>
                <input type="number" inputMode="numeric" value={hitsHome} onChange={(e) => setHitsHome(Number(e.target.value))} className="w-10 rounded bg-slate-700 text-center text-sm" />
              </td>
              <td>
                <input type="number" inputMode="numeric" value={errorsHome} onChange={(e) => setErrorsHome(Number(e.target.value))} className="w-10 rounded bg-slate-700 text-center text-sm" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-700 px-4 py-3 font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
        >
          Confirm &amp; Save
        </button>
      </div>
    </div>
  )
}

function resize(arr: number[], n: number): number[] {
  if (arr.length === n) return arr
  if (arr.length < n) return [...arr, ...Array(n - arr.length).fill(0)]
  return arr.slice(0, n)
}
