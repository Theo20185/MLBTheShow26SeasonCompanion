import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Settings } from './Settings'
import { createSeason } from '../domain/createSeason'
import { saveSeason, loadSeason } from '../domain/seasonStore'

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  )
}

describe('Settings — theme mode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders Dark and Light mode buttons', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument()
  })

  it('defaults to dark mode when the season has no themeMode', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    const dark = screen.getByRole('button', { name: /^dark$/i })
    expect(dark.getAttribute('aria-pressed')).toBe('true')
  })

  it('persists themeMode = "light" to localStorage when the user clicks Light', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    await user.click(screen.getByRole('button', { name: /^light$/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.themeMode).toBe('light')
    })
  })

  it('persists themeMode = "dark" when the user clicks Dark after Light', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason({ ...season, themeMode: 'light' })
    renderSettings()
    await user.click(screen.getByRole('button', { name: /^dark$/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.themeMode).toBe('dark')
    })
  })
})

describe('Settings — home park override', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the home park controls (default / pick / custom)', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    expect(screen.getByRole('button', { name: /^default$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^pick.*park$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^custom park$/i })).toBeInTheDocument()
  })

  it('persists a preset park override into season.userSquad.homePark', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    await user.click(screen.getByRole('button', { name: /^pick.*park$/i }))
    const select = screen.getByLabelText(/home park preset/i) as HTMLSelectElement
    await user.selectOptions(select, 'coors-field')
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.userSquad?.homePark).toEqual({ kind: 'preset', parkId: 'coors-field' })
    })
  })

  it('persists a custom park name into season.userSquad.homePark', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    await user.click(screen.getByRole('button', { name: /^custom park$/i }))
    const input = screen.getByLabelText(/custom park name/i)
    await user.clear(input)
    await user.type(input, 'The Crater')
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.userSquad?.homePark).toEqual({ kind: 'custom', name: 'The Crater' })
    })
  })

  it('clears the override when the user clicks Default after setting one', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason({
      ...season,
      userSquad: {
        name: 'Bombers',
        abbrev: 'BMB',
        homePark: { kind: 'preset', parkId: 'coors-field' },
      },
    })
    renderSettings()
    await user.click(screen.getByRole('button', { name: /^default$/i }))
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.userSquad?.homePark).toBeUndefined()
    })
  })
})

describe('Settings — squad colors swatch', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the primary color swatch with a tap-to-pick hint', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    const primary = screen.getByLabelText(/primary squad color/i) as HTMLInputElement
    expect(primary).toBeInTheDocument()
    expect(primary.type).toBe('color')
    expect(screen.getAllByText(/tap a swatch/i).length).toBeGreaterThan(0)
  })

  it('writes the primary color to localStorage when the swatch changes', async () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    renderSettings()
    const primary = screen.getByLabelText(/primary squad color/i) as HTMLInputElement
    // userEvent doesn't drive native color pickers; fire change directly.
    fireEvent.change(primary, { target: { value: '#123456' } })
    await waitFor(() => {
      const reloaded = loadSeason(season.id)!
      expect(reloaded.userSquad?.primaryColor).toBe('#123456')
    })
  })
})
