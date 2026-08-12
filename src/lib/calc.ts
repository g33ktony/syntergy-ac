import {
  DEFAULT_HIGHWAY_KMH,
  DRIVE_STYLE_MULTIPLIERS,
  KM_PER_CHARGE_STOP,
  MX_FACTOR,
} from './constants'
import type { TripInput, TripResult, TripResultBase } from '../types'

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
