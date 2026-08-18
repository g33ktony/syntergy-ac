import { DRIVE_STYLE_MULTIPLIERS, FUEL_MX_FACTOR } from './constants'
import { attachCompareMetrics, attachTripCosts } from './trip-costs'
import { calcTankFeasibility } from './calc-tank'
import { elevationFuelDeltaLiters } from './elevation'
import { tripCo2Kg } from './co2'
import { clampSpeedKmh, speedConsumptionFactor } from './speed-factor'
import type { FuelTripInput, FuelTripResult, FuelTripResultBase } from '../types'

function driveHoursForDistance(
  distanceKm: number,
  averageSpeedKmh: number,
): number {
  return distanceKm / clampSpeedKmh(averageSpeedKmh)
}

function calcOneWay(
  input: FuelTripInput,
  distanceKm = input.distanceKm,
  elevationGainM = input.elevationGainM,
  tollCostMxn = 0,
): FuelTripResultBase {
  const { version, driveStyle, pricePerLiter } = input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const consumptionEffective =
    version.consumptionLPer100 *
    FUEL_MX_FACTOR *
    styleMult *
    speedConsumptionFactor(input.averageSpeedKmh)
  const baseLiters = (distanceKm * consumptionEffective) / 100
  const litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(elevationGainM),
  )
  const tank = calcTankFeasibility(litersUsed, version.tankLiters)

  const priced = attachTripCosts(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, input.averageSpeedKmh),
      litersUsed,
      costMxn: litersUsed * pricePerLiter,
      ...tank,
      fuel: version.fuel,
    },
    tollCostMxn,
  )
  return attachCompareMetrics(priced, tripCo2Kg({ liters: litersUsed }))
}

/**
 * Pure trip calculator for ICE and HEV versions (Phase 2).
 * No React / I/O — safe to unit-test.
 */
export function calcFuelTrip(input: FuelTripInput): FuelTripResult {
  const oneWay = calcOneWay(
    input,
    input.distanceKm,
    input.elevationGainM,
    input.mode === 'oneWay' ? input.tollCostMxn : 0,
  )

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const returnDistance = input.returnDistanceKm ?? input.distanceKm
  const returnGain = input.returnElevationGainM ?? input.elevationLossM
  const returnLeg = calcOneWay(input, returnDistance, returnGain, 0)
  const litersUsed = oneWay.litersUsed + returnLeg.litersUsed
  const priced = attachTripCosts(
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
    ...attachCompareMetrics(priced, tripCo2Kg({ liters: litersUsed })),
    oneWay,
  }
}
