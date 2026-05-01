import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NavBar } from './NavBar'
import { themeForSeason } from './squadTheme'
import type { Season } from '../domain/types'

function makeSeason(): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
    userSquad: { name: 'X', abbrev: 'X', primaryColor: '#003087', secondaryColor: '#ffd700' },
    startDate: '2026-04-01',
    currentDate: '2026-04-01',
    status: 'regular',
    rngSeed: 1,
    baseOvrSnapshot: {},
    ovrOverrides: {},
    rosterSnapshotId: 'r1',
    userGames: [],
    teamRecords: [],
    headToHead: {},
  } as Season
}

describe('NavBar', () => {
  it('renders chips at the given paths', () => {
    render(
      <MemoryRouter>
        <NavBar
          theme={themeForSeason(makeSeason())}
          items={[
            { to: '/', label: 'Home' },
            { to: '/standings', label: 'Standings' },
          ]}
        />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /standings/i })).toBeInTheDocument()
  })

  it('applies the secondary color as background to non-accent chips', () => {
    render(
      <MemoryRouter>
        <NavBar
          theme={themeForSeason(makeSeason())}
          items={[{ to: '/standings', label: 'Standings' }]}
        />
      </MemoryRouter>
    )
    const chip = screen.getByRole('link', { name: /standings/i })
    // The chip uses inline style for the secondary swatch.
    expect(chip.getAttribute('style') ?? '').toMatch(/background-color:\s*(#ffd700|rgb\(255,\s*215,\s*0\))/i)
  })

  it('does NOT apply the secondary color to accent chips (e.g. Bracket during postseason)', () => {
    render(
      <MemoryRouter>
        <NavBar
          theme={themeForSeason(makeSeason())}
          items={[{ to: '/bracket', label: 'Bracket', accent: true }]}
        />
      </MemoryRouter>
    )
    const chip = screen.getByRole('link', { name: /bracket/i })
    const style = chip.getAttribute('style') ?? ''
    expect(style).not.toMatch(/#ffd700/i)
    expect(style).not.toMatch(/rgb\(255,\s*215,\s*0\)/i)
  })
})
