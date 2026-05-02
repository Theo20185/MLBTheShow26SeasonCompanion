// App-level preferences kept outside any individual save.
// Currently: theme mode, so the setting persists across saves and is
// available even on the landing screen with no save loaded.
//
// Resolution rule: a season's themeMode (when set) wins for that save;
// otherwise the app pref applies. When the user toggles theme inside
// a loaded season, both are written so the app pref always tracks the
// most recent user choice.

import type { Season, ThemeMode } from './types'

export interface AppPrefs {
  themeMode: ThemeMode
}

export const DEFAULT_APP_PREFS: AppPrefs = {
  themeMode: 'dark',
}

const STORAGE_KEY = 'app:prefs'

export function loadAppPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APP_PREFS }
    const parsed = JSON.parse(raw) as Partial<AppPrefs>
    return {
      ...DEFAULT_APP_PREFS,
      ...parsed,
      themeMode: parsed.themeMode === 'light' ? 'light' : 'dark',
    }
  } catch {
    return { ...DEFAULT_APP_PREFS }
  }
}

export function saveAppPrefs(prefs: AppPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function setAppThemeMode(mode: ThemeMode): void {
  const prefs = loadAppPrefs()
  saveAppPrefs({ ...prefs, themeMode: mode })
}

/**
 * Returns the theme mode that should be active right now. Season
 * override wins when set (in-game personalization); otherwise the
 * app-level pref applies; otherwise the hardcoded default.
 */
export function resolveActiveThemeMode(season: Season | null): ThemeMode {
  if (season?.themeMode) return season.themeMode
  return loadAppPrefs().themeMode
}
