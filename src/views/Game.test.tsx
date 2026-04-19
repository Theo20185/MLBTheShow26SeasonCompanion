import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Game } from './Game'
import { createSeason } from '../domain/createSeason'
import { saveSeason, loadSeason } from '../domain/seasonStore'

function renderGame() {
  return render(
    <MemoryRouter>
      <Game />
    </MemoryRouter>
  )
}

describe('Game view', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a "no active season" message when no save exists', () => {
    renderGame()
    expect(screen.getByText(/no active season/i)).toBeInTheDocument()
  })

  it('renders the next game card with opponent and ballpark when a season exists', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    // Opponent appears in the card
    expect(screen.getByTestId('game-card')).toBeInTheDocument()
    expect(screen.getByTestId('opponent-name')).toBeInTheDocument()
    expect(screen.getByTestId('venue-name')).toBeInTheDocument()
  })

  it('shows the progress chip with game number and standings rank', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    expect(screen.getByTestId('progress-chip')).toBeInTheDocument()
    expect(screen.getByText(/game 1 of/i)).toBeInTheDocument()
  })

  it('reveals W and L buttons when Report Result is tapped', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    await user.click(screen.getByRole('button', { name: /report result/i }))
    expect(screen.getByRole('button', { name: /^win$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^loss$/i })).toBeInTheDocument()
  })

  it('commits a Win on tap and advances to the next game', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const firstGamePk = season.userGames[0].gamePk
    renderGame()
    await user.click(screen.getByRole('button', { name: /report result/i }))
    await user.click(screen.getByRole('button', { name: /^win$/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      const game = reloaded.userGames.find((g) => g.gamePk === firstGamePk)!
      expect(game.status).toBe('played')
      expect(game.result?.quick).toBe(true)
    })
  })

  it('shows an Undo affordance only after a report has been made', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /report result/i }))
    await user.click(screen.getByRole('button', { name: /^win$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    })
  })

  it('Undo restores the prior state and re-shows the previously-reported game', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const firstGamePk = season.userGames[0].gamePk
    renderGame()
    await user.click(screen.getByRole('button', { name: /report result/i }))
    await user.click(screen.getByRole('button', { name: /^win$/i }))
    await user.click(await screen.findByRole('button', { name: /undo/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      const game = reloaded.userGames.find((g) => g.gamePk === firstGamePk)!
      expect(game.status).toBe('scheduled')
      expect(reloaded.lastSnapshot).toBeUndefined()
    })
  })

  it('shows a Sim this game link', async () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    expect(screen.getByRole('button', { name: /sim this game/i })).toBeInTheDocument()
  })

  it('Sim this game shows a warning then commits a (likely) loss on confirm', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const firstGamePk = season.userGames[0].gamePk
    renderGame()
    await user.click(screen.getByRole('button', { name: /sim this game/i }))
    expect(screen.getByText(/CPU.*bias/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^sim$/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      const game = reloaded.userGames.find((g) => g.gamePk === firstGamePk)!
      expect(game.status).toBe('played')
      expect(game.result?.simmed).toBe(true)
    })
  })
})
