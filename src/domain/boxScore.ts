// Box-score validation + helpers (PLAN.md §6.4 full report).

export interface BoxScoreInput {
  inningsHome: number[]
  inningsAway: number[]
  hitsHome: number
  hitsAway: number
  errorsHome: number
  errorsAway: number
  shortened: boolean
}

export interface ValidationResult {
  ok: boolean
  error?: string
}

const STANDARD_INNINGS = 9

export function validateBoxScore(input: BoxScoreInput): ValidationResult {
  if (input.inningsHome.length !== input.inningsAway.length) {
    return { ok: false, error: 'Both teams must have the same number of innings' }
  }
  const innings = input.inningsHome.length
  if (innings < STANDARD_INNINGS && !input.shortened) {
    return {
      ok: false,
      error: `Need ${STANDARD_INNINGS}+ innings unless game was shortened`,
    }
  }
  if (input.inningsHome.some((r) => r < 0) || input.inningsAway.some((r) => r < 0)) {
    return { ok: false, error: 'Inning runs cannot be negative' }
  }
  if (input.hitsHome < 0 || input.hitsAway < 0) {
    return { ok: false, error: 'Hits cannot be negative' }
  }
  if (input.errorsHome < 0 || input.errorsAway < 0) {
    return { ok: false, error: 'Errors cannot be negative' }
  }
  if (totalRuns(input.inningsHome) === totalRuns(input.inningsAway)) {
    return { ok: false, error: 'Game cannot end in a tie — add extra innings' }
  }
  return { ok: true }
}

export function inferWinnerFromBoxScore(
  input: BoxScoreInput
): 'home' | 'away' {
  return totalRuns(input.inningsHome) > totalRuns(input.inningsAway)
    ? 'home'
    : 'away'
}

export function totalRuns(innings: number[]): number {
  return innings.reduce((sum, r) => sum + r, 0)
}
