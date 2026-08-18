import { useMemo, useState } from 'react'
import { RouteComposer } from './components/RouteComposer'
import { SettingsPanel } from './components/SettingsPanel'
import { TripControls } from './components/TripControls'
import { VehicleSlot } from './components/VehicleSlot'
import { presetRoutes } from './data/routes'
import { getAllMultiFuelVehicles } from './data/vehicles-multifuel'
import { DEFAULT_HIGHWAY_KMH, DEFAULT_PRICE_PER_KWH, DEFAULT_PRICE_PER_LITER } from './lib/constants'
import { createSlot, type SlotSelection } from './lib/slots'
import { routeGeometryChanged, seedAverageSpeedKmh } from './lib/speed-factor'
import {
  loadCustomRoutes,
  loadRouteSourcePreference,
  loadUnitSystem,
} from './lib/storage'
import type {
  DriveStyle,
  Route,
  RouteSourcePreference,
  TripMode,
  UnitSystem,
} from './types'
import type { RouteOverlay } from './components/map-overlays'
import './App.css'

function App() {
  const vehicles = getAllMultiFuelVehicles()
  const [customRoutes, setCustomRoutes] = useState<Route[]>(() =>
    loadCustomRoutes(),
  )
  const [googleRoutes, setGoogleRoutes] = useState<Route[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [mode, setMode] = useState<TripMode>('oneWay')
  const [driveStyle, setDriveStyle] = useState<DriveStyle>('normal')
  const [pricePerKWh, setPricePerKWh] = useState(DEFAULT_PRICE_PER_KWH)
  const [pricePerLiter, setPricePerLiter] = useState(DEFAULT_PRICE_PER_LITER)
  const [averageSpeedKmh, setAverageSpeedKmh] = useState(DEFAULT_HIGHWAY_KMH)
  const [slots, setSlots] = useState<SlotSelection[]>(() => [createSlot()])
  const [slotRoutes, setSlotRoutes] = useState<(Route | null)[]>([null])
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null)
  const [apiKeyEpoch, setApiKeyEpoch] = useState(0)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() =>
    loadUnitSystem(),
  )
  const [routeSourcePreference, setRouteSourcePreference] =
    useState<RouteSourcePreference>(() => loadRouteSourcePreference())

  const allRoutes = useMemo(
    () => [...presetRoutes, ...customRoutes, ...googleRoutes],
    [customRoutes, googleRoutes],
  )

  const selectedRoute =
    allRoutes.find((r) => r.id === selectedRouteId) ?? null

  const overlays = useMemo<RouteOverlay[]>(() => {
    return slots
      .map((selection, index): RouteOverlay | null => {
        const slotRoute = slotRoutes[index] ?? selectedRoute
        const outboundPath = slotRoute?.outbound?.path
        if (!outboundPath || outboundPath.length === 0) return null
        return {
          id: selection.id,
          outboundPath,
          inboundPath: slotRoute?.inbound?.path,
          focused: focusedSlotIndex === index,
          stops: slotRoutes[index]?.chargingPois,
        }
      })
      .filter((overlay): overlay is RouteOverlay => overlay != null)
  }, [slots, slotRoutes, selectedRoute, focusedSlotIndex])

  function updateSlot(index: number, next: SlotSelection) {
    setSlots((prev) => prev.map((s, i) => (i === index ? next : s)))
  }

  function updateSlotRoute(index: number, route: Route | null) {
    setSlotRoutes((prev) => prev.map((r, i) => (i === index ? route : r)))
  }

  function applyLookedUpRoute(route: Route) {
    setAverageSpeedKmh(seedAverageSpeedKmh(route))
    setSelectedRouteId(route.id)
  }

  function handleLookedUpRoute(route: Route) {
    setGoogleRoutes((prev) => [route, ...prev].slice(0, 5))
    applyLookedUpRoute(route)
  }

  function handleSelectedRouteChange(route: Route) {
    setGoogleRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)))
    setCustomRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)))
    if (routeGeometryChanged(selectedRoute, route)) {
      setAverageSpeedKmh(seedAverageSpeedKmh(route))
    }
  }

  function handleCustomRouteCreated(route: Route) {
    applyLookedUpRoute(route)
  }

  function handleCustomRoutesChange(routes: Route[]) {
    setCustomRoutes(routes)
    if (selectedRouteId.startsWith('custom-')) {
      const stillThere = routes.some((r) => r.id === selectedRouteId)
      if (!stillThere) {
        setSelectedRouteId('')
      }
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Syntergy AC</h1>
        <p className="tagline">
          Compara autonomía y costo de viaje entre eléctricos, híbridos y
          gasolina en México.
        </p>
        <SettingsPanel
          onApiKeyChange={() => setApiKeyEpoch((n) => n + 1)}
          unitSystem={unitSystem}
          onUnitSystemChange={setUnitSystem}
          routeSourcePreference={routeSourcePreference}
          onRouteSourcePreferenceChange={setRouteSourcePreference}
        />
      </header>

      <RouteComposer
        customRoutes={customRoutes}
        onCustomRoutesChange={handleCustomRoutesChange}
        onRouteCreated={handleCustomRouteCreated}
        onSelectPreset={(route) => {
          setAverageSpeedKmh(seedAverageSpeedKmh(route))
          setSelectedRouteId(route.id)
        }}
        onLookedUpRoute={handleLookedUpRoute}
        mode={mode}
        routeSourcePreference={routeSourcePreference}
        apiKeyEpoch={apiKeyEpoch}
        selectedRoute={selectedRoute}
        onSelectedRouteChange={handleSelectedRouteChange}
        overlays={overlays}
      />

      <TripControls
        mode={mode}
        onModeChange={setMode}
        driveStyle={driveStyle}
        onDriveStyleChange={setDriveStyle}
        pricePerKWh={pricePerKWh}
        onPriceChange={setPricePerKWh}
        pricePerLiter={pricePerLiter}
        onPricePerLiterChange={setPricePerLiter}
        unitSystem={unitSystem}
        onApplySuggestedPrice={setPricePerKWh}
        selectedRoute={selectedRoute}
        averageSpeedKmh={averageSpeedKmh}
        onAverageSpeedChange={setAverageSpeedKmh}
      />

      <section className="slots" aria-label="Comparación de vehículos">
        {slots.map((selection, index) => (
          <VehicleSlot
            key={selection.id}
            slotIndex={index}
            vehicles={vehicles}
            selection={selection}
            onChange={(next) => updateSlot(index, next)}
            onRemove={
              slots.length > 1
                ? () => {
                    setSlots((prev) =>
                      prev.filter((slot) => slot.id !== selection.id),
                    )
                    setSlotRoutes((prev) => prev.filter((_, i) => i !== index))
                    setFocusedSlotIndex((prev) =>
                      prev === index ? null : prev,
                    )
                  }
                : undefined
            }
            route={selectedRoute}
            mode={mode}
            driveStyle={driveStyle}
            pricePerKWh={pricePerKWh}
            pricePerLiter={pricePerLiter}
            unitSystem={unitSystem}
            averageSpeedKmh={averageSpeedKmh}
            onFocus={() => setFocusedSlotIndex(index)}
            onSlotRouteChange={(route) => updateSlotRoute(index, route)}
          />
        ))}
      </section>
      {slots.length < 3 ? (
        <p className="slots-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSlots((s) => [...s, createSlot()])
              setSlotRoutes((r) => [...r, null])
            }}
          >
            Agregar auto para comparar
          </button>
        </p>
      ) : null}

      <p className="footnote">
        El consumo oficial (NEDC/CLTC) no es carretera real. Usamos un factor
        MX y el estilo de manejo para aproximar. Las paradas de carga son las
        del planner cuando está activo; si no, cero. Los puntos OpenChargeMap
        son de referencia. Casetas: tabla MX aproximada, corrígela si tienes
        el dato real. CO₂ es orden de magnitud, no inventario oficial.
      </p>
    </main>
  )
}

export default App
