import {
  ELEVATION_KWH_PER_100M_GAIN,
  ELEVATION_L_PER_100M_GAIN,
  ELEVATION_REGEN_RECOVERY,
} from './constants'

/**
 * Extra electric energy for climbing/descending, applied to BEV consumption
 * and the electric portion of a PHEV trip (route-enrichment spec §7.5).
 * Descent only credits a fraction back via regen — never fully "free".
 *
 * `kmShare` scales the whole-route gain/loss down to the fraction of the
 * trip actually driven on electric power (1 for BEV, electricKm/distanceKm
 * for PHEV) — elevation data is a route-level fact, not split by segment.
 */
export function elevationEnergyDeltaKWh(
  gainM: number | undefined,
  lossM: number | undefined,
  kmShare = 1,
): number {
  if (gainM == null && lossM == null) return 0
  const gainCost = ((gainM ?? 0) / 100) * ELEVATION_KWH_PER_100M_GAIN
  const lossCredit =
    ((lossM ?? 0) / 100) * ELEVATION_KWH_PER_100M_GAIN * ELEVATION_REGEN_RECOVERY
  return (gainCost - lossCredit) * kmShare
}

/**
 * Extra fuel for climbing, applied to ICE/HEV consumption and the fuel
 * portion of a PHEV trip. No credit for descent — coasting/engine braking
 * doesn't put fuel back in the tank.
 */
export function elevationFuelDeltaLiters(
  gainM: number | undefined,
  kmShare = 1,
): number {
  if (gainM == null) return 0
  return ((gainM ?? 0) / 100) * ELEVATION_L_PER_100M_GAIN * kmShare
}
