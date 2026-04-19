// Box-score validation + helpers (PLAN.md §6.4 full report).
//
// The Show lets Vs. CPU games run as short as 3 innings. Users can set
// their preferred regulation length on the season; the validator
// accepts that length without requiring the "shortened" flag. Reports
// shorter than the season's regulation length still work but must be
// marked shortened.

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

export const MIN_INNINGS = 3
const DEFAULT_REGULATION = 9

export interface ValidateOptions {
  /** Season-configured regulation length, e.g. 3, 5, 7, or 9 (default 9). */
  regulationLength?: number
}

export function validateBoxScore(
  input: BoxScoreInput,
  opts: ValidateOptions = {}
): ValidationResult {
  const regulation = opts.regulationLength ?? DEFAULT_REGULATION
  if (input.inningsHome.length !== input.inningsAway.length) {
    return { ok: false, error: 'Both teams must have the same number of innings' }
  }
  const innings = input.inningsHome.length
  if (innings < MIN_INNINGS) {
    return { ok: false, error: `Need at least ${MIN_INNINGS} innings` }
  }
  if (innings < regulation && !input.shortened) {
    return {
      ok: false,
      error: `Need ${regulation}+ innings unless game was shortened`,
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
