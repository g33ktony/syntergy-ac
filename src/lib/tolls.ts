import { MX_TOLL_CORRIDORS, type MxTollCorridor } from '../data/mx-tolls'
import type { LatLng, TollEstimate, TripMode } from '../types'

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function aliasesMatch(name: string, aliases: string[]): boolean {
  const n = normalize(name)
  const tokens = n.split(' ').filter((t) => t.length >= 3)
  return aliases.some((a) => {
    const al = normalize(a)
    if (!al) return false
    if (n === al) return true
    if (al.length >= 4 && (n.includes(al) || tokens.includes(al))) return true
    return tokens.includes(al)
  })
}

function findCorridor(from: string, to: string): MxTollCorridor | undefined {
  return MX_TOLL_CORRIDORS.find(
    (c) =>
      (aliasesMatch(from, c.aliasesA) && aliasesMatch(to, c.aliasesB)) ||
      (aliasesMatch(from, c.aliasesB) && aliasesMatch(to, c.aliasesA)),
  )
}

function pathHitsBbox(path: LatLng[] | undefined, bbox: MxTollCorridor['bbox']): boolean {
  if (!path || !bbox) return false
  const [south, west, north, east] = bbox
  return path.some(
    (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east,
  )
}

export function estimateTolls(input: {
  from: string
  to: string
  path?: LatLng[]
  likelyTolls?: boolean
  roundTrip?: boolean
}): TollEstimate {
  const corridor =
    findCorridor(input.from, input.to) ??
    MX_TOLL_CORRIDORS.find((c) => pathHitsBbox(input.path, c.bbox))

  if (corridor) {
    const costMxn = input.roundTrip ? corridor.costMxn * 2 : corridor.costMxn
    return {
      likelyTolls: true,
      costMxn,
      source: 'mx-table',
      segments: [
        {
          id: corridor.id,
          name: input.roundTrip ? `${corridor.name} (ida y vuelta)` : corridor.name,
          costMxn,
        },
      ],
    }
  }

  if (input.likelyTolls) {
    return {
      likelyTolls: true,
      costMxn: 0,
      source: 'osm',
      segments: [],
    }
  }

  return {
    likelyTolls: false,
    costMxn: 0,
    source: 'none',
    segments: [],
  }
}

export function applyTollOverride(
  estimate: TollEstimate,
  overrideMxn: number,
): TollEstimate {
  const costMxn = Number.isFinite(overrideMxn) && overrideMxn >= 0 ? overrideMxn : 0
  return {
    ...estimate,
    likelyTolls: estimate.likelyTolls || costMxn > 0,
    costMxn,
    source: 'manual',
  }
}

/** Lookup stores one-way casetas; scale here so ida/redondo can change without a new fetch. */
export function tollCostForTripMode(
  oneWayMxn: number | undefined,
  mode: TripMode,
): number | undefined {
  if (oneWayMxn == null) return undefined
  return mode === 'roundTrip' ? oneWayMxn * 2 : oneWayMxn
}
