import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  FUEL_MX_FACTOR,
} from './constants'
import { attachTripCosts } from './trip-costs'
import { calcTankFeasibility } from './calc-tank'
import { elevationFuelDeltaLiters } from './elevation'
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

function calcOneWay(
  input: FuelTripInput,
  distanceKm = input.distanceKm,
  driveHoursOneWay = input.driveHoursOneWay,
  elevationGainM = input.elevationGainM,
  tollCostMxn = 0,
): FuelTripResultBase {
  const { version, driveStyle, pricePerLiter } = input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const consumptionEffective =
    version.consumptionLPer100 * FUEL_MX_FACTOR * styleMult
  const baseLiters = (distanceKm * consumptionEffective) / 100
  const litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(elevationGainM),
  )
  const tank = calcTankFeasibility(litersUsed, version.tankLiters)

  return attachTripCosts(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
      litersUsed,
      costMxn: litersUsed * pricePerLiter,
      ...tank,
      fuel: version.fuel,
    },
    tollCostMxn,
  )
}

/**
 * Pure trip calculator for ICE and HEV versions (Phase 2).
 * No React / I/O — safe to unit-test. Mirrors calcTrip's BEV shape
 * (energy → liters, SoC → tank %, charge stops → fuel stops).
 */
export function calcFuelTrip(input: FuelTripInput): FuelTripResult {
  const oneWay = calcOneWay(
    input,
    input.distanceKm,
    input.driveHoursOneWay,
    input.elevationGainM,
    input.mode === 'oneWay' ? input.tollCostMxn : 0,
  )

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const returnDistance = input.returnDistanceKm ?? input.distanceKm
  const returnGain = input.returnElevationGainM ?? input.elevationLossM
  const returnLeg = calcOneWay(
    input,
    returnDistance,
    input.returnDriveHoursOneWay ?? input.driveHoursOneWay,
    returnGain,
    0,
  )
  const litersUsed = oneWay.litersUsed + returnLeg.litersUsed
  const roundTrip = attachTripCosts(
    {
      distanceKm: oneWay.distanceKm + returnLeg.distanceKm,
      driveHours: oneWay.driveHours + returnLeg.driveHours,
      litersUsed,
      costMxn: oneWay.costMxn + returnLeg.costMxn,
      ...calcTankFeasibility(litersUsed, input.version.tankLiters),
      fuel: input.version.fuel,
    },
    input.tollCostMxn,
  )

  return {
    ...roundTrip,
    oneWay,
  }
}
