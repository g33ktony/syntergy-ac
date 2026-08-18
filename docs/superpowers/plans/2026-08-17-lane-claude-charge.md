# Lane Claude — BEV charge planner (then wire after GATE)

> **For agentic workers:** REQUIRED SUB-SKILL: executing-plans or subagent-driven-development.  
> **Worktree:** `feat/lane-claude-charge` from `feat/single-ticket-speed-charge`.  
> **Now:** Tasks 1–4 only (new files).  
> **Forbidden until Cursor says GATE is on the base:** `App.tsx`, `VehicleSlot.tsx`, `TripControls.tsx`, `MapView.tsx`, `calc.ts`, `types.ts`.

**Goal:** Pure planner: given a path, POIs, battery, kWh/km, never plan below 15% SoC; insert up to 6 stops charging to 80%. Later (Tasks 5+): lookup legs per ticket and pass Codex overlays.

**Architecture:** `planChargeStops` has no fetch. kWh/km is an **input** (Cursor’s calc owns the formula). Connector match is substring on OCM titles.

**Tech Stack:** TypeScript, Vitest.

## Global Constraints

- Start SoC 100% on first outbound. Charge target 80%. Floor 15%.
- Search window: last 60 km of remaining useful range before the must-stop km.
- Max 6 stops. No dwell minutes.
- `other` connector = no filter.

---

### Task 1: Connector match

**Files:** Create `src/lib/charge-plan.ts`, `src/lib/charge-plan.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { poiMatchesConnector } from './charge-plan'

describe('poiMatchesConnector', () => {
  it('matches CCS1 to Combo/CCS titles', () => {
    expect(poiMatchesConnector('CCS1', ['IEC 62196-3 CCS Combo 2'])).toBe(true)
    expect(poiMatchesConnector('CCS1', ['Type 2'])).toBe(false)
  })
  it('matches GB/T', () => {
    expect(poiMatchesConnector('GB/T', ['GB/T'])).toBe(true)
    expect(poiMatchesConnector('GB/T', ['GBT'])).toBe(true)
  })
  it('matches NACS / Tesla', () => {
    expect(poiMatchesConnector('NACS', ['NACS'])).toBe(true)
    expect(poiMatchesConnector('NACS', ['Tesla'])).toBe(true)
  })
  it('does not filter when connector is other', () => {
    expect(poiMatchesConnector('other', ['anything'])).toBe(true)
    expect(poiMatchesConnector('other', [])).toBe(true)
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement `poiMatchesConnector`**

```ts
import type { ChargingPoi, LatLng } from '../types'

export function poiMatchesConnector(
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other',
  titles: string[] | undefined,
): boolean {
  if (connector === 'other') return true
  const blob = (titles ?? []).join(' ').toLowerCase()
  if (connector === 'CCS1') return blob.includes('ccs') || blob.includes('combo')
  if (connector === 'GB/T') return blob.includes('gb/t') || blob.includes('gbt')
  return blob.includes('nacs') || blob.includes('tesla')
}
```

- [ ] **Step 4: PASS. Commit** `feat: match OpenChargeMap connectors to vehicle plugs`

---

### Task 2: Already feasible → 0 stops

- [ ] **Step 1: Test**

```ts
import { planChargeStops } from './charge-plan'

const path: LatLng[] = [
  { lat: 19.4, lng: -99.1 },
  { lat: 20.6, lng: -100.4 },
]

it('returns no stops when dest stays above reserve', () => {
  const plan = planChargeStops({
    path,
    pathLengthKm: 80,
    pois: [],
    batteryKWh: 38,
    kWhPerKm: 0.08, // 8 kWh/100 → 80 km uses 6.4 kWh → arrival ~83%
    reservePercent: 15,
    startSocPercent: 100,
    chargeToPercent: 80,
    maxStops: 6,
    connector: 'GB/T',
  })
  expect(plan.feasible).toBe(true)
  expect(plan.stops).toEqual([])
  expect(plan.reason).toBe('already-feasible')
})
```

Use the real function signature below. Energy to dest = `pathLengthKm * kWhPerKm`. Arrival SoC = `startSoc - 100 * energy / batteryKWh`. Feasible if arrival ≥ reserve.

- [ ] **Step 2: Implement `ChargePlanInput` / `ChargePlan` / `planChargeStops`** enough to pass this test.

```ts
export type ChargePlanStop = { poi: ChargingPoi; alongKm: number }

export type ChargePlan = {
  feasible: boolean
  stops: ChargePlanStop[]
  reason?: 'already-feasible' | 'no-poi' | 'max-stops'
}

export type ChargePlanInput = {
  path: LatLng[]
  pathLengthKm: number
  pois: ChargingPoi[]
  batteryKWh: number
  kWhPerKm: number
  reservePercent: number
  startSocPercent: number
  chargeToPercent: number
  maxStops: number
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other'
}
```

- [ ] **Step 3: Commit** `feat: charge plan skips stops when reserve is kept`

---

### Task 3: One stop in the 60 km window

- [ ] **Step 1: Test** — long path 300 km, small pack so a stop is required. Two POIs: one at 50 km (too early / outside window) and one at 220 km (inside last 60 km before must-stop). Expect the 220 km POI.

Compute must-stop: usable kWh = battery * (startSoc - reserve) / 100; rangeKm = usable / kWhPerKm. Window `[mustStopKm - 60, mustStopKm]`.

Give POIs `alongKm` already set. Filter with `poiMatchesConnector`. Pick the POI in window **closest to the path** (smallest `|alongKm - mustStopKm|` is acceptable if all have alongKm; prefer the one with alongKm nearest to mustStopKm without exceeding it).

After adding the stop, SoC = 80%, remaining distance = pathLength - alongKm, repeat. For this test one stop should suffice.

- [ ] **Step 2: Implement the greedy loop.** Do not mutate the input `pois` array.

- [ ] **Step 3: Test: wrong connector at the only in-window POI → `reason: 'no-poi'`, `feasible: false`, `stops: []`.

- [ ] **Step 4: Commit** `feat: greedy charge stop in reserve window`

---

### Task 4: Two stops + maxStops

- [ ] **Step 1: Test** two required stops on a 500 km path with two in-window POIs chained.

- [ ] **Step 2: Test** `maxStops: 1` when two are needed → `reason: 'max-stops'`, `feasible: false`, `stops.length === 1` (the one it could place).

- [ ] **Step 3: Commit** `feat: cap planned charge stops at six`

**Wave 1 PR:** `feat: BEV charge-stop planner (pure)`. Merge independently.

---

## STOP — human gate

Do not start Task 5 until Cursor GATE (`feat/lane-cursor-gate`) **and** Codex MapView (`feat/lane-codex-map`) are on your base (`git pull` / rebase). Then create `feat/lane-claude-charge-wire` from that updated `master`.

---

### Task 5 (after GATE): kWh/km from the live calc + lookup legs

**Files:**
- Create: `src/lib/charge-legs.ts`, `src/lib/charge-legs.test.ts`
- Modify: `src/components/VehicleSlot.tsx`, `src/App.tsx` — **now allowed**

**Interfaces:**
- Consumes Cursor: `averageSpeedKmh`, `calcAnyTrip`, `speedConsumptionFactor`, BEV `consumptionKWhPer100 * MX_FACTOR * style * speedFactor / 100` as `kWhPerKm`
- Consumes Codex: `RouteOverlay` from `src/components/map-overlays.ts`
- Consumes existing `lookupTrip` in `src/lib/providers/lookup-trip.ts`

- [ ] Export a small helper (keep in `charge-legs.ts` or VehicleSlot):

```ts
export function bevKWhPerKm(input: {
  consumptionKWhPer100: number
  driveStyle: 'eco' | 'normal' | 'aggressive'
  averageSpeedKmh: number
}): number {
  // same product as calc.ts: MX_FACTOR * style * speedFactor * consumption / 100
}
```

Test it against `calcTrip` energy / distance on a 100 km trip at 90 km/h (must match within 1e-6, elevation 0).

- [ ] `lookupTripViaStops({ origin, dest, stops, roundTrip, preference, keys })`: sequentially `lookupTrip` origin→stop[0], stop[i]→stop[i+1], last→dest. Concatenate `outbound.path`. Sum `distanceKm` and hours. Re-run `estimateTolls` on the concatenated path (import from `src/lib/tolls.ts`). On any leg throw: return `null` (caller keeps base route).

Mock `lookupTrip` in the test file via injecting a `lookup` function parameter — do not hit the network:

```ts
export async function lookupTripViaStops(options: {
  origin: LatLng
  dest: LatLng
  stops: ChargingPoi[]
  roundTrip: boolean
  lookup: typeof lookupTrip
  preference: RouteSourcePreference
}): Promise<Route | null>
```

- [ ] Round trip: plan outbound with `startSocPercent: 100`. Plan inbound with `startSocPercent` = arrival after outbound energy (including detours). Lookup inbound dest→origin via return stops. Fill `route.inbound`.

- [ ] Commit `feat: stitch route legs through planned chargers`

---

### Task 6 (after GATE): UI toggle + overlays

**Files:** `VehicleSlot.tsx`, `App.tsx`, maybe `RouteComposer.tsx` only if you must pass overlays into `MapView` (RouteComposer currently owns MapView — **prefer** adding an `overlays` prop to `RouteComposer` rather than moving the map).

- [ ] `SlotSelection` stays as Cursor left it. Hold charge mode in VehicleSlot state **or** lift to App: `chargeModeBySlot: ('none' | 'withStops')[]`. Spec: new tickets `'none'`.

- [ ] BEV + `!reachesWithReserve` on the **base** route: enable segmented `Sin cargas` / `Con cargas`. If reaches: disable Con cargas, hint `No hace falta cargar en ruta.`

- [ ] On Con cargas: run `planChargeStops` with `route.chargingPois` (already on the looked-up route). Then `lookupTripViaStops`. Store `slotRoutes[i]`. Calc uses that route’s km/elevation/tolls. On failure: warning paragraph, stay on base route.

- [ ] Build `overlays: RouteOverlay[]` — one per slot that has a path (slot route or base). `focused` = last slot clicked (`focusedSlotIndex` in App). Pass to MapView via RouteComposer.

- [ ] Copy: never “alcanza (reserva 15%)” (Cursor should have removed it; do not reintroduce).

- [ ] Commit `feat: per-ticket charge detours on the shared map`

---

### Task 7: Verify wave 2

- [ ] `npx tsc -b --noEmit && npx oxlint src && npm test && npm run build`
- [ ] Manual: BEV that fails CDMX–something long → Con cargas draws a detour; add ICE ticket → ICE line stays direct.

PR: `feat: BEV in-route charging with per-ticket geometry`
