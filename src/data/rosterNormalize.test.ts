import { describe, it, expect } from 'vitest'
import {
  normalizeRosterResponse,
  type RawShowItem,
} from './rosterNormalize'

function rawCard(overrides: Partial<RawShowItem> = {}): RawShowItem {
  return {
    uuid: 'abc',
    type: 'mlb_card',
    name: 'Player Name',
    team: 'Yankees',
    team_short_name: 'NYY',
    ovr: 80,
    display_position: 'OF',
    is_hitter: true,
    series: 'Live',
    ...overrides,
  }
}

describe('normalizeRosterResponse', () => {
  it('converts each raw mlb_card item into a RosterPlayer', () => {
    const out = normalizeRosterResponse([rawCard()])
    expect(out).toEqual([
      {
        uuid: 'abc',
        name: 'Player Name',
        teamId: 'NYY',
        ovr: 80,
        position: 'OF',
        isHitter: true,
      },
    ])
  })

  it('drops items whose type is not mlb_card', () => {
    const out = normalizeRosterResponse([
      rawCard({ uuid: 'a' }),
      rawCard({ uuid: 'b', type: 'stadium' }),
    ])
    expect(out.map((p) => p.uuid)).toEqual(['a'])
  })

  it('drops items whose series is not Live (we only want live-series cards)', () => {
    const out = normalizeRosterResponse([
      rawCard({ uuid: 'a', series: 'Live' }),
      rawCard({ uuid: 'b', series: 'Topps Now' }),
      rawCard({ uuid: 'c', series: 'Future Stars' }),
    ])
    expect(out.map((p) => p.uuid)).toEqual(['a'])
  })

  it('drops items with an unknown team_short_name (mapping mismatch)', () => {
    const out = normalizeRosterResponse([
      rawCard({ uuid: 'a', team_short_name: 'NYY' }),
      rawCard({ uuid: 'b', team_short_name: 'ZZZ' }),
    ])
    expect(out.map((p) => p.uuid)).toEqual(['a'])
  })

  it('preserves the OVR exactly (no rounding/clamping at this layer)', () => {
    const out = normalizeRosterResponse([
      rawCard({ uuid: 'a', ovr: 99 }),
      rawCard({ uuid: 'b', ovr: 45 }),
    ])
    expect(out.map((p) => p.ovr)).toEqual([99, 45])
  })

  it('handles empty input', () => {
    expect(normalizeRosterResponse([])).toEqual([])
  })
})
