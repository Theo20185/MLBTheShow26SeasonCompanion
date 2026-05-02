// Tests for the runtime roster-refresh planner + applier.

import { describe, it, expect } from 'vitest'
import { planRosterRefresh, applyRosterRefresh } from './rosterRefresh'
import { TEAM_MAP } from '../data/teamIdMap'
import type { Season } from './types'

function makeSeason(snapshot: Record<string, number>): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
    startDate: '2026-04-01',
    currentDate: '2026-04-01',
    status: 'regular',
    rngSeed: 1,
    baseOvrSnapshot: snapshot,
    ovrOverrides: {},
    rosterSnapshotId: 'r1',
    userGames: [],
    teamRecords: [],
    headToHead: {},
  } as Season
}

/** Minimal fake API: returns 25 identical-OVR players for every team
 *  on a single page. Page count is inferred so we hit the loop logic. */
function makeFakeFetch(perTeamOvr: Record<string, number>): typeof fetch {
  const items: unknown[] = []
  for (const team of TEAM_MAP) {
    const ovr = perTeamOvr[team.id]
    if (ovr === undefined) continue
    for (let i = 0; i < 25; i++) {
      items.push({
        uuid: `${team.id}-${i}`,
        type: 'mlb_card',
        name: `${team.id} Player ${i}`,
        team: team.name,
        team_short_name: team.showShortName,
        ovr,
        display_position: 'P',
        is_hitter: false,
        series: 'Live',
      })
    }
  }
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ page: 1, per_page: items.length, total_pages: 1, items }),
  })) as unknown as typeof fetch
}

describe('rosterRefresh', () => {
  it('returns deltas only for teams whose OVR actually changed', async () => {
    const baseline: Record<string, number> = {}
    for (const t of TEAM_MAP) baseline[t.id] = 80
    // Bump NYY to 85 in the fresh fetch; everyone else stays at 80.
    const fresh: Record<string, number> = { ...baseline, NYY: 85 }
    const season = makeSeason(baseline)
    const fakeFetch = makeFakeFetch(fresh)
    const plan = await planRosterRefresh(season, fakeFetch)
    expect(plan.newOvrs.NYY).toBe(85)
    expect(plan.deltas).toHaveLength(1)
    expect(plan.deltas[0]).toEqual({ teamId: 'NYY', current: 80, next: 85, delta: 5 })
  })

  it('sorts deltas by absolute magnitude', async () => {
    const baseline: Record<string, number> = {}
    for (const t of TEAM_MAP) baseline[t.id] = 80
    const fresh: Record<string, number> = {
      ...baseline,
      NYY: 81,
      LAD: 90,
      BOS: 70,
    }
    const fakeFetch = makeFakeFetch(fresh)
    const plan = await planRosterRefresh(makeSeason(baseline), fakeFetch)
    // LAD (+10) and BOS (-10) tie for largest magnitude; either order ok.
    expect(['LAD', 'BOS']).toContain(plan.deltas[0].teamId)
    expect(['LAD', 'BOS']).toContain(plan.deltas[1].teamId)
    expect(plan.deltas[plan.deltas.length - 1].teamId).toBe('NYY') // delta 1
  })

  it('applyRosterRefresh writes every newOvr into ovrOverrides without touching baseOvrSnapshot', () => {
    const baseline: Record<string, number> = { NYY: 80, BOS: 80 }
    const season = makeSeason(baseline)
    const plan = { newOvrs: { NYY: 85, BOS: 78 }, deltas: [] }
    const updated = applyRosterRefresh(season, plan)
    expect(updated.ovrOverrides.NYY).toBe(85)
    expect(updated.ovrOverrides.BOS).toBe(78)
    expect(updated.baseOvrSnapshot.NYY).toBe(80) // untouched
    expect(updated.baseOvrSnapshot.BOS).toBe(80)
  })

  it('skips teams with too few players rather than fabricating an OVR', async () => {
    const baseline: Record<string, number> = {}
    for (const t of TEAM_MAP) baseline[t.id] = 80
    // Only return 5 players for NYY — below the depth threshold.
    const items: unknown[] = []
    for (let i = 0; i < 5; i++) {
      items.push({
        uuid: `NYY-${i}`,
        type: 'mlb_card',
        name: `Player ${i}`,
        team: 'Yankees',
        team_short_name: 'NYY',
        ovr: 99,
        display_position: 'P',
        is_hitter: false,
        series: 'Live',
      })
    }
    const fakeFetch: typeof fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ page: 1, per_page: items.length, total_pages: 1, items }),
    })) as unknown as typeof fetch
    const plan = await planRosterRefresh(makeSeason(baseline), fakeFetch)
    expect(plan.newOvrs.NYY).toBeUndefined()
  })
})
