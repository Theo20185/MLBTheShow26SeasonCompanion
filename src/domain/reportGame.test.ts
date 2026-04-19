import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import {
  reportUserGame,
  undoLastReport,
  getNextUserGame,
} from './reportGame'

function freshSeason() {
  return createSeason({ userTeamId: 'NYY', rngSeed: 1 })
}

describe('getNextUserGame', () => {
  it('returns the first scheduled game for a fresh season', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)
    expect(next).toBeDefined()
    expect(next?.status).toBe('scheduled')
  })

  it('returns null when all user games are played', () => {
    let season = freshSeason()
    season = {
      ...season,
      userGames: season.userGames.map((g) => ({
        ...g,
        status: 'played',
        result: { homeScore: 1, awayScore: 0, quick: true, simmed: false },
      })),
    }
    expect(getNextUserGame(season)).toBeNull()
  })
})

describe('reportUserGame', () => {
  it('marks the next user game as played with the reported result', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const updated = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const game = updated.userGames.find((g) => g.gamePk === next.gamePk)!
    expect(game.status).toBe('played')
    expect(game.result?.quick).toBe(true)
    expect(game.result?.simmed).toBe(false)
    if (next.homeTeamId === season.userTeamId) {
      expect(game.result!.homeScore).toBeGreaterThan(game.result!.awayScore)
    } else {
      expect(game.result!.awayScore).toBeGreaterThan(game.result!.homeScore)
    }
  })

  it('updates the user team\'s record (W → firstHalfWins+1)', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const updated = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const yankees = updated.teamRecords.find((r) => r.teamId === 'NYY')!
    expect(yankees.firstHalfWins).toBe(1)
    expect(yankees.firstHalfLosses).toBe(0)
  })

  it('updates the opponent record (L on the opponent)', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const opponentId =
      next.homeTeamId === 'NYY' ? next.awayTeamId : next.homeTeamId
    const updated = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const opponent = updated.teamRecords.find((r) => r.teamId === opponentId)!
    expect(opponent.firstHalfLosses).toBe(1)
  })

  it('writes a lastSnapshot capturing pre-report state', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const updated = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    expect(updated.lastSnapshot).toBeDefined()
    expect(updated.lastSnapshot?.gameId).toBe(next.gamePk)
    expect(updated.lastSnapshot?.currentDate).toBe(season.currentDate)
    expect(updated.lastSnapshot?.rngSeed).toBe(season.rngSeed)
  })

  it('advances currentDate past the played game', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const updated = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    expect(updated.currentDate >= next.date).toBe(true)
  })

  it('throws if the gamePk does not match the next scheduled user game', () => {
    const season = freshSeason()
    expect(() =>
      reportUserGame(season, { gamePk: 99999999, didUserWin: true })
    ).toThrow()
  })
})

describe('reportUserGame with sim', () => {
  it('sets simmed: true when isSim flag is set', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const updated = reportUserGame(season, {
      gamePk: next.gamePk,
      didUserWin: true,
      isSim: true,
    })
    const game = updated.userGames.find((g) => g.gamePk === next.gamePk)!
    expect(game.result?.simmed).toBe(true)
  })
})

describe('undoLastReport', () => {
  it('restores currentDate, rngSeed, records, and H2H to pre-report state', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const reported = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    expect(reported.lastSnapshot).toBeDefined()
    const undone = undoLastReport(reported)
    expect(undone).not.toBeNull()
    expect(undone!.currentDate).toBe(season.currentDate)
    expect(undone!.rngSeed).toBe(season.rngSeed)
    expect(undone!.teamRecords).toEqual(season.teamRecords)
    expect(undone!.headToHead).toEqual(season.headToHead)
  })

  it('flips the previously-reported game back to scheduled and clears its result', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const reported = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const undone = undoLastReport(reported)!
    const restoredGame = undone.userGames.find((g) => g.gamePk === next.gamePk)!
    expect(restoredGame.status).toBe('scheduled')
    expect(restoredGame.result).toBeUndefined()
  })

  it('clears lastSnapshot after undo (no double-undo)', () => {
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const reported = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const undone = undoLastReport(reported)!
    expect(undone.lastSnapshot).toBeUndefined()
  })

  it('returns null when there is no snapshot to undo', () => {
    const season = freshSeason()
    expect(undoLastReport(season)).toBeNull()
  })

  it('a re-report after undo with the OPPOSITE result produces different downstream state', () => {
    // Phase 6 build-order assertion: undo logic test.
    const season = freshSeason()
    const next = getNextUserGame(season)!
    const winReport = reportUserGame(season, { gamePk: next.gamePk, didUserWin: true })
    const undone = undoLastReport(winReport)!
    const lossReport = reportUserGame(undone, { gamePk: next.gamePk, didUserWin: false })
    const yankeesAfterLoss = lossReport.teamRecords.find((r) => r.teamId === 'NYY')!
    expect(yankeesAfterLoss.firstHalfWins).toBe(0)
    expect(yankeesAfterLoss.firstHalfLosses).toBe(1)
  })
})
