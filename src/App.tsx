import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './views/Home'
import { Setup } from './views/Setup'

// Top-level router. We use HashRouter because the app is hosted on
// GitHub Pages, which has no server-side rewrite for SPA deep links —
// hash-based routing avoids 404s on direct visits to /#/game etc.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/game" element={<GameStub />} />
      </Routes>
    </HashRouter>
  )
}

// Phase 6 will replace this with the real Game screen.
function GameStub() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-900 text-slate-100">
      <p>Game screen lands in phase 6.</p>
    </main>
  )
}
