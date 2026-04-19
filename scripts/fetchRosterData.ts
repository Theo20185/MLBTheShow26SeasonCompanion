// Build-time fetcher for MLB The Show 26 roster data.
// Pulls all live-series MLB cards from mlb26.theshow.com, normalizes,
// computes a baseOvr per team, and writes:
//   - src/data/players.json     — flat list of normalized RosterPlayer
//   - src/data/teamBaseOvrs.json — { [teamId]: number }
//
// Run with: npm run fetch:roster

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeRosterResponse,
  type RawShowItem,
} from '../src/data/rosterNormalize'
import { computeTeamOvr, type RosterPlayer } from '../src/data/teamOvr'
import { TEAM_MAP } from '../src/data/teamIdMap'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYERS_OUTPUT = join(__dirname, '..', 'src', 'data', 'players.json')
const OVRS_OUTPUT = join(__dirname, '..', 'src', 'data', 'teamBaseOvrs.json')

const BASE_URL = 'https://mlb26.theshow.com/apis/items.json'
const TYPE = 'mlb_card'

interface PageResponse {
  page: number
  per_page: number
  total_pages: number
  items: RawShowItem[]
}

async function fetchPage(page: number): Promise<PageResponse> {
  const url = `${BASE_URL}?type=${TYPE}&page=${page}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Show API responded ${res.status} for page ${page}`)
  }
  return (await res.json()) as PageResponse
}

async function fetchAllPages(): Promise<RawShowItem[]> {
  const first = await fetchPage(1)
  const totalPages = first.total_pages
  console.log(`Total pages: ${totalPages}`)
  const all: RawShowItem[] = [...first.items]

  // Light concurrency: 5 pages at a time so we don't hammer the API.
  const concurrency = 5
  let nextPage = 2
  while (nextPage <= totalPages) {
    const batch: number[] = []
    for (let i = 0; i < concurrency && nextPage <= totalPages; i++) {
      batch.push(nextPage++)
    }
    const responses = await Promise.all(batch.map(fetchPage))
    for (const r of responses) all.push(...r.items)
    process.stdout.write(`  fetched up to page ${batch[batch.length - 1]} of ${totalPages}\r`)
  }
  process.stdout.write('\n')
  return all
}

async function main(): Promise<void> {
  console.log('Fetching MLB The Show 26 cards ...')
  const rawItems = await fetchAllPages()
  console.log(`Got ${rawItems.length} raw items total.`)

  const players: RosterPlayer[] = normalizeRosterResponse(rawItems)
  console.log(`Normalized to ${players.length} live-series MLB cards.`)

  // Group players by teamId and compute baseOvr per team.
  const byTeam = new Map<string, RosterPlayer[]>()
  for (const p of players) {
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, [])
    byTeam.get(p.teamId)!.push(p)
  }

  const teamBaseOvrs: Record<string, number> = {}
  for (const team of TEAM_MAP) {
    const teamPlayers = byTeam.get(team.id) ?? []
    if (teamPlayers.length < 25) {
      console.warn(
        `WARN: Team ${team.id} has only ${teamPlayers.length} live-series players (need ≥25 for OVR derivation)`
      )
      continue
    }
    teamBaseOvrs[team.id] = computeTeamOvr(teamPlayers)
  }

  const fetchedAt = new Date().toISOString()
  await mkdir(dirname(PLAYERS_OUTPUT), { recursive: true })
  await writeFile(
    PLAYERS_OUTPUT,
    JSON.stringify({ fetchedAt, source: BASE_URL, players }, null, 2) + '\n',
    'utf8'
  )
  await writeFile(
    OVRS_OUTPUT,
    JSON.stringify({ fetchedAt, teamBaseOvrs }, null, 2) + '\n',
    'utf8'
  )
  console.log(`Wrote ${PLAYERS_OUTPUT}`)
  console.log(`Wrote ${OVRS_OUTPUT}`)
  console.log('Team base OVRs:', teamBaseOvrs)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
