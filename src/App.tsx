import { useMemo, useState } from 'react'
import { RouteManager } from './components/RouteManager'
import { SettingsPanel } from './components/SettingsPanel'
import { TripControls } from './components/TripControls'
import {
  VehicleSlot,
  type SlotSelection,
} from './components/VehicleSlot'
import { presetRoutes } from './data/routes'
import { getAllVehicles } from './data/vehicles'
import { DEFAULT_PRICE_PER_KWH } from './lib/constants'
import { loadCustomRoutes } from './lib/storage'
import type { DriveStyle, Route, TripMode } from './types'
import './App.css'

const EMPTY_SLOT: SlotSelection = { vehicleId: '', versionId: '' }

function App() {
  const vehicles = getAllVehicles()
  const [customRoutes, setCustomRoutes] = useState<Route[]>(() =>
    loadCustomRoutes(),
  )
  const [googleRoutes, setGoogleRoutes] = useState<Route[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState(
    () => presetRoutes[0]?.id ?? '',
  )
  const [mode, setMode] = useState<TripMode>('oneWay')
  const [driveStyle, setDriveStyle] = useState<DriveStyle>('normal')
  const [pricePerKWh, setPricePerKWh] = useState(DEFAULT_PRICE_PER_KWH)
  const [slots, setSlots] = useState<SlotSelection[]>([
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ])
  const [apiKeyEpoch, setApiKeyEpoch] = useState(0)

  const allRoutes = useMemo(
    () => [...presetRoutes, ...customRoutes, ...googleRoutes],
    [customRoutes, googleRoutes],
  )

  const selectedRoute =
    allRoutes.find((r) => r.id === selectedRouteId) ?? null

  function updateSlot(index: number, next: SlotSelection) {
    setSlots((prev) => prev.map((s, i) => (i === index ? next : s)))
  }

  function handleGoogleRoute(route: Route) {
    setGoogleRoutes((prev) => [route, ...prev].slice(0, 5))
    setSelectedRouteId(route.id)
  }

  function handleCustomRouteCreated(route: Route) {
    setSelectedRouteId(route.id)
  }

  function handleCustomRoutesChange(routes: Route[]) {
    setCustomRoutes(routes)
    if (selectedRouteId.startsWith('custom-')) {
      const stillThere = routes.some((r) => r.id === selectedRouteId)
      if (!stillThere) {
        setSelectedRouteId(presetRoutes[0]?.id ?? '')
      }
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Syntergy AC</h1>
        <p className="tagline">
          Compara autonomía y costo de viaje entre vehículos eléctricos en
          México.
        </p>
        <SettingsPanel onApiKeyChange={() => setApiKeyEpoch((n) => n + 1)} />
      </header>

      <TripControls
        routes={allRoutes}
        selectedRouteId={selectedRouteId}
        onSelectRouteId={setSelectedRouteId}
        onGoogleRoute={handleGoogleRoute}
        mode={mode}
        onModeChange={setMode}
        driveStyle={driveStyle}
        onDriveStyleChange={setDriveStyle}
        pricePerKWh={pricePerKWh}
        onPriceChange={setPricePerKWh}
        apiKeyEpoch={apiKeyEpoch}
      />

      <RouteManager
        customRoutes={customRoutes}
        onCustomRoutesChange={handleCustomRoutesChange}
        onRouteCreated={handleCustomRouteCreated}
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
          />
        ))}
      </section>

      <p className="footnote">
        El consumo oficial (NEDC/CLTC) no es carretera real. Usamos un factor
        MX y el estilo de manejo para aproximar. Las paradas de carga son
        estimaciones por distancia, no red VEMO/Evergo.
      </p>
    </main>
  )
}

export default App
