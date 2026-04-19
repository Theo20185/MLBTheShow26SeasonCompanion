// Game screen (PLAN.md §6.3 + §7.1 step 3) — primary UX surface.
// Mini Seasons style: single card with the next game, big Report Result
// CTA, single-level Undo, optional "Sim this game" with warning.

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getNextUserGame,
  reportUserGame,
  undoLastReport,
} from '../domain/reportGame'
import {
  loadSeason,
  saveSeason,
  listSeasons,
} from '../domain/seasonStore'
import { getDivisionRankForTeam } from '../domain/standings'
import { TEAM_BY_ID } from '../data/teamIdMap'
import { BALLPARK_BY_ID } from '../data/ballparks'
import { BoxScorePanel } from './BoxScorePanel'
import { PostseasonGame } from './PostseasonGame'
import { SimAheadModal } from './SimAheadModal'
import { NavBar } from './NavBar'
import {
  advancePastByes,
  getNextUserPostseasonGame,
  isUserStillAlive,
  startPostseason,
} from '../domain/postseason'
import { getUserDisplay, fullLabel } from '../domain/userDisplay'
import type { Season, BoxScore } from '../domain/types'
import type { BoxScoreInput } from '../domain/boxScore'

export function Game() {
  const initial = useMemo(() => loadActiveSeason(), [])
  const [season, setSeason] = useState<Season | null>(initial)
  const [reportPanelOpen, setReportPanelOpen] = useState(false)
  const [boxScoreOpen, setBoxScoreOpen] = useState(false)
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [simAheadOpen, setSimAheadOpen] = useState(false)

  if (!season) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p className="text-lg">No active season.</p>
        <Link
          to="/setup"
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white"
        >
          Start a new season
        </Link>
      </main>
    )
  }

  // Season-complete: champion screen.
  if (season.status === 'complete') {
    const champion = season.champion ? TEAM_BY_ID.get(season.champion) : null
    const userWon = season.champion === season.userTeamId
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p className="text-sm uppercase tracking-wider text-slate-400">Season complete</p>
        <h1 className="text-center text-3xl font-semibold">
          {userWon ? 'You won the World Series!' : `${champion?.city} ${champion?.name} win the World Series`}
        </h1>
        <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
          <Link
            to="/bracket"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-slate-700 px-6 py-3 font-semibold text-white active:scale-[0.98]"
          >
            View final bracket
          </Link>
          <Link
            to="/setup"
            className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white active:scale-[0.98]"
          >
            Start a new season
          </Link>
        </div>
      </main>
    )
  }

  // Postseason mode.
  if (season.status === 'postseason') {
    if (!isUserStillAlive(season)) {
      return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
          <p className="text-sm uppercase tracking-wider text-slate-400">Eliminated</p>
          <h1 className="text-center text-2xl font-semibold">Your season is over.</h1>
          <Link
            to="/bracket"
            className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-center font-semibold text-white active:scale-[0.98]"
          >
            See the bracket / sim to World Series
          </Link>
        </main>
      )
    }
    // User is alive but has nothing to play right now — most commonly a
    // top-2 seed with a Wild Card bye, or the gap between completing a
    // series and the next round being constructed. Offer to fast-forward.
    if (!getNextUserPostseasonGame(season)) {
      const round = season.bracket?.currentRound
      const roundLabel = round === 'WCS' ? 'Wild Card Series' :
        round === 'DS' ? 'Division Series' :
        round === 'LCS' ? 'Championship Series' : 'current round'
      return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
          <p className="text-sm uppercase tracking-wider text-amber-300">Bye round</p>
          <h1 className="text-center text-2xl font-semibold">
            You have a bye through the {roundLabel}.
          </h1>
          <p className="max-w-sm text-center text-sm text-slate-400">
            Sim out the {roundLabel} to find out your next opponent and start
            playing.
          </p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                const advanced = advancePastByes(season)
                saveSeason(advanced)
                setSeason(advanced)
              }}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white active:scale-[0.98]"
            >
              Sim the {roundLabel}
            </button>
            <Link
              to="/bracket"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98]"
            >
              See the bracket
            </Link>
          </div>
        </main>
      )
    }
    return (
      <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
        <div className="mx-auto max-w-md">
          <NavBar
            items={[
              { to: '/', label: 'Home' },
              { to: '/bracket', label: 'Bracket', accent: true },
              { to: '/standings', label: 'Standings' },
              { to: '/settings', label: 'Settings' },
            ]}
          />
          <PostseasonGame season={season} onSeasonUpdate={setSeason} />
          <button
            type="button"
            onClick={() => setSimAheadOpen(true)}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98]"
          >
            Sim ahead…
          </button>
          {simAheadOpen && (
            <SimAheadModal
              season={season}
              onClose={() => setSimAheadOpen(false)}
              onSimmed={(updated) => {
                saveSeason(updated)
                setSeason(updated)
                setSimAheadOpen(false)
              }}
            />
          )}
        </div>
      </main>
    )
  }

  // Regular season.
  const next = getNextUserGame(season)
  if (!next) {
    // Auto-build the bracket and flip status to postseason.
    const updated = startPostseason(season)
    saveSeason(updated)
    setSeason(updated)
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-slate-100">
        <p className="text-lg">Regular season complete. Building the bracket...</p>
      </main>
    )
  }

  const userTeamMeta = TEAM_BY_ID.get(season.userTeamId)!
  const userIsHome = next.homeTeamId === season.userTeamId
  const opponentId = userIsHome ? next.awayTeamId : next.homeTeamId
  const opponentDisplay = getUserDisplay(season, opponentId)
  const park = BALLPARK_BY_ID.get(next.parkId)
  const playedCount = season.userGames.filter((g) => g.status === 'played').length
  const userRecord = season.teamRecords.find((r) => r.teamId === season.userTeamId)!
  const wins = userRecord.firstHalfWins + userRecord.secondHalfWins
  const losses = userRecord.firstHalfLosses + userRecord.secondHalfLosses
  const opponentRecord = season.teamRecords.find((r) => r.teamId === opponentId)!
  const opponentWins = opponentRecord.firstHalfWins + opponentRecord.secondHalfWins
  const opponentLosses = opponentRecord.firstHalfLosses + opponentRecord.secondHalfLosses
  const rankInfo = getDivisionRankForTeam(season, season.userTeamId)

  function commit(updated: Season) {
    saveSeason(updated)
    setSeason(updated)
    setReportPanelOpen(false)
    setBoxScoreOpen(false)
    setSimModalOpen(false)
  }

  function handleBoxScoreSubmit(
    didUserWin: boolean,
    homeScore: number,
    awayScore: number,
    detail: BoxScoreInput
  ) {
    const boxScore: BoxScore = {
      inningsHome: detail.inningsHome.map((r) => ({ runs: r })),
      inningsAway: detail.inningsAway.map((r) => ({ runs: r })),
      hitsHome: detail.hitsHome,
      hitsAway: detail.hitsAway,
      errorsHome: detail.errorsHome,
      errorsAway: detail.errorsAway,
    }
    const updated = reportUserGame(season!, {
      gamePk: next!.gamePk,
      didUserWin,
      homeScore,
      awayScore,
    })
    // Patch in box score detail.
    const withDetail: Season = {
      ...updated,
      userGames: updated.userGames.map((g) =>
        g.gamePk === next!.gamePk && g.result
          ? { ...g, result: { ...g.result, quick: false, detail: boxScore } }
          : g
      ),
    }
    commit(withDetail)
  }

  function handleReport(didUserWin: boolean) {
    const updated = reportUserGame(season!, {
      gamePk: next!.gamePk,
      didUserWin,
    })
    commit(updated)
  }

  function handleSim() {
    // Apply user-disadvantage roll. We don't pre-decide W/L — the sim does.
    // Simple approach: roll once with the penalty and use that outcome.
    // The simulator's RNG is tracked on the season seed, which reportUserGame
    // also advances; using reportUserGame with isSim=true gives consistent
    // semantics even though we have to pre-decide didUserWin here. For now,
    // call reportUserGame with the simulator's outcome.
    // (Full game-day-decided sim is fine because the score generator inside
    // reportUserGame already produces a sensible result.)
    // Compute outcome via simulator with penalty applied.
    const homeOvr = season!.baseOvrSnapshot[next!.homeTeamId]
    const awayOvr = season!.baseOvrSnapshot[next!.awayTeamId]
    const userOvr = userIsHome ? homeOvr : awayOvr
    const oppOvr = userIsHome ? awayOvr : homeOvr
    // Approximate p(user wins) under the penalty so we can decide before report.
    const penaltyAdjustedUserOvr = userOvr - 10
    const userWinPct =
      penaltyAdjustedUserOvr ** 3 /
      (penaltyAdjustedUserOvr ** 3 + oppOvr ** 3) -
      (userIsHome ? 0 : 0.04) // home bonus benefits whoever's at home
    const didUserWin = Math.random() < Math.max(0.05, userWinPct)
    const updated = reportUserGame(season!, {
      gamePk: next!.gamePk,
      didUserWin,
      isSim: true,
    })
    commit(updated)
  }

  function handleUndo() {
    const undone = undoLastReport(season!)
    if (undone) commit(undone)
  }

  return (
    <main className="min-h-svh bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mx-auto max-w-md">
        {/* Top nav drawer-equivalent buttons (PLAN.md §7.2) */}
        <NavBar
          items={[
            { to: '/', label: 'Home' },
            { to: '/standings', label: 'Standings' },
            { to: '/schedule', label: 'Schedule' },
            { to: '/settings', label: 'Settings' },
          ]}
        />

        {/* Progress chip */}
        <div
          data-testid="progress-chip"
          className="mb-4 rounded-full bg-slate-800 px-4 py-2 text-center text-xs text-slate-300"
        >
          Game {playedCount + 1} of {season.userGames.length} · {wins}-{losses}
          {rankInfo && (
            <>
              {' · '}
              {ordinal(rankInfo.rank)} {userTeamMeta.league} {userTeamMeta.division}
              {rankInfo.gamesBack > 0 && ` (-${rankInfo.gamesBack})`}
            </>
          )}
        </div>

        {/* Game card */}
        <section
          data-testid="game-card"
          className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg"
        >
          <div className="text-center text-xs uppercase tracking-wider text-slate-400">
            {fullLabel(season, season.userTeamId)} {userIsHome ? 'host' : '@'}{' '}
            <span data-testid="opponent-name">{opponentDisplay.name}</span>
          </div>
          <div className="mt-2 text-center text-base text-slate-300">
            {opponentDisplay.city} {opponentDisplay.name} ({opponentWins}-{opponentLosses})
          </div>
          <div className="my-4 text-center text-2xl font-semibold">
            <span data-testid="venue-name">
              {park?.name ?? next.homeTeamId}
            </span>
          </div>
          <div className="text-center text-sm text-slate-400">
            {formatDate(next.date)} · {formatTime(next.gameDate)}
          </div>
        </section>

        {/* Primary action */}
        <div className="mt-6">
          {!reportPanelOpen && !boxScoreOpen ? (
            <button
              type="button"
              onClick={() => setReportPanelOpen(true)}
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg active:scale-[0.98]"
            >
              Report Result
            </button>
          ) : boxScoreOpen ? (
            <BoxScorePanel
              userIsHome={userIsHome}
              regulationLength={season.defaultGameLength ?? 9}
              onCancel={() => setBoxScoreOpen(false)}
              onSubmit={handleBoxScoreSubmit}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-center text-xs text-slate-400">
                Tap W or L to commit. Want to log innings, hits, errors? Open
                the full box score.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleReport(true)}
                  className="rounded-xl bg-emerald-600 px-6 py-5 text-xl font-bold text-white active:scale-[0.98]"
                >
                  Win
                </button>
                <button
                  type="button"
                  onClick={() => handleReport(false)}
                  className="rounded-xl bg-rose-600 px-6 py-5 text-xl font-bold text-white active:scale-[0.98]"
                >
                  Loss
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportPanelOpen(false)
                  setBoxScoreOpen(true)
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98]"
              >
                Full box score →
              </button>
              <button
                type="button"
                onClick={() => setReportPanelOpen(false)}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSimModalOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98]"
            >
              Sim this game
            </button>
            <button
              type="button"
              onClick={() => setSimAheadOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-700 active:scale-[0.98]"
            >
              Sim ahead…
            </button>
          </div>

          {season.lastSnapshot && (
            <button
              type="button"
              onClick={handleUndo}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-amber-700 bg-amber-900/30 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-900/50 active:scale-[0.98]"
            >
              Undo last game
            </button>
          )}
        </div>

        {/* Sim warning modal */}
        {simModalOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <div className="max-w-sm rounded-2xl bg-slate-800 p-6 text-slate-100">
              <h2 className="text-lg font-semibold">Sim this game?</h2>
              <p className="mt-2 text-sm text-slate-300">
                Simming will apply a CPU-favored bias — you're more likely to
                take the loss. Everything's self-reported anyway; this is just
                a nudge toward actually playing.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimModalOpen(false)}
                  className="rounded-lg bg-slate-700 px-4 py-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSim}
                  className="rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white"
                >
                  Sim
                </button>
              </div>
            </div>
          </div>
        )}

        {simAheadOpen && (
          <SimAheadModal
            season={season}
            onClose={() => setSimAheadOpen(false)}
            onSimmed={(updated) => {
              saveSeason(updated)
              setSeason(updated)
              setSimAheadOpen(false)
            }}
          />
        )}
      </div>
    </main>
  )
}

function loadActiveSeason(): Season | null {
  const index = listSeasons()
  for (const entry of index) {
    if (entry.status !== 'complete') {
      const s = loadSeason(entry.id)
      if (s) return s
    }
  }
  return null
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
