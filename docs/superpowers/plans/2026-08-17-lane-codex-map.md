# Lane Codex — Map overlays (one map, N polylines)

> **For agentic workers:** REQUIRED SUB-SKILL: executing-plans or subagent-driven-development.  
> **Worktree:** `feat/lane-codex-map` from `feat/single-ticket-speed-charge`.  
> **Start:** now, in parallel with Cursor GATE.  
> **Do not edit:** `App.tsx`, `VehicleSlot.tsx`, `calc*.ts`, `types.ts`, `TripControls.tsx`, `charge-plan.ts`.

**Goal:** `MapView` can draw the shared A/B pins plus optional extra routes (dashed/thin vs focused solid) and charge-stop markers, without changing origin/dest behavior. App may keep passing only `outboundPath`/`inboundPath`; overlays default to empty.

**Architecture:** Additive props on `MapView`. Overlay CSS in a **new** file imported from `MapView` so you do not fight Cursor on `App.css`.

**Tech Stack:** React, Leaflet, Google Maps JS (existing `GoogleMapCanvas`).

## Global Constraints

- One Ink Rule: tinta `#1c1a16` / tinta atenuada `#6b6152`. No per-car hue. Focused = weight 5 solid; others = weight 3 dashed; base inbound can stay slightly thinner.
- Pins A/B stay the only draggable origin/dest.
- Do not fetch routes. Do not call OpenChargeMap.

---

### Task 1: Overlay types local to MapView

**Files:**
- Create: `src/components/map-overlays.ts`
- Test: `src/components/map-overlays.test.ts`

Claude/Cursor will import this type later. Keep it in the components folder so you do not touch `src/types.ts`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { overlayPolylineStyle } from './map-overlays'

describe('overlayPolylineStyle', () => {
  it('makes the focused overlay solid and thicker', () => {
    const focused = overlayPolylineStyle({ focused: true })
    const other = overlayPolylineStyle({ focused: false })
    expect(focused.weight).toBeGreaterThan(other.weight)
    expect(focused.dashArray).toBeUndefined()
    expect(other.dashArray).toBe('8 6')
    expect(focused.color).toBe('#1c1a16')
    expect(other.color).toBe('#6b6152')
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/components/map-overlays.test.ts` — FAIL.

- [ ] **Step 3: Implement**

```ts
import type { ChargingPoi, LatLng } from '../types'

export type RouteOverlay = {
  id: string
  outboundPath: LatLng[]
  inboundPath?: LatLng[]
  focused?: boolean
  stops?: ChargingPoi[]
}

export function overlayPolylineStyle(input: { focused: boolean }): {
  color: string
  weight: number
  dashArray?: string
  opacity: number
} {
  if (input.focused) {
    return { color: '#1c1a16', weight: 5, opacity: 1 }
  }
  return { color: '#6b6152', weight: 3, dashArray: '8 6', opacity: 0.85 }
}
```

- [ ] **Step 4: Tests PASS. Commit** `feat: map overlay style helper`

---

### Task 2: MapView accepts overlays (OSM)

**Files:**
- Modify: `src/components/MapView.tsx`
- Create: `src/map-overlays.css` (import from MapView next to leaflet css)

**Interfaces:**
- Consumes: `RouteOverlay`
- Extend `MapViewProps`:

```ts
type MapViewProps = {
  origin?: LatLng
  dest?: LatLng
  outboundPath?: LatLng[]
  inboundPath?: LatLng[]
  overlays?: RouteOverlay[]
  useGoogle: boolean
  onPinsChange: (origin: LatLng, dest: LatLng) => void
}
```

When `overlays` is missing or empty, behavior equals today (one outbound + one inbound polyline).

When `overlays.length > 0`, **do not** also draw `outboundPath`/`inboundPath` as extra copies. Draw each overlay’s outbound (and inbound if present). Still draw A/B pins from `origin`/`dest`. If App still only passes `outboundPath` (Cursor GATE), overlays empty → current look.

- [ ] **Step 1:** In `OsmMapCanvas`, store `overlayLines: import('leaflet').Polyline[]` and `stopMarkers: import('leaflet').Marker[]` on the ref object.

- [ ] **Step 2:** `syncOsm` extra args: `overlays: RouteOverlay[]`. For each overlay, polyline with `overlayPolylineStyle({ focused: Boolean(o.focused) })`. Leaflet: `dashArray` via `{ dashArray: style.dashArray }`. Focused overlay last (so it paints on top) or `bringToFront()`.

- [ ] **Step 3:** Stops: only markers for the **focused** overlay’s `stops` (or all overlays if none focused — then first overlay). Marker html: a small square `divIcon` class `map-stop`, no second accent color (tinta). `bindTooltip(stop.name)`.

- [ ] **Step 4:** `src/map-overlays.css`:

```css
.map-stop {
  width: 12px;
  height: 12px;
  background: #1c1a16;
  border: 2px solid #fbf8f1;
  box-sizing: border-box;
}
```

- [ ] **Step 5:** Recreate overlay layers on each sync (remove previous polylines/markers) so you do not leak.

- [ ] **Step 6: Commit** `feat: leaflet overlays for per-vehicle routes`

---

### Task 3: GoogleMapCanvas same contract

**Files:** `src/components/MapView.tsx` only (`GoogleMapCanvas`)

- [ ] When `useGoogle`, apply the same overlay rules with `google.maps.Polyline` (`strokeColor`, `strokeWeight`, `icons` or `strokeOpacity`; dashed via `icons` repeating or accept solid tinta atenuada if dash is painful — prefer dashed). Stop markers: `google.maps.Marker` with label `C` or a circle.

- [ ] Commit `feat: google map overlays match leaflet contract`

---

### Task 4: Verify

- [ ] `npx tsc -b --noEmit`
- [ ] `npx oxlint src/components/MapView.tsx src/components/map-overlays.ts`
- [ ] `npx vitest run src/components/map-overlays.test.ts`
- [ ] `npm run build`

PR title: `feat: map overlays for per-vehicle charge detours`

**Stop.** Do not wire App. Empty `overlays` must keep today’s map working with Cursor’s unchanged `RouteComposer`.
