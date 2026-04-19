# MLB The Show 26 Season Companion

A free, browser-based companion app for MLB The Show 26 that lets you run a custom 162-game Diamond Dynasty season — replacing one MLB team with your DD squad and playing their full schedule Vs. CPU while the app simulates the rest of the league.

> **Live app:** **[https://theo20185.github.io/MLBTheShow26SeasonCompanion/](https://theo20185.github.io/MLBTheShow26SeasonCompanion/)**

> **Status:** v1 functional — full regular-season loop, simulator, standings, settings, and a basic postseason bracket are all live. Game-by-game postseason playthrough with lockstep parallel-series simming is a planned follow-up enhancement.

---

## What this is

You pick one MLB team. The app:
- Loads that team's actual 2026 schedule (162 games, real opponents, real ballparks, real dates).
- Tells you what game to play next: opponent, home or away, ballpark to select in The Show, and the in-sim date.
- Lets you play the game in MLB The Show 26's Diamond Dynasty Vs. CPU mode.
- Accepts your Win/Loss report, then quietly simulates every other game in the league up to the new date — so standings, divisions, and wild-card races stay accurate the whole way.
- At season's end, builds the playoff bracket using the official MLB tiebreaker stack (with a small simplification: "second-half record" uses the All-Star break as the cutoff).

It's free, runs in your browser, works offline after the first load, and saves your progress automatically. No signup, no install, no account.

---

## Quick start

1. Open the live app on your phone or tablet.
2. Pick the MLB team your DD squad is replacing.
3. Start playing games one at a time. After each game, tap **W** or **L** — that's it.

---

## The core loop

The Game screen is where you'll spend ~95% of your time:

- **Progress chip** at the top: `Game 47 of 162 · 25-21 · 2nd AL East (-1.5)` — your record and division standing.
- **Game card** in the middle: opponent, home/away, ballpark to pick in-game, in-sim date.
- **Report Result** button → reveals **W** / **L** buttons. One tap commits and auto-advances.
- **Sim this game** (small link below) — for vacations or fatigue. Applies a CPU bias so you're more likely to take the loss; warns you first.
- **Undo last game** appears after every report, in case you mis-tapped. One level deep — undoing only restores the *most recent* report.
- **Full box score** option opens a per-inning entry grid with hits + errors + a Confirm & Save step (the only place the app asks for confirmation, since you've entered many fields).

---

## Settings

Available in the drawer at the top of the Game screen:

- **OVR overrides** — set any team's OVR manually. The base values come from the bundled MLB The Show 26 cards (computed from the top 25 player OVRs). Overrides only affect *future* simulations — past results stay as they happened.
- **Export season** — downloads your save as a JSON file. Save it somewhere safe; if the browser ever clears site data, this is your only backup.
- **Import season** — load a previously-exported save. Saves are self-contained (they embed their own OVR snapshot), so they import cleanly into any future version of the app.
- **Delete season** — start fresh.

---

## Schedule and Standings

- **Schedule view** shows your team's full 162 games. Past games show the final score; upcoming games show the opponent's *current* W/L record so you know what you're walking into.
- **Standings view** shows AL/NL × East/Central/West tables, with your team highlighted. Records come from the same source as everywhere else in the app — no risk of seeing different numbers on different screens.

---

## Postseason

When the regular season ends, the **Begin Postseason** button takes you to the bracket. The 2026 MLB format applies:
- 3 division winners + 3 wild cards per league.
- Top 2 division winners get byes.
- Wild Card Series (best-of-3) → Division Series (best-of-5) → LCS (best-of-7) → World Series (best-of-7).

Seeding uses the full 6-step MLB tiebreaker stack: overall winning percentage → head-to-head → intra-division → inter-division → second-half record → deterministic fallback (so identical inputs always produce identical brackets).

---

## Save data and your browser

Your save lives in this browser's `localStorage`. That means:
- It's local to this device + this browser. Different browser, different device — different save.
- It's small (~100 KB) so storage isn't a concern.
- It's auto-written after every game report. There's no Save button.
- **It can be wiped if the browser clears site data.** Export occasionally for backup.

---

## FAQ

**Why doesn't my schedule match the real 2026 season?**
It does — every game comes from the official MLB Stats API. Real opponents, real ballparks, real dates.

**Where do the team OVRs come from?**
They're computed from the top 25 player OVRs in each team's MLB The Show 26 live-series roster, fetched from the public Show API at build time. You can override any team in Settings.

**Can I sim my own games?**
Yes — there's a "Sim this game" link on the Game screen. It applies a CPU-favored bias (your effective OVR drops by 10) so the sim isn't a free win. There's a confirmation modal explaining this. (Honestly, the whole thing is self-reported anyway — this is just a nudge.)

**Does this work offline?**
Yes, after the first load. All bundled data (rosters, schedule, ballparks) ships in the JS bundle. There are no runtime API calls.

**Will my season survive an app update?**
Yes. Each season embeds its own OVR snapshot at creation time, frozen for the season's life. New roster updates only affect *new* seasons. Imported saves use their embedded snapshot, ignoring whatever the current app build ships with.

**What happens if I mis-tap W when it should be L?**
Tap **Undo last game** on the next screen — it reverses the report, the league sims, and the standings, and brings the game back. Single level only (no undo-the-undo).

**Why is the Athletics shown as "Athletics" with no city?**
That's how MLB and The Show have it for 2026 — the franchise is in transition between Oakland and Las Vegas, currently playing in Sacramento at Sutter Health Park.

---

## For developers

**Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind v4. Vitest 3 + React Testing Library + Playwright for testing. `localStorage` for save state. Deployed to GitHub Pages from `main` via GitHub Actions.

**Run locally:**
```bash
npm install
npm run dev
```

**Run tests:**
```bash
npm test          # unit + component
npm run test:e2e  # end-to-end (requires playwright install once)
```

**Refresh bundled data** — manual maintenance step, not run in CI:
```bash
npm run fetch:roster    # MLB The Show 26 cards + computed team OVRs
npm run fetch:schedule  # MLB Stats API: 2026 regular-season schedule
```

The full design and build plan lives in [`PLAN.md`](./PLAN.md).

149 tests cover every layer: storage, normalizers, schedule loader, season factory, simulator, standings, tiebreakers, bracket seeding, report/undo flow, and view rendering.

---

## License & acknowledgements

[MIT](./LICENSE).

This is an unofficial fan project. Not affiliated with, endorsed by, or sponsored by **MLB Advanced Media, L.P.**, **Sony San Diego Studio**, or **Major League Baseball**. MLB The Show is a trademark of its respective owners.

Data sources used at build time only:
- [MLB The Show 26 public API](https://mlb26.theshow.com/apis/docs) — player cards, ratings, stadiums.
- [MLB Stats API](https://statsapi.mlb.com) — official 2026 regular-season schedule.
