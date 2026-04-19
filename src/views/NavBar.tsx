// Shared top-of-screen navigation row. Each item is a tappable button-
// style chip with a 44pt min height (Apple HIG) so they can't be misfired
// next to the primary game card.

import { Link } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  /** Highlight the chip in amber (e.g. "Bracket" during postseason). */
  accent?: boolean
}

export function NavBar({ items }: { items: NavItem[] }) {
  return (
    <nav className="mb-3 grid grid-cols-4 gap-2">
      {items.map((it) => (
        <Link
          key={it.to + it.label}
          to={it.to}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-md border px-2 text-xs font-semibold uppercase tracking-wider active:scale-[0.98] ${
            it.accent
              ? 'border-amber-700 bg-amber-900/40 text-amber-200 hover:bg-amber-900/60'
              : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
