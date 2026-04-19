// Sim Ahead modal — three "skip ahead" options with a CPU-bias /
// no-undo warning. See src/domain/simAhead.ts for the engine.

import {
  simToAllStarBreak,
  simToPostseason,
  simToWorldSeries,
} from '../domain/simAhead'
import type { Season } from '../domain/types'

interface Props {
  season: Season
  onClose: () => void
  onSimmed: (updated: Season) => void
}

export function SimAheadModal({ season, onClose, onSimmed }: Props) {
  function run(fn: (s: Season) => Season) {
    const updated = fn(season)
    onSimmed(updated)
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-sm rounded-2xl bg-slate-800 p-6 text-slate-100">
        <h2 className="text-lg font-semibold">Sim ahead</h2>
        <p className="mt-2 text-sm text-slate-300">
          Each option simulates a stretch of games on your behalf. The
          simulator applies a <span className="font-semibold text-amber-300">CPU-favored bias</span>
          {' '}to your team for any games it skips, so you'll lose more than you'd
          expect to. <span className="font-semibold">These bulk sims cannot be undone.</span>
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => run(simToAllStarBreak)}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 text-left font-semibold text-white"
          >
            Simulate to All-Star Break
            <div className="mt-0.5 text-xs font-normal text-amber-100/90">
              Drops you on the first game after the break.
            </div>
          </button>

          <button
            type="button"
            onClick={() => run(simToPostseason)}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 text-left font-semibold text-white"
          >
            Simulate to Postseason
            <div className="mt-0.5 text-xs font-normal text-amber-100/90">
              Sims the rest of the regular season. Guarantees your team a
              playoff spot (division winner or wild card).
            </div>
          </button>

          <button
            type="button"
            onClick={() => run(simToWorldSeries)}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 text-left font-semibold text-white"
          >
            Simulate to World Series
            <div className="mt-0.5 text-xs font-normal text-amber-100/90">
              Sims everything through the LCS. Drops you at game 1 of the
              World Series.
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-slate-700 px-4 py-3 font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
