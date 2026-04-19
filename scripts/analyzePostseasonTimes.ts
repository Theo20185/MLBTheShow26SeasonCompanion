// Pull the last N years of MLB postseason games, summarize their start
// times, and write a per-(round, home team) venue-LOCAL-hour histogram
// to src/data/postseasonTimes.json. The runtime postseason scheduler
// reads that file to pick a realistic start time per game (rather than
// always using a single fixed slot).
//
// Run with: npx tsx scripts/analyzePostseasonTimes.ts

import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEAM_BY_MLB_STATS_ID } from '../src/data/teamIdMap'
import { BALLPARK_BY_TEAM_ID } from '../src/data/ballparks'

interface RawGame {
  gamePk: number
  gameDate: string         // ISO 8601 UTC
  officialDate: string
  gameType: string
  status: { abstractGameState: string }
  teams: { home: { team: { id: number } }; away: { team: { id: number } } }
}

interface RawScheduleResponse {
  dates: { date: string; games: RawGame[] }[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'postseasonTimes.json')

const YEARS = [2021, 2022, 2023, 2024, 2025]
const ROUND_CODES: Record<string, 'WCS' | 'DS' | 'LCS' | 'WS'> = {
  F: 'WCS',
  D: 'DS',
  L: 'LCS',
  W: 'WS',
}

interface GameRecord {
  year: number
  round: 'WCS' | 'DS' | 'LCS' | 'WS'
  homeTeamId: string                // our internal id
  utcDateTime: string
  /** Hour in the venue's local timezone, 0-23. */
  localHour: number
  localMinute: number
}

async function fetchRound(year: number, code: string): Promise<RawGame[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${year}-09-25&endDate=${year}-11-15&gameType=${code}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`MLB Stats API ${url} → ${res.status}`)
  }
  const json = (await res.json()) as RawScheduleResponse
  const games: RawGame[] = []
  for (const d of json.dates) games.push(...d.games)
  return games
}

/** Returns the local hour:minute for a UTC instant in the given IANA timezone. */
function localHourMinuteAt(utcIso: string, timezone: string): { hour: number; minute: number } {
  const d = new Date(utcIso)
  // Use Intl to format the date in the given TZ, then parse the hh/mm out.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const minuteStr = parts.find((p) => p.type === 'minute')?.value ?? '0'
  // Intl can render hour as "24" for midnight; normalize.
  const hour = parseInt(hourStr, 10) % 24
  const minute = parseInt(minuteStr, 10)
  return { hour, minute }
}

async function main() {
  const all: GameRecord[] = []
  for (const year of YEARS) {
    for (const code of Object.keys(ROUND_CODES)) {
      const games = await fetchRound(year, code)
      for (const g of games) {
        if (g.status.abstractGameState !== 'Final') continue
        const homeMlbId = g.teams.home.team.id
        const home = TEAM_BY_MLB_STATS_ID.get(homeMlbId)
        if (!home) continue   // unknown team (shouldn't happen for real games)
        const park = BALLPARK_BY_TEAM_ID.get(home.id)
        if (!park) continue
        const local = localHourMinuteAt(g.gameDate, park.timezone)
        all.push({
          year,
          round: ROUND_CODES[code],
          homeTeamId: home.id,
          utcDateTime: g.gameDate,
          localHour: local.hour,
          localMinute: local.minute,
        })
      }
    }
  }

  console.log(`\nFetched ${all.length} postseason games across ${YEARS[0]}-${YEARS[YEARS.length - 1]}\n`)

  // Per-year coverage.
  console.log('=== Coverage by year × round ===')
  console.log('  year    WCS  DS  LCS  WS   total')
  for (const year of YEARS) {
    const inYear = all.filter((g) => g.year === year)
    const counts = (['WCS', 'DS', 'LCS', 'WS'] as const).map(
      (r) => inYear.filter((g) => g.round === r).length
    )
    console.log(`  ${year}   ${counts.map((c) => String(c).padStart(3)).join('  ')}    ${String(inYear.length).padStart(3)}`)
  }
  console.log()

  // Per-round local-hour distributions.
  for (const round of ['WCS', 'DS', 'LCS', 'WS'] as const) {
    const inRound = all.filter((g) => g.round === round)
    if (inRound.length === 0) continue
    console.log(`=== ${round} (${inRound.length} games — venue-LOCAL start hour) ===`)
    const buckets = new Map<number, number>()
    for (const g of inRound) buckets.set(g.localHour, (buckets.get(g.localHour) ?? 0) + 1)
    const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0])
    for (const [h, count] of sorted) {
      const pct = Math.round((count / inRound.length) * 100)
      const bar = '█'.repeat(Math.max(1, Math.round(pct / 4)))
      console.log(`    ${String(h).padStart(2, '0')}:00  ${String(count).padStart(3)}  ${String(pct).padStart(3)}%  ${bar}`)
    }
    console.log()
  }

  // Build the bundled output: { byRoundAndTeam: { WCS: { NYY: [{hour, minute}, ...], ...}, ...},
  //                            byRound: { WCS: [...], ...} }
  type SlotPick = { hour: number; minute: number }
  interface Output {
    fetchedAt: string
    sourceYears: number[]
    byRoundAndTeam: Record<string, Record<string, SlotPick[]>>
    byRound: Record<string, SlotPick[]>
  }

  const out: Output = {
    fetchedAt: new Date().toISOString(),
    sourceYears: YEARS,
    byRoundAndTeam: { WCS: {}, DS: {}, LCS: {}, WS: {} },
    byRound: { WCS: [], DS: [], LCS: [], WS: [] },
  }

  for (const r of all) {
    out.byRound[r.round].push({ hour: r.localHour, minute: r.localMinute })
    if (!out.byRoundAndTeam[r.round][r.homeTeamId]) {
      out.byRoundAndTeam[r.round][r.homeTeamId] = []
    }
    out.byRoundAndTeam[r.round][r.homeTeamId].push({ hour: r.localHour, minute: r.localMinute })
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)

  // Coverage report: how many teams have data per round?
  for (const round of ['WCS', 'DS', 'LCS', 'WS'] as const) {
    const teamsWithData = Object.keys(out.byRoundAndTeam[round]).length
    const totalGames = out.byRound[round].length
    console.log(`  ${round}: ${teamsWithData} teams have data, ${totalGames} total games`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
