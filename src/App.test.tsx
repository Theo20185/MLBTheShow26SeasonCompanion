import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App smoke test', () => {
  it('renders the app shell with the title', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /MLB The Show 26 Season Companion/i })
    ).toBeInTheDocument()
  })
})
