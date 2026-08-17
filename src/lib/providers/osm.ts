import type { LatLng, RouteLeg, RouteQuery } from '../../types'
import { isLatLng, placeRefToQuery } from '../place'
import { gainLossFromElevations } from '../elevation-profile'
import { enqueuePublicRequest } from '../rate-limit'
import type { ProviderEnrichment } from '../route-enrichment'
import type { RouteProvider } from './types'
import { photonGeocode } from './photon'
import { fetchElevationProfile } from './opentopo'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'

type OsrmResponse = {
  code?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: { coordinates?: [number, number][] }
  }>
}

type OrsGeoJson = {
  features?: Array<{
    properties?: {
      summary?: { distance?: number; duration?: number }
      extras?: { tollways?: { values?: number[][] } }
    }
    geometry?: { coordinates?: Array<[number, number] | [number, number, number]> }
  }>
}

async function resolvePlace(place: RouteQuery['from']): Promise<LatLng> {
  if (isLatLng(place)) return place
  const q = placeRefToQuery(place)
  if (!q) throw new Error('Indica ciudad de origen y destino')
  return photonGeocode(q)
}

function coordsToPath(
  coords: Array<[number, number] | [number, number, number]>,
): { path: LatLng[]; elevations: number[] } {
  const path: LatLng[] = []
  const elevations: number[] = []
  for (const c of coords) {
    const lng = c[0]
    const lat = c[1]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    path.push({ lat, lng })
    if (typeof c[2] === 'number' && Number.isFinite(c[2])) elevations.push(c[2])
  }
  return { path, elevations }
}

function toLeg(
  distanceM: number,
  durationS: number,
  path: LatLng[],
  elevation?: { gainM: number; lossM: number },
): RouteLeg {
  const distanceKm = distanceM / 1000
  const driveHours = durationS / 3600
  return {
    distanceKm,
    driveHours,
    path,
    avgTravelSpeedKmh: driveHours > 0 ? distanceKm / driveHours : undefined,
    elevationGainM: elevation?.gainM,
    elevationLossM: elevation?.lossM,
  }
}

async function routeOsrm(from: LatLng, to: LatLng): Promise<{
  leg: RouteLeg
  likelyTolls: boolean
}> {
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('No se pudo calcular la ruta (OSRM público).')
    }
    return (await response.json()) as OsrmResponse
  })
  const route = data.routes?.[0]
  const coords = route?.geometry?.coordinates
  if (!route || !coords || coords.length < 2 || data.code !== 'Ok') {
    throw new Error('Ruta no encontrada. Prueba nombres más específicos o km manual.')
  }
  const { path } = coordsToPath(coords)
  let elevation: { gainM: number; lossM: number } | undefined
  try {
    elevation = await fetchElevationProfile(path)
  } catch {
    elevation = undefined
  }
  return {
    leg: toLeg(route.distance ?? 0, route.duration ?? 0, path, elevation),
    likelyTolls: false,
  }
}

async function routeOrs(
  from: LatLng,
  to: LatLng,
  apiKey: string,
): Promise<{ leg: RouteLeg; likelyTolls: boolean }> {
  const data = await enqueuePublicRequest(async () => {
    const response = await fetch(ORS_URL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        elevation: true,
        extra_info: ['tollways'],
      }),
    })
    if (!response.ok) {
      throw new Error(
        `OpenRouteService respondió con error (${response.status}). Revisa la API key.`,
      )
    }
    return (await response.json()) as OrsGeoJson
  })
  const feature = data.features?.[0]
  const coords = feature?.geometry?.coordinates
  if (!feature || !coords || coords.length < 2) {
    throw new Error('OpenRouteService no devolvió una ruta válida.')
  }
  const { path, elevations } = coordsToPath(coords)
  const elevation =
    elevations.length >= 2 ? gainLossFromElevations(elevations) : undefined
  const distanceM = feature.properties?.summary?.distance ?? 0
  const durationS = feature.properties?.summary?.duration ?? 0
  const tollValues = feature.properties?.extras?.tollways?.values ?? []
  const likelyTolls = tollValues.some((row) => (row[2] ?? 0) > 0)
  return { leg: toLeg(distanceM, durationS, path, elevation), likelyTolls }
}

/**
 * Free routing fallback. With an ORS key: OpenRouteService (elevation + tollways).
 * Without: public OSRM demo + OpenTopoData. Not for heavy production traffic.
 */
export function createOsmProvider(orsApiKey?: string | null): RouteProvider {
  const useOrs = Boolean(orsApiKey?.trim())
  return {
    id: useOrs ? 'ors' : 'osm',
    async lookup(query): Promise<ProviderEnrichment> {
      const origin = await resolvePlace(query.from)
      const dest = await resolvePlace(query.to)
      const routeFn = useOrs
        ? (a: LatLng, b: LatLng) => routeOrs(a, b, orsApiKey!.trim())
        : routeOsrm

      const outbound = await routeFn(origin, dest)
      let inbound: RouteLeg | undefined
      let inboundTolls = false
      if (query.roundTrip) {
        try {
          const back = await routeFn(dest, origin)
          inbound = back.leg
          inboundTolls = back.likelyTolls
        } catch {
          throw new Error(
            'Se obtuvo la ida pero no la vuelta. Reintenta o usa solo ida.',
          )
        }
      }

      return {
        provider: useOrs ? 'ors' : 'osm',
        distanceKm: outbound.leg.distanceKm,
        driveHoursOneWay: outbound.leg.driveHours,
        elevationGainM: outbound.leg.elevationGainM,
        elevationLossM: outbound.leg.elevationLossM,
        origin,
        dest,
        outbound: outbound.leg,
        inbound,
        likelyTolls: outbound.likelyTolls || inboundTolls,
      }
    },
  }
}
