import { MAX_SPEED_KMH, MIN_SPEED_KMH } from './constants'
import { clampSpeedKmh } from './speed-factor'
import { kmhToMph, miToKm } from './units'
import type { UnitSystem } from '../types'

/** Displayed integer in the active unit system (km/h or mph). */
export function formatSpeedDraft(
  speedKmh: number,
  unitSystem: UnitSystem,
): string {
  const displayed =
    unitSystem === 'imperial'
      ? Math.round(kmhToMph(speedKmh))
      : Math.round(speedKmh)
  return String(displayed)
}

/** Parsed km/h from the draft, or null if empty/invalid. */
export function parseSpeedDraftKmh(
  raw: string,
  unitSystem: UnitSystem,
): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return unitSystem === 'imperial' ? miToKm(n) : n
}

/**
 * Live-apply only values already inside the allowed band so partial
 * keystrokes ("9" of "90") do not rewrite parent speed / retrigger
 * charge planning. Out-of-range drafts wait for blur/Enter to clamp.
 */
export function liveSpeedKmhFromDraft(
  raw: string,
  unitSystem: UnitSystem,
): number | null {
  const kmh = parseSpeedDraftKmh(raw, unitSystem)
  if (kmh == null) return null
  if (kmh < MIN_SPEED_KMH || kmh > MAX_SPEED_KMH) return null
  return kmh
}

/** Clamp a finished draft into range, or keep the last committed speed. */
export function commitSpeedKmh(
  raw: string,
  unitSystem: UnitSystem,
  fallbackKmh: number,
): number {
  const kmh = parseSpeedDraftKmh(raw, unitSystem)
  if (kmh == null) return clampSpeedKmh(fallbackKmh)
  return clampSpeedKmh(kmh)
}
