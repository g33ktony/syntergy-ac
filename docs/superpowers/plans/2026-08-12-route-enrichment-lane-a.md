# Route Enrichment — Lane A Implementation Plan (units + avg speed)

> **For agentic workers:** Lane A only. Lane B uses the shared spec: `docs/superpowers/specs/2026-08-12-route-enrichment-abrp-design.md`.

**Goal:** Preferencia métrico/imperial (copy en español) y velocidad promedio en tarjetas BEV/ICE/PHEV.

**Architecture:** `units.ts` formatea display; velocidad derivada de `distanceKm / driveHours` (o fallback 90 km/h); preferencia en `localStorage`.

**Tech Stack:** Vite, React, TypeScript, Vitest

## Global Constraints

- UI copy always Spanish (including imperial mode).
- Internal calc stays metric/SI.
- Cost stays MXN.
- Do not implement ABRP in this plan.

---

### Task 1: units helper + tests

**Files:** Create `src/lib/units.ts`, `src/lib/units.test.ts`; extend `src/types.ts` with `UnitSystem`

- [ ] Conversions + `formatTripUnits` + `resolveDisplaySpeed`
- [ ] Vitest coverage

### Task 2: Persist unitSystem + Settings toggle

**Files:** `src/lib/storage.ts`, `src/components/SettingsPanel.tsx`, `src/App.tsx`

- [ ] load/save `syntergy-ac:unit-system`
- [ ] Toggle México (métrico) / EE.UU. (imperial); pass down to slots/cards

### Task 3: Show speed + unit-aware distance on result cards

**Files:** `ResultCard.tsx`, `FuelResultCard.tsx`, `PhevResultCard.tsx`, `VehicleSlot.tsx`

- [ ] Row under tiempo estimado
- [ ] Distance uses units formatter
- [ ] Fuel L ↔ gal when imperial
