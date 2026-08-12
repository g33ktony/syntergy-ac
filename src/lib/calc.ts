import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  KM_PER_CHARGE_STOP,
  MX_FACTOR,
} from './constants'
import type {
  AnyVehicle,
  ComparisonRow,
  FuelTripInput,
  FuelTripResult,
  PhevTripInput,
  PhevTripResult,
  TripInput,
  TripResult,
  TripResultBase,
} from '../types'
import { calcFuelTrip } from './calc-fuel'
import { calcPhevTrip } from './calc-phev'

function driveHoursForDistance(
  distanceKm: number,
  driveHoursOneWay?: number,
): number {
  if (driveHoursOneWay != null && driveHoursOneWay > 0) {
    return driveHoursOneWay
  }
  return distanceKm / DEFAULT_HIGHWAY_KMH
}

function calcOneWay(input: TripInput): TripResultBase {
  const {
    distanceKm,
    version,
    driveStyle,
    pricePerKWh,
    reservePercent,
    driveHoursOneWay,
  } = input

  const styleMult = DRIVE_STYLE_MULTIPLIERS[driveStyle]
  const consumptionEffective =
    version.consumptionKWhPer100 * MX_FACTOR * styleMult
  const energyKWh = (distanceKm * consumptionEffective) / 100
  const arrivalSocPercent = 100 - (energyKWh / version.batteryKWh) * 100
  const chargeStopsEstimate = Math.ceil(distanceKm / KM_PER_CHARGE_STOP)

  return {
    distanceKm,
    driveHours: driveHoursForDistance(distanceKm, driveHoursOneWay),
    energyKWh,
    costMxn: energyKWh * pricePerKWh,
    arrivalSocPercent,
    reachesWithReserve: arrivalSocPercent >= reservePercent,
    chargeStopsEstimate,
    connector: version.connector,
  }
}

/**
 * Pure trip calculator for BEV versions (Phase 1).
 * No React / I/O — safe to unit-test.
 */
export function calcTrip(input: TripInput): TripResult {
  const oneWay = calcOneWay(input)

  if (input.mode === 'oneWay') {
    return oneWay
  }

  const energyKWh = oneWay.energyKWh * 2
  const arrivalSocPercent =
    100 - (2 * oneWay.energyKWh * 100) / input.version.batteryKWh

  return {
    distanceKm: oneWay.distanceKm * 2,
    driveHours: oneWay.driveHours * 2,
    energyKWh,
    costMxn: energyKWh * input.pricePerKWh,
    arrivalSocPercent,
    reachesWithReserve: arrivalSocPercent >= input.reservePercent,
    chargeStopsEstimate: oneWay.chargeStopsEstimate,
    chargeStopsRoundTripEstimate: Math.ceil(
      (2 * input.distanceKm) / KM_PER_CHARGE_STOP,
    ),
    connector: input.version.connector,
    oneWay,
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — multi-fuel dispatch (plan Task 3/4: "wire calcTrip switch on
// type"). Kept as a separate exported function rather than overloading
// `calcTrip` above, so Phase 1's BEV-only call sites (VehicleSlot) keep
// their existing signature untouched.
// ---------------------------------------------------------------------------

export type AnyTripInput =
  | ({ vehicleType: 'BEV' } & TripInput)
  | ({ vehicleType: 'ICE' | 'HEV' } & FuelTripInput)
  | ({ vehicleType: 'PHEV' } & PhevTripInput)

export type AnyTripResult = TripResult | FuelTripResult | PhevTripResult

/** Single entry point that dispatches to the right pure calculator by powertrain. */
export function calcAnyTrip(input: AnyTripInput): AnyTripResult {
  switch (input.vehicleType) {
    case 'BEV':
      return calcTrip(input)
    case 'ICE':
    case 'HEV':
      return calcFuelTrip(input)
    case 'PHEV':
      return calcPhevTrip(input)
  }
}

function feasibilityReason(
  type: AnyVehicle['type'],
  feasible: boolean,
): string {
  if (feasible) return 'Alcanza sin parada adicional'
  return type === 'BEV'
    ? 'Requiere carga antes de llegar'
    : 'Requiere reabastecer antes de llegar'
}

/** Reduces any powertrain's trip result to the shared comparison row shape. */
export function toComparisonRow(
  vehicleId: string,
  versionId: string,
  type: AnyVehicle['type'],
  result: AnyTripResult,
): ComparisonRow {
  const feasible =
    'reachesWithReserve' in result
      ? result.reachesWithReserve
      : 'reachesWithoutStop' in result
        ? result.reachesWithoutStop
        : true // PHEV v1: no hard stop concept yet (design §"PHEV")

  return {
    vehicleId,
    versionId,
    type,
    totalCostMxn: result.costMxn,
    costPerKm: result.distanceKm > 0 ? result.costMxn / result.distanceKm : 0,
    feasibleWithoutStop: feasible,
    feasibilityReason: feasibilityReason(type, feasible),
    driveHours: result.driveHours,
  }
}
