/** Tunables for BEV trip math (see design §6 / §12). */

/**
 * Highway MX realism vs official NEDC/CLTC for BEV (and PHEV electric)
 * consumption: real-world highway driving (AC, wind, tire wear, non-ideal
 * conditions) runs above the official combined-cycle rating, calibrated
 * against ABRP's real-world estimates (~1.3x official at normal style /
 * 90 km/h).
 */
export const MX_FACTOR = 1.3

export const DRIVE_STYLE_MULTIPLIERS = {
  eco: 0.9,
  normal: 1.0,
  aggressive: 1.15,
} as const

export const RESERVE_PERCENT = 15

/** Rough charge-stop heuristic: 1 stop per this many km. */
export const KM_PER_CHARGE_STOP = 150

/** Charge-planner: max detour stops per trip, target SoC after each stop. */
export const MAX_CHARGE_STOPS = 6
export const CHARGE_TARGET_PERCENT = 80

/** Fallback average highway speed when route has no duration. */
export const DEFAULT_HIGHWAY_KMH = 90

/** Default electricity price (MXN / kWh). */
export const DEFAULT_PRICE_PER_KWH = 2.0

// ---------------------------------------------------------------------------
// Phase 2 — ICE / HEV / PHEV tunables (see design §12, plan §"Calculation
// rules"). Additive; does not change any Phase 1 constant above.
// ---------------------------------------------------------------------------

/** Default gasoline price (MXN / liter), regular/"Magna"-ish national avg. */
export const DEFAULT_PRICE_PER_LITER = 24.0

/**
 * Stop if the trip exceeds this fraction of effective (realism-adjusted)
 * range — mirrors the BEV reserve concept but expressed as a range fraction
 * since liquid-fuel tanks don't have a fixed "reserve %" the way SoC does.
 */
export const FUEL_RANGE_SAFETY_FACTOR = 0.85

/**
 * Highway MX realism for ICE/HEV liquid-fuel consumption and the
 * charge-sustaining (fuel) portion of PHEVs. Independently tunable from
 * MX_FACTOR: gasoline official-vs-real gaps are not the same as BEV CLTC.
 * Currently matches the BEV ABRP calibration until a dedicated ICE
 * highway check exists.
 */
export const FUEL_MX_FACTOR = 1.3

// ---------------------------------------------------------------------------
// Elevation → consumption (route-enrichment spec §7.5, rollout step 3).
// Simplified, vehicle-mass-agnostic heuristics — versioned here so future
// tuning has one place to change. Only applied when a route actually
// carries elevationGainM/elevationLossM (currently ABRP-only, opt-in).
// ---------------------------------------------------------------------------

/** Extra electric energy per 100 m of net climb (BEV/PHEV electric portion). */
export const ELEVATION_KWH_PER_100M_GAIN = 0.18

/**
 * Fraction of a descent's equivalent energy recovered via regen braking.
 * Electric powertrains only — liquid fuel has no regen credit.
 */
export const ELEVATION_REGEN_RECOVERY = 0.65

/** Extra fuel per 100 m of climb (ICE/HEV/PHEV fuel portion). No credit for descent. */
export const ELEVATION_L_PER_100M_GAIN = 0.09

/** Reference cruise speed for the aero/rolling consumption split. */
export const SPEED_REF_KMH = 90
export const SPEED_FACTOR_ROLLING = 0.6
export const SPEED_FACTOR_AERO = 0.4
export const MIN_SPEED_KMH = 40
export const MAX_SPEED_KMH = 130

/** Gasoline combustion (~2.31 kg CO₂ per liter). */
export const CO2_KG_PER_LITER_GASOLINE = 2.31
/** Approximate MX grid intensity (kg CO₂ per kWh). */
export const CO2_KG_PER_KWH_MX_GRID = 0.4
