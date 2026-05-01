# MLB The Show 26 Season Companion — Project Plan

A front-end-only web app that lets MLB The Show 26 players run a custom 162-game Diamond Dynasty season, replacing one MLB team and playing that team's full schedule Vs. CPU while the app simulates the rest of the league.

## 1. Goals & Constraints

- **Front-end only.** No backend, no server. All logic runs in the browser. Deployed as a static site to **GitHub Pages** from the public repo (see §11) — anyone with the URL can use it without installing anything.
- **Offline-first.** No runtime network dependency. Every feature must work with zero network once the app is loaded. External APIs are only used at build time to fetch data that gets committed into the repo (see §5.1).
- **Persistence on device.** Seasons are long; users will come back across many sessions. State survives browser restarts.
- **Companion, not replacement.** The actual baseball is played in-game (Vs. CPU in Diamond Dynasty). The app tracks schedule, simulates the rest of the league, manages standings, and runs the postseason bracket.
- **Mobile-first (phone + tablet, portrait + landscape).** Primary form factors are portrait phone (360–430px wide), landscape phone, portrait tablet, and landscape tablet — covering the 360–1024px range deliberately. Users are physically next to their console/TV and may use either a phone in hand or a tablet on the couch. The Mini Seasons–style UX (§7) is shaped for one-handed phone use as the baseline; tablet layouts get explicit attention so the single-card screens don't look stranded in a sea of whitespace, and landscape layouts reflow rather than just stretch. Desktop (>1024px) is supported as a graceful scale-up but not a design target.

## 2. Tech Stack

- **Framework:** React (user preference).
- **Language:** TypeScript — the domain (teams, games, standings, playoff brackets) is data-heavy and benefits strongly from types.
- **Build tool:** Vite — fast dev server, simple static output, easy to host anywhere (or run fully local via `file://` / a PWA).
- **Styling:** Tailwind CSS — fast iteration for a data-display-heavy UI. Classes are written **mobile-first**: base utilities target the phone viewport, and `sm:` / `md:` / `lg:` modifiers layer on enhancements for larger screens. Never the inverse.
- **State:** React Context + reducers for season state; Zustand if complexity grows. Keep it simple — this is a single-user local app.
- **Persistence:** `localStorage`. The large data (player cards, teams, ballparks) is bundled as static JSON at build time — it doesn't need persistence. Actual user save state (season metadata, user's 162-game schedule, per-team W/L records, head-to-head matrix, playoff bracket, OVR overrides) is well under 100KB and fits `localStorage` comfortably. Provide JSON export/import for manual backup and cross-device transfer.
- **PWA (stretch):** Service worker + manifest so it installs and runs fully offline.
- **Testing:** Vitest for unit/logic tests, React Testing Library for component tests, Playwright (or Vitest browser mode) for end-to-end flows. See Section 3 — all work is test-driven.

## 3. Development Process — Test-Driven Development

**All development is test-driven. No implementation phase is "done" until its tests exist, run, and pass.**

### 3.1 The loop

For every unit of work, the order is:
1. **Write failing tests first** that describe the behavior we want.
2. Run them and confirm they fail for the right reason (not a typo, not a missing import).
3. **Implement** the smallest change that makes the tests pass.
4. Run the full suite — new tests green, no regressions elsewhere.
5. Refactor with the tests still green.

A feature is not considered complete until its tests ship with it. No "I'll add tests later." No merging or declaring a phase done on unverified code.

### 3.2 What "everything needs to work" means per feature

Every user-facing feature needs tests at **three layers**, proportional to what the feature actually touches:

- **Render / presence test** — the UI element shows up on the correct page/route, in the correct state.
- **Interaction / persistence test** — user input is accepted, validated, and stored on the correct model in the correct shape, including round-tripping through `localStorage` (jsdom provides it natively in tests).
- **Integration / logic test** — downstream logic (simulation, standings, schedule, next-game view, etc.) actually reads the new value and behaves differently because of it.

**Worked example — custom OVR override wheel for a team:**
1. *Render test:* the number wheel component renders on the Settings → Teams page for the selected team, pre-filled with the current OVR.
2. *Input/persistence test:* changing the wheel value and confirming writes the new OVR into the persisted season's OVR-overrides map in `localStorage`, and re-reading that season returns the overridden value.
3. *Logic test:* the league simulator, when computing `P(homeWin)` for a game involving that team, uses the overridden OVR — not the bundled default. A sim run before and after the override produces a measurably different win probability for that team.

If any of those three are missing, the feature is not done.

### 3.3 Testing tools & conventions

- **Vitest** for unit and component tests.
- **React Testing Library** for component render + interaction tests. Query by role/label, not by implementation detail.
- **jsdom** (Vitest's default env) provides `localStorage` in tests out of the box — no extra persistence-mocking dependency needed.
- **Playwright** (or Vitest browser mode) for a small number of true end-to-end smoke tests on the core loop (setup season → report game → standings update → next game shown). E2E tests run across a **multi-viewport matrix** that reflects the design targets:
  - phone portrait (390×844 / iPhone 14)
  - phone landscape (844×390)
  - tablet portrait (768×1024 / iPad mini)
  - tablet landscape (1024×768)
  - desktop (1280×800) — included as a regression catch, not the primary check
  At least one viewport per orientation runs against the core loop in CI. Phone portrait is the baseline assertion target; the others verify nothing breaks (no horizontal scroll, all primary actions reachable, no wasted whitespace large enough to look broken).
- **Deterministic RNG in tests.** Simulation is seeded; simulation tests pin the seed so results are reproducible.
- **Test file colocation:** `foo.ts` + `foo.test.ts` side by side. E2E tests under `e2e/`.

### 3.4 CI gate

`npm test` runs the full suite (unit + component + persistence) and must pass before any phase is marked complete. Aim for fast feedback — the full unit/component suite should run in a few seconds so the TDD loop stays tight.

## 4. Core Domain Model

```
Team  (static, bundled — never persisted)
  id          — 3-letter abbreviation, e.g. "BAL", "NYY", "LAD". Used everywhere internally and in exported saves; human-readable
  name, city
  league (AL | NL), division (East | Central | West)
  homeParkId
  baseOvr     — computed once at build time from bundled player OVRs (see §5.1)
  mlbStatsId  — numeric id from the MLB Stats API; only used to join external schedule data, never as a primary key in our code
  showShortName — 3-letter abbrev as it appears in The Show API; usually identical to id but kept separate in case of edge cases (e.g., relocations, name changes)

Ballpark  (static, bundled)
  id, name, city, teamId

Season  (persisted)
  id, year, userTeamId, startDate, currentDate
  status: setup | regular | postseason | complete
  rngSeed                                — current position in the deterministic RNG stream (advances as sims run; restored on Undo). OVR overrides do NOT touch this — they're sim inputs, not stream consumers (see §6.5)
  baseOvrSnapshot: { [teamId]: number } — **all 30 teams' base OVRs at season creation**, copied from `Team.baseOvr` in the bundle at that moment. Frozen for the season's life. Embedded in exports so saves are portable across app versions (see §6.8)
  ovrOverrides: { [teamId]: number }    — sparse; user edits live here, layered on top of `baseOvrSnapshot`
  rosterSnapshotId                       — the bundled roster id this season was created against; metadata/label only (the actual OVR data lives in `baseOvrSnapshot`). Frozen for the life of the season
  lastSnapshot?: PreReportSnapshot      — state just before the most recent game report; see §6.4

PreReportSnapshot  (single-level undo, overwritten on each report)
  gameId                                 — the user game whose report is undoable
  currentDate, rngSeed                   — pre-report values
  teamRecords: TeamRecord[]              — pre-report standings for all 30 teams
  headToHead: HeadToHead                 — pre-report H2H matrix
  priorResult?: Game['result']           — if we're undoing a re-report on an already-played game (rare; mostly `undefined`)

Game  (persisted only when it's a user game or a playoff game)
  gamePk          — from MLB Stats API for regular season; synthetic id for postseason
  seasonId, date, scheduledTime
  homeTeamId, awayTeamId, parkId
  kind: userRegular | postseason
  status: scheduled | played
  result?: { homeScore, awayScore, quick: boolean, simmed: boolean, detail?: BoxScore }
      simmed=true when the user chose "Sim this game" (§6.3); false when the user reported the result themselves

BoxScore (full report only)
  inningsHome[], inningsAway[]
  hitsHome, hitsAway, errorsHome, errorsAway

TeamRecord (persisted, one per team per season)
  teamId
  firstHalfWins, firstHalfLosses       — games before the All-Star break
  secondHalfWins, secondHalfLosses     — games after the All-Star break
  divisionWins, divisionLosses         — for tiebreakers; also split first/second half? no — single aggregate is enough
  (total wins/losses are derived: firstHalf + secondHalf)

HeadToHead (persisted, sparse 30×30)
  [teamIdA][teamIdB] = wins of A over B
  (only needs to hold the diagonal's two halves; tiebreakers read it)

Standings (derived from TeamRecord + HeadToHead, never persisted)
  winPct, gamesBack, divisionRank, wildCardRank

PlayoffBracket
  wildCardSeries[], divisionSeries[], championshipSeries[], worldSeries
  each with teams, games (full Game records — user might play them), status
```

**Persistence rule of thumb:** only persist what the user created. The user's 162 games and their results *are* the save — they're the only per-game rows we keep. Non-user games are simulated and folded into `TeamRecord` + `HeadToHead`, then discarded. The full 2026 schedule lives in the bundled `schedule2026.json` (§5.1) as reference data — standings math may read from it to know which teams played on which dates, but sim'd game outcomes are never stored.

## 5. Bundled Static Data

Shipped with the app (no network at runtime):

- **Teams:** all 30 MLB teams with league/division, city, abbreviation.
- **Ballparks:** each team's home park with name. Sourced from the MLB The Show 26 API `items.json?type=stadium` at build time; hand-curated fallback committed in the repo.
- **Team OVRs:** computed from per-player OVRs pulled from the MLB The Show 26 API (see 5.1). User can override/update via a settings screen so roster updates and mid-season edits are always possible.
- **Player roster snapshot (optional use):** per-team player list with `ovr`, position, jersey, handedness. Bundled for display and potential future stat/simulation enrichment.
- **2026 MLB schedule:** the actual regular-season schedule fetched from the MLB Stats API at build time (see 5.1). Committed JSON drives the entire season — we do not generate a synthetic schedule.

### 5.1 Build-time Data Pipeline

Two public data sources are used **only at build time**, never at runtime. The app always reads committed JSON.

**Source A — MLB The Show 26 API (rosters, OVRs, stadiums).** Endpoints (`GET`, no auth):
- `/apis/items.json?type=mlb_card&page=N` — paginated list of every MLB card (`uuid`, `name`, `rarity`, `team`).
- `/apis/item.json?uuid=...` — full card detail: **`ovr`**, `team`, `team_short_name`, `display_position`, attributes, quirks, etc.
- `/apis/items.json?type=stadium&page=N` — ballparks.
- `/apis/roster_updates.json` — list of roster update snapshots (id + date). Used to tag the bundled snapshot.
- `/apis/roster_update.json?id=...` — deltas since a prior snapshot (`attribute_changes`, `position_changes`, `newly_added`). Useful for the optional in-app "update roster data" flow.

*Skipped (documented but not useful):* Captains, Player Search (user accounts, not baseball players), Meta Data, Game History / Game Log, Inventory, Listing(s).

**Source B — MLB Stats API (the official 2026 schedule).** `statsapi.mlb.com` is MLB Advanced Media's public API.
- `GET https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=2026-03-25&endDate=2026-10-02&gameType=R`
- Per-game fields we keep: `gamePk`, `officialDate`, `gameDate` (ISO 8601 UTC), `teams.home.team.id`, `teams.away.team.id`, `venue.id`, `venue.name`, `doubleHeader`.
- `gameType=R` filter excludes spring training, All-Star, and postseason (we generate our own playoffs from final standings).
- Joined to our internal teams via `src/data/teamIdMap.ts` — a single source of truth keyed by our 3-letter abbreviation (`Team.id`), with `mlbStatsId` and `showShortName` columns. The schedule fetcher uses `mlbStatsId` to look up rows; the roster fetcher uses `showShortName`.

**Pipeline:**
1. `scripts/fetchRosterData.ts` — pulls cards + stadiums + latest roster update id from The Show API.
2. `scripts/fetchSchedule.ts` — pulls the 2026 regular-season schedule from the MLB Stats API.
3. Both paginate politely, retry on failure, cache raw responses to disk under `scripts/.cache/` for fast reruns.
4. Normalize into `src/data/teams.json`, `src/data/ballparks.json`, `src/data/players.json`, `src/data/rosterSnapshot.json`, `src/data/schedule2026.json` (each with `fetchedAt` and source-version metadata).
5. Committed to the repo. The app imports these at build time — runtime never hits the network.

**Team OVR derivation (no team-OVR endpoint exists):**
- Default formula: average OVR of a team's top 25 players. Alternate: weighted average of top 8 pitchers (rotation + closer) and top 12 position players. The chosen formula lives in one function with tests pinning expected outputs for a known input set, so we can tune it later without fear.
- User override in Settings always wins and is stored per team on the `Team` record (or per-season override on `Season`).

**Optional in-app refresh (non-blocking, opt-in, bulk-override model):**
- Settings → "Update Roster Data" button. Fetches the latest roster update at runtime if online, computes new team OVRs from the incoming player data, and on user confirmation writes them as **bulk entries into `season.ovrOverrides`**. `season.rosterSnapshotId` never changes — the season is frozen against its original snapshot for life.
- This mirrors how Mini Seasons works: a season is locked to the roster snapshot it was created with, regardless of later roster updates shipped by the game. Explicit, predictable, and stable across app updates.
- Consequence (accepted): no automatic simulation of mid-season trades, injuries, or roster churn. This is a DD game-series mode, not a Franchise simulator.
- Silent no-op when offline. Never required — the bundled snapshot is always sufficient.
- After writing bulk overrides, the user can still edit individual team OVRs in Settings (the per-team override UI writes to the same `ovrOverrides` map).

## 6. Feature Breakdown

### 6.1 Setup (Team Picker + Squad Identity)
Two-step flow.
- **Step 1 — Pick the MLB team to replace.** Grid of 30 MLB teams. User taps one → continue. Team selection locks the user's league, division, and their 162-game schedule (pulled from the bundled 2026 schedule — see 6.2).
- **Step 2 — Name your DD squad.** Squad name (default: the team's name), 2-4 letter abbreviation (default: the team id), squad OVR (default: the bundled team OVR), default game length (3 / 5 / 7 / 9), squad colors (defaults to the replaced team's brand palette — primary + secondary; see §6.9), home park (default / pick another MLB park / custom name; see §6.9).
- **Season always starts at opening day** (in-sim `currentDate` = the first real 2026 game date for that team). The app does not skip ahead to the real-world date; the user replays the full season from the beginning. Confirmed design decision.
- OVR editing in setup is intentional (it's the squad's defining stat). Per-team OVR overrides for the *other 29* teams live in Settings.
- On confirm: build the `Season` record (with `userSquad` populated from step 2), filter the bundled schedule to this team's 162 games, initialize `TeamRecord[]` (0-0 for all 30) and `HeadToHead` (zeros), save to `localStorage`, jump straight to the Game screen.

### 6.2 Schedule Loader (not a generator)
- Bundled `src/data/schedule2026.json` contains every 2026 regular-season game (from the MLB Stats API — see 5.1). There is no schedule generation at runtime.
- On season start: filter to games where the user's team is home or away → 162 games. Persist these as the user's schedule (only these are stored per-game; non-user games are folded into records/H2H as they sim).
- Handles doubleheaders and off-days correctly by virtue of using the real schedule.
- Tests: integrity assertion on the committed JSON (~2,430 team-slots, 81 home + 81 away for every team, venue resolves, every team in every division appears, no duplicate `gamePk`).

### 6.3 Game Screen (primary UX, Mini Seasons–style)
The app's home base — where the user spends 95% of their time. Single-screen, linear.

**Top strip (progress context):**
- `Game 47 of 162 · 25-21 · 2nd AL East (-1.5)` — compact chip so the user always knows where they stand.

**Big card (the thing to play):**
- **vs. Texas Rangers** (home) or **@ Texas Rangers** (away) — user perspective.
- **Ballpark name** — what to pick in-game.
- **April 22, 2026 · 7:05 PM ET** — in-sim date and time for flavor (from the real schedule).
- Team logos + **current** records of both teams, read live from `TeamRecord` at render time.

**Primary action — Report Result:**
- Tapping **Report Result** reveals the report panel with two modes:
  - **Quick mode (default):** large **W** and **L** buttons with optional final-score inputs. Small helper text reads: *"Tap W or L to commit this result now. Want to log innings, hits, and errors? Open Full box score below."*
    - Tapping **W** or **L** **commits immediately** — no confirmation modal. Auto-advances. Undo (§6.3) catches any misclick.
  - **Full box score (opt-in):** a "Full box score" toggle expands per-inning run entry for both teams + hits + errors. When this panel is open, the top W / L commit buttons are **replaced** by a single **Confirm & Save** button. W/L is inferred from the final totals. Helper text reads: *"Review your entries and tap Confirm & Save to commit."*
    - Confirm & Save requires the score to be internally consistent (inning sum == total runs per side, at least 9 innings unless user marks it as a shortened game).
    - This confirm step exists only in box-score mode — the user is entering many numbers and should be able to review before commit. The same Undo applies afterward.

**Secondary action on the card — Sim this game:**
- A small, de-emphasized "Sim this game" link under the Report Result button. Lets the user skip playing when life gets in the way (vacation, long season fatigue).
- Tapping it shows a **one-time warning modal**: *"Simming will apply a CPU-favored bias — you're more likely to take the loss. Everything's self-reported anyway; this is just a nudge toward actually playing. Continue?"* with Cancel / Sim buttons. This is an acceptable exception to "no confirmation modals" because the consequence (biased outcome) is non-obvious.
- On confirm: the league simulator (§6.5) runs this one game in **user-disadvantage mode** — the user team's effective OVR is reduced by a tunable `userSimPenalty` (default `-10`) for this roll only. Result is recorded like a played game (status: `played`, `quick: true`, with a flag `simmed: true` so standings can split it out per §6.6).
- After confirming, the rest of the post-report flow (currentDate advance, league sim, next game, toast) runs exactly as if the user had reported normally.

**Post-report transition (confirmed: auto-advance with fading toast):**
- On report, the app: writes a `lastSnapshot` (§4) capturing pre-report state, advances `currentDate` past this game, sims all other league games up to the new `currentDate`, updates `TeamRecord` + `HeadToHead`, and **immediately shows the next game screen**.
- A fading toast appears briefly over the new screen: `"April 22 → April 25 · 18 league games simmed"` and vanishes after ~2 seconds. The user can keep playing through it; no tap required.
- If the user's standings position changed meaningfully (division lead gained/lost, wild-card in/out), the toast mentions it.

**All-Star break (no interstitial screen, just a longer-lived toast):**
- When `currentDate` advances across a gap of ≥2 consecutive days with no scheduled games anywhere in the league (the real 2026 schedule has one such gap — mid-July), the fading toast is replaced by a slightly longer one: `"All-Star Break · July 14–16 · Resuming July 17"`. No extra taps required; the next game screen is already showing.
- We don't model the All-Star Game itself. DD cards can't be routed into it and there's no voting sim — the break is purely a calendar acknowledgement.
- Detected automatically by gap length in the bundled schedule, so no hardcoded dates.

**Undo (persistent, single-level):**
- A small **Undo last game** link is visible on the Game screen whenever `lastSnapshot` exists. No timer — it stays until the user reports the next game, at which point the snapshot is overwritten.
- Tapping Undo restores `currentDate`, `TeamRecord[]`, `HeadToHead`, `rngSeed`, and flips the most recently reported user game back to `scheduled` (clearing its `result`). The screen returns to showing that game as the next one to play.
- Undo is about fixing a single misclicked report (tapped W when it was L). It only reverts game reports — OVR overrides, team-picker decisions, and settings changes are not undoable.
- Minimal recalc: the league sims that ran between the old `currentDate` and the new one are replayed deterministically from the restored `rngSeed` the next time the user reports — not proactively, so Undo is essentially instant.

**Secondary actions** — header menu / drawer, not on the main card:
- Standings, Full Schedule (the user's 162 games — past results + upcoming), Settings (OVR overrides, export/import save, reset).

### 6.4 Report Result
Two paths, with different commit UX (both surfaced on the Game screen per §6.3):
- **Quick report:** one tap on W or L commits immediately (no confirm modal). Optional final-score inputs. Also writes the CPU opponent's L / W so their record stays correct. Undo (§6.3) handles misclicks.
- **Full report:** runs per inning for both sides, hits, errors. Requires a **Confirm & Save** tap because the user has entered many fields and needs to review. W/L is inferred from inning totals. Saved as a full `BoxScore`. Validation: per-side inning sum must equal total runs; minimum 9 innings unless user marks the game as shortened.

After reporting, the app:
- Writes `season.lastSnapshot` with pre-report `currentDate`, `rngSeed`, `TeamRecord[]`, and `HeadToHead` — exactly one snapshot; any previous snapshot is discarded.
- Advances `currentDate` past the user's game.
- Simulates every other league game scheduled on/before the new current date (see 6.5).
- Recomputes standings (derived, not persisted).
- Points at the next user game. The **Undo** affordance (see §6.3) is now live.

### 6.5 League Simulator
- Runs for every non-user game up to `currentDate`, and for any user game the user chose to sim via §6.3's "Sim this game" action.
- Model: `P(homeWin) = (homeOVR ^ k) / (homeOVR ^ k + awayOVR ^ k) + homeFieldBonus`, tuned so a team with a meaningful OVR edge wins ~55–60% of the time, matching real MLB variance. `k` is a tunable "how much OVR matters" exponent.
- **User-disadvantage mode** (opt-in, only when the user explicitly sims their own game): the user team's effective OVR is reduced by `userSimPenalty` (default `-10`) for that single roll. Applied via the same probability function — no separate code path.
- Roll RNG → decide winner. Generate a plausible final score (simple distribution — no need for full box score unless we want flavor).
- **Recording the result:** writes W/L to the winner's and loser's `TeamRecord`, routing to `firstHalf*` or `secondHalf*` counters based on whether the game date falls before or after the All-Star break (detected from the bundled schedule; see §6.3). Also updates `divisionWins/Losses` if both teams are in the same division, and increments `HeadToHead[winnerId][loserId]`.
- Deterministic given a seed stored on the season, so re-running simulation on the same state produces the same results (debuggability and undo).

**Determinism invariant — OVR changes don't shift the RNG stream:**
- `Season.rngSeed` tracks the current position in the deterministic RNG stream. Each sim call reads N values and advances the seed; nothing else does.
- OVRs (whether base, per-team override, or bulk-overridden via Update Roster Data) are *inputs* to the probability function, not stream consumers. Changing an OVR shifts the threshold a roll is compared against — it does not change the roll itself.
- Consequence the user sees: a mid-season OVR change biases future sims toward the new OVR, but the random "noise" pattern stays the same. A team that was about to get lucky over the next 10 games would still be roughly "lucky" with the new OVR — outcomes just move by the OVR delta.
- Past sims are never re-computed after an override. Their results are baked into `TeamRecord` and `HeadToHead`. Overrides only affect the next sim call forward.
- This invariant is what makes Undo + replay produce identical downstream state, even if the user opened Settings between the original report and the undo.

### 6.6 Standings & Stats
- AL/NL × East/Central/West tables.
- Wild card standings.
- User team record split: games the user actually played vs. games they chose to sim (via §6.3's "Sim this game"). Shown as `45-32 (39 played · 6 simmed)` or similar. Makes it honest without nagging.

### 6.7 Postseason

**Format.** 2026 MLB bracket: 3 division winners + 3 wild cards per league. Top 2 division winners get byes. #3 division winner + 3 wild cards play the Wild Card Series (best-of-3) → Division Series (best-of-5) → LCS (best-of-7) → World Series (best-of-7).

**Seeding and tiebreakers** (applied in order; first to resolve wins):
1. Overall winning percentage (`firstHalfWins + secondHalfWins` / total).
2. Head-to-head winning percentage (from `HeadToHead`).
3. Intradivision record (from `TeamRecord.divisionWins/Losses`).
4. Interdivision record (derived: total wins − division wins).
5. Second-half winning percentage (`secondHalfWins` / second-half games). This is the "last half of the season" tiebreaker — we use the All-Star break as the cutoff, which is a small semantic simplification of MLB's rule but far more intuitive.
6. Deterministic fallback: `hash(tiedTeamIds, season.rngSeed) mod N` so the same inputs always yield the same order across replays and undos.

Division-winner designation uses the same stack — if two division rivals finish tied, tiebreakers decide which is the division winner and which is a wild card.

**Transition into postseason.** After the user reports their 162nd regular-season game, a **Final Standings + Bracket Reveal** screen shows league champs, division winners, wild cards, byes, and round-1 matchups. One button: **Begin Postseason** (or **Sim to World Series** if the user's team missed the playoffs).

**Game screen in postseason.** Same layout, same report UX, same Undo, same "Sim this game" action. Differences:
- Progress chip reformats in a dramatic Mini Seasons–style voice: `WCS · Game 2 · Yankees lead 1-0 · Win today to survive`, `ALCS · Game 7 · Tied 3-3 · Winner goes to the World Series`, etc. Specific phrasing is a content concern — the structure is: round · game number · series state · stakes line when dramatic.
- Date/time is synthesized (our bundled schedule is regular-season only via `gameType=R`). Assign plausible consecutive days with an off-day for travel between cities.
- Ballpark: higher seed hosts games 1, 2 (and 6, 7 for best-of-7). Lower seed hosts 3, 4, (5).
- `Game.kind` is `postseason`. Synthetic `gamePk` namespace; persisted only because the user plays them.

**Lockstep parallel-series simming (confirmed).** While the user is playing through their own series, every other active series in the same round sims one game per user report — so round 1 advances across all series in lockstep.
- Example: user reports Game 1 of their ALDS → app sims Game 1 of the other ALDS and both NLDS Game 1s. User reports Game 2 → app sims Game 2 of each parallel series. Series that end early (e.g., sweep) stop advancing for that series; others keep going.
- When the user's series ends, any still-unfinished parallel series auto-complete silently during the transition to the next round — results appear in the Bracket view but aren't spoiled via toast.
- Lockstep reveal lets the user see partial results (game-by-game) for parallel series as they play, without knowing the final outcome until they reach it themselves.

**Between series.** A brief **Bracket transition screen** shows the updated bracket and who advanced. One tap to continue.

**Bracket drawer entry.** During postseason, the drawer's **Full Schedule** entry is replaced by **Bracket** — the visual bracket is always one tap from the Game screen.

**User eliminated.** If the user loses their series mid-postseason, show a "Your season is over" screen with their postseason path and final record. Options: **Sim to World Series** (finishes out the rest silently, shows the champion) or **Start New Season**.

**On World Series finish.** Season is marked `complete`. User lands on the Season Complete results screen (§7.1 step 5). Starting a new season is available from there.

### 6.8 Persistence & Save Management
- `localStorage` is source of truth for user save state.
- One key per season (e.g., `season:<id>`), plus an index key listing saved seasons so we can support multiple saves.
- **Auto-save after every game report.** The full Season object is written atomically on every report (and on every Undo). No "save" button, no save prompts — mirrors how the real game auto-saves after each game. The user never has to think about it.
- Persisted shape per season: season metadata + `baseOvrSnapshot` (30 numbers, frozen at creation) + `ovrOverrides` (sparse) + user's 162 games + `TeamRecord[]` + `HeadToHead` matrix + playoff bracket (once built) + `lastSnapshot` for Undo. Total ~100KB per season, easily under browser quotas.
- Bundled static data (players, teams, ballparks, schedule) is **not** in `localStorage` — it's imported from the shipped JSON modules. Each season carries its own `baseOvrSnapshot` so it never depends on the current bundle's OVRs (see below).
- Schema version field on every save; migration functions for each version bump.
- **Export Season** → downloads a JSON file containing the entire persisted shape, including `baseOvrSnapshot`. Saves are self-contained. Available in Settings; **no nudges, no auto-prompts** — opt-in only, for users who want disaster recovery against browser-wipe scenarios.
- **Import Season** → loads a JSON file (validate schema, version it, migrate if needed). The embedded `baseOvrSnapshot` is honored — the imported season uses its own OVRs, ignoring whatever the current bundle says. This makes saves portable across app versions and faithful to the "frozen for life" rule from §6.1.
- Support multiple saved seasons.

**Accepted residual risk:** if the browser clears site data (`localStorage` wiped), all unexported saves are lost. Documented in Settings near the Export button — not nagged about during gameplay.

**Effective OVR resolution at runtime:**
```
effectiveOvr(teamId, season) = season.ovrOverrides[teamId] ?? season.baseOvrSnapshot[teamId]
```
The bundled `Team.baseOvr` is only read when **creating** a new season — at that moment, all 30 base OVRs are copied into the new `Season.baseOvrSnapshot`. After that, the bundle's OVRs are irrelevant to existing seasons. This means:
- Mid-season bundled-roster updates (via app deploy) do not silently shift running seasons.
- Imported saves work identically to native saves regardless of the importer app's bundle version.
- Changing the OVR derivation formula in a future app version affects only seasons created after the change. Existing seasons keep their original derived OVRs forever.

### 6.9 Squad Personalization
All cosmetic — none of these affect simulation, standings, or any persisted record. They live on `Season.userSquad` and `Season.themeMode` so they round-trip through export/import.

**Light / dark mode** — `season.themeMode: 'light' | 'dark'` (default `'dark'`). Toggled in Settings. Applied via Tailwind's class-based `dark:` variant on `<html>` (custom-variant declared in `index.css`). The toggle re-applies the class via a hook so changes take effect immediately, no reload needed.

**Squad colors** — `userSquad.primaryColor` + `userSquad.secondaryColor` (hex). Roles are fixed:
- **Primary** drives action buttons (Report Result, Win, Sim this game, Begin Postseason, Continue on Home).
- **Secondary** drives non-accent navigation chips (Standings, Schedule, Settings, Home in the NavBar). The amber accent on the postseason "Bracket" chip is preserved — secondary doesn't override that.
- Defaults to the replaced MLB team's brand palette. Settings offers per-team presets and per-color swatches; the swatch is a 64×64 tappable square (custom HTML input + colored backdrop), labeled "Tap a swatch to pick a color" so the picker is unambiguously discoverable.
- **Contrast safety:** any color used as text on the page background routes through `readableOn(color, mode)` which iteratively shifts the color toward white (dark mode) or black (light mode) until WCAG AA (4.5:1) is met. Buttons that put the squad color *behind* text use `contrastTextFor(hex)` to pick black or white text. Net: whatever color the user picks, the UI stays legible.

**Home park override** — `userSquad.homePark?: { kind: 'preset', parkId } | { kind: 'custom', name }`. Default (undefined) shows the bundled MLB park.
- **Preset** lets the user pick any of the 30 MLB ballparks as their home park. Display name and timezone come from the chosen park, so game time on the card renders in that park's local zone.
- **Custom** lets the user type a free-text name for a park they built and named in The Show. Timezone falls back to the user team's bundled park (custom parks have no real-world TZ).
- Resolved through a single helper `resolveDisplayPark(season, game)` so every home-game surface (regular-season Game card, postseason game card) shows the same name. Override only applies when the user team is the home team — away games always show the actual host park.

## 7. UX Flow

Modeled after MLB The Show's Mini Seasons: tight, linear, game-first. The user spends 95% of their time on one screen — the Game screen — tapping through the season.

### 7.1 Primary flow

1. **Launch screen**
   - If no save exists: single **New Season** CTA.
   - If a save exists: **Continue** (shows team, current record, "Game X of 162") as primary, **New Season** as secondary. Multiple saves appear as a list.

2. **New Season → Team Picker** (see 6.1)
   - Grid of 30 MLB teams. Tap → confirm → the app builds the season and jumps into the Game screen. Season starts at opening day.

3. **Game screen** (see 6.3) — the loop
   - Shows the next game (opponent, home/away, ballpark, date/time).
   - User plays the game in MLB The Show 26 (Diamond Dynasty → Vs. CPU).
   - Returns to the app, taps **Report Result**, picks **W** or **L** (or enters a full box score).
   - App auto-advances: sims non-user games up to the new date, updates records, and shows the next game immediately. A fading toast recaps what happened (confirmed decision: auto-advance with toast).
   - Repeat 162 times.

4. **Regular season ends**
   - Transition screen: final standings + playoff bracket reveal.
   - If user's team is in the playoffs → continue the loop inside the bracket (best-of-3 / 5 / 7 series). If eliminated → "Sim to World Series" option.

5. **Season complete**
   - Results screen: champion, user's final record, division finish, notable stats if any. **Start New Season** button.

### 7.2 Secondary surfaces (accessed via header/drawer — never blocks the loop)

- **Standings** — AL/NL × East/Central/West + wild card. Highlights user's team.
- **Full Schedule** — list of the user's 162 games (past results, upcoming), strictly read-only. Each row shows the opponent and, for upcoming games, the opponent's **current** W/L record (read live from `TeamRecord`). For played games, shows the final score and the result.
- **Settings** — Appearance (light/dark mode), Squad colors (primary + secondary, with MLB team presets), Home park (default / pick MLB park / custom name), Game length, Save data (Export / Import / Delete), per-team OVR overrides, Update Roster Data refresh (§5.1).

### 7.3 Design principles

- **One decision per screen.** Launch = New or Continue. Team picker = pick one team. Game screen = report the result. No nested menus on primary surfaces.
- **Auto-advance everywhere.** No confirmation modals for routine actions. The fading toast is enough acknowledgement.
- **The loop is sacred.** Every secondary feature is reachable in one tap from the Game screen and returns there in one tap. Nothing interrupts the Next Game → Report → Next Game rhythm.
- **Records are single-source-of-truth.** Any W/L record shown anywhere in the UI — opponent records on the Game screen, upcoming-opponent records in the Schedule, standings tables, playoff seeding — reads directly from the season's `TeamRecord[]`. No cached copies, no duplicated counters. If two surfaces show a team's record, they are always consistent by construction.
- **Phone-first ergonomics.** All interactive elements have touch targets ≥44pt. Primary actions (Report Result, W/L, Confirm & Save, Undo) sit in the lower two-thirds of the screen for thumb reach on portrait phones. No hover-only affordances — anything discoverable on hover must be discoverable via tap. Numeric inputs (final scores, box-score innings) use `inputmode="numeric"` to surface the right on-screen keyboard.
- **Orientation and tablet-aware layouts.** Layouts reflow between portrait and landscape rather than stretching — landscape phone uses two-column splits where it makes sense (game card + standings strip), portrait stacks them. Tablet layouts (≥768px) use the extra space for context that's drawer-only on phone (e.g., a persistent mini-standings sidebar), but the core game card stays the focus. Never assume one orientation; rotation should never break a screen.

## 8. Risks & Open Questions

- **Roster data entry.** Mitigated by the public MLB The Show 26 API (Section 5.1) — a Node script pulls real per-player OVRs at build time and we derive team OVRs from them. Still no runtime dependency. User override in Settings always wins. Risk reduced to "API shape changes between builds" (handled by a versioned fetch script + committed fallback data).
- **API availability.** The public MLB The Show 26 API is undocumented in terms of SLA/rate limits. We assume it can go away or change. Mitigation: fetch-and-commit at build time; the app never requires the API to be up. Worst case: ship with the last committed snapshot.
- **Simulation accuracy.** Pure OVR-based sim will produce defensible but not deeply realistic outcomes. Good enough for v1; can layer in pitcher matchups, recent form, injuries later if desired.
- **Save corruption / loss.** `localStorage` can be wiped by browser clearing or "clear site data." Mitigated by atomic auto-save after every report (so partial-write corruption is never possible) and by Settings → Export Season for users who want disaster recovery. No in-gameplay nudges (would violate §7.3); a quiet note next to the Export button explains the risk.
- **Storage limits.** Not a concern: a full season's save state is ~100KB, well under the `localStorage` per-origin quota (~5–10MB). Bundled player/team/park data lives in JS modules, not `localStorage`, so saves stay tiny.
- **PWA install vs. plain static site.** PWA adds complexity but buys true offline + installability. Defer to v1.1 unless trivial.

## 9. Rough Build Order

Every phase below (from phase 1 onward) follows the TDD loop from Section 3: write failing tests first, implement, green the suite, refactor. A phase is not "done" until its three-layer tests (render, persistence, logic — wherever applicable) pass and the full existing suite still passes.

0. **Repo setup:** initialize a git repository in the working directory and create a **public** GitHub remote under the user's personal GitHub account. Push the initial commit (containing `PLAN.md`, a stub `README.md`, a `LICENSE`, and a `.gitignore` for Node/Vite). This phase has no tests of its own; it just establishes where the code lives.
1. **Scaffold:** Vite + React + TS + Tailwind. Thin typed `localStorage` wrapper (get/set by key, JSON serialize, schema-versioned). Routing. Vitest + RTL + Playwright wired up, a smoke test passing. Configure Vite's `base` for the GitHub Pages subpath.
2. **GitHub Pages deployment pipeline:** add a GitHub Actions workflow (`.github/workflows/deploy.yml`) that on push to `main` builds the app and deploys to GitHub Pages. Verify the live URL serves the scaffold smoke screen end-to-end before moving on. CI must run the full Vitest + Playwright suite against the built artifact and block deploy on failure.
3. **Static data + fetch scripts:** build-time `scripts/fetchRosterData.ts` (The Show API: cards, stadiums, roster updates) and `scripts/fetchSchedule.ts` (MLB Stats API: 2026 regular-season schedule) normalize into committed JSON under `src/data/`. Tests cover each normalizer with recorded API fixtures (no live calls in the test suite), the team-OVR derivation formula (pinned expected outputs), and data integrity of the committed JSON (30 teams, 6 divisions of 5, every team has a park, every team has ≥25 players, no duplicate uuids; schedule has 81 home + 81 away for every team, no duplicate `gamePk`, all venues resolve).
4. **Schedule loader + team filter:** given a team id, return that team's 162 games in order. Tests cover filtering, sort stability across doubleheaders, and opening-day detection per team.
5. **Team picker + season creation flow** + persistence. Tests cover the team grid rendering, selection, `Season` + `TeamRecord[]` + `HeadToHead` write to `localStorage`, and rehydration on reload.
6. **Game screen + Quick Report + auto-advance + fading toast + single-level Undo** → end-to-end loop working for one game, covered by an E2E test (setup → first game visible → report W → second game visible → toast appeared → Undo → first game visible again → different report → different second game). Undo needs its own three-layer tests: render (button visible only when `lastSnapshot` exists), persistence (snapshot round-trips through `localStorage`), logic (undo fully restores `currentDate`, records, H2H, and rngSeed — verified by a second report producing different downstream state).
7. **League simulator** + standings recompute. Tests pin RNG seed, assert OVR edge trends over N simulated games, assert standings match a hand-computed scenario.
8. **Full Report (box score).**
9. **Schedule browser** (read-only view of the user's 162 games with results and upcoming).
10. **Postseason bracket.**
11. **Export / import, multi-season management, settings (including OVR overrides and optional in-app "Update Roster Data" refresh from §5.1), polish.**
12. **README as user guide:** flesh `README.md` into a full user guide (see §10.3). The README has been growing alongside features since phase 0; this phase polishes it, adds screenshots, cross-links to the live URL, and verifies it answers every common user question end-to-end.
13. **Personalization (shipped):** light/dark mode, squad colors with role-based application + WCAG AA contrast checks, home park override (preset or custom). See §6.9.
14. **Stretch:** PWA, stat leaderboards, team-level season stats aggregation.

**README discipline (applies from phase 0 onward):** every feature phase that adds user-visible behavior must update the relevant section of `README.md` in the same commit set. Don't let the user guide drift behind the app. Phase 12 is for polish, not first-time writing.

## 10. Hosting, Deployment, and Documentation

### 10.1 Hosting — GitHub Pages
- Repo is **public** under the user's personal GitHub account.
- App is served from GitHub Pages at the repo's default Pages URL (`https://<user>.github.io/MLBTheShow26SeasonCompanion/` or whatever the repo is named).
- Vite's `base` config is set to the repo subpath so all asset URLs resolve correctly.
- All routing uses HashRouter (or equivalent) to avoid GitHub Pages 404s on deep links — no server-side rewrites available on Pages.
- Static-only deploy. No server, no environment variables, no secrets needed at deploy time. The build is reproducible from a clean checkout.

### 10.2 Deployment pipeline — GitHub Actions
- Workflow at `.github/workflows/deploy.yml` triggers on push to `main`.
- Steps: install deps → run full Vitest suite → run Playwright suite (multi-viewport per §3.3) → build → publish `dist/` to GitHub Pages.
- Failed tests block the deploy. Failed deploy doesn't break the existing live site (Pages keeps the last good build until a successful new one replaces it).
- Build is fully offline-capable from a fresh checkout: no live API calls during build (the bundled JSON in `src/data/` is committed, not refetched on CI). The `scripts/fetch*` scripts are run manually by the maintainer when refreshing data.

### 10.3 README as user guide
The repo `README.md` doubles as the public user guide — most visitors will read it on github.com before clicking through to the live app. Structure:

1. **What this is** — one-paragraph pitch + a screenshot of the Game screen on a phone. Link to the live URL prominently.
2. **Quick start** — three steps: open the link → pick your team → start playing. Make it obvious there's no install, no signup, no save-syncing infrastructure to set up.
3. **The core loop** — annotated screenshots of the Game screen, Report Result, Sim this game, Undo, the All-Star toast.
4. **Reading the game info** — what each field on the Game card means (opponent, home/away, ballpark, in-sim date), and how to use the ballpark info when setting up the Vs. CPU game in The Show.
5. **Settings** — Appearance (light/dark), Squad colors with MLB presets, Home park (default / pick / custom), Game length, OVR overrides, Update Roster Data, Export/Import, multi-save management. Explain the "frozen at creation" snapshot rule plainly.
6. **Standings & Postseason** — what the chip means, tiebreaker stack in plain English, how the bracket plays out.
7. **Save data and your browser** — explain `localStorage` in user-friendly terms, the browser-wipe risk, and why exporting a save occasionally is a good habit.
8. **FAQ** — likely questions: "Why doesn't my schedule match the real 2026 season?" (it does, that's the point), "Can I sim my games?" (yes, with a CPU-favored bias), "Does this work offline?" (yes, after the first load), "Will my season survive an app update?" (yes, OVRs are frozen at creation).
9. **For developers** — short section at the bottom: tech stack one-liner, how to run locally (`npm install && npm run dev`), how to run tests, where the data fetch scripts live. Not the focus.
10. **License + acknowledgements** — license, note that this is an unofficial fan project not affiliated with MLB Advanced Media or Sony San Diego Studio, credit the data sources (The Show API, MLB Stats API).

### 10.4 LICENSE
- MIT or similar permissive license. Personal project, no commercial intent, no attempt to monetize.
- Include the disclaimer about being an unofficial fan project in the README and at the bottom of the app's Settings screen.

## 11. Out of Scope (v1)

- Player-level stats tracking (batting averages, ERAs). Team-level only.
- Trades, call-ups, injuries, free agency.
- Multi-season continuity / franchise mode.
- Cloud sync or multi-device sync beyond manual JSON export/import.
- Any live integration with The Show, PSN, Xbox, or MLB APIs.
