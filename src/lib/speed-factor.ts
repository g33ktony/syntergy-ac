import {
  DEFAULT_HIGHWAY_KMH,
  MAX_SPEED_KMH,
  MIN_SPEED_KMH,
  SPEED_FACTOR_AERO,
  SPEED_FACTOR_ROLLING,
  SPEED_REF_KMH,
} from './constants'

export function clampSpeedKmh(speedKmh: number): number {
  if (!Number.isFinite(speedKmh)) return DEFAULT_HIGHWAY_KMH
  return Math.min(MAX_SPEED_KMH, Math.max(MIN_SPEED_KMH, speedKmh))
}

export function speedConsumptionFactor(speedKmh: number): number {
  const v = clampSpeedKmh(speedKmh)
  return SPEED_FACTOR_ROLLING + SPEED_FACTOR_AERO * (v / SPEED_REF_KMH) ** 2
}

export function seedAverageSpeedKmh(
  route: {
    distanceKm: number
    driveHoursOneWay?: number
  } | null,
): number {
  if (!route || route.distanceKm <= 0) return DEFAULT_HIGHWAY_KMH
  const hours = route.driveHoursOneWay
  if (hours != null && hours > 0) {
    return clampSpeedKmh(route.distanceKm / hours)
  }
  return DEFAULT_HIGHWAY_KMH
}
