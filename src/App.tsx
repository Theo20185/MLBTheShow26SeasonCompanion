import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './views/Home'

// Top-level router. We use HashRouter because the app is hosted on
// GitHub Pages, which has no server-side rewrite for SPA deep links —
// hash-based routing avoids 404s on direct visits to /#/game etc.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
