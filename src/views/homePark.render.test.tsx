// Render tests for the user's home-park override across all
// home-game surfaces. The override must appear consistently anywhere
// the user is shown a home game to play.

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Game } from './Game'
import { createSeason } from '../domain/createSeason'
import { saveSeason } from '../domain/seasonStore'
import type { Season } from '../domain/types'

function renderGame() {
  return render(
    <MemoryRouter>
      <Game />
    </MemoryRouter>
  )
}

/** Roll user's userGames forward to a known home game, leaving the
 *  rest scheduled. The first home game's index varies by team because
 *  schedules sometimes start with a road trip; finding the first home
 *  game keeps the test independent of MLB scheduling quirks. */
function withFirstHomeGameAsNext(season: Season): Season {
  const firstHomeIdx = season.userGames.findIndex(
    (g) => g.homeTeamId === season.userTeamId
  )
  if (firstHomeIdx === -1) throw new Error('no home games')
  // Mark all earlier games as 'played' with a dummy result so the
  // "next game" resolver lands on the first home game.
  return {
    ...season,
    userGames: season.userGames.map((g, i) => {
      if (i < firstHomeIdx) {
        return {
          ...g,
          status: 'played' as const,
          result: { homeScore: 0, awayScore: 1, quick: true, simmed: false },
        }
      }
      return g
    }),
  }
}

describe('Home-park override on the Game card', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the bundled park name when no override is set (default behavior)', () => {
    const base = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(withFirstHomeGameAsNext(base))
    renderGame()
    const venue = screen.getByTestId('venue-name')
    expect(venue.textContent).toMatch(/yankee stadium/i)
  })

  it('shows a different MLB park when homePark.kind === "preset"', () => {
    const base = createSeason({
      userTeamId: 'NYY',
      rngSeed: 1,
      userSquad: {
        name: 'Bombers',
        abbrev: 'BMB',
        homePark: { kind: 'preset', parkId: 'coors-field' },
      },
    })
    saveSeason(withFirstHomeGameAsNext(base))
    renderGame()
    const venue = screen.getByTestId('venue-name')
    expect(venue.textContent).toMatch(/coors field/i)
  })

  it('shows the user-provided custom name when homePark.kind === "custom"', () => {
    const base = createSeason({
      userTeamId: 'NYY',
      rngSeed: 1,
      userSquad: {
        name: 'Bombers',
        abbrev: 'BMB',
        homePark: { kind: 'custom', name: 'The Crater' },
      },
    })
    saveSeason(withFirstHomeGameAsNext(base))
    renderGame()
    const venue = screen.getByTestId('venue-name')
    expect(venue.textContent).toMatch(/the crater/i)
  })

  it('does NOT apply the override when the user is on the road', () => {
    // Default to whatever first game NYY has — for teams whose first
    // game is away, the venue should be the opponent's park, not the
    // user's overridden home.
    const base = createSeason({
      userTeamId: 'NYY',
      rngSeed: 1,
      userSquad: {
        name: 'Bombers',
        abbrev: 'BMB',
        homePark: { kind: 'custom', name: 'The Crater' },
      },
    })
    // If NYY's opening day is at home, find the first away game.
    const firstAwayIdx = base.userGames.findIndex(
      (g) => g.homeTeamId !== base.userTeamId
    )
    if (firstAwayIdx === -1) throw new Error('no away games')
    const seasonAtAway: Season = {
      ...base,
      userGames: base.userGames.map((g, i) =>
        i < firstAwayIdx
          ? {
              ...g,
              status: 'played' as const,
              result: { homeScore: 0, awayScore: 1, quick: true, simmed: false },
            }
          : g
      ),
    }
    saveSeason(seasonAtAway)
    renderGame()
    const venue = screen.getByTestId('venue-name')
    expect(venue.textContent).not.toMatch(/the crater/i)
  })
})
