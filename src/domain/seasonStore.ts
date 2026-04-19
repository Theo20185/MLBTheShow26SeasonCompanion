// Persistence layer for Season objects (PLAN.md §6.8).
// Uses the typed createStore wrapper from src/lib/storage.ts.

import { createStore } from '../lib/storage'
import type { Season, SeasonIndexEntry } from './types'

const SCHEMA_VERSION = 1
const INDEX_KEY = 'seasons:index'

const indexStore = createStore<SeasonIndexEntry[]>({
  key: INDEX_KEY,
  version: SCHEMA_VERSION,
  validate: (raw) => {
    if (!Array.isArray(raw)) throw new Error('index must be an array')
    return raw as SeasonIndexEntry[]
  },
})

function seasonStoreFor(id: string) {
  return createStore<Season>({
    key: `season:${id}`,
    version: SCHEMA_VERSION,
    validate: (raw) => {
      if (typeof raw !== 'object' || raw === null) {
        throw new Error('season must be an object')
      }
      // Light shape check; deep validation can grow over time.
      const r = raw as Season
      if (typeof r.id !== 'string') throw new Error('season.id missing')
      if (typeof r.userTeamId !== 'string') throw new Error('season.userTeamId missing')
      return r
    },
  })
}

export function saveSeason(season: Season): void {
  seasonStoreFor(season.id).set(season)

  const existing = indexStore.get() ?? []
  const filtered = existing.filter((e) => e.id !== season.id)
  const entry: SeasonIndexEntry = {
    id: season.id,
    userTeamId: season.userTeamId,
    year: season.year,
    createdAt: extractCreatedAtFromId(season.id),
    status: season.status,
  }
  // Newest first.
  indexStore.set([entry, ...filtered])
}

export function loadSeason(id: string): Season | null {
  return seasonStoreFor(id).get()
}

export function deleteSeason(id: string): void {
  seasonStoreFor(id).remove()
  const existing = indexStore.get() ?? []
  indexStore.set(existing.filter((e) => e.id !== id))
}

export function listSeasons(): SeasonIndexEntry[] {
  return indexStore.get() ?? []
}

function extractCreatedAtFromId(id: string): string {
  // id format: "season-<iso>-<teamId>"
  // Pull the ISO timestamp back out for the index entry.
  const match = id.match(/^season-(.+)-([A-Z]+)$/)
  return match ? match[1] : new Date().toISOString()
}
