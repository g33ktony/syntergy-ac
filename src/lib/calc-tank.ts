import { FUEL_RANGE_SAFETY_FACTOR } from './constants'

/** Tank % and stop estimate from liters used vs usable tank (safety-factored). */
export function calcTankFeasibility(
  litersUsed: number,
  tankLiters: number,
): {
  arrivalFuelPercent: number
  reachesWithoutStop: boolean
  fuelStopsEstimate: number
} {
  const arrivalFuelPercent =
    tankLiters > 0 ? 100 - (litersUsed / tankLiters) * 100 : 0
  const usableLiters = tankLiters * FUEL_RANGE_SAFETY_FACTOR
  const reachesWithoutStop = usableLiters > 0 && litersUsed <= usableLiters
  const fuelStopsEstimate = reachesWithoutStop
    ? 0
    : usableLiters > 0
      ? Math.ceil(litersUsed / usableLiters) - 1
      : 1

  return { arrivalFuelPercent, reachesWithoutStop, fuelStopsEstimate }
}
