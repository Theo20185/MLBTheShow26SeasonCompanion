import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Game } from './Game'
import { Settings } from './Settings'
import { Home } from './Home'
import { createSeason } from '../domain/createSeason'
import { saveSeason } from '../domain/seasonStore'

describe('Theme mode application on <html>', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('adds the "dark" class on <html> when the active season is in dark mode', () => {
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason({ ...season, themeMode: 'dark' })
    render(
      <MemoryRouter>
        <Game />
      </MemoryRouter>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes the "dark" class on <html> when the active season is in light mode', () => {
    document.documentElement.classList.add('dark')
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason({ ...season, themeMode: 'light' })
    render(
      <MemoryRouter>
        <Game />
      </MemoryRouter>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('defaults to dark on Home (no season)', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles the dark class live when the user changes theme mode in Settings', async () => {
    const user = userEvent.setup()
    const season = createSeason({ userTeamId: 'NYY', rngSeed: 1 })
    saveSeason(season)
    const { getByRole } = render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(getByRole('button', { name: /^light$/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(getByRole('button', { name: /^dark$/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
