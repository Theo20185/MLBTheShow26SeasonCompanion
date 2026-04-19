// Single source of truth for team identity.
//
// Internal `id` is the 3-letter abbreviation (PLAN.md §4 + decision in
// loose end #4). External joins:
//   - `mlbStatsId` — used by statsapi.mlb.com (schedule fetch).
//   - `showShortName` — used by mlb26.theshow.com (roster fetch).
// Usually `showShortName === id`, but we keep them distinct in case of
// edge cases (e.g. franchise relocations / name changes).

export type LeagueId = 'AL' | 'NL'
export type DivisionId = 'East' | 'Central' | 'West'

export interface TeamMapEntry {
  id: string
  name: string
  city: string
  league: LeagueId
  division: DivisionId
  mlbStatsId: number
  showShortName: string
}

export const TEAM_MAP: readonly TeamMapEntry[] = [
  // AL East
  { id: 'BAL', name: 'Orioles',       city: 'Baltimore',     league: 'AL', division: 'East',    mlbStatsId: 110, showShortName: 'BAL' },
  { id: 'BOS', name: 'Red Sox',       city: 'Boston',        league: 'AL', division: 'East',    mlbStatsId: 111, showShortName: 'BOS' },
  { id: 'NYY', name: 'Yankees',       city: 'New York',      league: 'AL', division: 'East',    mlbStatsId: 147, showShortName: 'NYY' },
  { id: 'TB',  name: 'Rays',          city: 'Tampa Bay',     league: 'AL', division: 'East',    mlbStatsId: 139, showShortName: 'TB'  },
  { id: 'TOR', name: 'Blue Jays',     city: 'Toronto',       league: 'AL', division: 'East',    mlbStatsId: 141, showShortName: 'TOR' },
  // AL Central
  { id: 'CWS', name: 'White Sox',     city: 'Chicago',       league: 'AL', division: 'Central', mlbStatsId: 145, showShortName: 'CWS' },
  { id: 'CLE', name: 'Guardians',     city: 'Cleveland',     league: 'AL', division: 'Central', mlbStatsId: 114, showShortName: 'CLE' },
  { id: 'DET', name: 'Tigers',        city: 'Detroit',       league: 'AL', division: 'Central', mlbStatsId: 116, showShortName: 'DET' },
  { id: 'KC',  name: 'Royals',        city: 'Kansas City',   league: 'AL', division: 'Central', mlbStatsId: 118, showShortName: 'KC'  },
  { id: 'MIN', name: 'Twins',         city: 'Minnesota',     league: 'AL', division: 'Central', mlbStatsId: 142, showShortName: 'MIN' },
  // AL West
  { id: 'ATH', name: 'Athletics',     city: 'Athletics',     league: 'AL', division: 'West',    mlbStatsId: 133, showShortName: 'OAK' },
  { id: 'HOU', name: 'Astros',        city: 'Houston',       league: 'AL', division: 'West',    mlbStatsId: 117, showShortName: 'HOU' },
  { id: 'LAA', name: 'Angels',        city: 'Los Angeles',   league: 'AL', division: 'West',    mlbStatsId: 108, showShortName: 'LAA' },
  { id: 'SEA', name: 'Mariners',      city: 'Seattle',       league: 'AL', division: 'West',    mlbStatsId: 136, showShortName: 'SEA' },
  { id: 'TEX', name: 'Rangers',       city: 'Texas',         league: 'AL', division: 'West',    mlbStatsId: 140, showShortName: 'TEX' },
  // NL East
  { id: 'ATL', name: 'Braves',        city: 'Atlanta',       league: 'NL', division: 'East',    mlbStatsId: 144, showShortName: 'ATL' },
  { id: 'MIA', name: 'Marlins',       city: 'Miami',         league: 'NL', division: 'East',    mlbStatsId: 146, showShortName: 'MIA' },
  { id: 'NYM', name: 'Mets',          city: 'New York',      league: 'NL', division: 'East',    mlbStatsId: 121, showShortName: 'NYM' },
  { id: 'PHI', name: 'Phillies',      city: 'Philadelphia',  league: 'NL', division: 'East',    mlbStatsId: 143, showShortName: 'PHI' },
  { id: 'WSH', name: 'Nationals',     city: 'Washington',    league: 'NL', division: 'East',    mlbStatsId: 120, showShortName: 'WAS' },
  // NL Central
  { id: 'CHC', name: 'Cubs',          city: 'Chicago',       league: 'NL', division: 'Central', mlbStatsId: 112, showShortName: 'CHC' },
  { id: 'CIN', name: 'Reds',          city: 'Cincinnati',    league: 'NL', division: 'Central', mlbStatsId: 113, showShortName: 'CIN' },
  { id: 'MIL', name: 'Brewers',       city: 'Milwaukee',     league: 'NL', division: 'Central', mlbStatsId: 158, showShortName: 'MIL' },
  { id: 'PIT', name: 'Pirates',       city: 'Pittsburgh',    league: 'NL', division: 'Central', mlbStatsId: 134, showShortName: 'PIT' },
  { id: 'STL', name: 'Cardinals',     city: 'St. Louis',     league: 'NL', division: 'Central', mlbStatsId: 138, showShortName: 'STL' },
  // NL West
  { id: 'ARI', name: 'Diamondbacks',  city: 'Arizona',       league: 'NL', division: 'West',    mlbStatsId: 109, showShortName: 'ARI' },
  { id: 'COL', name: 'Rockies',       city: 'Colorado',      league: 'NL', division: 'West',    mlbStatsId: 115, showShortName: 'COL' },
  { id: 'LAD', name: 'Dodgers',       city: 'Los Angeles',   league: 'NL', division: 'West',    mlbStatsId: 119, showShortName: 'LAD' },
  { id: 'SD',  name: 'Padres',        city: 'San Diego',     league: 'NL', division: 'West',    mlbStatsId: 135, showShortName: 'SD'  },
  { id: 'SF',  name: 'Giants',        city: 'San Francisco', league: 'NL', division: 'West',    mlbStatsId: 137, showShortName: 'SF'  },
] as const

export const TEAM_BY_ID = new Map(TEAM_MAP.map((t) => [t.id, t]))
export const TEAM_BY_MLB_STATS_ID = new Map(
  TEAM_MAP.map((t) => [t.mlbStatsId, t])
)
export const TEAM_BY_SHOW_SHORT_NAME = new Map(
  TEAM_MAP.map((t) => [t.showShortName, t])
)
