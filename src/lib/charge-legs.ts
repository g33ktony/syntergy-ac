import { DRIVE_STYLE_MULTIPLIERS, MX_FACTOR } from './constants'
import { speedConsumptionFactor } from './speed-factor'
import { estimateTolls } from './tolls'
import { placeLabel } from './place'
import type { lookupTrip } from './providers/lookup-trip'
import type { ChargingPoi, DriveStyle, LatLng, PlaceRef, Route, RouteSourcePreference } from '../types'

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
  roundTrip: boolean
  preference: RouteSourcePreference
  lookup: typeof lookupTrip
  googleKey?: string | null
  abrpKey?: string | null
  orsKey?: string | null
  ocmKey?: string | null
}

export async function lookupTripViaStops(options: LookupTripViaStopsOptions): Promise<Route | null> {
  const waypoints: PlaceRef[] = [options.origin, ...options.stops.map((s) => ({ lat: s.lat, lng: s.lng }) as LatLng), options.dest]

  try {
    let distanceKm = 0
    let driveHours = 0
    let path: LatLng[] = []

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
    }

    const tolls = estimateTolls({
      from: placeLabel(options.origin),
      to: placeLabel(options.dest),
      path,
      roundTrip: false,
    })

    return {
      id: `${placeLabel(options.origin)}->${placeLabel(options.dest)}:via-stops`,
      from: placeLabel(options.origin),
      to: placeLabel(options.dest),
      distanceKm,
      source: 'osm',
      driveHoursOneWay: driveHours,
      outbound: { distanceKm, driveHours, path },
      likelyTolls: tolls.likelyTolls,
      tolls,
    }
  } catch {
    return null
  }
}
