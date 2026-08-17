import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  FUEL_MX_FACTOR,
} from './constants'
import { calcTankFeasibility } from './calc-tank'
import { elevationEnergyDeltaKWh, elevationFuelDeltaLiters } from './elevation'
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

function withTankMetrics(
  base: Omit<
    PhevTripResultBase,
    | 'arrivalFuelPercent'
    | 'reachesWithoutStop'
    | 'fuelStopsEstimate'
    | 'rechargeAtDestination'
  >,
  tankLiters: number,
  rechargeAtDestination: boolean,
): PhevTripResultBase {
  return {
    ...base,
    ...calcTankFeasibility(base.litersUsed, tankLiters),
    rechargeAtDestination,
  }
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
  const { distanceKm, version, driveStyle, pricePerKWh, pricePerLiter, driveHoursOneWay } =
    input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const impliedKWhPer100 =
    version.electricRangeKmOfficial > 0
      ? (version.batteryKWh / version.electricRangeKmOfficial) * 100
      : 0
  const evConsumptionEffective = impliedKWhPer100 * FUEL_MX_FACTOR * styleMult
  const electricRangeEffective =
    evConsumptionEffective > 0
      ? (version.batteryKWh / evConsumptionEffective) * 100
      : 0

  const electricKmUsed = Math.min(distanceKm, electricRangeEffective)
  const fuelKmUsed = Math.max(0, distanceKm - electricRangeEffective)
  const baseEnergyKWh = (electricKmUsed * evConsumptionEffective) / 100

  const consumptionEffective =
    version.consumptionLPer100ChargeSustaining * FUEL_MX_FACTOR * styleMult
  const baseLiters = (fuelKmUsed * consumptionEffective) / 100

  const electricShare = distanceKm > 0 ? electricKmUsed / distanceKm : 0
  const fuelShare = distanceKm > 0 ? fuelKmUsed / distanceKm : 0
  const energyKWh = Math.max(
    0,
    baseEnergyKWh +
      elevationEnergyDeltaKWh(
        input.elevationGainM,
        input.elevationLossM,
        electricShare,
      ),
  )
  const litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(input.elevationGainM, fuelShare),
  )

  return withTankMetrics(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
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
  )
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
  const baseLiters = (distanceKm * consumptionEffective) / 100
  // Return leg reverses the outbound elevation profile — what was
  // descended on the way there is climbed on the way back.
  const litersUsed = Math.max(
    0,
    baseLiters + elevationFuelDeltaLiters(input.elevationLossM),
  )

  return withTankMetrics(
    {
      distanceKm,
      driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
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
  const oneWay = calcOneWay(input)

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const rechargeAtDestination = Boolean(input.rechargeAtDestination)
  const returnLeg = rechargeAtDestination
    ? calcOneWay({
        ...input,
        driveHoursOneWay: input.driveHoursOneWay,
        // Return leg reverses the outbound elevation profile.
        elevationGainM: input.elevationLossM,
        elevationLossM: input.elevationGainM,
      })
    : calcFuelOnlyLeg(input, input.driveHoursOneWay)

  const litersUsed = oneWay.litersUsed + returnLeg.litersUsed

  return {
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
    oneWay,
  }
}
