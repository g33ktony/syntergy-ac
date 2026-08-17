import type { LatLng } from '../../types'
import {
  gainLossFromElevations,
  samplePath,
  samplePathEveryKm,
} from '../elevation-profile'
import { enqueuePublicRequest } from '../rate-limit'

const OPENTOPO_URL = 'https://api.opentopodata.org/v1/aster30m'

type OpenTopoResponse = {
  results?: Array<{ elevation?: number | null }>
}

/**
 * Sample elevations along a path via public OpenTopoData ASTER (max 100 pts).
 * Public instance: ~1 req/s — always go through enqueuePublicRequest.
 */
export async function fetchElevationProfile(path: LatLng[]): Promise<{
  gainM: number
  lossM: number
}> {
  const sampled = samplePath(samplePathEveryKm(path, 2), 100)
  if (sampled.length < 2) return { gainM: 0, lossM: 0 }

  const locations = sampled.map((p) => `${p.lat},${p.lng}`).join('|')
  const url = `${OPENTOPO_URL}?locations=${encodeURIComponent(locations)}`
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo obtener la elevación (OpenTopoData).')
    }
    return (await response.json()) as OpenTopoResponse
  })

  const samples = (data.results ?? [])
    .map((r) => r.elevation)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  if (samples.length < 2) return { gainM: 0, lossM: 0 }
  return gainLossFromElevations(samples)
}
