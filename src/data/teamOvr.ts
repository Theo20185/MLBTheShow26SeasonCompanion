// Team OVR derivation (PLAN.md §5.1).
//
// We don't get a team-level OVR from any API — we derive it from the
// per-player OVRs in the bundled roster snapshot. The formula is the
// average of the team's top 25 player OVRs, rounded to the nearest int.
// This is a tunable starting point: simple, defensible, easy to reason
// about. Tests pin its behavior so we can change it deliberately later.

export interface RosterPlayer {
  uuid: string
  name: string
  teamId: string
  ovr: number
  position: string
  isHitter: boolean
}

const ROSTER_DEPTH = 25

export function computeTeamOvr(players: RosterPlayer[]): number {
  if (players.length < ROSTER_DEPTH) {
    throw new Error(
      `Team must have at least ${ROSTER_DEPTH} players to compute an OVR; got ${players.length}`
    )
  }
  const top = players
    .map((p) => p.ovr)
    .sort((a, b) => b - a)
    .slice(0, ROSTER_DEPTH)
  const sum = top.reduce((acc, ovr) => acc + ovr, 0)
  return Math.round(sum / ROSTER_DEPTH)
}
