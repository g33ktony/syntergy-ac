import { DRIVE_STYLE_MULTIPLIERS, MX_FACTOR } from './constants'
import { speedConsumptionFactor } from './speed-factor'
import { estimateTolls } from './tolls'
import { placeLabel } from './place'
import {
  getAbrpApiKey,
  getGoogleApiKey,
  getOpenChargeMapApiKey,
  getOrsApiKey,
} from './config'
import { lookupTrip } from './providers/lookup-trip'
import type { ChargingPoi, DriveStyle, LatLng, PlaceRef, Route, RouteLeg, RouteSourcePreference } from '../types'

export function bevKWhPerKm(input: {
  consumptionKWhPer100: number
  driveStyle: DriveStyle
  averageSpeedKmh: number
}): number {
  const styleMult = DRIVE_STYLE_MULTIPLIERS[input.driveStyle]
  const consumptionEffective =
    input.consumptionKWhPer100 * MX_FACTOR * styleMult * speedConsumptionFactor(input.averageSpeedKmh)
  return consumptionEffective / 100
}

export type LookupTripViaStopsOptions = {
  origin: PlaceRef
  dest: PlaceRef
  stops: ChargingPoi[]
  /** When set (including `[]`), used for the return instead of reversing `stops`. */
  inboundStops?: ChargingPoi[]
  /** Reuse a previously stitched outbound instead of fetching origin→stops→dest again. */
  outboundRoute?: Route
  roundTrip: boolean
  preference: RouteSourcePreference
  lookup: typeof lookupTrip
  googleKey?: string | null
  abrpKey?: string | null
  orsKey?: string | null
  ocmKey?: string | null
}

function stopPlaces(stops: ChargingPoi[]): LatLng[] {
  return stops.map((s) => ({ lat: s.lat, lng: s.lng }))
}

async function stitchLegs(
  waypoints: PlaceRef[],
  options: LookupTripViaStopsOptions,
): Promise<RouteLeg> {
  let distanceKm = 0
  let driveHours = 0
  let path: LatLng[] = []
  let elevationGainM = 0
  let elevationLossM = 0

  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = await options.lookup({
      query: { from: waypoints[i], to: waypoints[i + 1], roundTrip: false },
      preference: options.preference,
      googleKey: options.googleKey,
      abrpKey: options.abrpKey,
      orsKey: options.orsKey,
      ocmKey: options.ocmKey,
    })
    if (!leg.outbound) throw new Error('leg missing geometry')
    distanceKm += leg.distanceKm
    driveHours += leg.outbound.driveHours
    const legPath = leg.outbound.path
    path = path.length > 0 ? [...path, ...legPath.slice(1)] : legPath
    elevationGainM += leg.outbound.elevationGainM ?? leg.elevationGainM ?? 0
    elevationLossM += leg.outbound.elevationLossM ?? leg.elevationLossM ?? 0
  }

  return { distanceKm, driveHours, path, elevationGainM, elevationLossM }
}

export async function lookupTripViaStops(options: LookupTripViaStopsOptions): Promise<Route | null> {
  const outboundWaypoints: PlaceRef[] = [options.origin, ...stopPlaces(options.stops), options.dest]

  try {
    const outbound = options.outboundRoute?.outbound
      ? {
          distanceKm: options.outboundRoute.distanceKm,
          driveHours:
            options.outboundRoute.driveHoursOneWay ?? options.outboundRoute.outbound.driveHours,
          path: options.outboundRoute.outbound.path,
          elevationGainM:
            options.outboundRoute.outbound.elevationGainM ??
            options.outboundRoute.elevationGainM ??
            0,
          elevationLossM:
            options.outboundRoute.outbound.elevationLossM ??
            options.outboundRoute.elevationLossM ??
            0,
        }
      : await stitchLegs(outboundWaypoints, options)
    const inboundStopList =
      options.inboundStops !== undefined
        ? options.inboundStops
        : [...options.stops].reverse()
    const inbound = options.roundTrip
      ? await stitchLegs(
          [options.dest, ...stopPlaces(inboundStopList), options.origin],
          options,
        )
      : undefined

    const tolls = estimateTolls({
      from: placeLabel(options.origin),
      to: placeLabel(options.dest),
      path: outbound.path,
      roundTrip: false,
    })

    return {
      id: `${placeLabel(options.origin)}->${placeLabel(options.dest)}:via-stops`,
      from: placeLabel(options.origin),
      to: placeLabel(options.dest),
      distanceKm: outbound.distanceKm,
      source: 'osm',
      driveHoursOneWay: outbound.driveHours,
      elevationGainM: outbound.elevationGainM,
      elevationLossM: outbound.elevationLossM,
      outbound,
      inbound,
      likelyTolls: tolls.likelyTolls,
      tolls,
      chargingPois: [...options.stops, ...(options.inboundStops ?? [])],
    }
  } catch {
    return null
  }
}

export function lookupTripViaStopsFromConfig(
  options: Omit<
    LookupTripViaStopsOptions,
    'lookup' | 'googleKey' | 'abrpKey' | 'orsKey' | 'ocmKey'
  >,
): Promise<Route | null> {
  return lookupTripViaStops({
    ...options,
    lookup: lookupTrip,
    googleKey: getGoogleApiKey(),
    abrpKey: getAbrpApiKey(),
    orsKey: getOrsApiKey(),
    ocmKey: getOpenChargeMapApiKey(),
  })
}
