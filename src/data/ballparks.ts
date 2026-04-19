// Each MLB team's primary home ballpark. Hardcoded because the The Show
// stadium API doesn't reliably expose team↔stadium joins, and the list
// is small + stable enough that auto-fetching adds no value.

export interface Ballpark {
  id: string       // ballpark id (slug)
  name: string     // canonical name to display
  city: string
  teamId: string   // which team's home park this is
  timezone: string // IANA timezone for the venue, used so game times display in park-local time
}

export const BALLPARKS: readonly Ballpark[] = [
  // AL East
  { id: 'oriole-park',         name: 'Oriole Park at Camden Yards', city: 'Baltimore',     teamId: 'BAL', timezone: 'America/New_York' },
  { id: 'fenway-park',         name: 'Fenway Park',                  city: 'Boston',        teamId: 'BOS', timezone: 'America/New_York' },
  { id: 'yankee-stadium',      name: 'Yankee Stadium',               city: 'New York',      teamId: 'NYY', timezone: 'America/New_York' },
  { id: 'tropicana-field',     name: 'Tropicana Field',              city: 'Tampa Bay',     teamId: 'TB',  timezone: 'America/New_York' },
  { id: 'rogers-centre',       name: 'Rogers Centre',                city: 'Toronto',       teamId: 'TOR', timezone: 'America/Toronto'  },
  // AL Central
  { id: 'rate-field',          name: 'Rate Field',                   city: 'Chicago',       teamId: 'CWS', timezone: 'America/Chicago'  },
  { id: 'progressive-field',   name: 'Progressive Field',            city: 'Cleveland',     teamId: 'CLE', timezone: 'America/New_York' },
  { id: 'comerica-park',       name: 'Comerica Park',                city: 'Detroit',       teamId: 'DET', timezone: 'America/Detroit'  },
  { id: 'kauffman-stadium',    name: 'Kauffman Stadium',             city: 'Kansas City',   teamId: 'KC',  timezone: 'America/Chicago'  },
  { id: 'target-field',        name: 'Target Field',                 city: 'Minneapolis',   teamId: 'MIN', timezone: 'America/Chicago'  },
  // AL West
  { id: 'sutter-health-park',  name: 'Sutter Health Park',           city: 'Sacramento',    teamId: 'ATH', timezone: 'America/Los_Angeles' },
  { id: 'daikin-park',         name: 'Daikin Park',                  city: 'Houston',       teamId: 'HOU', timezone: 'America/Chicago'     },
  { id: 'angel-stadium',       name: 'Angel Stadium',                city: 'Anaheim',       teamId: 'LAA', timezone: 'America/Los_Angeles' },
  { id: 't-mobile-park',       name: 'T-Mobile Park',                city: 'Seattle',       teamId: 'SEA', timezone: 'America/Los_Angeles' },
  { id: 'globe-life-field',    name: 'Globe Life Field',             city: 'Arlington',     teamId: 'TEX', timezone: 'America/Chicago'     },
  // NL East
  { id: 'truist-park',         name: 'Truist Park',                  city: 'Atlanta',       teamId: 'ATL', timezone: 'America/New_York' },
  { id: 'loandepot-park',      name: 'loanDepot park',               city: 'Miami',         teamId: 'MIA', timezone: 'America/New_York' },
  { id: 'citi-field',          name: 'Citi Field',                   city: 'New York',      teamId: 'NYM', timezone: 'America/New_York' },
  { id: 'citizens-bank-park',  name: 'Citizens Bank Park',           city: 'Philadelphia',  teamId: 'PHI', timezone: 'America/New_York' },
  { id: 'nationals-park',      name: 'Nationals Park',               city: 'Washington',    teamId: 'WSH', timezone: 'America/New_York' },
  // NL Central
  { id: 'wrigley-field',       name: 'Wrigley Field',                city: 'Chicago',       teamId: 'CHC', timezone: 'America/Chicago'  },
  { id: 'great-american-ball-park', name: 'Great American Ball Park', city: 'Cincinnati',  teamId: 'CIN', timezone: 'America/New_York' },
  { id: 'american-family-field', name: 'American Family Field',     city: 'Milwaukee',     teamId: 'MIL', timezone: 'America/Chicago'  },
  { id: 'pnc-park',            name: 'PNC Park',                     city: 'Pittsburgh',    teamId: 'PIT', timezone: 'America/New_York' },
  { id: 'busch-stadium',       name: 'Busch Stadium',                city: 'St. Louis',     teamId: 'STL', timezone: 'America/Chicago'  },
  // NL West
  { id: 'chase-field',         name: 'Chase Field',                  city: 'Phoenix',       teamId: 'ARI', timezone: 'America/Phoenix' },     // no DST
  { id: 'coors-field',         name: 'Coors Field',                  city: 'Denver',        teamId: 'COL', timezone: 'America/Denver'  },
  { id: 'dodger-stadium',      name: 'Dodger Stadium',               city: 'Los Angeles',   teamId: 'LAD', timezone: 'America/Los_Angeles' },
  { id: 'petco-park',          name: 'Petco Park',                   city: 'San Diego',     teamId: 'SD',  timezone: 'America/Los_Angeles' },
  { id: 'oracle-park',         name: 'Oracle Park',                  city: 'San Francisco', teamId: 'SF',  timezone: 'America/Los_Angeles' },
] as const

export const BALLPARK_BY_ID = new Map(BALLPARKS.map((b) => [b.id, b]))
export const BALLPARK_BY_TEAM_ID = new Map(
  BALLPARKS.map((b) => [b.teamId, b])
)
