import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Setup } from './Setup'
import { listSeasons, loadSeason } from '../domain/seasonStore'

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/game" element={<div>Game Screen Stub</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Setup view (team picker)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders 30 team buttons', () => {
    renderSetup()
    const teamButtons = screen.getAllByRole('button', { name: /Pick the / })
    expect(teamButtons).toHaveLength(30)
  })

  it('renders the page heading', () => {
    renderSetup()
    expect(
      screen.getByRole('heading', { name: /pick your team/i })
    ).toBeInTheDocument()
  })

  it('writes a new season to localStorage when a team is picked', async () => {
    const user = userEvent.setup()
    renderSetup()
    const yankeesButton = screen.getByRole('button', { name: /Pick the Yankees/i })
    await user.click(yankeesButton)
    const seasons = listSeasons()
    expect(seasons).toHaveLength(1)
    expect(seasons[0].userTeamId).toBe('NYY')
    const fullSeason = loadSeason(seasons[0].id)
    expect(fullSeason?.userTeamId).toBe('NYY')
    expect(fullSeason?.teamRecords).toHaveLength(30)
    expect(fullSeason?.userGames.length).toBeGreaterThanOrEqual(161)
  })

  it('navigates to /game after picking a team', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Pick the Dodgers/i }))
    expect(screen.getByText('Game Screen Stub')).toBeInTheDocument()
  })

  it('shows teams grouped by league + division', () => {
    renderSetup()
    expect(screen.getByText(/AL East/i)).toBeInTheDocument()
    expect(screen.getByText(/AL West/i)).toBeInTheDocument()
    expect(screen.getByText(/NL Central/i)).toBeInTheDocument()
  })
})
