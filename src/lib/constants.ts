/** Tunables for BEV trip math (see design §6 / §12). */

/** Highway MX realism vs official NEDC/CLTC consumption. */
export const MX_FACTOR = 0.8

export const DRIVE_STYLE_MULTIPLIERS = {
  eco: 0.9,
  normal: 1.0,
  aggressive: 1.15,
} as const

export const RESERVE_PERCENT = 15

/** Rough charge-stop heuristic: 1 stop per this many km. */
export const KM_PER_CHARGE_STOP = 150

/** Fallback average highway speed when route has no duration. */
export const DEFAULT_HIGHWAY_KMH = 90

/** Default electricity price (MXN / kWh). */
export const DEFAULT_PRICE_PER_KWH = 2.0
