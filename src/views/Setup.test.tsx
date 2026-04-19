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

describe('Setup view — team picker step', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders 30 team buttons', () => {
    renderSetup()
    const teamButtons = screen.getAllByRole('button', { name: /Replace the / })
    expect(teamButtons).toHaveLength(30)
  })

  it('renders the page heading', () => {
    renderSetup()
    expect(
      screen.getByRole('heading', { name: /pick the team to replace/i })
    ).toBeInTheDocument()
  })

  it('shows teams grouped by league + division', () => {
    renderSetup()
    expect(screen.getByText(/AL East/i)).toBeInTheDocument()
    expect(screen.getByText(/AL West/i)).toBeInTheDocument()
    expect(screen.getByText(/NL Central/i)).toBeInTheDocument()
  })
})

describe('Setup view — squad identity step', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows squad identity form after picking a team', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Replace the Yankees/i }))
    expect(
      screen.getByRole('heading', { name: /your diamond dynasty squad/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/squad name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/abbreviation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/squad ovr/i)).toBeInTheDocument()
  })

  it('pre-fills squad inputs from the selected team', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Replace the Yankees/i }))
    const nameInput = screen.getByLabelText(/squad name/i) as HTMLInputElement
    expect(nameInput.value).toBe('Yankees')
    const abbrevInput = screen.getByLabelText(/abbreviation/i) as HTMLInputElement
    expect(abbrevInput.value).toBe('NYY')
  })

  it('writes a season with the user-entered squad identity', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Replace the Yankees/i }))

    const nameInput = screen.getByLabelText(/squad name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Bombers')

    const abbrevInput = screen.getByLabelText(/abbreviation/i)
    await user.clear(abbrevInput)
    await user.type(abbrevInput, 'BMB')

    const ovrInput = screen.getByLabelText(/squad ovr/i)
    await user.clear(ovrInput)
    await user.type(ovrInput, '92')

    await user.click(screen.getByRole('button', { name: /start season/i }))

    const seasons = listSeasons()
    expect(seasons).toHaveLength(1)
    const full = loadSeason(seasons[0].id)!
    expect(full.userTeamId).toBe('NYY')
    expect(full.userSquad?.name).toBe('Bombers')
    expect(full.userSquad?.abbrev).toBe('BMB')
    expect(full.ovrOverrides.NYY).toBe(92)
  })

  it('Back returns to the team picker without saving', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Replace the Dodgers/i }))
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(
      screen.getByRole('heading', { name: /pick the team to replace/i })
    ).toBeInTheDocument()
    expect(listSeasons()).toHaveLength(0)
  })

  it('navigates to /game after starting the season', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('button', { name: /Replace the Dodgers/i }))
    await user.click(screen.getByRole('button', { name: /start season/i }))
    expect(screen.getByText('Game Screen Stub')).toBeInTheDocument()
  })
})
