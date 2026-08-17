# Route Enrichment — Lane B handoff (ABRP + providers)

**Start immediately** — shared contract is frozen in:

`docs/superpowers/specs/2026-08-12-route-enrichment-abrp-design.md`

## Do not touch (Lane A owns)

- `src/lib/units.ts` / unit preference UI
- Avg-speed **display** wiring in result cards (A adds the row; B only fills richer fields later)

## Build

1. `src/lib/route-enrichment.ts` — types + pure merge (see spec §4)
2. `src/lib/providers/{types,google,abrp,merge}.ts`
3. Settings: `abrpApiKey` + route source selector Google | ABRP | Ambas
4. Optional `suggestedPricePerKWh` hint (manual $/kWh wins)
5. Feature flags; no ABRP key ⇒ app still works with Google/presets

## Contract fields B must populate when available

`avgTravelSpeedKmh`, `avgSpeedLimitKmh`, `elevationGainM`, `elevationLossM`, `suggestedPricePerKWh`, `fieldSources`

## Research first

Confirm ABRP API: speed-limit segments, elevation, charging prices, auth model.
