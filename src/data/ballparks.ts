// Each MLB team's primary home ballpark. Hardcoded because the The Show
// stadium API doesn't reliably expose team↔stadium joins, and the list
// is small + stable enough that auto-fetching adds no value.

export interface Ballpark {
  id: string       // ballpark id (slug)
  name: string     // canonical name to display
  city: string
  teamId: string   // which team's home park this is
}

export const BALLPARKS: readonly Ballpark[] = [
  // AL East
  { id: 'oriole-park',         name: 'Oriole Park at Camden Yards', city: 'Baltimore',     teamId: 'BAL' },
  { id: 'fenway-park',         name: 'Fenway Park',                  city: 'Boston',        teamId: 'BOS' },
  { id: 'yankee-stadium',      name: 'Yankee Stadium',               city: 'New York',      teamId: 'NYY' },
  { id: 'tropicana-field',     name: 'Tropicana Field',              city: 'Tampa Bay',     teamId: 'TB'  },
  { id: 'rogers-centre',       name: 'Rogers Centre',                city: 'Toronto',       teamId: 'TOR' },
  // AL Central
  { id: 'rate-field',          name: 'Rate Field',                   city: 'Chicago',       teamId: 'CWS' },
  { id: 'progressive-field',   name: 'Progressive Field',            city: 'Cleveland',     teamId: 'CLE' },
  { id: 'comerica-park',       name: 'Comerica Park',                city: 'Detroit',       teamId: 'DET' },
  { id: 'kauffman-stadium',    name: 'Kauffman Stadium',             city: 'Kansas City',   teamId: 'KC'  },
  { id: 'target-field',        name: 'Target Field',                 city: 'Minneapolis',   teamId: 'MIN' },
  // AL West
  { id: 'sutter-health-park',  name: 'Sutter Health Park',           city: 'Sacramento',    teamId: 'ATH' },
  { id: 'daikin-park',         name: 'Daikin Park',                  city: 'Houston',       teamId: 'HOU' },
  { id: 'angel-stadium',       name: 'Angel Stadium',                city: 'Anaheim',       teamId: 'LAA' },
  { id: 't-mobile-park',       name: 'T-Mobile Park',                city: 'Seattle',       teamId: 'SEA' },
  { id: 'globe-life-field',    name: 'Globe Life Field',             city: 'Arlington',     teamId: 'TEX' },
  // NL East
  { id: 'truist-park',         name: 'Truist Park',                  city: 'Atlanta',       teamId: 'ATL' },
  { id: 'loandepot-park',      name: 'loanDepot park',               city: 'Miami',         teamId: 'MIA' },
  { id: 'citi-field',          name: 'Citi Field',                   city: 'New York',      teamId: 'NYM' },
  { id: 'citizens-bank-park',  name: 'Citizens Bank Park',           city: 'Philadelphia',  teamId: 'PHI' },
  { id: 'nationals-park',      name: 'Nationals Park',               city: 'Washington',    teamId: 'WSH' },
  // NL Central
  { id: 'wrigley-field',       name: 'Wrigley Field',                city: 'Chicago',       teamId: 'CHC' },
  { id: 'great-american-ball-park', name: 'Great American Ball Park', city: 'Cincinnati',  teamId: 'CIN' },
  { id: 'american-family-field', name: 'American Family Field',     city: 'Milwaukee',     teamId: 'MIL' },
  { id: 'pnc-park',            name: 'PNC Park',                     city: 'Pittsburgh',    teamId: 'PIT' },
  { id: 'busch-stadium',       name: 'Busch Stadium',                city: 'St. Louis',     teamId: 'STL' },
  // NL West
  { id: 'chase-field',         name: 'Chase Field',                  city: 'Phoenix',       teamId: 'ARI' },
  { id: 'coors-field',         name: 'Coors Field',                  city: 'Denver',        teamId: 'COL' },
  { id: 'dodger-stadium',      name: 'Dodger Stadium',               city: 'Los Angeles',   teamId: 'LAD' },
  { id: 'petco-park',          name: 'Petco Park',                   city: 'San Diego',     teamId: 'SD'  },
  { id: 'oracle-park',         name: 'Oracle Park',                  city: 'San Francisco', teamId: 'SF'  },
] as const

export const BALLPARK_BY_ID = new Map(BALLPARKS.map((b) => [b.id, b]))
export const BALLPARK_BY_TEAM_ID = new Map(
  BALLPARKS.map((b) => [b.teamId, b])
)
