# Phase 1 — GATE A (core types + BEV calc)

> **Status:** Implementation target for mergeable base before Phase 2 forks.  
> **Design:** `docs/superpowers/specs/2026-08-12-syntergy-ac-design.md`  
> **Product display name:** Syntergy AC only.

## Goal

Ship a Vite + React + TypeScript scaffold with BEV catalog, pure `calcTrip`, and Vitest coverage so Phase 2 can extend catalogs/calc in parallel.

## GATE A checklist

- [x] Vite + React + TS boots; `npm run build` succeeds
- [x] Types: `Powertrain`, `Vehicle`, `VehicleVersion`
- [x] `src/data/vehicles.ts` Phase 1 BEV catalog
- [x] Pure `calcTrip` in `src/lib/calc.ts` (MX factor, drive style, reserve, ida/redondo)
- [x] Vitest: BEV one-way + round-trip
- [x] Minimal App shell importing catalog

## Out of scope (rest of Phase 1)

- RouteManager / Google Distance Matrix / Settings API key UI
- 3-slot polished comparison UI
- ICE/HEV/PHEV catalogs (Phase 2)

## Verify

```bash
npm install
npm test
npm run build
```
