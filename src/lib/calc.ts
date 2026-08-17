import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  KM_PER_CHARGE_STOP,
  MX_FACTOR,
} from './constants'
import { elevationEnergyDeltaKWh } from './elevation'
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

function baseEnergyKWh(input: TripInput): number {
  const styleMult = DRIVE_STYLE_MULTIPLIERS[input.driveStyle]
  const consumptionEffective =
    input.version.consumptionKWhPer100 * MX_FACTOR * styleMult
  return (input.distanceKm * consumptionEffective) / 100
}

function fromEnergyKWh(
  energyKWh: number,
  distanceKm: number,
  input: TripInput,
): TripResultBase {
  const arrivalSocPercent = 100 - (energyKWh / input.version.batteryKWh) * 100
  return {
    distanceKm,
    driveHours: driveHoursForDistance(distanceKm, input.driveHoursOneWay),
    energyKWh,
    costMxn: energyKWh * input.pricePerKWh,
    arrivalSocPercent,
    reachesWithReserve: arrivalSocPercent >= input.reservePercent,
    chargeStopsEstimate: Math.ceil(distanceKm / KM_PER_CHARGE_STOP),
    connector: input.version.connector,
  }
}

/**
 * Pure trip calculator for BEV versions (Phase 1).
 * No React / I/O — safe to unit-test.
 */
export function calcTrip(input: TripInput): TripResult {
  const oneWayElevationDelta = elevationEnergyDeltaKWh(
    input.elevationGainM,
    input.elevationLossM,
  )
  const oneWayEnergy = Math.max(
    0,
    baseEnergyKWh(input) + oneWayElevationDelta,
  )
  const oneWay = fromEnergyKWh(oneWayEnergy, input.distanceKm, input)

  if (input.mode === 'oneWay') {
    return oneWay
  }

  // Round trip: the return leg climbs what the outbound leg descended and
  // vice versa (route-enrichment spec §4.4) — never just double the
  // one-way elevation delta.
  const returnLegElevationDelta = elevationEnergyDeltaKWh(
    input.elevationLossM,
    input.elevationGainM,
  )
  const roundTripEnergy = Math.max(
    0,
    baseEnergyKWh(input) * 2 + oneWayElevationDelta + returnLegElevationDelta,
  )
  const roundTrip = fromEnergyKWh(
    roundTripEnergy,
    input.distanceKm * 2,
    input,
  )

  return {
    ...roundTrip,
    driveHours: oneWay.driveHours * 2,
    chargeStopsEstimate: oneWay.chargeStopsEstimate,
    chargeStopsRoundTripEstimate: Math.ceil(
      (2 * input.distanceKm) / KM_PER_CHARGE_STOP,
    ),
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

export type AnyTripResult =
  | ({ vehicleType: 'BEV' } & TripResult)
  | ({ vehicleType: 'ICE' | 'HEV' } & FuelTripResult)
  | ({ vehicleType: 'PHEV' } & PhevTripResult)

/** Single entry point that dispatches to the right pure calculator by powertrain. */
export function calcAnyTrip(input: AnyTripInput): AnyTripResult {
  switch (input.vehicleType) {
    case 'BEV':
      return { vehicleType: 'BEV', ...calcTrip(input) }
    case 'ICE':
    case 'HEV':
      return { vehicleType: input.vehicleType, ...calcFuelTrip(input) }
    case 'PHEV':
      return { vehicleType: 'PHEV', ...calcPhevTrip(input) }
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

function isFeasibleWithoutStop(result: AnyTripResult): boolean {
  return result.vehicleType === 'BEV'
    ? result.reachesWithReserve
    : result.reachesWithoutStop
}

/** Reduces any powertrain's trip result to the shared comparison row shape. */
export function toComparisonRow(
  vehicleId: string,
  versionId: string,
  type: AnyVehicle['type'],
  result: AnyTripResult,
): ComparisonRow {
  const feasible = isFeasibleWithoutStop(result)

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
