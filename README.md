# MLB The Show 26 Season Companion

A free, browser-based companion app for MLB The Show 26 that lets you run a custom 162-game Diamond Dynasty season — replacing one MLB team with your DD squad and playing their full schedule Vs. CPU while the app simulates the rest of the league.

> **Status: pre-alpha.** This README is the public user guide. It will fill in as features ship — see [`PLAN.md`](./PLAN.md) for the full design plan.

> **Live app:** _coming soon — link will appear here once GitHub Pages deploy is live._

---

## What this is

You pick one MLB team, the app generates that team's real 162-game 2026 schedule, and then it tells you what game to play next: opponent, home or away, ballpark to select in The Show, and the in-sim date. You play the game in MLB The Show 26's Diamond Dynasty Vs. CPU mode, then come back here, tap **W** or **L**, and the app handles everything else — sims the rest of the league, updates standings, advances the calendar, and queues your next game.

It's free, runs in your browser, works offline after the first load, and saves your progress automatically. No signup, no install, no account.

---

## Quick start

1. Open the live app link (above) on your phone or tablet.
2. Pick the MLB team you want your DD squad to replace.
3. Start playing through your schedule, one game at a time.

That's it. There's nothing to install, no account to create, no save file to manage. Your progress is saved automatically on your device after every game.

---

## The core loop

_Annotated screenshots will go here once the Game screen ships (build phase 6)._

For now, a quick description: the Game screen shows your next game (opponent, home/away, ballpark, date). Play it in The Show, then tap **Report Result** → **W** or **L**. The app auto-advances to your next game and sims everything else in the league silently.

---

## Reading the game info

_To come — explains every field on the Game card and how to use the ballpark info when setting up Vs. CPU in The Show._

---

## Settings

_To come — covers OVR overrides, Update Roster Data, Export/Import saves, multi-save management, and the "frozen at creation" snapshot rule._

---

## Standings & Postseason

_To come — explains the progress chip, the tiebreaker stack in plain English, and how the playoff bracket plays out._

---

## Save data and your browser

_To come — explains `localStorage` in user-friendly terms, the browser-wipe risk, and why exporting a save occasionally is a good habit._

---

## FAQ

_To come — answers the common questions: real schedule? sim my own games? offline? survives app updates?_

---

## For developers

This is a static front-end app. No backend, no server.

**Stack:** React + TypeScript + Vite + Tailwind. Vitest + React Testing Library + Playwright for testing. `localStorage` for save state. Deployed to GitHub Pages from `main`.

**Run locally:**
```bash
npm install
npm run dev
```

**Run tests:**
```bash
npm test
```

**Refresh bundled data** (rosters, schedule) — manual maintenance step:
```bash
npm run fetch:roster
npm run fetch:schedule
```

The full design and build plan lives in [`PLAN.md`](./PLAN.md).

---

## License & acknowledgements

[MIT](./LICENSE).

This is an unofficial fan project. Not affiliated with, endorsed by, or sponsored by **MLB Advanced Media, L.P.**, **Sony San Diego Studio**, or **Major League Baseball**. MLB The Show is a trademark of its respective owners.

Data sources used at build time only:
- [MLB The Show 26 public API](https://mlb26.theshow.com/apis/docs) — player cards, ratings, stadiums.
- [MLB Stats API](https://statsapi.mlb.com) — official 2026 regular-season schedule.
