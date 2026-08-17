import { DEFAULT_HIGHWAY_KMH } from './constants'
import { formatLocaleNumber } from './format'
import type { SpeedDisplayKind, UnitSystem } from '../types'

const KM_PER_MI = 1.609344
const LITERS_PER_US_GALLON = 3.785411784
const FEET_PER_METER = 3.280839895

export function kmToMi(km: number): number {
  return km / KM_PER_MI
}

export function miToKm(mi: number): number {
  return mi * KM_PER_MI
}

export function kmhToMph(kmh: number): number {
  return kmToMi(kmh)
}

export function litersToUsGallons(liters: number): number {
  return liters / LITERS_PER_US_GALLON
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER
}

export type TripUnitKind =
  | 'distance'
  | 'speed'
  | 'volume'
  | 'elevation'
  | 'energy'

/** Format a metric/SI value for the active unit system. Copy stays Spanish. */
export function formatTripUnits(
  value: number,
  kind: TripUnitKind,
  unitSystem: UnitSystem,
  digits?: number,
): string {
  switch (kind) {
    case 'distance': {
      if (unitSystem === 'imperial') {
        return `${formatLocaleNumber(kmToMi(value), digits ?? 0)} mi`
      }
      return `${formatLocaleNumber(value, digits ?? 0)} km`
    }
    case 'speed': {
      if (unitSystem === 'imperial') {
        return `${formatLocaleNumber(kmhToMph(value), digits ?? 0)} mph`
      }
      return `${formatLocaleNumber(value, digits ?? 0)} km/h`
    }
    case 'volume': {
      if (unitSystem === 'imperial') {
        return `${formatLocaleNumber(litersToUsGallons(value), digits ?? 1)} gal`
      }
      return `${formatLocaleNumber(value, digits ?? 1)} L`
    }
    case 'elevation': {
      if (unitSystem === 'imperial') {
        return `${formatLocaleNumber(metersToFeet(value), digits ?? 0)} ft`
      }
      return `${formatLocaleNumber(value, digits ?? 0)} m`
    }
    case 'energy':
      return `${formatLocaleNumber(value, digits ?? 1)} kWh`
  }
}

export type ResolveSpeedInput = {
  distanceKm: number
  driveHours: number
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
}

export function resolveAvgSpeedKmh(input: ResolveSpeedInput): {
  speedKmh: number
  kind: SpeedDisplayKind
} {
  if (input.avgSpeedLimitKmh != null && input.avgSpeedLimitKmh > 0) {
    return { speedKmh: input.avgSpeedLimitKmh, kind: 'limits' }
  }
  if (input.avgTravelSpeedKmh != null && input.avgTravelSpeedKmh > 0) {
    return { speedKmh: input.avgTravelSpeedKmh, kind: 'estimated' }
  }
  if (input.driveHours > 0 && input.distanceKm > 0) {
    return {
      speedKmh: input.distanceKm / input.driveHours,
      kind: 'estimated',
    }
  }
  return { speedKmh: DEFAULT_HIGHWAY_KMH, kind: 'fallback' }
}

export function speedKindSuffix(
  kind: SpeedDisplayKind,
  unitSystem: UnitSystem,
): string {
  if (kind === 'limits') return '(límites)'
  if (kind === 'estimated') return '(estimada)'
  const ref = formatTripUnits(DEFAULT_HIGHWAY_KMH, 'speed', unitSystem, 0)
  return `(ref. ${ref})`
}

export function formatAvgSpeedRow(
  input: ResolveSpeedInput,
  unitSystem: UnitSystem,
): { label: string; value: string } {
  const { speedKmh, kind } = resolveAvgSpeedKmh(input)
  return {
    label: 'Vel. promedio',
    value: `${formatTripUnits(speedKmh, 'speed', unitSystem, 0)} · ${speedKindSuffix(kind, unitSystem)}`,
  }
}

/**
 * Elevation row for a result card. Returns null when the route has no
 * elevation data at all (most routes — ABRP-only, opt-in) so callers can
 * skip the row entirely rather than showing "+0 m / -0 m".
 */
/**
 * Round-trip elevation totals: the return leg climbs what the outbound leg
 * descended and vice versa, so total ascent = total descent = gain + loss
 * (route-enrichment spec §4.4). Returns undefined fields untouched when no
 * elevation data exists, so formatElevationRow still returns null for it.
 */
export function roundTripElevation(
  gainM: number | undefined,
  lossM: number | undefined,
): { gainM: number | undefined; lossM: number | undefined } {
  if (gainM == null && lossM == null) return { gainM: undefined, lossM: undefined }
  const total = (gainM ?? 0) + (lossM ?? 0)
  return { gainM: total, lossM: total }
}

export function formatElevationRow(
  gainM: number | undefined,
  lossM: number | undefined,
  unitSystem: UnitSystem,
): { label: string; value: string } | null {
  if (gainM == null && lossM == null) return null
  return {
    label: 'Elevación',
    value: `+${formatTripUnits(gainM ?? 0, 'elevation', unitSystem, 0)} / -${formatTripUnits(lossM ?? 0, 'elevation', unitSystem, 0)}`,
  }
}
