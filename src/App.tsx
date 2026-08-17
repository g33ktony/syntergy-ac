import { useMemo, useState } from 'react'
import { RouteComposer } from './components/RouteComposer'
import { SettingsPanel } from './components/SettingsPanel'
import { TripControls } from './components/TripControls'
import {
  VehicleSlot,
  type SlotSelection,
} from './components/VehicleSlot'
import { presetRoutes } from './data/routes'
import { getAllMultiFuelVehicles } from './data/vehicles-multifuel'
import { DEFAULT_PRICE_PER_KWH, DEFAULT_PRICE_PER_LITER } from './lib/constants'
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
import './App.css'

const EMPTY_SLOT: SlotSelection = { vehicleId: '', versionId: '' }

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
  const [slots, setSlots] = useState<SlotSelection[]>([
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ])
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

  function updateSlot(index: number, next: SlotSelection) {
    setSlots((prev) => prev.map((s, i) => (i === index ? next : s)))
  }

  function handleLookedUpRoute(route: Route) {
    setGoogleRoutes((prev) => [route, ...prev].slice(0, 5))
    setSelectedRouteId(route.id)
  }

  function handleSelectedRouteChange(route: Route) {
    setGoogleRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)))
    setCustomRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)))
  }

  function handleCustomRouteCreated(route: Route) {
    setSelectedRouteId(route.id)
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
        onSelectPreset={(route) => setSelectedRouteId(route.id)}
        onLookedUpRoute={handleLookedUpRoute}
        mode={mode}
        routeSourcePreference={routeSourcePreference}
        apiKeyEpoch={apiKeyEpoch}
        selectedRoute={selectedRoute}
        onSelectedRouteChange={handleSelectedRouteChange}
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
      />

      <section className="slots" aria-label="Comparación de vehículos">
        {slots.map((selection, index) => (
          <VehicleSlot
            key={index}
            slotIndex={index}
            vehicles={vehicles}
            selection={selection}
            onChange={(next) => updateSlot(index, next)}
            route={selectedRoute}
            mode={mode}
            driveStyle={driveStyle}
            pricePerKWh={pricePerKWh}
            pricePerLiter={pricePerLiter}
            unitSystem={unitSystem}
          />
        ))}
      </section>

      <p className="footnote">
        El consumo oficial (NEDC/CLTC) no es carretera real. Usamos un factor
        MX y el estilo de manejo para aproximar. Las paradas de carga son
        estimaciones por distancia; los puntos OpenChargeMap son de referencia.
        Casetas: tabla MX aproximada, corrígela si tienes el dato real.
      </p>
    </main>
  )
}

export default App
