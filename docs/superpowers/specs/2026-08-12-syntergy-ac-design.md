# Syntergy AC — Design Spec

**Date:** 2026-08-12  
**Status:** Approved (pending user review of this written spec)  
**Product / display name:** Syntergy AC  
**Repo / folder:** `syntergy-ac`  
**Planned subdomain:** `ac.syntergy.app` (optional future alias: `autonomy.syntergy.app`)  
**Stack:** Vite + React + TypeScript + Vitest  

> **Naming note (internal only):** “AC” expands to Autonomy Compare. Do **not** use “Autonomy Compare”, “Autonomía Compare”, or “EVs Compare” as the app title, product name, UI branding, or primary heading. Display name is exactly **Syntergy AC**.

---

## 1. Problem

Comparar viajes en México entre vehículos eléctricos (y luego híbridos/gasolina) con datos de ida y redondo, versiones reales, consumo calibrable, y rutas precargadas / custom / Google opcional. El artefacto previo de Claude no reflejaba consumo real (ej. Dolphin Mini Plus ~40% de batería en un tramo que el artefacto sobrestimaba) ni ida/vuelta ni selector modelo→versión correcto.

## 2. Goals (Phase 1)

- Comparar hasta **3 vehículos** en paralelo.
- Flujo **modelo → versión**.
- Catálogo v1 (solo BEV):
  - Chevrolet Spark EUV
  - BYD Dolphin Mini (entrada ~300 km NEDC + Plus/tope)
  - Geely EX2 (entrada + tope)
  - GAC AION UT (básica + tope)
- Toggle global **Solo ida / Redondo**.
- Consumo: **factor carretera MX** + **slider** económico / normal / agresivo.
- Rutas:
  - Precargadas (ciudades MX comunes).
  - Agregar manualmente ciudad A, ciudad B, km → guardar en `localStorage` para reutilizar.
  - Google Distance Matrix **solo si hay API key**; si no hay key, la UI de Google **no se muestra**.
- API key: `config.js` opcional **y** Ajustes en UI (`localStorage`). Preferencia: UI override > config.
- Resultados por vehículo: tiempo estimado, % batería al llegar, kWh, costo ($/kWh editable, **default 2.00 MXN**), puntos de carga estimados, conector, si alcanza (con reserva **15%**).
- En modo **Redondo**, cada tarjeta muestra desglose **ida** + totales **redondo** (no solo un número agregado).
- Branding UI: título **Syntergy AC** únicamente. Tipos de vehículo extensibles para Fase 2 (ICE/HEV/PHEV) sin renombrar el producto.

## 3. Non-goals (Phase 1)

- Catálogo gasolina / HEV / PHEV (Fase 2).
- Mapa visual de ruta / Places Autocomplete completo.
- Backend / auth / multi-usuario.
- Bases reales VEMO/Evergo por coordenadas (estimación por distancia OK).
- Exactitud GPS turno a turno.

## 4. Architecture

```
src/
  data/
    vehicles.ts          # catálogo BEV v1 (extensible por `type`)
    routes.ts            # rutas precargadas MX
  lib/
    calc.ts              # trip math puro (testeable)
    google.ts            # Distance Matrix client
    storage.ts           # custom routes + API key
    config.ts            # merge config.js + localStorage
  components/
    TripControls.tsx     # origen/destino, toggle ida/redondo, slider, $/kWh
    RouteManager.tsx     # lista + agregar ruta custom
    SettingsPanel.tsx    # API key
    VehicleSlot.tsx      # modelo → versión → resultados
    ResultCard.tsx       # métricas BEV (Fase 2 ampliará)
  App.tsx
  main.tsx
config.example.js        # plantilla; config.js en .gitignore
```

**Principles:**

- `calcTrip()` es función pura: inputs → outputs; sin React.
- `Vehicle.type` ya existe en v1 (`'BEV'`) para no romper Fase 2.
- Google y rutas custom no bloquean el core de cálculo.

## 5. Data model

```ts
type Powertrain = 'BEV' | 'HEV' | 'PHEV' | 'ICE'; // ICE/HEV/PHEV unused in UI until Phase 2

type VehicleVersion = {
  id: string;
  name: string;
  batteryKWh: number;
  rangeKmOfficial: number;      // NEDC or maker claim
  consumptionKWhPer100: number; // derived or stated
  powerKW?: number;
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other';
};

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  type: Powertrain;
  versions: VehicleVersion[];
};

type Route = {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  source: 'preset' | 'custom' | 'google';
  driveHoursOneWay?: number;
};

type DriveStyle = 'eco' | 'normal' | 'aggressive';

type TripMode = 'oneWay' | 'roundTrip';

type TripInput = {
  distanceKm: number;
  version: VehicleVersion;
  driveStyle: DriveStyle;
  pricePerKWh: number;
  reservePercent: number; // default 15
  mode: TripMode;
};

type TripResult = {
  distanceKm: number;
  driveHours: number;
  energyKWh: number;
  costMxn: number;
  arrivalSocPercent: number;
  reachesWithReserve: boolean;
  chargeStopsEstimate: number;
  connector: string;
  // when mode === roundTrip, also expose one-way breakdown fields
  oneWay?: Omit<TripResult, 'oneWay' | 'roundTrip'>;
};
```

## 6. Calculations (Phase 1)

1. **Base MX factor:** apply to official consumption, e.g. `consumptionEffective = consumptionOfficial * mxFactor` with `mxFactor ≈ 0.80` (calibrated so a known Dolphin Mini Plus trip lands near ~40% used when distance matches user experience). Exact constant tunable in one place.
2. **Drive style multipliers:** eco `0.90`, normal `1.00`, aggressive `1.15` (tunable).
3. **Energy one-way:** `distanceKm * (consumptionEffective * styleMult) / 100`.
4. **Arrival SoC:** `100 - (energy / batteryKWh * 100)`.
5. **Reaches:** `arrivalSocPercent >= reservePercent`.
6. **Round trip:** compute one-way then scale energy/cost/time ×2; arrival SoC for “sin cargar en destino” = `100 - 2 * energyOneWay/battery*100`; also show one-way numbers when mode is roundTrip (breakdown).
7. **Charge stops estimate:** `Math.ceil(legDistanceKm / 150)` where `legDistanceKm` is one-way distance in Solo ida, and **one-way distance still** for the “paradas en ruta (por tramo)” line in Redondo; additionally show `Math.ceil((2 * oneWayKm) / 150)` as “paradas estimadas redondo” labeled as rough. Document both as estimates, not real network data.
8. **Drive time:** if Google/route provides hours use it; else `distanceKm / 90` hours (highway average 90 km/h).

**Transparency:** UI footnote that NEDC ≠ real world; slider + MX factor exist for that reason.

## 7. UI / UX

- Single page, not a dashboard clutter.
- Brand mark / primary heading: **Syntergy AC** only.
- Global controls top; up to 3 `VehicleSlot` columns.
- Toggle **Solo ida | Redondo** updates all slots.
- Route select: presets ∪ custom; “Agregar ruta” form: from, to, km.
- Settings: paste Google API key; clear key; show Google controls only if key present (config or storage).
- Spanish UI copy (Mexico) for controls and results; product name stays Syntergy AC.

## 8. Google integration

- Use Distance Matrix (or Routes API if Matrix restricted) for A→B distance + duration.
- Key from `import.meta`/`config` or `localStorage`.
- On failure: toast + fallback to manual km.
- Never commit real keys; `config.example.js` only.

## 9. Phase 2 (summary)

Expand to ICE, HEV, PHEV; unified metrics ($/km, fuel liters and/or kWh, CO₂); large multi-brand catalog.  
**Full parallel handoff plan:** `docs/superpowers/plans/2026-08-12-syntergy-ac-phase-2-multi-fuel.md`

### Parallel start gate

| Phase 1 milestone | Phase 2 can start? |
|---|---|
| Scaffold Vite+React | No |
| **GATE A:** `Vehicle` types + `vehicles` module + pure `calcTrip` + tests for BEV | **Yes — catalog + calc branches** |
| GATE B: model→version UI + one result slot | Yes — multi-fuel result components |
| Routes / Google / Settings | Independent; Phase 2 must not edit these files |

**Ownership rule:** Phase 2 only touches `src/data/vehicles*`, `src/lib/calc*`, shared types, and **new** result/metric components until merge.

## 10. Testing

- Unit tests for `calcTrip` (Vitest): one-way, round-trip, reserve edge, style multipliers.
- Manual: add custom route, persist reload, hide Google without key, show with key.

## 11. Future backlog (not Phase 2 required)

- Deploy under Syntergy: prefer `ac.syntergy.app`.
- Real charger DB (VEMO/Evergo).
- Places autocomplete + map polyline.
- Per-network tariffs.
- User calibration “I used X% on this route” → personal factor.

## 12. Open tunables (implement with constants file)

- `MX_FACTOR`, drive style multipliers, `RESERVE_PERCENT`, `KM_PER_CHARGE_STOP`, default `$/kWh`, default highway speed.
