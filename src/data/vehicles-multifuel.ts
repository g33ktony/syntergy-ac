import type { AnyVehicle, BevVehicle } from '../types'
import { vehicles as bevVehicles } from './vehicles'
import { iceVehicles } from './vehicles-ice'
import { hevVehicles } from './vehicles-hev'
import { phevVehicles } from './vehicles-phev'

// `vehicles.ts` (Phase 1) types its catalog as `Vehicle[]` with
// `type: Powertrain` (broad) rather than the narrowed `'BEV'` literal, since
// Phase 1 doesn't need the discriminated union. Every entry in it is in
// fact `'BEV'` today — assert that at the boundary instead of widening the
// Phase 2 union or touching the Phase 1 file.
const bevVehiclesNarrowed = bevVehicles as unknown as BevVehicle[]

/**
 * Aggregate catalog across all powertrains (Phase 2, plan Task 2/5).
 *
 * Kept separate from `getAllVehicles()` in `./vehicles.ts` on purpose:
 * that function backs Phase 1's live 3-slot BEV comparison UI, and Phase 2
 * must not silently change its return shape out from under
 * VehicleSlot/App.tsx. Multi-fuel UI wiring (Task 6) can switch to this
 * once Phase 1 opts in.
 */
export function getAllMultiFuelVehicles(): AnyVehicle[] {
  return [...bevVehiclesNarrowed, ...iceVehicles, ...hevVehicles, ...phevVehicles]
}

export function getMultiFuelVehicleById(id: string): AnyVehicle | undefined {
  return getAllMultiFuelVehicles().find((v) => v.id === id)
}
