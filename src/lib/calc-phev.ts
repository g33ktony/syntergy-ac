import { DRIVE_STYLE_MULTIPLIERS, FUEL_MX_FACTOR } from './constants'
import { attachCompareMetrics, attachTripCosts } from './trip-costs'
import { calcTankFeasibility } from './calc-tank'
import { elevationEnergyDeltaKWh, elevationFuelDeltaLiters } from './elevation'
import { tripCo2Kg } from './co2'
import { clampSpeedKmh, speedConsumptionFactor } from './speed-factor'
import type { PhevTripInput, PhevTripResult, PhevTripResultBase } from '../types'

function driveHoursForDistance(
  distanceKm: number,
  averageSpeedKmh: number,
): number {
  return distanceKm / clampSpeedKmh(averageSpeedKmh)
}

function withTankMetrics(
  base: Omit<
    PhevTripResultBase,
    | 'arrivalFuelPercent'
    | 'reachesWithoutStop'
    | 'fuelStopsEstimate'
    | 'rechargeAtDestination'
    | 'tollCostMxn'
    | 'totalCostMxn'
    | 'costPerKm'
    | 'co2Kg'
  >,
  tankLiters: number,
  rechargeAtDestination: boolean,
): Omit<PhevTripResultBase, 'costPerKm' | 'co2Kg'> {
  return {
    ...base,
    ...calcTankFeasibility(base.litersUsed, tankLiters),
    rechargeAtDestination,
    tollCostMxn: 0,
    totalCostMxn: base.costMxn,
  }
}

function finishPhev(
  result: Omit<
    PhevTripResultBase,
    'costPerKm' | 'co2Kg' | 'tollCostMxn' | 'totalCostMxn'
  > &
    Partial<Pick<PhevTripResultBase, 'tollCostMxn' | 'totalCostMxn'>>,
  tollCostMxn = 0,
): PhevTripResultBase {
  const priced = attachTripCosts(result, tollCostMxn)
  return attachCompareMetrics(
    priced,
    tripCo2Kg({ energyKWh: priced.energyKWh, liters: priced.litersUsed }),
  )
}

/**
 * Simple blend (design §"PHEV" / plan): assume start at 100% battery,
 * consume electric range first, remainder on fuel.
 *
 * EV energy uses implied kWh/100 from pack ÷ official range, then the same
 * MX_FACTOR × drive-style multipliers as BEV `calcTrip` (consumption
 * direction — not a haircut on official range). Elevation (route-enrichment
 * spec §7.5) splits proportionally by km share between the electric and
 * fuel portions — elevation is a whole-route fact, not segment-specific.
 */
function calcOneWay(input: PhevTripInput): PhevTripResultBase {
  const { distanceKm, version, driveStyle, pricePerKWh, pricePerLiter } = input

  const styleMult =
    DRIVE_STYLE_MULTIPLIERS[driveStyle] *
    speedConsumptionFactor(input.averageSpeedKmh)
  const impliedKWhPer100 =
    version.electricRangeKmOfficial > 0
      ? (version.batteryKWh / version.electricRangeKmOfficial) * 100
      : 0
  const evConsumptionEffective = impliedKWhPer100 * FUEL_MX_FACTOR * styleMult
  const electricRangeEffective =
    evConsumptionEffective > 0
      ? (version.batteryKWh / evConsumptionEffective) * 100
      : 0

  let electricKmUsed = Math.min(distanceKm, electricRangeEffective)
  let fuelKmUsed = Math.max(0, distanceKm - electricRangeEffective)
  const baseEnergyKWh = (electricKmUsed * evConsumptionEffective) / 100

  const consumptionEffective =
    version.consumptionLPer100ChargeSustaining * FUEL_MX_FACTOR * styleMult
  const baseLiters = (fuelKmUsed * consumptionEffective) / 100

  const electricShare = distanceKm > 0 ? electricKmUsed / distanceKm : 0
  const fuelShare = distanceKm > 0 ? fuelKmUsed / distanceKm : 0
  let energyKWh = Math.max(
    0,
    baseEnergyKWh +
      elevationEnergyDeltaKWh(
        input.elevationGainM,
        input.elevationLossM,
        electricShare,
      ),
  )
  let litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(input.elevationGainM, fuelShare),
  )

  if (energyKWh > version.batteryKWh) {
    const overflowKWh = energyKWh - version.batteryKWh
    energyKWh = version.batteryKWh
    const overflowKm =
      evConsumptionEffective > 0
        ? (overflowKWh / evConsumptionEffective) * 100
        : 0
    electricKmUsed = Math.max(0, electricKmUsed - overflowKm)
    fuelKmUsed = Math.max(0, distanceKm - electricKmUsed)
    const overflowFuelShare = distanceKm > 0 ? fuelKmUsed / distanceKm : 0
    litersUsed = Math.max(
      0,
      (fuelKmUsed * consumptionEffective) / 100 +
        elevationFuelDeltaLiters(input.elevationGainM, overflowFuelShare),
    )
  }

  return finishPhev(
    withTankMetrics(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, input.averageSpeedKmh),
      electricKmUsed,
      fuelKmUsed,
      energyKWh,
      litersUsed,
      costMxn: energyKWh * pricePerKWh + litersUsed * pricePerLiter,
      usedElectricOnly: fuelKmUsed === 0,
      fuel: version.fuel,
    },
    version.tankLiters,
    false,
    ),
    0,
  )
}

/** Fuel-only leg: used for the return trip when no recharge is assumed. */
function calcFuelOnlyLeg(input: PhevTripInput): PhevTripResultBase {
  const { distanceKm, version, driveStyle, pricePerLiter } = input
  const styleMult =
    DRIVE_STYLE_MULTIPLIERS[driveStyle] *
    speedConsumptionFactor(input.averageSpeedKmh)
  const consumptionEffective =
    version.consumptionLPer100ChargeSustaining * FUEL_MX_FACTOR * styleMult
  const baseLiters = (distanceKm * consumptionEffective) / 100
  // Return leg reverses the outbound elevation profile — what was
  // descended on the way there is climbed on the way back.
  const litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(input.elevationGainM),
  )

  return finishPhev(
    withTankMetrics(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, input.averageSpeedKmh),
      electricKmUsed: 0,
      fuelKmUsed: distanceKm,
      energyKWh: 0,
      litersUsed,
      costMxn: litersUsed * pricePerLiter,
      usedElectricOnly: false,
      fuel: version.fuel,
    },
    version.tankLiters,
    false,
    ),
    0,
  )
}

/**
 * Pure trip calculator for PHEV versions (Phase 2).
 * Conservative default: round trips assume NO recharge at destination, so
 * the return leg runs fuel-only. Pass `rechargeAtDestination: true` to
 * instead double the one-way leg (symmetric electric+fuel both ways).
 *
 * Fuel-stop feasibility uses total liters vs tank (same helper as ICE/HEV).
 */
export function calcPhevTrip(input: PhevTripInput): PhevTripResult {
  const oneWay = finishPhev(
    calcOneWay(input),
    input.mode === 'oneWay' ? input.tollCostMxn : 0,
  )

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const rechargeAtDestination = Boolean(input.rechargeAtDestination)
  const returnDistance = input.returnDistanceKm ?? input.distanceKm
  const returnGain = input.returnElevationGainM ?? input.elevationLossM
  const returnLoss = input.returnElevationLossM ?? input.elevationGainM
  const returnInput: PhevTripInput = {
    ...input,
    distanceKm: returnDistance,
    elevationGainM: returnGain,
    elevationLossM: returnLoss,
  }
  const returnLeg = rechargeAtDestination
    ? calcOneWay(returnInput)
    : calcFuelOnlyLeg(returnInput)

  const litersUsed = oneWay.litersUsed + returnLeg.litersUsed

  return {
    ...finishPhev(
      {
        distanceKm: oneWay.distanceKm + returnLeg.distanceKm,
        driveHours: oneWay.driveHours + returnLeg.driveHours,
        electricKmUsed: oneWay.electricKmUsed + returnLeg.electricKmUsed,
        fuelKmUsed: oneWay.fuelKmUsed + returnLeg.fuelKmUsed,
        energyKWh: oneWay.energyKWh + returnLeg.energyKWh,
        litersUsed,
        costMxn: oneWay.costMxn + returnLeg.costMxn,
        usedElectricOnly: oneWay.usedElectricOnly && returnLeg.usedElectricOnly,
        fuel: oneWay.fuel,
        rechargeAtDestination,
        ...calcTankFeasibility(litersUsed, input.version.tankLiters),
      },
      input.tollCostMxn,
    ),
    oneWay,
  }
}
