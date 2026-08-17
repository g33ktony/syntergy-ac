# Syntergy AC — Route Enrichment, Units & ABRP Design

**Date:** 2026-08-12  
**Status:** Draft for user review  
**Product:** Syntergy AC  
**Repo:** `syntergy-ac`  
**Related:** `docs/superpowers/specs/2026-08-12-syntergy-ac-design.md` (Phase 1), Phase 2 multi-fuel  

---

## 1. Problem

Hoy el viaje usa distancia (y a veces duración de Google Distance Matrix). El consumo es plano (ficha × factor MX × estilo). La velocidad solo alimenta el tiempo (fallback 90 km/h) y **no se muestra**. No hay elevación, límites de velocidad en ruta, ni precios de carga en ruta. Google es el único proveedor opcional; no hay ABRP ni selector de fuente.

Además, usuarios en EE.UU. necesitan ver **unidades imperiales** sin cambiar el idioma de la app (español hasta i18n).

## 2. Goals

1. Mostrar **velocidad promedio** en tarjetas Ida/Redondo (BEV, ICE/HEV, PHEV).
2. Preferencia **métrico | imperial**; toda la UI permanece en **español** (i18n después).
3. Contrato compartido `RouteEnrichment` para presets, manual, Google, ABRP y merge.
4. Integrar **ABRP** (opt-in) para elevación, límites / avg ponderado, y sugerencia de precio kWh en ruta.
5. **Selector de fuente de ruta:** Google | ABRP | Ambas (merge).
6. Trabajo en **fases paralelas** (Cursor carril A · Claude/Codex carril B) sobre el mismo contrato.

## 3. Non-goals (esta entrega)

- i18n multi-idioma (ES/EN).
- Conversión de costos a USD.
- Mapa canvas / Places autocomplete completo (backlog; el selector de *fuente* sí entra).
- Confiar ciegamente en precios de cargadores ABRP.
- Reemplazar por completo Google en v1 (sigue disponible).
- Más APIs de precios de carga más allá del hook pluggable (solo ABRP hint en v1).

---

## 4. Shared contract — `RouteEnrichment`

Campos canónicos (cálculo interno en SI / métrico). La UI formatea según `unitSystem`.

### 4.1 Core (ya existen en `Route`)

| Campo | Notas |
|--------|--------|
| `distanceKm` | Obligatorio |
| `driveHoursOneWay?` | Si falta → fallback tiempo con `DEFAULT_HIGHWAY_KMH` |
| `source` | Extender: `'preset' \| 'custom' \| 'google' \| 'abrp' \| 'merged'` |

### 4.2 Enrichment (nuevo)

| Campo | Significado |
|--------|-------------|
| `avgTravelSpeedKmh?` | `distanceKm / driveHours` cuando hay duración |
| `avgSpeedLimitKmh?` | Promedio **ponderado por longitud de tramo** de límites (110/90/80…) si el proveedor lo da |
| `elevationGainM?` / `elevationLossM?` | Ida; en redondo también return o totales documentados |
| `suggestedPricePerKWh?` | Hint de precio en ruta (ABRP); nunca pisa el $/kWh manual sin acción del usuario |
| `fieldSources` | Por campo: `'preset' \| 'google' \| 'abrp' \| 'derived' \| 'merged' \| 'manual'` |

**Nombre en UI (velocidad mostrada):**  
Prioridad: `avgSpeedLimitKmh` si existe → si no `avgTravelSpeedKmh` → si no fallback 90 km/h (`derived`).

Labels (siempre español):

- Con límites: `Vel. promedio (límites)`
- Con duración: `Vel. promedio (estimada)`
- Fallback: `Vel. promedio (ref. 90 km/h)` / en imperial `… (ref. 56 mph)` equivalente

### 4.3 Merge rules (v1)

1. Un solo proveedor tiene el dato → usarlo; `fieldSources[field] = ese proveedor`.
2. Dos proveedores tienen el mismo dato numérico (p. ej. duración o distancia) → **promedio**; `fieldSources = merged`.
3. Sin duración → no inventar elevación; velocidad de viaje = derived 90 km/h.
4. **Precios kWh:** `manual (TripControls) > suggestedPricePerKWh (opt-in apply) > DEFAULT_PRICE_PER_KWH`. ABRP nunca escribe solo el precio activo.

### 4.4 Round trip

- Enriquecer **ida**; **vuelta** = geometría invertida o segundo fetch ABRP.
- Tarjeta Redondo: velocidad del tramo total (o ida+vuelta documentado en UI).
- Elevación redondo = suma ida + vuelta (gain/loss).

---

## 5. Units preference (carril A)

### 5.1 Preferencia

- `unitSystem: 'metric' | 'imperial'` en `localStorage` (mismo patrón que Google API key).
- Default: `metric`.
- Toggle en Settings (o TripControls): **México (métrico)** / **EE.UU. (imperial)**.
- **Solo cambia unidades**, no idioma. Copy siempre en español.

### 5.2 Display mapping

| Kind | Métrico | Imperial |
|------|---------|----------|
| Distancia | km | mi |
| Velocidad | km/h | mph |
| Elevación | m | ft |
| Combustible volumen | L | gal (US) |
| Energía | kWh | kWh |
| Costo | MXN | MXN (sin USD en v1) |

Helper: `src/lib/units.ts` — `formatTripUnits(value, kind, unitSystem)` + conversiones puras testeables.

---

## 6. UI — velocidad en resultados (carril A)

En `ResultCard` / `FuelResultCard` / `PhevResultCard`, debajo de **Tiempo estimado**:

```
Vel. promedio · 80 km/h · (límites|estimada|ref.)
```

Imperial ejemplo:

```
Vel. promedio · 50 mph · (estimada)
```

Derivar en el cliente desde `Route` + enrichment (o `distanceKm / driveHours` si aún no hay enrichment).

**Carril A no implementa ABRP ni elevación en el consumo.**

---

## 7. Providers (carril B)

### 7.1 Roles

| Capacidad | Google (actual + posible) | ABRP (nuevo) |
|-----------|---------------------------|--------------|
| Distancia / duración | Distance Matrix (hoy) | Plan / route API |
| Elegir ruta (UX) | Key opcional; futuro mapa | Alternativa o complemento |
| Elevación | Elevation API opcional | Preferido para perfil |
| Límites / avg ponderado | Si disponible | Preferido |
| Precio kWh en ruta | — | Sugerencia opt-in |

### 7.2 Selector UX

Fuente de ruta: **Google | ABRP | Ambas (merge)**.  
Persistir preferencia en `localStorage`.  
Sin API key del proveedor elegido → ocultar o deshabilitar esa opción (mismo patrón que Google hoy).

### 7.3 Config / keys

Extender `config.js` + Settings:

- `googleMapsApiKey` (existente)
- `abrpApiKey` (nuevo)
- Flags: `abrpEnabled`, `useRouteChargingPriceHint`

### 7.4 Architecture sketch

```
src/lib/
  units.ts                 # carril A
  route-enrichment.ts      # tipos + merge puro
  providers/
    types.ts               # RouteProvider interface
    google.ts              # wrap google.ts actual
    abrp.ts                # cliente ABRP
    merge.ts               # apply merge rules
```

```ts
interface RouteProvider {
  id: 'google' | 'abrp'
  lookup(from: string, to: string): Promise<Partial<RouteEnrichment> & { distanceKm: number }>
}
```

### 7.5 Elevación → consumo (fase posterior al enrichment)

Documentar multiplicador (p. ej. factor por m de gain neto) en plan de implementación **después** de tener datos reales en `RouteEnrichment`. No bloquear carril A ni el primer merge ABRP.

### 7.6 Charging price hints

- ABRP puede devolver `suggestedPricePerKWh`.
- UI: chip “Usar precio sugerido en ruta (ABRP)” que copia al input $/kWh; el usuario puede editar después.
- Experiencia conocida: precios ABRP poco fiables en MX → siempre subtítulo de cautela.
- Extensibilidad: `ChargingPriceProvider` para APIs futuras (mismo merge/fallback).

---

## 8. Parallel delivery

| Carril | Owner sugerido | Entrega |
|--------|----------------|---------|
| **A** | Cursor | `units.ts`, preferencia, velocidad en 3 tarjetas, tests |
| **B** | Claude (spec/plan) → Codex (adapter) | Providers, ABRP, selector, merge, hint precio, tests |
| **Integración** | Uno solo | ABRP rellena campos que A ya muestra; flags off por default |

**Contrato compartido (esta spec) es el gate** antes de divergir en ramas.

---

## 9. Testing

**Carril A**

- Conversiones km↔mi, km/h↔mph, L↔gal, m↔ft.
- Velocidad: con duración; sin duración → 90 km/h; labels correctos.
- Redondo: velocidad consistente con distancia/tiempo totales.

**Carril B**

- Merge: un lado vacío; ambos presentes → promedio; sources correctos.
- Sin `abrpApiKey`: app no rompe; Google/presets siguen.
- Hint precio no muta `$/kWh` hasta acción del usuario.

---

## 10. Rollout

1. Ship carril A (velocidad + unidades).
2. ABRP opt-in + enrichment (elevación/límites en modelo de datos).
3. Elevación en fórmula de consumo (multiplicador versionado).
4. i18n + más price providers + mapa visual (backlog).

---

## 11. Open questions (no bloquean carril A)

1. ¿Credenciales ABRP partner ya disponibles o feature-flag hasta tener key?
2. ¿ABRP expone límites por tramo y precios de carga en la API que usaremos? (validar en research del carril B).
3. ¿Redondo: un fetch ABRP ida+vuelta o dos llamadas?

---

## 12. Spec self-review

- [x] Sin placeholders TBD en requisitos de carril A.
- [x] Copy imperial en español; i18n explícitamente deferred.
- [x] Precios ABRP = sugerencia, no autoridad.
- [x] Contrato alineado con trabajo paralelo Cursor / Claude / Codex.
- [x] Non-goals claros (mapa canvas, USD, i18n).
