# Phase 2 — Multi-fuel catalog (ICE / HEV / PHEV) Implementation Plan

> **For agentic workers (Claude / Codex / Cursor):** Read this entire doc before coding.  
> **REQUIRED context:** Phase 1 design at `docs/superpowers/specs/2026-08-12-syntergy-ac-design.md`  
> **Do not start until GATE A is satisfied** (see below). If GATE A is not done, stop and report blocked.

**Product / display name:** Syntergy AC  
**Repo:** `syntergy-ac` (`/Users/antonio/syntergy-ac`)  
**Subdomain (planned):** `ac.syntergy.app`

> **Naming note (internal only):** “AC” = Autonomy Compare etymology. Never use “Autonomy Compare” / “Autonomía Compare” as the displayed app name. UI title is **Syntergy AC** only.

**Goal:** Extend Syntergy AC beyond BEVs so users can compare gasoline, hybrid (HEV), and plug-in hybrid (PHEV) vehicles on the same trip, with unified cost and “range anxiety / fuel stop” metrics.

**Architecture:** Keep pure calculation in `src/lib/calc*`. Extend `Vehicle.type` branches. Add catalog modules without rewriting route/Google/settings. UI adds metric fields by powertrain; shared trip controls stay owned by Phase 1 until merge.

**Tech Stack:** Vite + React + TypeScript + Vitest (same as Phase 1).

---

## Phase 1 context (hand this to the other agent)

### Product
- **Name:** Syntergy AC (`syntergy-ac`)
- **Phase 1:** Compare up to 3 BEVs for MX road trips (ida / redondo), model→version, MX consumption factor + drive-style slider, preset+custom routes, optional Google Distance Matrix if API key set.

### Phase 1 vehicles (BEV only)
- Chevrolet Spark EUV
- BYD Dolphin Mini (entry + Plus/top)
- Geely EX2 (entry + top)
- GAC AION UT (base + top)

### Key Phase 1 decisions
- Toggle **Solo ida / Redondo** (not always-three-panels).
- Consumption = MX highway factor × drive-style slider.
- Routes: presets + user-saved (city A, city B, km in `localStorage`) + Google only if key (`config.js` and/or Settings UI).
- Charge stops estimate: ~1 per 150 km (simplification).

### Parallelism contract
Phase 2 **MAY** edit:
- `src/data/vehicles.ts` (and new files under `src/data/`)
- `src/lib/calc.ts` (and new `src/lib/calc-*.ts` if split)
- Shared types for vehicles/trips
- **New** components only (e.g. `FuelResultCard.tsx`, `PowertrainBadge.tsx`)

Phase 2 **MUST NOT** edit until merge coordination:
- `src/lib/google.ts`, `src/lib/storage.ts` (routes/key)
- `RouteManager`, `SettingsPanel`, Google UI
- Global layout ownership without syncing with Phase 1 agent

---

## When Phase 2 can start

### GATE A (minimum — start catalog + calc work)

All of the following exist and tests pass:

- [x] Vite + React app boots
- [x] `Powertrain` / `Vehicle` / `VehicleVersion` types exist with `type: 'BEV' | 'HEV' | 'PHEV' | 'ICE'`
- [x] `calcTrip` (or equivalent) is a **pure function** with Vitest coverage for BEV one-way + round-trip
- [x] BEV catalog module is the single source of vehicle data

**Status placeholder for handoff:**  
`GATE A: READY (commit/SHA: af2413af14f66c89577041606f853db541b6380c on feat/gate-a-core)`

### GATE B (safe to wire multi-fuel UI)

- [ ] `VehicleSlot` supports model → version
- [ ] At least one `ResultCard` renders BEV metrics from `calcTrip`
- [ ] Trip mode toggle and distance flow into calc

**Status placeholder:**  
`GATE B: [ ] NOT READY  /  [ ] READY (commit/SHA: ________)`

### Recommended parallel schedule

| Phase 1 still doing… | Phase 2 should do… |
|---|---|
| Routes UI, Google, Settings, polish, 3-slot layout | Catalog ICE/HEV/PHEV + calc branches + unit tests |
| After GATE B | New result subcomponents; feature-flag or `type` switch in slot |
| Final Phase 1 polish | Merge conflict pass on `vehicles.ts` / `calc.ts` / `ResultCard` |

---

## Global Constraints

- Product display name: **Syntergy AC** only (no “Autonomy Compare” in UI titles).
- Spanish UI copy (Mexico) for controls/results.
- Do not commit API keys.
- Prefer extending types over one-off conditionals scattered in JSX.
- YAGNI: no charger network APIs, no map UI in Phase 2 unless Phase 1 already shipped Google distance.
- Default fuel price and electricity price must be editable constants/inputs (MXN).
- Official ranges (WLTP/NEDC/EPA) must be labeled; apply a visible “realism” factor consistent with Phase 1 patterns.

---

## File map (expected after Phase 1 GATE A)

```
src/data/vehicles.ts          # extend or split by powertrain
src/data/vehicles-bev.ts      # optional split
src/data/vehicles-ice.ts      # Phase 2
src/data/vehicles-hev.ts      # Phase 2
src/data/vehicles-phev.ts     # Phase 2
src/lib/calc.ts               # dispatch by type
src/lib/calc-bev.ts           # optional
src/lib/calc-fuel.ts          # ICE/HEV liquid fuel math
src/lib/calc-phev.ts          # electric + fuel blend assumptions
src/components/ResultCard.tsx # or compose BEV + Fuel metrics
```

---

## Data model extensions

```ts
// BEV version fields already in Phase 1...

type IceVersion = {
  id: string;
  name: string;
  tankLiters: number;
  rangeKmOfficial: number;
  consumptionLPer100: number; // combined claim
  fuel: 'gasolina' | 'diesel';
};

type HevVersion = IceVersion & {
  // same liquid metrics; optionally mark system e.g. 'hybrid'
};

type PhevVersion = {
  id: string;
  name: string;
  batteryKWh: number;
  electricRangeKmOfficial: number;
  tankLiters: number;
  consumptionLPer100ChargeSustaining: number;
  connector?: 'CCS1' | 'GB/T' | 'NACS' | 'other';
};
```

Unify behind a discriminated union on `Vehicle.type` so selectors stay one component.

---

## Calculation rules (Phase 2)

### ICE / HEV
- Fuel used (L) = `distanceKm * consumptionLPer100 * realismFactor * styleMult / 100`
- Cost = liters × `$/L` (input; default e.g. 24 MXN — tunable)
- “Arrival fuel %” ≈ tank-relative estimate
- Stops estimate: based on range after realism factor (e.g. stop if trip > 0.85 × effective range)

### PHEV (simple v1 assumptions — document in UI)
- Assume start at 100% battery unless user adds SoC later.
- Electric portion first up to `electricRangeEffective`; remainder on fuel.
- Cost = electric kWh × `$/kWh` + liters × `$/L`.
- Round trip: apply same assumption twice **or** assume recharge at destination (toggle later; default = **no recharge** for conservative compare).

### Unified comparison row
Every powertrain should expose:
- total cost MXN
- energy intensity proxy ($/km)
- whether trip is feasible without stop (boolean + reason)
- time (shared from distance/speed or Google duration)

---

## Suggested starter catalog (editable; “absurd OK”)

Include enough diversity to stress the UI:

**ICE:** Virtus, Sentra, Mazda3, Onix  
**HEV:** Corolla Hybrid, Civic Hybrid, Kicks e-Power  
**PHEV:** RAV4 Prime, Song Plus DM-i, Outlander PHEV  
**Stretch / contrast (optional):** Mustang GT, something tiny city-car  

Use approximate public MX/latam specs; put sources as code comments.

---

## Tasks (bite-sized)

### Task 1: Confirm GATE A
- [x] Pull latest Phase 1 branch
- [x] Verify types + `calcTrip` BEV tests pass
- [x] Fill GATE A status + commit SHA at top of this file (or PR description) — see below
- [x] If not ready: STOP — n/a, GATE A **and** GATE B were already merged locally
      (recovered dangling commits `af2413a`/`0fff868`/`b0266d6`; Phase 1's
      uncommitted GATE B work — RouteManager, SettingsPanel, google.ts,
      storage.ts, VehicleSlot, ResultCard, TripControls — was checkpointed
      as-is in commit `afe9758` before any Phase 2 edits, unmodified.)

### Task 2: Split or extend vehicle types
- [x] Add ICE/HEV/PHEV version shapes as discriminated union
      (`BevVehicle | IceVehicle | HevVehicle | PhevVehicle` in `src/types.ts`,
      additive only — Phase 1's `Vehicle`/`VehicleVersion` unchanged)
- [x] Export `getAllVehicles()` aggregating modules — added
      `getAllMultiFuelVehicles()` in `src/data/vehicles-multifuel.ts` as a
      **separate** function from Phase 1's BEV-only `getAllVehicles()`, so
      the live 3-slot UI's return shape doesn't change out from under it
- [x] Commit

### Task 3: ICE/HEV calc + tests
- [x] Write failing tests for one-way and round-trip fuel used/cost
      (`src/lib/calc-fuel.test.ts`, written before the implementation)
- [x] Implement `calcFuelTrip` (`src/lib/calc-fuel.ts`)
- [x] Wire `calcTrip` switch on `type` — added `calcAnyTrip()` dispatcher in
      `src/lib/calc.ts` rather than overloading `calcTrip` itself, so
      Phase 1's BEV-only call site (`VehicleSlot`) keeps its exact signature
- [x] Commit

### Task 4: PHEV calc + tests
- [x] Failing tests for blended energy (EV then fuel) (`calc-phev.test.ts`)
- [x] Implement conservative no-recharge round-trip (`calc-phev.ts`)
- [x] Commit

### Task 5: Seed catalogs
- [x] Add ≥3 ICE, ≥3 HEV, ≥3 PHEV entries with versions
      (5 ICE / 3 HEV / 3 PHEV models, most with 2 versions — see
      `src/data/vehicles-{ice,hev,phev}.ts`)
- [x] Ensure selector lists group by type or brand — n/a until Task 6 UI
      wiring lands; data is brand-grouped in each catalog file
- [x] Commit

### Task 6: UI metrics (after GATE B) — PARTIAL, by design
- [x] New standalone components: `FuelResultCard.tsx`, `PhevResultCard.tsx`,
      `PowertrainBadge.tsx` (reuse Phase 1's existing `.result-card`/
      `.metrics` CSS classes, no `App.css` edits)
- [ ] **Not wired into `VehicleSlot`/`ResultCard`/`App.tsx`.** Those are
      Phase 1-owned shared/live files (3-slot layout, model→version select,
      trip controls). Wiring multi-fuel selection in requires Phase 1
      decisions (does a slot pick powertrain first? do BEV-only fields like
      connector/SoC get hidden per type?) that are merge-coordination calls,
      not something to force through solo. Left explicitly open — see
      "Left for merge coordination" below.
- [ ] Commit — n/a, nothing to wire yet

### Task 7: Merge readiness
- [x] Rebase on Phase 1 — n/a, single local repo/branch (no separate
      Phase 1 branch existed to rebase against; GATE A+B were already on
      `master`)
- [x] Resolve conflicts only in agreed files — n/a, no conflicts (only
      touched `src/types.ts`, `src/lib/calc.ts` additively, plus new files)
- [x] Full Vitest + manual smoke — 14/14 tests pass, `tsc -b --noEmit`
      clean, `oxlint` clean, `npm run build` succeeds
- [ ] Manual smoke "1 BEV + 1 ICE + 1 PHEV side by side" in the running UI —
      blocked on the Task 6 wiring above
- [x] Commit

**GATE A: [x] READY (commit/SHA: `af2413a` / merged `b0266d6`)**
**GATE B: [x] READY** (RouteManager, SettingsPanel, VehicleSlot model→version,
ResultCard rendering, TripControls all present and working pre-Phase-2)

### Left for merge coordination (Phase 1 + Phase 2)
- Wiring `getAllMultiFuelVehicles()` / `calcAnyTrip()` into `VehicleSlot` so
  a slot can select any powertrain, not just BEV.
- Deciding whether `ResultCard` grows a `type`-based switch internally, or
  `VehicleSlot` picks between `ResultCard`/`FuelResultCard`/`PhevResultCard`
  externally.
- A `pricePerLiter` input needs to be added to `TripControls`/`App.tsx`
  state (currently only `pricePerKWh` is plumbed through); Phase 2's fuel
  calculators accept it as a parameter but nothing in the UI sets it yet —
  `DEFAULT_PRICE_PER_LITER` (24 MXN) is the only value exercised in tests.
- Hiding BEV-only fields (connector, SoC) vs. fuel-only fields (tank %,
  fuel type) per selected vehicle type in whatever slot UI results.

---

## Handoff checklist (paste into the other agent chat)

```
Project: Syntergy AC (/Users/antonio/syntergy-ac)
Phase 1 design: docs/superpowers/specs/2026-08-12-syntergy-ac-design.md
Phase 2 plan: docs/superpowers/plans/2026-08-12-syntergy-ac-phase-2-multi-fuel.md

GATE A commit: af2413af14f66c89577041606f853db541b6380c
GATE B commit: n/a

Phase 1 still in progress: RouteManager / presets+custom routes, Google Distance Matrix (optional key), Settings API key UI, TripControls (ida/redondo + drive style + $/kWh), 3-slot VehicleSlot + ResultCard comparison UI (GATE B+)
Branch to base on: feat/gate-a-core (or master after PR merge)
Instruction: Implement Phase 2 per plan; do not touch Google/routes/settings; keep calc pure + tests.
Display name is Syntergy AC only (never "Autonomy Compare" in UI titles).
```

---

## Out of scope for Phase 2

- Live fuel price APIs
- Exact PHEV OEM blended-cycle simulation
- Charger/gas station maps
- Renaming the product away from Syntergy AC
