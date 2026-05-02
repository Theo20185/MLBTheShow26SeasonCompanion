// Runtime opt-in fetcher for fresh roster data from the MLB The Show
// 26 public API (PLAN.md §5.1 "Optional in-app refresh"). Reuses the
// same normalizer + team-OVR formula as the build-time script so
// runtime values always match what would have been bundled.
//
// This is the only runtime network call in the app. It's user-
// triggered, never automatic. Failures (offline, CORS, API down) are
// surfaced to the user, never silent.

import { TEAM_MAP } from '../data/teamIdMap'
import {
  normalizeRosterResponse,
  type RawShowItem,
} from '../data/rosterNormalize'
import { computeTeamOvr, type RosterPlayer } from '../data/teamOvr'
import type { Season } from './types'
import { effectiveOvr } from './simulator'

const BASE_URL = 'https://mlb26.theshow.com/apis/items.json'

interface PageResponse {
  page: number
  per_page: number
  total_pages: number
  items: RawShowItem[]
}

export interface TeamOvrDelta {
  teamId: string
  current: number
  next: number
  delta: number
}

export interface RosterRefreshPlan {
  /** Map of teamId -> newly computed OVR. */
  newOvrs: Record<string, number>
  /** Per-team deltas vs the current effective OVR (override or base snapshot). */
  deltas: TeamOvrDelta[]
}

/**
 * Fetches the full live-series roster, computes new team OVRs, and
 * returns a plan diff vs the season's current effective OVRs.
 * Pure data — caller decides whether to apply.
 */
export async function planRosterRefresh(
  season: Season,
  fetchImpl: typeof fetch = fetch
): Promise<RosterRefreshPlan> {
  const items = await fetchAllPages(fetchImpl)
  const players: RosterPlayer[] = normalizeRosterResponse(items)

  const byTeam = new Map<string, RosterPlayer[]>()
  for (const p of players) {
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, [])
    byTeam.get(p.teamId)!.push(p)
  }

  const newOvrs: Record<string, number> = {}
  for (const team of TEAM_MAP) {
    const teamPlayers = byTeam.get(team.id)
    if (!teamPlayers || teamPlayers.length === 0) {
      // Skip teams where the API didn't return enough players. Defensive:
      // never produce an undefined OVR that would corrupt the season.
      continue
    }
    try {
      newOvrs[team.id] = computeTeamOvr(teamPlayers)
    } catch {
      // Below the depth threshold — skip rather than fabricate.
    }
  }

  const deltas: TeamOvrDelta[] = []
  for (const team of TEAM_MAP) {
    const next = newOvrs[team.id]
    if (next === undefined) continue
    const current = effectiveOvr(team.id, season)
    if (next !== current) {
      deltas.push({ teamId: team.id, current, next, delta: next - current })
    }
  }
  // Sort by largest absolute change first so the diff modal surfaces
  // the most surprising movements at the top.
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return { newOvrs, deltas }
}

/**
 * Applies a refresh plan: writes every newOvr into season.ovrOverrides.
 * Per PLAN.md §5.1, baseOvrSnapshot is never touched — overrides are
 * how mid-season changes layer on top of the frozen creation snapshot.
 */
export function applyRosterRefresh(
  season: Season,
  plan: RosterRefreshPlan
): Season {
  return {
    ...season,
    ovrOverrides: { ...season.ovrOverrides, ...plan.newOvrs },
  }
}

async function fetchAllPages(fetchImpl: typeof fetch): Promise<RawShowItem[]> {
  const first = await fetchPage(1, fetchImpl)
  const all: RawShowItem[] = [...first.items]
  for (let p = 2; p <= first.total_pages; p++) {
    const page = await fetchPage(p, fetchImpl)
    all.push(...page.items)
  }
  return all
}

async function fetchPage(page: number, fetchImpl: typeof fetch): Promise<PageResponse> {
  const url = `${BASE_URL}?type=mlb_card&page=${page}`
  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(`Show API responded ${res.status} for page ${page}`)
  }
  return (await res.json()) as PageResponse
}
