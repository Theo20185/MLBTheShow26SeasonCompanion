// Logic tests for the regular→postseason transition. Reporting the
// 162nd game must NOT auto-flip directly to 'postseason' anymore; it
// stops at 'awaitingPostseason' so the UI can show a final-standings
// reveal screen with a single "Begin Postseason" CTA. The user
// explicitly clicks through, which calls startPostseason() and only
// then flips status to 'postseason'.

import { describe, it, expect } from 'vitest'
import { createSeason } from './createSeason'
import { reportUserGame } from './reportGame'
import { startPostseason } from './postseason'
import type { Season } from './types'

function reportEveryRegularGame(season: Season): Season {
  let s = season
  for (let i = 0; i < season.userGames.length; i++) {
    const next = s.userGames.find((g) => g.status === 'scheduled')
    if (!next) break
    s = reportUserGame(s, { gamePk: next.gamePk, didUserWin: i % 2 === 0 })
  }
  return s
}

describe('Regular-season → postseason transition (final standings reveal)', () => {
  it('lands at status "awaitingPostseason" after the 162nd report — NOT "postseason"', () => {
    const initial = createSeason({ userTeamId: 'NYY', rngSeed: 42 })
    const after = reportEveryRegularGame(initial)
    expect(after.status).toBe('awaitingPostseason')
    expect(after.bracket).toBeUndefined()
  })

  it('does not build the bracket until startPostseason is called explicitly', () => {
    const initial = createSeason({ userTeamId: 'NYY', rngSeed: 42 })
    const reported = reportEveryRegularGame(initial)
    const begun = startPostseason(reported)
    expect(begun.status).toBe('postseason')
    expect(begun.bracket).toBeDefined()
  })
})
