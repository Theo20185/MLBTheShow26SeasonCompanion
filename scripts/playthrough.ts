// End-to-end playthrough harness.
//
// Runs many full season + postseason simulations across a matrix of
// (user team, RNG seed, behavior profile) and asserts invariants at
// every step. Failures are dumped to scripts/.cache/playthrough-failures/
// for investigation. Designed for catching state-machine bugs (like
// the Wild Card bye regression) that unit tests miss.
//
// Run with: npm run test:playthrough
// Options:
//   --seeds=N            number of RNG seeds per team (default 3)
//   --teams=ID,ID,...    only run these team ids (default: all 30)
//   --profiles=name,...  only these behavior profiles (default: a useful subset)
//   --max-steps=N        cap steps per playthrough to catch infinite loops (default 1000)
//   --full               run all 30 teams × 5 seeds × all profiles

import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEAM_MAP } from '../src/data/teamIdMap'
import { createSeason } from '../src/domain/createSeason'
import {
  ALL_INVARIANTS,
  type Invariant,
  type InvariantFailure,
} from './playthrough/invariants'
import {
  ALL_PROFILES,
  alwaysWin,
  alwaysLose,
  mixed5050,
  goodTeam,
  simAheadToAllStar,
  simAheadToPostseason,
  simAheadToWorldSeries,
  type BehaviorProfile,
} from './playthrough/behaviors'
import type { Season } from '../src/domain/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FAILURES_DIR = join(__dirname, '.cache', 'playthrough-failures')

// Default subset: most distinct behaviors, less repetition than ALL.
const DEFAULT_PROFILES: BehaviorProfile[] = [
  alwaysWin,
  alwaysLose,
  mixed5050,
  goodTeam,
  simAheadToAllStar,
  simAheadToPostseason,
  simAheadToWorldSeries,
]

interface CliArgs {
  seeds: number
  teams: string[]
  profiles: BehaviorProfile[]
  maxSteps: number
  full: boolean
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2)
  let seeds = 3
  let teams = TEAM_MAP.map((t) => t.id)
  let profiles = DEFAULT_PROFILES
  let maxSteps = 1000
  let full = false

  for (const arg of argv) {
    if (arg.startsWith('--seeds=')) {
      seeds = parseInt(arg.slice('--seeds='.length), 10)
    } else if (arg.startsWith('--teams=')) {
      teams = arg.slice('--teams='.length).split(',').map((s) => s.trim().toUpperCase())
    } else if (arg.startsWith('--profiles=')) {
      const names = arg.slice('--profiles='.length).split(',').map((s) => s.trim())
      profiles = ALL_PROFILES.filter((p) => names.includes(p.name))
      if (profiles.length === 0) {
        throw new Error(`No matching profiles in: ${names.join(', ')}`)
      }
    } else if (arg.startsWith('--max-steps=')) {
      maxSteps = parseInt(arg.slice('--max-steps='.length), 10)
    } else if (arg === '--full') {
      full = true
      seeds = 5
      profiles = ALL_PROFILES
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${arg}`)
    }
  }
  return { seeds, teams, profiles, maxSteps, full }
}

function printHelp() {
  console.log(`Usage: npm run test:playthrough -- [options]
  --seeds=N            number of RNG seeds per team (default 3)
  --teams=ID,ID,...    only run these team ids (default: all 30)
  --profiles=name,...  only these behavior profiles
  --max-steps=N        cap steps per playthrough (default 1000)
  --full               5 seeds × 30 teams × all 7 profiles
`)
}

interface PlaythroughResult {
  team: string
  seed: number
  profile: string
  steps: number
  finalStatus: Season['status']
  champion?: string
  failures: InvariantFailure[]
}

function checkInvariants(
  season: Season,
  invariants: Invariant[]
): InvariantFailure[] {
  const out: InvariantFailure[] = []
  for (const inv of invariants) {
    const f = inv(season)
    if (f) out.push(f)
  }
  return out
}

async function runPlaythrough(
  team: string,
  seed: number,
  profile: BehaviorProfile,
  maxSteps: number
): Promise<PlaythroughResult> {
  const failures: InvariantFailure[] = []

  // Default squad identity so the user can also configure squads correctly.
  let season: Season = createSeason({
    userTeamId: team,
    rngSeed: seed,
    userSquad: { name: 'Test Squad', abbrev: 'TST' },
    userSquadOvr: 80,
  })

  // Initial invariant check.
  for (const f of checkInvariants(season, ALL_INVARIANTS)) {
    failures.push({ ...f, message: `[step 0] ${f.message}` })
  }

  let steps = 0
  while (steps < maxSteps) {
    const next = profile.step(season)
    if (next === null) break  // profile signals "done"
    season = next
    steps++

    // Run invariants after every step. Cheap enough for our scale.
    const stepFailures = checkInvariants(season, ALL_INVARIANTS)
    if (stepFailures.length > 0) {
      for (const f of stepFailures) {
        failures.push({ ...f, message: `[step ${steps}] ${f.message}` })
      }
      // Bail on first invariant failure to keep the dump focused.
      break
    }

    if (season.status === 'complete') break
  }

  if (steps >= maxSteps) {
    failures.push({
      name: 'maxStepsExceeded',
      message: `Playthrough did not terminate after ${maxSteps} steps; possible infinite loop`,
    })
  }

  return {
    team,
    seed,
    profile: profile.name,
    steps,
    finalStatus: season.status,
    champion: season.champion,
    failures,
  }
}

async function dumpFailure(
  result: PlaythroughResult,
  finalSeason: Season | null
): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${ts}-${result.team}-seed${result.seed}-${result.profile}.json`
  const path = join(FAILURES_DIR, filename)
  const payload = {
    repro: {
      team: result.team,
      seed: result.seed,
      profile: result.profile,
    },
    summary: {
      steps: result.steps,
      finalStatus: result.finalStatus,
      champion: result.champion,
    },
    failures: result.failures,
    finalSeason,
  }
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8')
  return path
}

async function main() {
  const args = parseArgs()
  await mkdir(FAILURES_DIR, { recursive: true })
  // Clear prior failures so each run starts clean.
  try {
    await rm(FAILURES_DIR, { recursive: true })
    await mkdir(FAILURES_DIR, { recursive: true })
  } catch {
    // ignore
  }

  const total = args.teams.length * args.seeds * args.profiles.length
  console.log(
    `Running ${total} playthroughs (${args.teams.length} teams × ${args.seeds} seeds × ${args.profiles.length} profiles, max ${args.maxSteps} steps each)`
  )

  const results: PlaythroughResult[] = []
  let done = 0
  let lastReportPct = -1
  const startTime = Date.now()

  for (const team of args.teams) {
    for (let s = 0; s < args.seeds; s++) {
      const seed = (s + 1) * 1009 + simpleHash(team)  // distinct but reproducible
      for (const profile of args.profiles) {
        const result = await runPlaythrough(team, seed, profile, args.maxSteps)
        results.push(result)
        done++
        const pct = Math.floor((done / total) * 100)
        if (pct >= lastReportPct + 5) {
          lastReportPct = pct
          process.stdout.write(`  ${done}/${total} (${pct}%)\r`)
        }
        if (result.failures.length > 0) {
          // Re-run to capture the final season state at the moment of
          // failure (we lost it in the loop above).
          const replay = await runPlaythrough(
            result.team,
            result.seed,
            profile,
            args.maxSteps
          )
          // Use the replay's final state — same seed, same outcome.
          let replayedSeason: Season = createSeason({
            userTeamId: result.team,
            rngSeed: result.seed,
            userSquad: { name: 'Test Squad', abbrev: 'TST' },
            userSquadOvr: 80,
          })
          for (let i = 0; i < replay.steps; i++) {
            const next = profile.step(replayedSeason)
            if (next === null) break
            replayedSeason = next
          }
          const path = await dumpFailure(result, replayedSeason)
          console.log(
            `\n  ✗ FAIL ${result.team} seed=${result.seed} ${result.profile}: ${result.failures.length} invariant(s) failed; dumped ${path}`
          )
        }
      }
    }
  }

  process.stdout.write('\n')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const passed = results.filter((r) => r.failures.length === 0)
  const failed = results.filter((r) => r.failures.length > 0)

  console.log('\n=== Playthrough summary ===')
  console.log(`Total:    ${results.length} (${elapsed}s)`)
  console.log(`Passed:   ${passed.length}`)
  console.log(`Failed:   ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailures by invariant:')
    const byInvariant = new Map<string, number>()
    for (const r of failed) {
      for (const f of r.failures) {
        byInvariant.set(f.name, (byInvariant.get(f.name) ?? 0) + 1)
      }
    }
    for (const [name, count] of [...byInvariant.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${name.padEnd(40)} ${count}`)
    }
    console.log(`\nFailure dumps: ${FAILURES_DIR}`)
    process.exit(1)
  }

  // Quality stats for green runs.
  console.log('\nFinal status distribution:')
  const byStatus = new Map<string, number>()
  for (const r of passed) {
    byStatus.set(r.finalStatus, (byStatus.get(r.finalStatus) ?? 0) + 1)
  }
  for (const [status, count] of byStatus) {
    console.log(`  ${status.padEnd(15)} ${count}`)
  }

  const avgSteps = passed.reduce((sum, r) => sum + r.steps, 0) / Math.max(1, passed.length)
  console.log(`Average steps per playthrough: ${avgSteps.toFixed(1)}`)
}

function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
