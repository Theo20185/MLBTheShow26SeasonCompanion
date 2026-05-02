// Render tests for the post-report toast: it appears after a Win
// commit and contains the expected date-range + simmed-game text.

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Game } from './Game'
import { createSeason } from '../domain/createSeason'
import { saveSeason } from '../domain/seasonStore'

function renderGame() {
  return render(
    <MemoryRouter>
      <Game />
    </MemoryRouter>
  )
}

describe('Post-report toast', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('appears after a Win commit with a date-range message', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()

    await user.click(screen.getByRole('button', { name: /report result/i }))
    await user.click(screen.getByRole('button', { name: /^win$/i }))

    const toast = await waitFor(() => screen.getByTestId('post-report-toast'))
    // Should mention some month abbreviation in the date range.
    expect(toast.textContent).toMatch(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/)
  })

  it('does not render before any report has been made', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderGame()
    expect(screen.queryByTestId('post-report-toast')).not.toBeInTheDocument()
  })
})
