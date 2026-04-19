// Build-time fetcher for the 2026 MLB regular-season schedule.
// Pulls from statsapi.mlb.com (the official MLB Stats API) and writes
// a normalized snapshot into src/data/schedule2026.json. The committed
// JSON is what the app reads at runtime — the API is never called from
// the browser (PLAN.md §5.1).
//
// Run with: npm run fetch:schedule

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeScheduleResponse,
  type RawScheduleResponse,
} from '../src/data/scheduleNormalize'

const SEASON_START = '2026-03-25'
const SEASON_END = '2026-10-02'
const ENDPOINT = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${SEASON_START}&endDate=${SEASON_END}&gameType=R`

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'schedule2026.json')

async function main(): Promise<void> {
  console.log(`Fetching schedule from ${ENDPOINT} ...`)
  const res = await fetch(ENDPOINT)
  if (!res.ok) {
    throw new Error(`MLB Stats API responded ${res.status} ${res.statusText}`)
  }
  const raw = (await res.json()) as RawScheduleResponse
  const games = normalizeScheduleResponse(raw)
  console.log(`Normalized ${games.length} regular-season games.`)

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: ENDPOINT,
    games,
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
