# Lane Cursor — GATE: calc de velocidad + un ticket + copy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Checkboxes (`- [ ]`) for tracking.  
> **Worktree:** `feat/lane-cursor-gate` from `feat/single-ticket-speed-charge`.  
> **Do not edit:** `src/components/MapView.tsx`, `src/lib/charge-plan.ts`, `src/lib/providers/**`.

**Goal:** Speed feeds time and consumption; one ticket by default with add-to-compare; honest reserve copy; `$/km` and CO₂ on tickets. No charging planner.

**Architecture:** Pure helpers (`speed-factor`, `co2`, `reserve-copy`) then `calc*` then React wiring. `averageSpeedKmh` is required on trip inputs. Hours are always `km / speed`. BEV `chargeStopsEstimate` is `0` until Claude’s planner (later).

**Tech Stack:** Vite, React 19, TypeScript, Vitest.

## Global Constraints

- Display name Syntergy AC. Copy Spanish (México).
- `speedConsumptionFactor(v) = 0.6 + 0.4 * (v / 90)²`
- Clamp speed 40–130 km/h.
- Reserve 15% is a **floor**, not the arrival number.
- TDD. Commit after each green task.

---

### Task 1: speed-factor + constants

**Files:**
- Create: `src/lib/speed-factor.ts`, `src/lib/speed-factor.test.ts`
- Modify: `src/lib/constants.ts` (append only)

**Interfaces:**
- Produces: `clampSpeedKmh`, `speedConsumptionFactor`, `seedAverageSpeedKmh`, constants listed below

- [ ] **Step 1: Append constants** to `src/lib/constants.ts`:

```ts
export const SPEED_REF_KMH = 90
export const SPEED_FACTOR_ROLLING = 0.6
export const SPEED_FACTOR_AERO = 0.4
export const MIN_SPEED_KMH = 40
export const MAX_SPEED_KMH = 130
export const CO2_KG_PER_LITER_GASOLINE = 2.31
export const CO2_KG_PER_KWH_MX_GRID = 0.4
```

Keep `DEFAULT_HIGHWAY_KMH = 90`. Do not delete `KM_PER_CHARGE_STOP` yet (Claude/ICE still; BEV calc will stop using it).

- [ ] **Step 2: Failing tests** in `src/lib/speed-factor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  clampSpeedKmh,
  seedAverageSpeedKmh,
  speedConsumptionFactor,
} from './speed-factor'

describe('speedConsumptionFactor', () => {
  it('is 1 at 90 km/h', () => {
    expect(speedConsumptionFactor(90)).toBeCloseTo(1, 8)
  })
  it('is below 1 at 77 km/h', () => {
    expect(speedConsumptionFactor(77)).toBeLessThan(1)
    expect(speedConsumptionFactor(77)).toBeCloseTo(
      0.6 + 0.4 * (77 / 90) ** 2,
      8,
    )
  })
  it('is above 1 at 110 km/h', () => {
    expect(speedConsumptionFactor(110)).toBeGreaterThan(1)
  })
})

describe('clampSpeedKmh', () => {
  it('clamps to 40–130', () => {
    expect(clampSpeedKmh(10)).toBe(40)
    expect(clampSpeedKmh(200)).toBe(130)
    expect(clampSpeedKmh(77)).toBe(77)
  })
})

describe('seedAverageSpeedKmh', () => {
  it('uses distance / hours when duration exists', () => {
    expect(seedAverageSpeedKmh({ distanceKm: 231, driveHoursOneWay: 3 })).toBe(
      clampSpeedKmh(231 / 3),
    )
  })
  it('falls back to 90 when no duration', () => {
    expect(seedAverageSpeedKmh({ distanceKm: 100 })).toBe(90)
  })
})
```

- [ ] **Step 3: Run** `npx vitest run src/lib/speed-factor.test.ts`  
  Expected: FAIL (module missing).

- [ ] **Step 4: Implement** `src/lib/speed-factor.ts`:

```ts
import {
  DEFAULT_HIGHWAY_KMH,
  MAX_SPEED_KMH,
  MIN_SPEED_KMH,
  SPEED_FACTOR_AERO,
  SPEED_FACTOR_ROLLING,
  SPEED_REF_KMH,
} from './constants'

export function clampSpeedKmh(speedKmh: number): number {
  if (!Number.isFinite(speedKmh)) return DEFAULT_HIGHWAY_KMH
  return Math.min(MAX_SPEED_KMH, Math.max(MIN_SPEED_KMH, speedKmh))
}

export function speedConsumptionFactor(speedKmh: number): number {
  const v = clampSpeedKmh(speedKmh)
  return SPEED_FACTOR_ROLLING + SPEED_FACTOR_AERO * (v / SPEED_REF_KMH) ** 2
}

export function seedAverageSpeedKmh(route: {
  distanceKm: number
  driveHoursOneWay?: number
} | null): number {
  if (!route || route.distanceKm <= 0) return DEFAULT_HIGHWAY_KMH
  const hours = route.driveHoursOneWay
  if (hours != null && hours > 0) {
    return clampSpeedKmh(route.distanceKm / hours)
  }
  return DEFAULT_HIGHWAY_KMH
}
```

- [ ] **Step 5: Re-run tests** — Expected: PASS.

- [ ] **Step 6: Commit** `feat: add speed consumption factor and clamp`

---

### Task 2: CO₂ + reserve copy helpers

**Files:**
- Create: `src/lib/co2.ts`, `src/lib/co2.test.ts`, `src/lib/reserve-copy.ts`, `src/lib/reserve-copy.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/lib/co2.test.ts
import { describe, expect, it } from 'vitest'
import { tripCo2Kg } from './co2'

describe('tripCo2Kg', () => {
  it('uses 0.40 kg/kWh for electricity', () => {
    expect(tripCo2Kg({ energyKWh: 10, liters: 0 })).toBeCloseTo(4, 8)
  })
  it('uses 2.31 kg/L for gasoline', () => {
    expect(tripCo2Kg({ energyKWh: 0, liters: 2 })).toBeCloseTo(4.62, 8)
  })
  it('sums PHEV blend', () => {
    expect(tripCo2Kg({ energyKWh: 5, liters: 1 })).toBeCloseTo(2 + 2.31, 8)
  })
})
```

```ts
// src/lib/reserve-copy.test.ts
import { describe, expect, it } from 'vitest'
import { reserveStatusCopy } from './reserve-copy'

describe('reserveStatusCopy', () => {
  it('does not say the driver arrives with 15%', () => {
    const ok = reserveStatusCopy(true)
    expect(ok).toBe('Se mantiene ≥15% de reserva por imprevistos.')
    expect(ok.toLowerCase()).not.toMatch(/llega con/)
    const bad = reserveStatusCopy(false)
    expect(bad).toBe(
      'Por debajo de la reserva del 15% (imprevistos). No alcanza sin cargar.',
    )
  })
})
```

- [ ] **Step 2: Run** both files — FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/co2.ts
import {
  CO2_KG_PER_KWH_MX_GRID,
  CO2_KG_PER_LITER_GASOLINE,
} from './constants'

export function tripCo2Kg(input: { energyKWh?: number; liters?: number }): number {
  const kwh = input.energyKWh ?? 0
  const liters = input.liters ?? 0
  return kwh * CO2_KG_PER_KWH_MX_GRID + liters * CO2_KG_PER_LITER_GASOLINE
}
```

```ts
// src/lib/reserve-copy.ts
export function reserveStatusCopy(reachesWithReserve: boolean): string {
  return reachesWithReserve
    ? 'Se mantiene ≥15% de reserva por imprevistos.'
    : 'Por debajo de la reserva del 15% (imprevistos). No alcanza sin cargar.'
}
```

- [ ] **Step 4: Tests PASS. Commit** `feat: add CO2 estimate and reserve copy helpers`

---

### Task 3: Types + calc time/energy from speed

**Files:**
- Modify: `src/types.ts` (`TripInput`, `TripResultBase`, `FuelTripInput`, `FuelTripResultBase`, `PhevTripInput`, `PhevTripResultBase`)
- Modify: `src/lib/calc.ts`, `calc-fuel.ts`, `calc-phev.ts`
- Modify: `src/lib/calc.test.ts`, `calc-fuel.test.ts`, `calc-phev.test.ts`, `calc-any.test.ts`

**Interfaces:**
- Every `*TripInput` gains required `averageSpeedKmh: number`
- Every `*ResultBase` gains `costPerKm: number` and `co2Kg: number`
- Hours = `distanceKm / clampSpeedKmh(averageSpeedKmh)` (ignore `driveHoursOneWay` for duration)
- Consumption multiplies existing MX × style by `speedConsumptionFactor(averageSpeedKmh)`
- BEV `chargeStopsEstimate` = `0`; omit or `0` for `chargeStopsRoundTripEstimate` on one-way; on redondo set round-trip estimate to `0` as well (planner later)

- [ ] **Step 1: Add a failing test** at the top of the existing BEV describe in `calc.test.ts` (keep `dolphinPlus` helper):

```ts
  it('uses averageSpeedKmh for hours and scales energy vs 90 km/h', () => {
    const version = dolphinPlus()
    const base = {
      distanceKm: 90,
      version,
      driveStyle: 'normal' as const,
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay' as const,
    }
    const at90 = calcTrip({ ...base, averageSpeedKmh: 90 })
    const at77 = calcTrip({ ...base, averageSpeedKmh: 77 })
    expect(at90.driveHours).toBeCloseTo(1, 5)
    expect(at77.driveHours).toBeCloseTo(90 / 77, 5)
    expect(at77.energyKWh).toBeLessThan(at90.energyKWh)
    expect(at90.chargeStopsEstimate).toBe(0)
    expect(at90.costPerKm).toBeCloseTo(at90.totalCostMxn / 90, 5)
    expect(at90.co2Kg).toBeCloseTo(at90.energyKWh * 0.4, 5)
  })
```

- [ ] **Step 2: Run** `npx vitest run src/lib/calc.test.ts` — FAIL on missing field / old hours.

- [ ] **Step 3: Add `averageSpeedKmh: 90` to every existing `calcTrip` / `calcFuelTrip` / `calcPhevTrip` / `calcAnyTrip` fixture** so they typecheck. Change expectations:
  - `chargeStopsEstimate` that used `ceil(km/150)` → `0`
  - `chargeStopsRoundTripEstimate` → `0` or undefined; pick `0` for redondo
  - Hours: if the test did not pass `driveHoursOneWay`, they already used 90 km/h — still pass with `averageSpeedKmh: 90`
  - If a test passed `driveHoursOneWay: 2` expecting those hours, **change the test** to expect `distanceKm / averageSpeedKmh` instead (spec: provider duration only seeds the UI speed)

- [ ] **Step 4: Implement calc**

In `calc.ts` `baseEnergyKWh`, multiply by `speedConsumptionFactor(input.averageSpeedKmh)`.

Replace `driveHoursForDistance` with:

```ts
function driveHoursForDistance(distanceKm: number, averageSpeedKmh: number): number {
  return distanceKm / clampSpeedKmh(averageSpeedKmh)
}
```

In `fromEnergyKWh`, after `attachTripCosts`, set:

```ts
costPerKm: distanceKm > 0 ? totalCostMxn / distanceKm : 0,
co2Kg: tripCo2Kg({ energyKWh }),
chargeStopsEstimate: 0,
```

(`attachTripCosts` returns `totalCostMxn` — compute `costPerKm` from that object.)

Same pattern in `calc-fuel.ts` (`co2Kg: tripCo2Kg({ liters: litersUsed })`) and `calc-phev.ts` (`tripCo2Kg({ energyKWh, liters: litersUsed })`).

PHEV/ICE consumption lines that use `styleMult` must also multiply `speedConsumptionFactor(input.averageSpeedKmh)`.

- [ ] **Step 5: `npx vitest run src/lib/calc.test.ts src/lib/calc-fuel.test.ts src/lib/calc-phev.test.ts src/lib/calc-any.test.ts`** — PASS.

- [ ] **Step 6: Commit** `feat: drive time and consumption from editable speed`

---

### Task 4: TripControls speed + App seed/reset

**Files:**
- Modify: `src/components/TripControls.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `seedAverageSpeedKmh`, `clampSpeedKmh`, `formatTripUnits(..., 'speed', unitSystem, 0)`
- `TripControls` props add `averageSpeedKmh: number` and `onAverageSpeedChange: (v: number) => void`

- [ ] **Step 1: In `App.tsx`**

```ts
const [averageSpeedKmh, setAverageSpeedKmh] = useState(DEFAULT_HIGHWAY_KMH)
```

When `handleLookedUpRoute` / `onSelectPreset` / pin-driven `onSelectedRouteChange` installs a **new** route id (origin/dest lookup), also:

```ts
setAverageSpeedKmh(seedAverageSpeedKmh(route))
```

Do **not** reset speed when only ida/redondo, estilo, or prices change.

Pass speed into `TripControls` and `VehicleSlot`.

- [ ] **Step 2: Speed field** in `TripControls` after estilo, before $/kWh. Metric: number input km/h. Imperial: show mph (`kmhToMph` / `miToKm` from `units.ts`) but call `onAverageSpeedChange` with km/h. `min={40}` `max={130}` (convert those bounds if imperial). Label: `Velocidad promedio`. Hint: `Afecta tiempo y consumo de todos los tickets.`

- [ ] **Step 3: `npx tsc -b --noEmit`** — fix VehicleSlot next task if it still needs the prop.

- [ ] **Step 4: Commit** `feat: editable trip speed seeded from the route`

---

### Task 5: VehicleSlot + result cards (copy, $/km, CO₂)

**Files:**
- Modify: `src/components/VehicleSlot.tsx` (`calcResultForVehicle` pass `averageSpeedKmh`)
- Modify: `ResultCard.tsx`, `FuelResultCard.tsx`, `PhevResultCard.tsx`

- [ ] **Step 1: `VehicleSlotProps` + `calcResultForVehicle` add `averageSpeedKmh: number` into every `calcAnyTrip` call.

- [ ] **Step 2: BEV `ResultCard` metrics**
  - Keep `% batería al llegar` as the number: `{n}%`
  - Replace `· alcanza (reserva 15%)` / `· no alcanza con reserva` with a new `<p className="form-hint">` using `reserveStatusCopy(result.reachesWithReserve)` (alert class `soc-low` only when false)
  - `Paradas de carga`: show `result.chargeStopsEstimate` only (no “1 cada 150”, no `chargeStopsRoundTripEstimate` text unless > 0)
  - After costo total (or after costo if no tolls), add:
    - `Costo por km` → `formatMxn(result.costPerKm)` (if `formatMxn` always uses 1 decimal, that is fine)
    - `CO₂ (est.)` → `{formatLocaleNumber(result.co2Kg, 1)} kg`

- [ ] **Step 3: Fuel + PHEV cards** — same `$/km` and CO₂ rows. Do **not** use `reserveStatusCopy` on ICE (different meaning). ICE keeps tank feasibility copy as today.

- [ ] **Step 4: Footnote in `App.tsx`** append: `CO₂ es orden de magnitud, no inventario oficial.`

- [ ] **Step 5: `npx vitest run && npx tsc -b --noEmit`** — PASS.

- [ ] **Step 6: Commit** `feat: show cost per km, CO2, and honest reserve copy`

---

### Task 6: One ticket + add to compare

**Files:**
- Modify: `src/App.tsx`, `src/App.css`, `src/components/VehicleSlot.tsx` (remove button optional)

- [ ] **Step 1:** `slots` initial state is **one** `EMPTY_SLOT`, not three.

- [ ] **Step 2:** CSS:

```css
.slots {
  margin-top: 2.75rem;
  display: grid;
  gap: 1.75rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
.slots-actions {
  margin-top: 1.1rem;
}
```

Delete the hard `repeat(3, ...)` (keep the 900px single column if still needed — `auto-fit` already collapses).

- [ ] **Step 3:** Below `.slots`, if `slots.length < 3`:

```tsx
<button type="button" className="btn-secondary" onClick={() => setSlots((s) => [...s, EMPTY_SLOT])}>
  Agregar auto para comparar
</button>
```

If `slots.length > 1`, each `VehicleSlot` gets `onRemove` that splices that index. New slots are `chargeMode`-free (do not add `chargeMode` in this lane).

- [ ] **Step 4:** Manual smoke: one ticket full width; add second; both calc with the same speed.

- [ ] **Step 5: Commit** `feat: start with one vehicle ticket and optional compare`

---

### Task 7: Verify GATE

- [ ] `npx tsc -b --noEmit`
- [ ] `npx oxlint src`
- [ ] `npm test`
- [ ] `npm run build`

Open a PR titled `feat: one-ticket compare, editable speed, cost/km and CO2`.

**Stop.** Do not implement charging or map overlays.

After this PR is on the shared base, the human unblocks Claude **Tasks 5+**.
