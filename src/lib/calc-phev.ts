import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  FUEL_MX_FACTOR,
} from './constants'
import type { PhevTripInput, PhevTripResult, PhevTripResultBase } from '../types'

function driveHoursForDistance(
  distanceKm: number,
  driveHoursOneWay?: number,
): number {
  if (driveHoursOneWay != null && driveHoursOneWay > 0) {
    return driveHoursOneWay
  }
  return distanceKm / DEFAULT_HIGHWAY_KMH
}

/**
 * Simple v1 blend (design §"PHEV" / plan): assume start at 100% battery,
 * consume electric range first (MX-realism adjusted), remainder on fuel.
 */
function calcOneWay(input: PhevTripInput): PhevTripResultBase {
  const { distanceKm, version, driveStyle, pricePerKWh, pricePerLiter, driveHoursOneWay } =
    input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  // Drive style shrinks effective EV range (same direction as BEV
  // consumption multipliers): aggressive uses the battery faster.
  const electricRangeEffective =
    (version.electricRangeKmOfficial * FUEL_MX_FACTOR) / styleMult
  const electricKmUsed = Math.min(distanceKm, electricRangeEffective)
  const fuelKmUsed = Math.max(0, distanceKm - electricRangeEffective)

  const energyKWh =
    electricRangeEffective > 0
      ? (electricKmUsed / electricRangeEffective) * version.batteryKWh
      : 0

  const consumptionEffective =
    version.consumptionLPer100ChargeSustaining * FUEL_MX_FACTOR * styleMult
  const litersUsed = (fuelKmUsed * consumptionEffective) / 100

  return {
    distanceKm,
    driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
    electricKmUsed,
    fuelKmUsed,
    energyKWh,
    litersUsed,
    costMxn: energyKWh * pricePerKWh + litersUsed * pricePerLiter,
    usedElectricOnly: fuelKmUsed === 0,
    fuel: version.fuel,
  }
}

/** Fuel-only leg: used for the return trip when no recharge is assumed. */
function calcFuelOnlyLeg(
  input: PhevTripInput,
  driveHoursOneWay?: number,
): PhevTripResultBase {
  const { distanceKm, version, driveStyle, pricePerLiter } = input
  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const consumptionEffective =
    version.consumptionLPer100ChargeSustaining * FUEL_MX_FACTOR * styleMult
  const litersUsed = (distanceKm * consumptionEffective) / 100

  return {
    distanceKm,
    driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
    electricKmUsed: 0,
    fuelKmUsed: distanceKm,
    energyKWh: 0,
    litersUsed,
    costMxn: litersUsed * pricePerLiter,
    usedElectricOnly: false,
    fuel: version.fuel,
  }
}

/**
 * Pure trip calculator for PHEV versions (Phase 2).
 * Conservative default: round trips assume NO recharge at destination, so
 * the return leg runs fuel-only. Pass `rechargeAtDestination: true` to
 * instead double the one-way leg (symmetric electric+fuel both ways).
 */
export function calcPhevTrip(input: PhevTripInput): PhevTripResult {
  const oneWay = calcOneWay(input)

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const returnLeg = input.rechargeAtDestination
    ? calcOneWay({ ...input, driveHoursOneWay: input.driveHoursOneWay })
    : calcFuelOnlyLeg(input, input.driveHoursOneWay)

  return {
    distanceKm: oneWay.distanceKm + returnLeg.distanceKm,
    driveHours: oneWay.driveHours + returnLeg.driveHours,
    electricKmUsed: oneWay.electricKmUsed + returnLeg.electricKmUsed,
    fuelKmUsed: oneWay.fuelKmUsed + returnLeg.fuelKmUsed,
    energyKWh: oneWay.energyKWh + returnLeg.energyKWh,
    litersUsed: oneWay.litersUsed + returnLeg.litersUsed,
    costMxn: oneWay.costMxn + returnLeg.costMxn,
    usedElectricOnly: oneWay.usedElectricOnly && returnLeg.usedElectricOnly,
    fuel: oneWay.fuel,
    oneWay,
  }
}
