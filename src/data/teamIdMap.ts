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

export interface TeamColors {
  /** Primary brand color (hex). Used for the user-team CTAs when this
   *  team is picked as a color preset, or the team-colors picker. */
  primary: string
  /** Secondary brand color (hex). */
  secondary: string
}

export interface TeamMapEntry {
  id: string
  name: string
  city: string
  league: LeagueId
  division: DivisionId
  mlbStatsId: number
  showShortName: string
  colors: TeamColors
}

// Primary + secondary colors are well-known MLB team brand colors,
// approximated to the nearest commonly-used hex value. Sourced from
// each team's official primary palette.
export const TEAM_MAP: readonly TeamMapEntry[] = [
  // AL East
  { id: 'BAL', name: 'Orioles',       city: 'Baltimore',     league: 'AL', division: 'East',    mlbStatsId: 110, showShortName: 'BAL', colors: { primary: '#DF4601', secondary: '#000000' } },
  { id: 'BOS', name: 'Red Sox',       city: 'Boston',        league: 'AL', division: 'East',    mlbStatsId: 111, showShortName: 'BOS', colors: { primary: '#BD3039', secondary: '#0C2340' } },
  { id: 'NYY', name: 'Yankees',       city: 'New York',      league: 'AL', division: 'East',    mlbStatsId: 147, showShortName: 'NYY', colors: { primary: '#003087', secondary: '#E4002C' } },
  { id: 'TB',  name: 'Rays',          city: 'Tampa Bay',     league: 'AL', division: 'East',    mlbStatsId: 139, showShortName: 'TB',  colors: { primary: '#092C5C', secondary: '#8FBCE6' } },
  { id: 'TOR', name: 'Blue Jays',     city: 'Toronto',       league: 'AL', division: 'East',    mlbStatsId: 141, showShortName: 'TOR', colors: { primary: '#134A8E', secondary: '#E8291C' } },
  // AL Central
  { id: 'CWS', name: 'White Sox',     city: 'Chicago',       league: 'AL', division: 'Central', mlbStatsId: 145, showShortName: 'CWS', colors: { primary: '#27251F', secondary: '#C4CED4' } },
  { id: 'CLE', name: 'Guardians',     city: 'Cleveland',     league: 'AL', division: 'Central', mlbStatsId: 114, showShortName: 'CLE', colors: { primary: '#00385D', secondary: '#E50022' } },
  { id: 'DET', name: 'Tigers',        city: 'Detroit',       league: 'AL', division: 'Central', mlbStatsId: 116, showShortName: 'DET', colors: { primary: '#0C2340', secondary: '#FA4616' } },
  { id: 'KC',  name: 'Royals',        city: 'Kansas City',   league: 'AL', division: 'Central', mlbStatsId: 118, showShortName: 'KC',  colors: { primary: '#004687', secondary: '#BD9B60' } },
  { id: 'MIN', name: 'Twins',         city: 'Minnesota',     league: 'AL', division: 'Central', mlbStatsId: 142, showShortName: 'MIN', colors: { primary: '#002B5C', secondary: '#D31145' } },
  // AL West
  { id: 'ATH', name: 'Athletics',     city: 'Athletics',     league: 'AL', division: 'West',    mlbStatsId: 133, showShortName: 'OAK', colors: { primary: '#003831', secondary: '#EFB21E' } },
  { id: 'HOU', name: 'Astros',        city: 'Houston',       league: 'AL', division: 'West',    mlbStatsId: 117, showShortName: 'HOU', colors: { primary: '#002D62', secondary: '#EB6E1F' } },
  { id: 'LAA', name: 'Angels',        city: 'Los Angeles',   league: 'AL', division: 'West',    mlbStatsId: 108, showShortName: 'LAA', colors: { primary: '#BA0021', secondary: '#003263' } },
  { id: 'SEA', name: 'Mariners',      city: 'Seattle',       league: 'AL', division: 'West',    mlbStatsId: 136, showShortName: 'SEA', colors: { primary: '#0C2C56', secondary: '#005C5C' } },
  { id: 'TEX', name: 'Rangers',       city: 'Texas',         league: 'AL', division: 'West',    mlbStatsId: 140, showShortName: 'TEX', colors: { primary: '#003278', secondary: '#C0111F' } },
  // NL East
  { id: 'ATL', name: 'Braves',        city: 'Atlanta',       league: 'NL', division: 'East',    mlbStatsId: 144, showShortName: 'ATL', colors: { primary: '#13274F', secondary: '#CE1141' } },
  { id: 'MIA', name: 'Marlins',       city: 'Miami',         league: 'NL', division: 'East',    mlbStatsId: 146, showShortName: 'MIA', colors: { primary: '#00A3E0', secondary: '#000000' } },
  { id: 'NYM', name: 'Mets',          city: 'New York',      league: 'NL', division: 'East',    mlbStatsId: 121, showShortName: 'NYM', colors: { primary: '#002D72', secondary: '#FF5910' } },
  { id: 'PHI', name: 'Phillies',      city: 'Philadelphia',  league: 'NL', division: 'East',    mlbStatsId: 143, showShortName: 'PHI', colors: { primary: '#E81828', secondary: '#002D72' } },
  { id: 'WSH', name: 'Nationals',     city: 'Washington',    league: 'NL', division: 'East',    mlbStatsId: 120, showShortName: 'WAS', colors: { primary: '#AB0003', secondary: '#14225D' } },
  // NL Central
  { id: 'CHC', name: 'Cubs',          city: 'Chicago',       league: 'NL', division: 'Central', mlbStatsId: 112, showShortName: 'CHC', colors: { primary: '#0E3386', secondary: '#CC3433' } },
  { id: 'CIN', name: 'Reds',          city: 'Cincinnati',    league: 'NL', division: 'Central', mlbStatsId: 113, showShortName: 'CIN', colors: { primary: '#C6011F', secondary: '#000000' } },
  { id: 'MIL', name: 'Brewers',       city: 'Milwaukee',     league: 'NL', division: 'Central', mlbStatsId: 158, showShortName: 'MIL', colors: { primary: '#12284B', secondary: '#FFC52F' } },
  { id: 'PIT', name: 'Pirates',       city: 'Pittsburgh',    league: 'NL', division: 'Central', mlbStatsId: 134, showShortName: 'PIT', colors: { primary: '#000000', secondary: '#FDB827' } },
  { id: 'STL', name: 'Cardinals',     city: 'St. Louis',     league: 'NL', division: 'Central', mlbStatsId: 138, showShortName: 'STL', colors: { primary: '#C41E3A', secondary: '#0C2340' } },
  // NL West
  { id: 'ARI', name: 'Diamondbacks',  city: 'Arizona',       league: 'NL', division: 'West',    mlbStatsId: 109, showShortName: 'ARI', colors: { primary: '#A71930', secondary: '#E3D4AD' } },
  { id: 'COL', name: 'Rockies',       city: 'Colorado',      league: 'NL', division: 'West',    mlbStatsId: 115, showShortName: 'COL', colors: { primary: '#33006F', secondary: '#C4CED4' } },
  { id: 'LAD', name: 'Dodgers',       city: 'Los Angeles',   league: 'NL', division: 'West',    mlbStatsId: 119, showShortName: 'LAD', colors: { primary: '#005A9C', secondary: '#EF3E42' } },
  { id: 'SD',  name: 'Padres',        city: 'San Diego',     league: 'NL', division: 'West',    mlbStatsId: 135, showShortName: 'SD',  colors: { primary: '#2F241D', secondary: '#FFC425' } },
  { id: 'SF',  name: 'Giants',        city: 'San Francisco', league: 'NL', division: 'West',    mlbStatsId: 137, showShortName: 'SF',  colors: { primary: '#FD5A1E', secondary: '#000000' } },
] as const

export const TEAM_BY_ID = new Map(TEAM_MAP.map((t) => [t.id, t]))
export const TEAM_BY_MLB_STATS_ID = new Map(
  TEAM_MAP.map((t) => [t.mlbStatsId, t])
)
export const TEAM_BY_SHOW_SHORT_NAME = new Map(
  TEAM_MAP.map((t) => [t.showShortName, t])
)
