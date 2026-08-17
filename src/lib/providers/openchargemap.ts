import type { ChargingPoi, LatLng } from '../../types'
import { samplePathEveryKm } from '../elevation-profile'
import { enqueuePublicRequest } from '../rate-limit'

type OcmPoi = {
  ID?: number
  UUID?: string
  AddressInfo?: {
    Title?: string
    Latitude?: number
    Longitude?: number
  }
  Connections?: Array<{ PowerKW?: number; ConnectionType?: { Title?: string } }>
  OperatorInfo?: { Title?: string }
}

function alongKm(path: LatLng[], poi: LatLng): number {
  let best = Infinity
  let acc = 0
  let at = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const dLat = b.lat - a.lat
    const dLng = b.lng - a.lng
    const seg = Math.hypot(dLat, dLng) || 1
    const t = Math.max(
      0,
      Math.min(1, ((poi.lat - a.lat) * dLat + (poi.lng - a.lng) * dLng) / (seg * seg)),
    )
    const proj = { lat: a.lat + dLat * t, lng: a.lng + dLng * t }
    const dist = Math.hypot(poi.lat - proj.lat, poi.lng - proj.lng)
    if (dist < best) {
      best = dist
      at = acc + t * 40
    }
    acc += 40
  }
  return at
}

/**
 * OpenChargeMap POIs sampled along a path. Optional free API key via X-API-Key.
 * https://openchargemap.org
 */
export async function fetchChargingPoisAlongPath(
  path: LatLng[],
  apiKey?: string | null,
): Promise<ChargingPoi[]> {
  if (path.length < 2) return []
  const samples = samplePathEveryKm(path, 40).slice(0, 8)
  const seen = new Set<string>()
  const pois: ChargingPoi[] = []

  for (const sample of samples) {
    const url = new URL('https://api.openchargemap.io/v3/poi/')
    url.searchParams.set('output', 'json')
    url.searchParams.set('latitude', String(sample.lat))
    url.searchParams.set('longitude', String(sample.lng))
    url.searchParams.set('distance', '20')
    url.searchParams.set('distanceunit', 'KM')
    url.searchParams.set('maxresults', '8')
    url.searchParams.set('compact', 'true')
    url.searchParams.set('verbose', 'false')

    const headers: Record<string, string> = {}
    if (apiKey?.trim()) headers['X-API-Key'] = apiKey.trim()

    let rows: OcmPoi[] = []
    try {
      const data = await enqueuePublicRequest(async () => {
        const response = await fetch(url.toString(), { headers })
        if (!response.ok) {
          throw new Error(`OpenChargeMap ${response.status}`)
        }
        return (await response.json()) as OcmPoi[]
      })
      rows = Array.isArray(data) ? data : []
    } catch {
      continue
    }

    for (const row of rows) {
      const id = String(row.UUID ?? row.ID ?? '')
      const lat = row.AddressInfo?.Latitude
      const lng = row.AddressInfo?.Longitude
      if (!id || seen.has(id) || lat == null || lng == null) continue
      seen.add(id)
      const power = row.Connections?.map((c) => c.PowerKW).find(
        (n) => typeof n === 'number',
      )
      pois.push({
        id,
        name: row.AddressInfo?.Title ?? 'Cargador',
        lat,
        lng,
        powerKW: power,
        connectors: row.Connections?.map((c) => c.ConnectionType?.Title).filter(
          (t): t is string => Boolean(t),
        ),
        network: row.OperatorInfo?.Title,
        alongKm: alongKm(path, { lat, lng }),
      })
    }
  }

  return pois.sort((a, b) => (a.alongKm ?? 0) - (b.alongKm ?? 0)).slice(0, 12)
}
