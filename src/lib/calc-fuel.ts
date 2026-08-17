import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  FUEL_MX_FACTOR,
  FUEL_RANGE_SAFETY_FACTOR,
} from './constants'
import type { FuelTripInput, FuelTripResult, FuelTripResultBase } from '../types'

function driveHoursForDistance(
  distanceKm: number,
  driveHoursOneWay?: number,
): number {
  if (driveHoursOneWay != null && driveHoursOneWay > 0) {
    return driveHoursOneWay
  }
  return distanceKm / DEFAULT_HIGHWAY_KMH
}

function effectiveRangeKm(
  tankLiters: number,
  consumptionLPer100Effective: number,
): number {
  return (tankLiters / consumptionLPer100Effective) * 100
}

function calcOneWay(input: FuelTripInput): FuelTripResultBase {
  const { distanceKm, version, driveStyle, pricePerLiter, driveHoursOneWay } =
    input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const consumptionEffective =
    version.consumptionLPer100 * FUEL_MX_FACTOR * styleMult
  const litersUsed = (distanceKm * consumptionEffective) / 100
  const arrivalFuelPercent = 100 - (litersUsed / version.tankLiters) * 100

  const rangeEffective = effectiveRangeKm(
    version.tankLiters,
    consumptionEffective,
  )
  const reachesWithoutStop = distanceKm <= rangeEffective * FUEL_RANGE_SAFETY_FACTOR
  const fuelStopsEstimate = reachesWithoutStop
    ? 0
    : Math.ceil(distanceKm / (rangeEffective * FUEL_RANGE_SAFETY_FACTOR)) - 1

  return {
    distanceKm,
    driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
    litersUsed,
    costMxn: litersUsed * pricePerLiter,
    arrivalFuelPercent,
    reachesWithoutStop,
    fuelStopsEstimate,
    fuel: version.fuel,
  }
}

/**
 * Pure trip calculator for ICE and HEV versions (Phase 2).
 * No React / I/O — safe to unit-test. Mirrors calcTrip's BEV shape
 * (energy → liters, SoC → tank %, charge stops → fuel stops).
 */
export function calcFuelTrip(input: FuelTripInput): FuelTripResult {
  const oneWay = calcOneWay(input)

  if (input.mode === 'oneWay') {
    return oneWay
  }

  // Recompute feasibility for the full round-trip distance. Doubling the
  // one-way stop flags is wrong when one leg fits the tank but both do not
  // (e.g. GDL↔CDMX presets).
  const roundTrip = calcOneWay({
    ...input,
    distanceKm: input.distanceKm * 2,
    driveHoursOneWay:
      input.driveHoursOneWay != null ? input.driveHoursOneWay * 2 : undefined,
  })

  return {
    ...roundTrip,
    oneWay,
  }
}
