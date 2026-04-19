import { describe, it, expect } from 'vitest'
import {
  normalizeScheduleResponse,
  type RawScheduleResponse,
  type NormalizedGame,
} from './scheduleNormalize'

const BASELINE: RawScheduleResponse = {
  dates: [
    {
      date: '2026-04-01',
      games: [
        {
          gamePk: 778001,
          gameDate: '2026-04-01T17:05:00Z',
          officialDate: '2026-04-01',
          gameType: 'R',
          doubleHeader: 'N',
          status: { abstractGameState: 'Preview' },
          venue: { id: 1, name: 'Yankee Stadium' },
          teams: {
            home: { team: { id: 147, name: 'New York Yankees' }, isWinner: false },
            away: { team: { id: 110, name: 'Baltimore Orioles' }, isWinner: false },
          },
        },
      ],
    },
  ],
}

describe('normalizeScheduleResponse', () => {
  it('converts each raw game into a normalized Game keyed by our 3-letter team ids', () => {
    const out = normalizeScheduleResponse(BASELINE)
    expect(out).toHaveLength(1)
    const g = out[0]
    expect(g.gamePk).toBe(778001)
    expect(g.officialDate).toBe('2026-04-01')
    expect(g.gameDate).toBe('2026-04-01T17:05:00Z')
    expect(g.homeTeamId).toBe('NYY')
    expect(g.awayTeamId).toBe('BAL')
    expect(g.venueName).toBe('Yankee Stadium')
    expect(g.doubleHeader).toBe('N')
  })

  it('drops non-regular-season games (gameType !== "R") even if present', () => {
    const raw: RawScheduleResponse = {
      dates: [
        {
          date: '2026-07-14',
          games: [
            { ...BASELINE.dates[0].games[0], gamePk: 999, gameType: 'A' }, // All-Star
            BASELINE.dates[0].games[0],
          ],
        },
      ],
    }
    const out = normalizeScheduleResponse(raw)
    expect(out).toHaveLength(1)
    expect(out.find((g) => g.gamePk === 999)).toBeUndefined()
  })

  it('throws on an unknown MLB Stats team id (mapping mismatch)', () => {
    const raw: RawScheduleResponse = {
      dates: [
        {
          date: '2026-04-01',
          games: [
            {
              ...BASELINE.dates[0].games[0],
              teams: {
                home: { team: { id: 99999, name: 'Mystery' }, isWinner: false },
                away: { team: { id: 110, name: 'Baltimore' }, isWinner: false },
              },
            },
          ],
        },
      ],
    }
    expect(() => normalizeScheduleResponse(raw)).toThrow(/Unknown MLB Stats team id/)
  })

  it('flattens games across multiple dates', () => {
    const raw: RawScheduleResponse = {
      dates: [
        BASELINE.dates[0],
        {
          date: '2026-04-02',
          games: [
            {
              ...BASELINE.dates[0].games[0],
              gamePk: 778002,
              officialDate: '2026-04-02',
              gameDate: '2026-04-02T17:05:00Z',
            },
          ],
        },
      ],
    }
    const out = normalizeScheduleResponse(raw)
    expect(out).toHaveLength(2)
    expect(out.map((g: NormalizedGame) => g.gamePk).sort()).toEqual([778001, 778002])
  })

  it('preserves doubleHeader flag values from the raw response', () => {
    const raw: RawScheduleResponse = {
      dates: [
        {
          date: '2026-04-01',
          games: [
            { ...BASELINE.dates[0].games[0], gamePk: 1, doubleHeader: 'Y' },
            { ...BASELINE.dates[0].games[0], gamePk: 2, doubleHeader: 'S' },
          ],
        },
      ],
    }
    const out = normalizeScheduleResponse(raw)
    expect(out.find((g) => g.gamePk === 1)?.doubleHeader).toBe('Y')
    expect(out.find((g) => g.gamePk === 2)?.doubleHeader).toBe('S')
  })
})
