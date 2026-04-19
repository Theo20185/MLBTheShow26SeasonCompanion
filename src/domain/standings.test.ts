import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import { recordGameResult } from './seasonEngine'
import {
  computeStandings,
  getStandingsForDivision,
  getDivisionRankForTeam,
} from './standings'

function freshSeason() {
  return createSeason({ userTeamId: 'NYY', rngSeed: 1 })
}

function recordWin(season: ReturnType<typeof createSeason>, w: string, l: string, isDiv = false, date = '2026-04-15') {
  return recordGameResult(season, { date, winnerId: w, loserId: l, isDivisionGame: isDiv })
}

describe('computeStandings', () => {
  it('returns one entry per team (30 entries)', () => {
    const standings = computeStandings(freshSeason())
    expect(standings).toHaveLength(30)
  })

  it('computes winPct correctly', () => {
    let s = freshSeason()
    s = recordWin(s, 'NYY', 'BAL')
    s = recordWin(s, 'NYY', 'BAL')
    s = recordWin(s, 'BAL', 'NYY')
    const standings = computeStandings(s)
    const yankees = standings.find((e) => e.teamId === 'NYY')!
    expect(yankees.wins).toBe(2)
    expect(yankees.losses).toBe(1)
    expect(yankees.winPct).toBeCloseTo(2 / 3, 3)
  })

  it('zero games played gives winPct of 0 (not NaN)', () => {
    const standings = computeStandings(freshSeason())
    for (const e of standings) {
      expect(e.winPct).toBe(0)
    }
  })

  it('division rank gives the leader rank 1, ordered by winPct', () => {
    let s = freshSeason()
    // NYY beats BAL 5x in-division. Both AL East. Other AL East teams have 0 games.
    for (let i = 0; i < 5; i++) s = recordWin(s, 'NYY', 'BAL', true)
    const ranks = getStandingsForDivision(s, 'AL', 'East')
    expect(ranks[0].teamId).toBe('NYY')
    expect(ranks[0].rank).toBe(1)
    // BAL is at the bottom (only losses).
    expect(ranks[ranks.length - 1].teamId).toBe('BAL')
  })

  it('gamesBack from leader is correctly computed', () => {
    let s = freshSeason()
    for (let i = 0; i < 5; i++) s = recordWin(s, 'NYY', 'BAL', true)
    const ranks = getStandingsForDivision(s, 'AL', 'East')
    const leader = ranks[0]
    const baltimore = ranks.find((r) => r.teamId === 'BAL')!
    // GB = ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2
    // Leader 5-0, BAL 0-5 → GB = (5-0 + 5-0)/2 = 5
    expect(leader.gamesBack).toBe(0)
    expect(baltimore.gamesBack).toBe(5)
  })

  it('getDivisionRankForTeam returns the right rank string for the chip', () => {
    let s = freshSeason()
    for (let i = 0; i < 3; i++) s = recordWin(s, 'NYY', 'BAL', true)
    const info = getDivisionRankForTeam(s, 'NYY')
    expect(info?.rank).toBe(1)
    expect(info?.gamesBack).toBe(0)
  })
})
