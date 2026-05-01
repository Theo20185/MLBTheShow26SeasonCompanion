// Shared top-of-screen navigation row. Each item is a tappable button-
// style chip with a 44pt min height (Apple HIG) so they can't be misfired
// next to the primary game card. Non-accent chips wear the user's
// secondary squad color; accent chips keep amber to signal urgency
// (e.g. "Bracket" during postseason).

import { Link } from 'react-router-dom'
import type { SquadTheme } from './squadTheme'
import { secondaryNavStyle } from './squadTheme'

interface NavItem {
  to: string
  label: string
  /** Highlight the chip in amber (e.g. "Bracket" during postseason). */
  accent?: boolean
}

export function NavBar({ items, theme }: { items: NavItem[]; theme?: SquadTheme }) {
  return (
    <nav className="mb-3 grid grid-cols-4 gap-2">
      {items.map((it) => (
        <Link
          key={it.to + it.label}
          to={it.to}
          style={!it.accent && theme ? secondaryNavStyle(theme) : undefined}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-md border px-2 text-xs font-semibold uppercase tracking-wider active:scale-[0.98] ${
            it.accent
              ? 'border-amber-700 bg-amber-900/40 text-amber-200 hover:bg-amber-900/60 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : ''
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
