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
- [ ] Pull latest Phase 1 branch
- [ ] Verify types + `calcTrip` BEV tests pass
- [ ] Fill GATE A status + commit SHA at top of this file (or PR description)
- [ ] If not ready: STOP

### Task 2: Split or extend vehicle types
- [ ] Add ICE/HEV/PHEV version shapes as discriminated union
- [ ] Export `getAllVehicles()` aggregating modules
- [ ] Commit

### Task 3: ICE/HEV calc + tests
- [ ] Write failing tests for one-way and round-trip fuel used/cost
- [ ] Implement `calcFuelTrip`
- [ ] Wire `calcTrip` switch on `type`
- [ ] Commit

### Task 4: PHEV calc + tests
- [ ] Failing tests for blended energy (EV then fuel)
- [ ] Implement conservative no-recharge round-trip
- [ ] Commit

### Task 5: Seed catalogs
- [ ] Add ≥3 ICE, ≥3 HEV, ≥3 PHEV entries with versions
- [ ] Ensure selector lists group by type or brand
- [ ] Commit

### Task 6: UI metrics (after GATE B)
- [ ] Extend or compose `ResultCard` to show liters / $/L / electric+fuel for PHEV
- [ ] Hide BEV-only fields (connector, SoC) when not applicable; show analogs
- [ ] Commit

### Task 7: Merge readiness
- [ ] Rebase on Phase 1
- [ ] Resolve conflicts only in agreed files
- [ ] Full Vitest + manual smoke (1 BEV + 1 ICE + 1 PHEV side by side)
- [ ] Commit

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
