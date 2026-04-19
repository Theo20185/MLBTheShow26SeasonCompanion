// Normalizer for the MLB The Show 26 cards endpoint.
// Pure function — the fetch script paginates the API and feeds the
// concatenated `items` array here.

import { TEAM_BY_SHOW_SHORT_NAME } from './teamIdMap'
import type { RosterPlayer } from './teamOvr'

// Subset of fields we keep from /apis/items.json?type=mlb_card.
export interface RawShowItem {
  uuid: string
  type: string                    // 'mlb_card', 'stadium', etc.
  name: string
  team: string                    // 'Yankees'
  team_short_name: string         // 'NYY'
  ovr: number
  display_position: string
  is_hitter: boolean
  series: string                  // 'Live', 'Topps Now', etc. — we only want 'Live'
}

export function normalizeRosterResponse(
  items: RawShowItem[]
): RosterPlayer[] {
  const out: RosterPlayer[] = []
  for (const item of items) {
    if (item.type !== 'mlb_card') continue
    if (item.series !== 'Live') continue
    const team = TEAM_BY_SHOW_SHORT_NAME.get(item.team_short_name)
    if (!team) continue
    out.push({
      uuid: item.uuid,
      name: item.name,
      teamId: team.id,
      ovr: item.ovr,
      position: item.display_position,
      isHitter: item.is_hitter,
    })
  }
  return out
}
