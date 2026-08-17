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
  }
}

function featureLabel(f: PhotonFeature): string {
  const p = f.properties ?? {}
  return [p.name ?? p.street, p.city, p.state, p.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ')
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
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=es&limit=${limit}`
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo buscar el lugar (Photon).')
    }
    return (await response.json()) as { features?: PhotonFeature[] }
  })
  return (data.features ?? [])
    .map((f) => {
      const coords = f.geometry?.coordinates
      if (!coords || coords.length < 2) return null
      const [lng, lat] = coords
      const label = featureLabel(f)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) return null
      return { label, latlng: { lat, lng } }
    })
    .filter((s): s is PlaceSuggestion => s != null)
}

export async function photonGeocode(query: string): Promise<LatLng> {
  const hits = await photonSuggest(query, 1)
  if (hits.length === 0) {
    throw new Error(`No se encontró «${query.trim()}». Prueba un nombre más específico.`)
  }
  return hits[0]!.latlng
}

export async function photonReverse(latlng: LatLng): Promise<string> {
  const url = `https://photon.komoot.io/reverse?lat=${latlng.lat}&lon=${latlng.lng}&lang=es`
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
