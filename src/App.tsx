import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './views/Home'
import { Setup } from './views/Setup'
import { Game } from './views/Game'
import { Schedule } from './views/Schedule'
import { Standings } from './views/Standings'
import { Settings } from './views/Settings'

// Top-level router. We use HashRouter because the app is hosted on
// GitHub Pages, which has no server-side rewrite for SPA deep links —
// hash-based routing avoids 404s on direct visits to /#/game etc.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/game" element={<Game />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </HashRouter>
  )
}
