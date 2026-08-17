import type { LatLng } from '../../types'
import { enqueuePublicRequest } from '../rate-limit'

export type PlaceSuggestion = {
  label: string
  latlng: LatLng
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    city?: string
    state?: string
    country?: string
    osm_value?: string
    type?: string
  }
}

/** Photon only supports default/de/en/fr — `lang=es` returns HTTP 400. */
const PHOTON_API = 'https://photon.komoot.io/api/'
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse'

/** Bias toward Mexico so CDMX/Querétaro beat random homonyms. */
const MX_BIAS = { lat: 23.6345, lon: -102.5528 }

const PLACE_RANK: Record<string, number> = {
  city: 0,
  town: 1,
  village: 2,
  municipality: 2,
  hamlet: 3,
  state: 4,
  county: 5,
}

function featureLabel(f: PhotonFeature): string {
  const p = f.properties ?? {}
  return [p.name ?? p.street, p.city, p.state, p.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ')
}

function placeRank(f: PhotonFeature): number {
  const value = f.properties?.osm_value ?? f.properties?.type ?? ''
  return PLACE_RANK[value] ?? 40
}

function toSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const coords = f.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  const label = featureLabel(f)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null
  return { label, latlng: { lat, lng } }
}

/**
 * Photon (Komoot) public geocoder. No key. Throttle via enqueuePublicRequest.
 * https://photon.komoot.io
 */
export async function photonSuggest(
  query: string,
  limit = 5,
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url =
    `${PHOTON_API}?q=${encodeURIComponent(q)}&limit=${Math.max(limit, 8)}` +
    `&lat=${MX_BIAS.lat}&lon=${MX_BIAS.lon}`
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo buscar el lugar (Photon).')
    }
    return (await response.json()) as { features?: PhotonFeature[] }
  })
  const ranked = [...(data.features ?? [])].sort(
    (a, b) => placeRank(a) - placeRank(b),
  )
  const seen = new Set<string>()
  const hits: PlaceSuggestion[] = []
  for (const f of ranked) {
    const s = toSuggestion(f)
    if (!s || seen.has(s.label)) continue
    seen.add(s.label)
    hits.push(s)
    if (hits.length >= limit) break
  }
  return hits
}

export async function photonGeocode(query: string): Promise<LatLng> {
  const hits = await photonSuggest(query, 1)
  if (hits.length === 0) {
    throw new Error(`No se encontró «${query.trim()}». Prueba un nombre más específico.`)
  }
  return hits[0]!.latlng
}

export async function photonReverse(latlng: LatLng): Promise<string> {
  const url = `${PHOTON_REVERSE}?lat=${latlng.lat}&lon=${latlng.lng}`
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo invertir la coordenada.')
    }
    return (await response.json()) as { features?: PhotonFeature[] }
  })
  const label = data.features?.[0] ? featureLabel(data.features[0]) : ''
  return label || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
}
