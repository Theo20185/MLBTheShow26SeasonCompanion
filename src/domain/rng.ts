// Mulberry32 — small, fast seeded PRNG. Returns a function that
// produces deterministic floats in [0, 1) given the seed (PLAN.md §6.5).
//
// We track the seed state on Season.rngSeed so re-running simulation
// from a snapshot reproduces results exactly. OVR overrides do NOT
// touch this seed (per the §6.5 invariant) — they only change the
// probability threshold a roll is compared against.

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return function () {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Advances a seed deterministically. Used for batched sim runs where we
 * want to checkpoint the seed after each game.
 */
export function nextSeed(seed: number): number {
  const rng = mulberry32(seed)
  // Burn one draw and derive the next seed from its bits.
  return Math.floor(rng() * 0x100000000) >>> 0
}
