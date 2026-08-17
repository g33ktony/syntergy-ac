import type { LatLng, Route, RouteLeg } from '../types'
import { gainLossFromElevations } from './elevation-profile'
import { isLatLng, placeRefToQuery } from './place'
import type { PlaceRef } from '../types'

type GoogleLatLng = { lat: () => number; lng: () => number }

type GoogleDirectionsService = {
  route: (
    request: {
      origin: string | { lat: number; lng: number }
      destination: string | { lat: number; lng: number }
      travelMode: string
      avoidTolls?: boolean
    },
    callback: (
      response: {
        routes?: Array<{
          overview_path?: GoogleLatLng[]
          legs?: Array<{
            distance?: { value: number }
            duration?: { value: number }
            start_location?: GoogleLatLng
            end_location?: GoogleLatLng
          }>
        }>
      } | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleElevationService = {
  getElevationAlongPath: (
    request: { path: Array<{ lat: number; lng: number }>; samples: number },
    callback: (
      results: Array<{ elevation: number }> | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleGeocoder = {
  geocode: (
    request: {
      address?: string
      location?: { lat: number; lng: number }
      placeId?: string
    },
    callback: (
      results: Array<{
        formatted_address?: string
        geometry?: { location: GoogleLatLng }
      }> | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleAutocompleteService = {
  getPlacePredictions: (
    request: { input: string; language?: string },
    callback: (
      predictions: Array<{ description: string; place_id: string }> | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleMapsNamespace = {
  maps: {
    DirectionsService: new () => GoogleDirectionsService
    ElevationService: new () => GoogleElevationService
    Geocoder: new () => GoogleGeocoder
    TravelMode: { DRIVING: string }
    places?: {
      AutocompleteService: new () => GoogleAutocompleteService
      PlacesServiceStatus?: { OK: string }
    }
  }
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace
    __syntergyAcMapsReady?: () => void
    gm_authFailure?: () => void
  }
}

const MAPS_LOAD_TIMEOUT_MS = 10_000

let mapsLoadPromise: Promise<void> | null = null

function loadMapsJs(apiKey: string): Promise<void> {
  if (window.google?.maps?.DirectionsService) {
    return Promise.resolve()
  }
  if (mapsLoadPromise) return mapsLoadPromise

  mapsLoadPromise = new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      fn()
    }

    const timeoutId = setTimeout(() => {
      mapsLoadPromise = null
      settle(() =>
        reject(
          new Error(
            'Google Maps no respondió a tiempo. Verifica que la API key tenga habilitadas "Maps JavaScript API", "Directions API", "Places API" y "Elevation API", que la facturación esté activa, y que el dominio/localhost esté permitido.',
          ),
        ),
      )
    }, MAPS_LOAD_TIMEOUT_MS)

    window.gm_authFailure = () => {
      delete window.gm_authFailure
      mapsLoadPromise = null
      settle(() =>
        reject(
          new Error(
            'Google rechazó la API key (auth). Revisa restricciones de dominio/HTTP referrer y que "Maps JavaScript API" esté habilitada.',
          ),
        ),
      )
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-syntergy-maps]',
    )
    if (existing) {
      existing.addEventListener('load', () => settle(resolve))
      existing.addEventListener('error', () =>
        settle(() => reject(new Error('No se pudo cargar Google Maps'))),
      )
      return
    }

    const callbackName = '__syntergyAcMapsReady'
    window[callbackName] = () => {
      delete window[callbackName]
      settle(resolve)
    }

    const script = document.createElement('script')
    script.dataset.syntergyMaps = '1'
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&loading=async&libraries=places`
    script.onerror = () => {
      mapsLoadPromise = null
      settle(() => reject(new Error('No se pudo cargar Google Maps')))
    }
    document.head.appendChild(script)
  })

  return mapsLoadPromise
}

function toLatLng(p: GoogleLatLng): LatLng {
  return { lat: p.lat(), lng: p.lng() }
}

function originForDirections(place: PlaceRef): string | { lat: number; lng: number } {
  if (isLatLng(place)) return { lat: place.lat, lng: place.lng }
  return placeRefToQuery(place)
}

async function directionsLeg(
  maps: GoogleMapsNamespace['maps'],
  from: PlaceRef,
  to: PlaceRef,
  avoidTolls = false,
): Promise<{
  distanceKm: number
  driveHours: number
  path: LatLng[]
  origin: LatLng
  dest: LatLng
}> {
  if (!maps.DirectionsService) {
    throw new Error('Google Maps Directions no está disponible')
  }
  const service = new maps.DirectionsService()
  return new Promise((resolve, reject) => {
    service.route(
      {
        origin: originForDirections(from),
        destination: originForDirections(to),
        travelMode: maps.TravelMode.DRIVING,
        avoidTolls,
      },
      (response, status) => {
        const route = response?.routes?.[0]
        const leg = route?.legs?.[0]
        const pathPts = route?.overview_path
        if (status !== 'OK' || !leg?.distance || !leg.duration || !pathPts?.length) {
          reject(
            new Error(
              'Ruta no encontrada. Usa una ruta precargada o agrega km manualmente.',
            ),
          )
          return
        }
        const path = pathPts.map(toLatLng)
        const origin = leg.start_location ? toLatLng(leg.start_location) : path[0]!
        const dest = leg.end_location
          ? toLatLng(leg.end_location)
          : path[path.length - 1]!
        resolve({
          distanceKm: leg.distance.value / 1000,
          driveHours: leg.duration.value / 3600,
          path,
          origin,
          dest,
        })
      },
    )
  })
}

async function elevationAlongPath(
  maps: GoogleMapsNamespace['maps'],
  path: LatLng[],
): Promise<{ gainM: number; lossM: number } | undefined> {
  if (!maps.ElevationService || path.length < 2) return undefined
  const service = new maps.ElevationService()
  const samples = Math.min(256, Math.max(64, path.length))
  return new Promise((resolve) => {
    service.getElevationAlongPath({ path, samples }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        resolve(undefined)
        return
      }
      resolve(gainLossFromElevations(results.map((r) => r.elevation)))
    })
  })
}

export type GoogleRouteFetch = {
  distanceKm: number
  driveHoursOneWay: number
  path: LatLng[]
  origin: LatLng
  dest: LatLng
  elevationGainM?: number
  elevationLossM?: number
  likelyTolls?: boolean
  outbound: RouteLeg
  inbound?: RouteLeg
}

async function buildLeg(
  maps: GoogleMapsNamespace['maps'],
  from: PlaceRef,
  to: PlaceRef,
): Promise<{
  leg: RouteLeg
  origin: LatLng
  dest: LatLng
  likelyTolls: boolean
}> {
  const primary = await directionsLeg(maps, from, to, false)
  let likelyTolls = false
  try {
    const avoided = await directionsLeg(maps, from, to, true)
    likelyTolls =
      Math.abs(avoided.distanceKm - primary.distanceKm) > 1 ||
      Math.abs(avoided.driveHours - primary.driveHours) > 0.08
  } catch {
    likelyTolls = false
  }
  const elevation = await elevationAlongPath(maps, primary.path)
  const leg: RouteLeg = {
    distanceKm: primary.distanceKm,
    driveHours: primary.driveHours,
    path: primary.path,
    avgTravelSpeedKmh:
      primary.driveHours > 0 ? primary.distanceKm / primary.driveHours : undefined,
    elevationGainM: elevation?.gainM,
    elevationLossM: elevation?.lossM,
  }
  return { leg, origin: primary.origin, dest: primary.dest, likelyTolls }
}

/**
 * Directions + Elevation (JS API). Replaces Distance Matrix for geometry.
 */
export async function fetchRoute(
  from: PlaceRef,
  to: PlaceRef,
  apiKey: string,
  roundTrip = false,
): Promise<GoogleRouteFetch> {
  const originQ = placeRefToQuery(from)
  const destQ = placeRefToQuery(to)
  if (!originQ || !destQ) {
    throw new Error('Indica ciudad de origen y destino')
  }

  await loadMapsJs(apiKey)
  const maps = window.google?.maps
  if (!maps?.DirectionsService) {
    throw new Error('Google Maps no está disponible')
  }

  const outbound = await buildLeg(maps, from, to)
  let inbound: RouteLeg | undefined
  let inboundTolls = false
  if (roundTrip) {
    const back = await buildLeg(maps, to, from)
    inbound = back.leg
    inboundTolls = back.likelyTolls
  }

  return {
    distanceKm: outbound.leg.distanceKm,
    driveHoursOneWay: outbound.leg.driveHours,
    path: outbound.leg.path,
    origin: outbound.origin,
    dest: outbound.dest,
    elevationGainM: outbound.leg.elevationGainM,
    elevationLossM: outbound.leg.elevationLossM,
    likelyTolls: outbound.likelyTolls || inboundTolls,
    outbound: outbound.leg,
    inbound,
  }
}

/** @deprecated Distance-only helper kept for callers that ignore geometry. */
export async function fetchRouteDistance(
  from: string,
  to: string,
  apiKey: string,
): Promise<{ distanceKm: number; driveHoursOneWay: number }> {
  const result = await fetchRoute(from, to, apiKey, false)
  return {
    distanceKm: Math.round(result.distanceKm),
    driveHoursOneWay: result.driveHoursOneWay,
  }
}

export async function suggestPlaces(
  query: string,
  apiKey: string,
): Promise<Array<{ description: string; placeId: string }>> {
  const q = query.trim()
  if (q.length < 2) return []
  await loadMapsJs(apiKey)
  const AutocompleteService = window.google?.maps?.places?.AutocompleteService
  if (!AutocompleteService) {
    throw new Error('Google Places no está disponible. Habilita Places API en la key.')
  }
  const service = new AutocompleteService()
  return new Promise((resolve, reject) => {
    service.getPlacePredictions({ input: q, language: 'es' }, (predictions, status) => {
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        reject(new Error('No se pudieron sugerir lugares (Places).'))
        return
      }
      resolve(
        (predictions ?? []).map((p) => ({
          description: p.description,
          placeId: p.place_id,
        })),
      )
    })
  })
}

export async function geocodePlace(address: string, apiKey: string): Promise<LatLng> {
  await loadMapsJs(apiKey)
  const maps = window.google?.maps
  if (!maps?.Geocoder) {
    throw new Error('Google Geocoder no está disponible')
  }
  const geocoder = new maps.Geocoder()
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      const loc = results?.[0]?.geometry?.location
      if (status !== 'OK' || !loc) {
        reject(new Error('No se encontró el lugar en Google.'))
        return
      }
      resolve(toLatLng(loc))
    })
  })
}

export async function reverseGeocode(
  latlng: LatLng,
  apiKey: string,
): Promise<string> {
  await loadMapsJs(apiKey)
  const maps = window.google?.maps
  if (!maps?.Geocoder) {
    return `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
  }
  const geocoder = new maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results?.[0]?.formatted_address) {
        resolve(results[0].formatted_address)
        return
      }
      resolve(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`)
    })
  })
}

export { loadMapsJs }

export function makeGoogleRoute(
  from: string,
  to: string,
  distanceKm: number,
  driveHoursOneWay: number,
): Route {
  return {
    id: `google-${Date.now()}`,
    from: from.trim(),
    to: to.trim(),
    distanceKm,
    source: 'google',
    driveHoursOneWay,
  }
}
