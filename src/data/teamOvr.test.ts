import { describe, it, expect } from 'vitest'
import { computeTeamOvr, type RosterPlayer } from './teamOvr'

function player(ovr: number, overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    uuid: `uuid-${ovr}-${Math.random()}`,
    name: `Player ${ovr}`,
    teamId: 'NYY',
    ovr,
    position: 'OF',
    isHitter: true,
    ...overrides,
  }
}

describe('computeTeamOvr', () => {
  it('averages the top 25 OVRs when there are exactly 25 players', () => {
    const players = Array.from({ length: 25 }, () => player(80))
    expect(computeTeamOvr(players)).toBe(80)
  })

  it('uses only the top 25 when more players exist', () => {
    // 25 players at 90, plus 100 players at 50.
    // Top 25 average = 90.
    const players = [
      ...Array.from({ length: 25 }, () => player(90)),
      ...Array.from({ length: 100 }, () => player(50)),
    ]
    expect(computeTeamOvr(players)).toBe(90)
  })

  it('rounds to the nearest integer', () => {
    // Mix that produces a fractional average.
    const ovrs = [85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61]
    const players = ovrs.map((o) => player(o))
    // Sum = 1825, /25 = 73, exactly. Pick a non-integer case.
    const ovrs2 = [...ovrs.slice(0, 24), 62] // sum 1825 - 61 + 62 = 1826, /25 = 73.04
    const players2 = ovrs2.map((o) => player(o))
    expect(computeTeamOvr(players)).toBe(73)
    expect(computeTeamOvr(players2)).toBe(73) // 73.04 → 73
  })

  it('throws if a team has fewer than 25 players', () => {
    const players = Array.from({ length: 24 }, () => player(80))
    expect(() => computeTeamOvr(players)).toThrow(/at least 25 players/)
  })

  it('returns the same value regardless of input order', () => {
    const ovrs = [88, 76, 92, 65, 81, 79, 84, 90, 73, 70, 85, 87, 78, 80, 82, 86, 91, 74, 75, 77, 83, 89, 72, 71, 68]
    const players = ovrs.map((o) => player(o))
    const reversed = [...players].reverse()
    expect(computeTeamOvr(players)).toBe(computeTeamOvr(reversed))
  })

  it('produces a higher OVR when a team replaces a low-OVR player with a high-OVR one', () => {
    const ovrs = [85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61]
    const baseline = computeTeamOvr(ovrs.map((o) => player(o)))

    const upgraded = [...ovrs]
    upgraded[upgraded.length - 1] = 95 // replace the worst with a star
    const upgradedOvr = computeTeamOvr(upgraded.map((o) => player(o)))

    expect(upgradedOvr).toBeGreaterThan(baseline)
  })
})
