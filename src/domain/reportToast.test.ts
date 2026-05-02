// Tests for the post-report toast text builder. Pure logic so it can
// be unit-tested without rendering the toast component.

import { describe, it, expect } from 'vitest'
import { buildReportToast } from './reportToast'
import type { Season } from './types'

function seasonWithDateAndTotalWins(currentDate: string, totalWins: number): Season {
  return {
    id: 's1',
    year: 2026,
    userTeamId: 'NYY',
    startDate: '2026-04-01',
    currentDate,
    status: 'regular',
    rngSeed: 1,
    baseOvrSnapshot: {},
    ovrOverrides: {},
    rosterSnapshotId: 'r1',
    userGames: [],
    teamRecords: [
      {
        teamId: 'NYY',
        firstHalfWins: totalWins,
        firstHalfLosses: 0,
        secondHalfWins: 0,
        secondHalfLosses: 0,
        divisionWins: 0,
        divisionLosses: 0,
      },
    ],
    headToHead: {},
  } as Season
}

describe('buildReportToast', () => {
  it('shows the date range plus simmed-game count', () => {
    const before = seasonWithDateAndTotalWins('2026-04-22', 0)
    const after = seasonWithDateAndTotalWins('2026-04-25', 19) // 1 user + 18 simmed
    const toast = buildReportToast(before, after)
    expect(toast).not.toBeNull()
    expect(toast!.text).toMatch(/Apr 22/)
    expect(toast!.text).toMatch(/Apr 25/)
    expect(toast!.text).toMatch(/18 league games simmed/i)
  })

  it('says "1 league game simmed" when only one non-user game played', () => {
    const before = seasonWithDateAndTotalWins('2026-04-22', 0)
    const after = seasonWithDateAndTotalWins('2026-04-23', 2) // 1 user + 1 simmed
    const toast = buildReportToast(before, after)
    expect(toast!.text).toMatch(/1 league game simmed/i)
  })

  it('omits the simmed count when zero non-user games played', () => {
    const before = seasonWithDateAndTotalWins('2026-04-22', 0)
    const after = seasonWithDateAndTotalWins('2026-04-22', 1) // user only, same date
    const toast = buildReportToast(before, after)
    expect(toast!.text).not.toMatch(/simmed/i)
  })

  it('uses a longer duration for the All-Star Break toast', () => {
    // The break is detected as a gap of ≥2 calendar days where no league
    // games happened. That means total wins didn't change much across
    // a multi-day jump.
    const before = seasonWithDateAndTotalWins('2026-07-13', 1000)
    const after = seasonWithDateAndTotalWins('2026-07-17', 1001) // user game only, 4 days
    const toast = buildReportToast(before, after)
    expect(toast!.text).toMatch(/all-star break/i)
    expect(toast!.durationMs).toBeGreaterThanOrEqual(4000)
  })

  it('returns null when nothing changed (defensive)', () => {
    const before = seasonWithDateAndTotalWins('2026-04-22', 0)
    const after = seasonWithDateAndTotalWins('2026-04-22', 0)
    expect(buildReportToast(before, after)).toBeNull()
  })
})
