# Syntergy AC — Un ticket, velocidad editable y cargas en ruta

**Date:** 2026-08-17  
**Status:** Draft for user review  
**Product / display name:** Syntergy AC  
**Live:** `https://evmap.syntergy.app`  
**Stack:** Vite + React + TypeScript + Vitest  
**Related:** `docs/superpowers/specs/2026-08-12-syntergy-ac-design.md`, route-enrichment spec, `PRODUCT.md`, `DESIGN.md`

> Display name is **Syntergy AC** only. UI copy stays Spanish (México). Units may be imperial; language does not change.

---

## 1. Problem

La app abre con tres slots vacíos y un mapa/ruta compartidos. La pregunta real del usuario es **si su auto puede hacer esa ruta**. Comparar es secundario. La velocidad solo afecta el tiempo (fallback 90 km/h), no el consumo. Las “paradas de carga” son `ceil(km / 150)`, no pasan por un cargador. El texto “alcanza (reserva 15%)” suena a llegar *con* 15%, no a un piso de seguridad. `$/km` se calcula y no se muestra; no hay CO₂.

## 2. Goals

1. Un viaje, **un ticket** por defecto; **Agregar auto para comparar** hasta 3.
2. Un mapa; cada auto puede tener **su** polilínea si uno va con cargas y el otro no.
3. Velocidad **editable** (default = promedio de la ruta) alimenta **tiempo y consumo**.
4. BEV: primero **sin cargas**; si no alcanza, **con cargas** elige POIs, rerutea por ellos, recarga al 80%, sigue. Tiempo enchufado **fuera de esta entrega**.
5. Copy de reserva honesto; `$/km` y CO₂ (est.) en cada ticket.

## 3. Non-goals (this delivery)

- Tiempo de espera en el cargador sumado al total (siguiente entrega).
- Planner de paradas en ruta para PHEV (sigue el toggle recarga en destino).
- Tarifas VEMO/Evergo, calibración personal, precios de gasolina en vivo, i18n, cuentas.
- Un mapa Leaflet/Google por ticket.
- Convertir costos a USD.
- Catálogo editable.

---

## 4. Screen flow

```
header + Ajustes
  → RouteComposer (origen/destino, mapa único, pines A/B, presets, casetas)
  → TripControls (ruta solo lectura, ida/redondo, estilo, velocidad, $/kWh, $/L)
  → tickets (1 al inicio, máx. 3) + “Agregar auto para comparar”
```

- Origen/destino y pines son **del viaje**. Arrastrar un pin recalcula el path **base** para todos. Los tickets en “con cargas” vuelven a pedir sus piernas.
- No hay tres columnas vacías al cargar. Un ticket usa el ancho disponible; 2–3 usan el grid actual (`repeat(3, minmax(0, 1fr))` bajo 900px → 1 columna).
- Quitar un auto (solo si hay más de uno) quita su línea del mapa.
- Un ticket nuevo nace en `chargeMode: 'none'` y sin `Route` propio.
- ICE/HEV: sin control de cargas en ruta. PHEV: sin planner; se mantiene “Sin recarga / Con recarga” en destino.

---

## 5. Speed

Un control en Viaje, compartido.

| Rule | Value |
|------|--------|
| Default | `distanceKm / driveHours` del path base si hay duración; si no, `DEFAULT_HIGHWAY_KMH` (90) |
| On new origin/dest lookup | Reset al promedio de **esa** ruta (no conservar el override del viaje anterior) |
| Range | 40–130 km/h (clamp). Imperial: el input muestra mph; el estado interno es km/h |
| Time (per ticket) | `pathKm / averageSpeedKmh` (el auto con desvíos tarda más por más km) |
| Consumption factor | `0.6 + 0.4 * (v / 90)²` relative to 90 km/h. At 90 → 1.0 |
| Stacking | `MX_FACTOR × driveStyle × speedFactor`. Elevation deltas unchanged |
| Charge dwell | Not included |

Applies to BEV, HEV, PHEV (electric and fuel legs), and ICE.

`driveHoursOneWay` from providers is used only to **seed** the default speed, not as a frozen duration after the user (or the default speed) is set.

---

## 6. Charging (BEV)

### 6.1 Sin cargas (default)

Always computed first on the **shared** origin→dest path (plus inbound if redondo).

- Feasible iff planned SoC **never goes below** `RESERVE_PERCENT` (15). Arrival SoC is the leftover at dest, which will be ≥ 15% when feasible.
- If feasible: “con cargas” disabled. Helper: `No hace falta cargar en ruta.`
- If not: enable **Con cargas**. Arrival may show 0% (floor display) plus deficit copy.

### 6.2 Con cargas (per ticket)

Only that BEV’s geometry changes.

Greedy planner (pure function):

1. Usable energy from a SoC floor of 15% to a charge target of **80%** (first leg: start 100% → floor 15%).
2. Along the current path, find the km where continuing would drop below 15%.
3. In the last **60 km** of remaining useful range before that point, pick the OpenChargeMap POI **closest to the path** whose connectors are compatible. Match is substring on OCM titles: `CCS1` → CCS / Combo; `GB/T` → GB/T or GBT; `NACS` → NACS or Tesla. `other` does not filter by connector.
4. Reroute legs with the existing lookup stack (Google if key, else OSM/ORS): origin → stop → … → dest. Merge into a ticket-owned `Route` (`chargingPois` = chosen stops). Re-run MX casetas on **that** path so detours can change tolls for that ticket only.
5. At each stop, SoC becomes 80%. Repeat until dest is reachable with ≥ 15%, or **6** stops.
6. If no usable POI or a leg lookup fails: keep base path, stay on “sin cargas”, ticket-level warning. Other tickets untouched.

### 6.3 Round trip

Plan outbound. Return starts at **arrival SoC** (no assumed outlet at dest). Insert return stops with the same planner. No extra “cargar en destino” toggle for BEV in this delivery.

### 6.4 Map

One `MapView`. Pins A/B shared.

Overlays (One Ink Rule — no extra hue per car):

- Path base: tinta atenuada, dashed, thin.
- Ticket paths: tinta; **focused** ticket = thicker solid; others = thinner or dashed.
- Charge stops: markers on the focused ticket’s path (name from OCM).

Focus = last ticket the user interacted with (selector, toggle, or click on the ticket). Default: ticket 1.

### 6.5 Heuristic removal

Delete BEV use of `KM_PER_CHARGE_STOP` (1 per 150 km). UI: `Paradas de carga: 0` without planner; otherwise the planner count. ICE/HEV keep tank-based “sin parada / con parada de combustible” as today.

---

## 7. Ticket copy and extra rows

### 7.1 Reserve (never “llegas con 15%”)

- Headline number: **% batería al llegar** (actual arrival SoC, not the reserve).
- If `reachesWithReserve`: muted line `Se mantiene ≥15% de reserva por imprevistos.`
- If not: alert line `Por debajo de la reserva del 15% (imprevistos). No alcanza sin cargar.`
- Forbidden: `alcanza (reserva 15%)`, `llega con 15%`, `reserva 15%` as if it were the arrival figure.

### 7.2 Costo por km

`totalCostMxn / pathKm` (energy/fuel + casetas). Label: `Costo por km`. Use that ticket’s path km.

### 7.3 CO₂ (est.)

| Energy | Factor | Source (code comment) |
|--------|--------|------------------------|
| Gasoline / HEV / PHEV fuel leg | 2.31 kg CO₂ / L | Combustion of gasoline, ~2.31 kg/L |
| BEV / PHEV electric leg | 0.40 kg CO₂ / kWh | Approximate MX grid intensity |

Label: `CO₂ (est.)`. Footnote already on the page: extend with “CO₂ es orden de magnitud, no inventario oficial.”

---

## 8. Data model (additive)

```ts
type ChargeMode = 'none' | 'withStops'

type SlotSelection = {
  vehicleId: string
  versionId: string
  chargeMode: ChargeMode // ignored unless BEV
}

// App holds:
// slots: SlotSelection[]           // length 1–3
// slotRoutes: (Route | null)[]     // planner output; null = use base route
// averageSpeedKmh: number          // 40–130
// focusedSlotIndex: number
```

`TripInput` (and fuel/PHEV inputs) gain `averageSpeedKmh: number`. Time is always `distanceKm / averageSpeedKmh`. Provider `driveHoursOneWay` is not passed through once speed is set.

`TripResultBase` gains:

- `costPerKm: number`
- `co2Kg: number`
- `chargeStopsEstimate` = planned stop count (0 if none), not km/150
- `chargeStopsRoundTripEstimate` = outbound + inbound planned stops when mode is redondo; omit on one-way

Planner:

```ts
type ChargePlanStop = { poi: ChargingPoi; alongKm: number }

type ChargePlan = {
  feasible: boolean
  stops: ChargePlanStop[]
  reason?: 'no-poi' | 'max-stops' | 'lookup-failed'
}

function speedConsumptionFactor(speedKmh: number): number
function planChargeStops(input: { ... }): ChargePlan
```

---

## 9. Architecture

| Unit | Responsibility |
|------|----------------|
| `src/lib/speed-factor.ts` | `speedConsumptionFactor`; clamp 40–130 |
| `src/lib/co2.ts` | kg from kWh and/or liters |
| `src/lib/charge-plan.ts` | greedy stops on a path + POIs (no I/O) |
| existing `lookup-trip` / OSM / Google | fetch each leg when a plan has stops |
| `calc.ts` / `calc-fuel.ts` / `calc-phev.ts` | apply speed to time + consumption |
| `TripControls` | speed input |
| `VehicleSlot` / `ResultCard*` | one ticket; charge toggle; copy; $/km; CO₂ |
| `App.tsx` | 1–3 slots; `slotRoutes`; focus |
| `MapView` | N polylines + stop markers; one A/B |

Failure isolation: OCM down, no connector match, or leg error → that ticket reverts to base route + warning. Never block RouteComposer or other tickets.

---

## 10. Testing

Vitest (TDD):

- Speed factor: 90 → 1.0; 77 < 1; 110 > 1; clamp 40 and 130.
- `calcTrip`: same distance, 90 vs 77 vs 110 changes energy and hours; hours = km/speed.
- Reserve: arrival 42% and floor 15% → `reachesWithReserve` true; arrival 8% → false. Copy helper strings exact.
- `costPerKm` = totalCost / km; CO₂ BEV vs ICE with the two constants.
- Planner: already feasible → 0 stops; one stop needed → picks nearest POI in the 60 km window; two stops; no POI → `no-poi`; does not mutate the base path fixture.
- Per-ticket: two slots, only slot 1 `withStops` → slot 2 still uses base km.

Manual on `evmap` after ship: one BEV that reaches; one that does not until “con cargas”; add a second ICE; lines independent; change speed 77→90; round trip BEV without dest charge.

---

## 11. Rollout

1. Speed + `$/km` + CO₂ + reserve copy + single-ticket layout (app usable without OCM).
2. Charge planner + per-ticket lookup + map overlays.
3. **Later (not this spec):** minutes at charger + total time.

---

## 12. Open tunables (constants file)

- `SPEED_REF_KMH = 90`
- `SPEED_FACTOR_ROLLING = 0.6` / `SPEED_FACTOR_AERO = 0.4`
- `MIN_SPEED_KMH = 40` / `MAX_SPEED_KMH = 130`
- `RESERVE_PERCENT = 15` (unchanged meaning: floor, not arrival target)
- `CHARGE_TARGET_SOC_PERCENT = 80`
- `CHARGE_SEARCH_BACK_KM = 60`
- `MAX_CHARGE_STOPS = 6`
- `CO2_KG_PER_LITER_GASOLINE = 2.31`
- `CO2_KG_PER_KWH_MX_GRID = 0.40`

---

## 13. Spec self-review

- No TBD/TODO placeholders.
- Charge dwell explicitly deferred; round-trip BEV dest-outlet explicitly out.
- Map styling uses stroke, not a second accent color (One Ink Rule).
- Speed reset vs override: reset only on new origin/dest lookup.
- `costPerKm` includes casetas; documented.
- Scope is one product slice (layout + speed + BEV planner); backlog from §3 stays out.
