# MLB The Show 26 Season Companion

A free, browser-based companion app for MLB The Show 26 that lets you run a custom 162-game Diamond Dynasty season — replacing one MLB team with your DD squad and playing their full schedule Vs. CPU while the app simulates the rest of the league.

> **Live app:** **[https://theo20185.github.io/MLBTheShow26SeasonCompanion/](https://theo20185.github.io/MLBTheShow26SeasonCompanion/)**

> **Status:** v1 feature-complete — full regular season, full postseason playthrough (game-by-game with lockstep parallel-series simming), bulk sim-ahead options, configurable game length, light/dark mode + role-based squad colors with WCAG AA contrast checks, home park override (any MLB park or a custom name), persistent saves with self-contained import/export, single-level Undo (regular season AND postseason), 245 unit tests + a 1050-run end-to-end playthrough harness for QA.

---

## What this is

You pick one MLB team to replace. Name your Diamond Dynasty squad, set its OVR, and the app:
- Loads that team's actual 2026 schedule (162 games, real opponents, real ballparks, real dates from the official MLB Stats API).
- Tells you what game to play next: opponent, home or away, ballpark to select in The Show, in-sim date and time **in the venue's local timezone** so it matches what The Show shows you.
- Lets you play the game in MLB The Show 26's Diamond Dynasty Vs. CPU mode.
- Accepts your Win/Loss report (or a full box score), then quietly simulates every other game in the league up to the new date — so standings, division races, and wild-card spots stay accurate.
- At season's end, builds the playoff bracket using the full 6-step MLB tiebreaker stack, then walks you through the entire postseason game-by-game with lockstep parallel-series simming — your series and other series in the same round advance together, so you can see how everyone else is doing without it spoiling your own bracket.

It's free, runs in your browser, works offline after the first load, and saves your progress automatically. No signup, no install, no account, no ads, no monetization.

---

## Quick start

1. Open the live app on your phone or tablet.
2. Pick the MLB team your DD squad is replacing.
3. Name your squad, set its OVR, pick your default game length (3 / 5 / 7 / 9 innings).
4. Start playing games one at a time. After each game, tap **W** or **L** — that's it.

---

## The core loop

The Game screen is where you'll spend ~95% of your time:

- **Progress chip** at the top: `Game 47 of 162 · 25-21 · 2nd AL East (-1.5)` — your record and division standing.
- **Game card** in the middle: opponent (with their current W/L), home/away, ballpark to pick in The Show, and the date/time in the **venue's local timezone**.
- **Report Result** button → reveals **W** / **L** buttons. One tap commits and auto-advances to the next game.
- **Sim this game** — for vacations or fatigue. Applies a CPU bias so you're more likely to take the loss; warns you first.
- **Sim ahead…** — bulk-sim options (see below).
- **Undo last game** appears after every report, in case you mis-tapped. Single level deep — undoing only restores the *most recent* report. Works in both regular season and postseason.
- **Full box score** option opens a per-inning entry grid with hits + errors and a Confirm & Save step.

---

## Sim ahead

Want to skip ahead? The "Sim ahead…" link gives you three options, each with a CPU-bias warning since these can't be undone:

- **Sim to All-Star Break** — sims every user game with bias up to the All-Star Break, drops you on the first game after the break.
- **Sim to Postseason** — sims the entire remaining regular season. **Guaranteed playoff slot at the lowest wild-card seed (#6)** — never grants you a Wild Card bye, even if you'd have earned one naturally. The reasoning: opting into bulk sim already skips gameplay, so we don't reward you with a free round.
- **Sim to World Series** — sims everything through the LCS. Force-flips any series you'd have lost so you advance. Drops you at Game 1 of the World Series ready to play.

---

## Postseason

When the regular season ends, the app builds the playoff bracket and walks you through it the same way as the regular season — game by game.

**2026 MLB format:**
- 3 division winners + 3 wild cards per league.
- Top 2 division winners get byes through the Wild Card Series.
- Wild Card Series (best-of-3) → Division Series (best-of-5) → LCS (best-of-7) → World Series (best-of-7).
- Real MLB scheduling formats are honored: WCS 1-1-1, DS 2-2-1 (with travel days), LCS / WS 2-3-2 (with travel days).

**Game times come from real data.** Game start times in your bracket are sampled from the past 5 years of actual MLB postseason games (2021-2025), bucketed by round and home team, then displayed in the venue's local timezone — so a Yankees DS home game gets a typical Yankees DS start time at Yankee Stadium-local, an LA NLCS game gets a typical LA NLCS time at Dodger Stadium-local, etc.

**Lockstep parallel-series simming.** While you're playing your own series, every other active series in the same round advances one game per report. So you watch the rest of the bracket evolve in real time without it being spoiled — you only learn how a series ends when it actually ends.

**Full 6-step MLB tiebreaker stack:** overall winning percentage → head-to-head → intra-division → inter-division → second-half record (All-Star Break = the cutoff) → deterministic fallback (so identical inputs always produce identical brackets). Same stack also picks division winners on ties.

If you have a bye, you'll see a "Bye round" screen with a "Sim the Wild Card Series" button. If you get eliminated, you can sim the rest of the postseason silently to see who wins it all.

---

## Your DD squad identity

When you pick a team to replace, the next step lets you set:
- **Squad name** (default: the team's name — change to "Bombers" or whatever you've named your DD squad).
- **Abbreviation** (2-4 letters, default: the team's abbreviation).
- **OVR** (default: that team's roster OVR — set to your actual DD squad's OVR for accurate sims).
- **Default game length** (3, 5, 7, or 9 innings — match the inning count you use in The Show's Vs. CPU settings).
- **Squad colors** — primary (drives action buttons like Win / Sim / Report) and secondary (drives the nav chips at the top of the Game screen). Defaults to the replaced team's brand palette; pick a different MLB team's palette as a preset, or tap a swatch to fine-tune.
- **Home park** — defaults to the replaced team's actual ballpark. You can pick a different MLB ballpark for your home games, or name a custom park (one you've built and named in The Show). The override shows up on every home game card so the ballpark you see in the app matches the one you picked in The Show.

Your squad name shows up everywhere: the standings table, the schedule view, the game card, the bracket. The MLB team name only shows in places where it's useful for context (e.g., "Continue · Bombers — in for Yankees" on the Home screen).

---

## Settings

Available from the nav bar at the top of the Game screen:

- **Appearance** — toggle between light and dark mode. Defaults to dark. The choice is saved on the season and applies immediately, no reload.
- **Squad colors** — pick any MLB team's palette as a preset, or tap a swatch to choose any color. Primary is for action buttons; secondary is for nav chips. Whatever color you pick, the UI runs it through a WCAG AA contrast check so text and buttons stay readable.
- **Home park** — keep the bundled park, pick a different MLB ballpark, or name a custom park you built in The Show. Updates everywhere a home game appears.
- **Game length** — change the default inning count (3 / 5 / 7 / 9) any time. The full box score panel will validate against this.
- **OVR overrides** — set any team's OVR manually. Base values come from the bundled MLB The Show 26 cards (computed from each team's top 25 player OVRs). Overrides only affect *future* simulations — past results stay as they happened.
- **Export season** — downloads your save as a JSON file with everything embedded (squad identity, colors, theme, home park, schedule, results, bracket, OVR snapshot). Save it somewhere safe; if the browser ever clears site data, this is your only backup.
- **Import season** — load a previously-exported save. Saves are self-contained, so they import cleanly into any future version of the app.
- **Delete season** — start fresh. Only one in-progress season exists at a time; starting a new season after a delete (or via "New Season" on Home) replaces the existing one with a warning.

---

## Schedule and Standings

- **Schedule view** shows your team's full 162 games. Past games show the final score; upcoming games show the opponent's *current* W/L record so you know what you're walking into. Dates display in the venue's local timezone.
- **Standings view** shows AL/NL × East/Central/West tables, with your team highlighted (using your DD squad name). Records use the same tiebreaker stack as the bracket — so the team listed atop your division is always the team that would seed as the division winner.

---

## Save data and your browser

Your save lives in this browser's `localStorage`. That means:
- It's local to this device + this browser. Different browser, different device — different save.
- It's small (~100 KB) so storage isn't a concern.
- It's auto-written after every game report. There's no Save button.
- Index entries that lose their underlying data (from old bugs or manual DevTools tinkering) self-heal on the next visit.
- **It can be wiped if the browser clears site data.** Export occasionally for backup.

---

## Mobile-first

Designed primarily for phones and tablets in both portrait and landscape. All interactive elements have ≥44pt tap targets. Primary actions (Report Result, W/L, Sim, Undo) sit in the lower two-thirds for thumb reach on portrait phones. The dev viewport matrix in CI checks phone portrait, phone landscape, tablet portrait, tablet landscape, and desktop.

---

## FAQ

**Why doesn't my schedule match the real 2026 season?**
It does — every regular-season game comes from the official MLB Stats API. Real opponents, real ballparks, real dates.

**Where do the team OVRs come from?**
Computed from each team's top 25 player OVRs in their MLB The Show 26 live-series roster, fetched from the public Show API at build time. You can override any team's OVR in Settings.

**Why are postseason game times what they are?**
They're sampled from the past 5 years of MLB postseason games (2021-2025), bucketed by (round, home team) so each ballpark gets its typical start times. The data and methodology are in `scripts/analyzePostseasonTimes.ts`.

**Can I sim my own games?**
Yes — there's a "Sim this game" link on the Game card. It applies a CPU-favored bias (your effective OVR drops by 10) so the sim isn't a free win. There's also a Sim ahead… option for bulk sims (to All-Star Break, to Postseason, or to World Series).

**Does this work offline?**
Yes, after the first load. All bundled data (rosters, schedule, ballparks, postseason time history) ships in the JS bundle. There are no runtime API calls.

**Will my season survive an app update?**
Yes. Each season embeds its own OVR snapshot at creation time, frozen for the season's life. New roster updates only affect *new* seasons. Imported saves use their embedded snapshot, ignoring whatever the current app build ships with.

**What happens if I mis-tap W when it should be L?**
Tap **Undo last game** on the next screen — it reverses the report, the league sims, the standings, and (in postseason) any parallel-series sims that ran in lockstep. Brings the game back so you can re-report. Single level only — no undo-the-undo.

**Why is the Athletics shown as "Athletics" with no city?**
That's how MLB and The Show have it for 2026 — the franchise is in transition between Oakland and Las Vegas, currently playing in Sacramento at Sutter Health Park.

**Why is the time on the game card different from what's on my phone's clock?**
The card shows the game time in the **venue's local timezone**, not yours. A Boston home game shows ET; a Dodgers home game shows PT. Matches what you'd select in The Show.

**My DD squad plays at a custom park I named in The Show. Can I show that on the card?**
Yes. In Setup or Settings, set Home park → Custom and type the name. It'll appear on every home game card. Custom parks don't have a real timezone, so game times keep using your replaced team's TZ.

**Can I change the colors / theme mid-season?**
Yes. Settings has Appearance (light/dark) and Squad colors. Both apply immediately and persist across reloads.

---

## For developers

**Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind v4. Vitest 3 + React Testing Library + Playwright for testing. `localStorage` for save state. Deployed to GitHub Pages from `main` via GitHub Actions on every push.

**Run locally:**
```bash
npm install
npm run dev
```

**Run tests:**
```bash
npm test                # unit + component (Vitest)
npm run test:e2e        # end-to-end (Playwright; requires browser install once)
npm run test:playthrough  # 630-run end-to-end harness, --full for 1050
```

**Refresh bundled data** — manual maintenance step, not run in CI:
```bash
npm run fetch:roster    # MLB The Show 26 cards + computed team OVRs
npm run fetch:schedule  # MLB Stats API: 2026 regular-season schedule
npx tsx scripts/analyzePostseasonTimes.ts  # past-5-years postseason start times
```

**Architecture:** the runtime app is a pure function of bundled data + the user's saved Season state. There are no runtime network calls; every bit of MLB data ships in the JS bundle. The `Season` is the single source of truth for save state and is round-trip-serializable to JSON for export/import.

The full design and build plan lives in [`PLAN.md`](./PLAN.md).

245 unit tests + a 1050-playthrough end-to-end harness cover every layer: storage, normalizers, schedule loader, season factory, simulator, standings, tiebreakers, bracket seeding, postseason flow, sim-ahead engine, report/undo, view rendering, theming + WCAG contrast helpers, and the home park override resolver. The harness asserts 9 invariants (conservation of wins/losses, no over-played teams, user state machine, save round-trip, etc.) at every step of every playthrough — caught 5 real bugs during initial development that unit tests missed.

---

## License & acknowledgements

[MIT](./LICENSE).

This is an unofficial fan project. Not affiliated with, endorsed by, or sponsored by **MLB Advanced Media, L.P.**, **Sony San Diego Studio**, or **Major League Baseball**. MLB The Show is a trademark of its respective owners.

Data sources used at build time only:
- [MLB The Show 26 public API](https://mlb26.theshow.com/apis/docs) — player cards, ratings.
- [MLB Stats API](https://statsapi.mlb.com) — official 2026 regular-season schedule, past 5 years of postseason game start times.
