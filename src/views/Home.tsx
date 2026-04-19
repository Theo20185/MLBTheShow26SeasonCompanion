// Launch screen. For now this is a placeholder — phase 5 (team picker)
// will fill this in with the real "New Season" / "Continue" affordances
// once we have season persistence to detect.

export function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-900 p-6 text-slate-100">
      <h1 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
        MLB The Show 26 Season Companion
      </h1>
      <p className="max-w-md text-center text-base text-slate-400 md:text-lg">
        Run a custom 162-game Diamond Dynasty season. Pick a team, play the
        schedule Vs. CPU, and let the app handle the rest of the league.
      </p>
      <p className="text-sm text-slate-500">
        Setup screen coming in phase 5.
      </p>
    </main>
  )
}
