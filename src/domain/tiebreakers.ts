// Six-step tiebreaker stack for postseason seeding (PLAN.md §6.7).
//
//   1. Overall winning percentage
//   2. Head-to-head winning percentage
//   3. Intra-division record
//   4. Inter-division record (derived: total wins − div wins)
//   5. Second-half winning percentage (All-Star break = boundary)
//   6. Deterministic hash fallback (seeded by season.rngSeed)

import type { Season, TeamRecord } from './types'

/**
 * Returns negative if teamA should be seeded ahead of teamB, positive
 * if teamB ahead, never returns 0 (the deterministic fallback always
 * resolves a tie).
 */
export function compareTeamsForSeeding(
  season: Season,
  teamAId: string,
  teamBId: string
): number {
  const a = recordOf(season, teamAId)
  const b = recordOf(season, teamBId)

  // 1. Overall winPct
  const aPct = winPct(a)
  const bPct = winPct(b)
  if (aPct !== bPct) return bPct - aPct  // higher pct seeds higher (negative result)

  // 2. Head-to-head
  const aOverB = season.headToHead[teamAId]?.[teamBId] ?? 0
  const bOverA = season.headToHead[teamBId]?.[teamAId] ?? 0
  const h2hTotal = aOverB + bOverA
  if (h2hTotal > 0) {
    const aH2HPct = aOverB / h2hTotal
    if (aH2HPct !== 0.5) return aH2HPct > 0.5 ? -1 : 1
  }

  // 3. Intra-division record (winPct of div games)
  const aDivPct = divPct(a)
  const bDivPct = divPct(b)
  if (aDivPct !== bDivPct) return bDivPct - aDivPct

  // 4. Inter-division record
  const aInterPct = interPct(a)
  const bInterPct = interPct(b)
  if (aInterPct !== bInterPct) return bInterPct - aInterPct

  // 5. Second-half record
  const aShPct = secondHalfPct(a)
  const bShPct = secondHalfPct(b)
  if (aShPct !== bShPct) return bShPct - aShPct

  // 6. Deterministic fallback — hash of (rngSeed, sorted team ids).
  const sorted = [teamAId, teamBId].sort()
  const tag = `${season.rngSeed}:${sorted.join('|')}`
  let h = 0
  for (let i = 0; i < tag.length; i++) {
    h = ((h << 5) - h + tag.charCodeAt(i)) | 0
  }
  // Stable: if hash positive, A wins; if negative, B wins. Never 0
  // because string is non-empty and h is rarely 0.
  if (h === 0) return teamAId < teamBId ? -1 : 1
  return h > 0 ? -1 : 1
}

function recordOf(season: Season, teamId: string): TeamRecord {
  return season.teamRecords.find((r) => r.teamId === teamId)!
}

function totalW(r: TeamRecord): number {
  return r.firstHalfWins + r.secondHalfWins
}

function totalL(r: TeamRecord): number {
  return r.firstHalfLosses + r.secondHalfLosses
}

function winPct(r: TeamRecord): number {
  const games = totalW(r) + totalL(r)
  return games === 0 ? 0 : totalW(r) / games
}

function divPct(r: TeamRecord): number {
  const games = r.divisionWins + r.divisionLosses
  return games === 0 ? 0 : r.divisionWins / games
}

function interPct(r: TeamRecord): number {
  const interW = totalW(r) - r.divisionWins
  const interL = totalL(r) - r.divisionLosses
  const games = interW + interL
  return games === 0 ? 0 : interW / games
}

function secondHalfPct(r: TeamRecord): number {
  const games = r.secondHalfWins + r.secondHalfLosses
  return games === 0 ? 0 : r.secondHalfWins / games
}
