import { useEffect, useRef, useState, type FormEvent } from 'react'
import { addCustomRoute, removeCustomRoute } from '../lib/storage'
import { hasGoogleApiKey } from '../lib/config'
import { lookupTripFromConfig } from '../lib/providers/lookup-trip'
import { photonReverse } from '../lib/providers/photon'
import { reverseGeocode } from '../lib/google'
import { getGoogleApiKey } from '../lib/config'
import { createDebouncedTask } from '../lib/debounced-task'
import { formatMxn } from '../lib/format'
import { applyTollOverride } from '../lib/tolls'
import { presetRoutes, routeLabel } from '../data/routes'
import type { LatLng, Route, RouteSourcePreference, TripMode } from '../types'
import { MapView } from './MapView'
import type { RouteOverlay } from './map-overlays'
import { PlaceField } from './PlaceField'

type RouteComposerProps = {
  customRoutes: Route[]
  onCustomRoutesChange: (routes: Route[]) => void
  onRouteCreated?: (route: Route) => void
  onSelectPreset?: (route: Route) => void
  onLookedUpRoute: (route: Route) => void
  mode: TripMode
  routeSourcePreference: RouteSourcePreference
  apiKeyEpoch: number
  selectedRoute: Route | null
  onSelectedRouteChange: (route: Route) => void
  overlays?: RouteOverlay[]
}

export function RouteComposer({
  customRoutes,
  onCustomRoutesChange,
  onRouteCreated,
  onSelectPreset,
  onLookedUpRoute,
  mode,
  routeSourcePreference,
  apiKeyEpoch,
  selectedRoute,
  onSelectedRouteChange,
  overlays,
}: RouteComposerProps) {
  void apiKeyEpoch
  const useGoogle = hasGoogleApiKey()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [origin, setOrigin] = useState<LatLng | undefined>()
  const [dest, setDest] = useState<LatLng | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualKm, setManualKm] = useState('')
  const pinLookupDebounce = useRef(createDebouncedTask())

  useEffect(() => {
    const debounce = pinLookupDebounce.current
    return () => debounce.cancel()
  }, [])

  async function runLookup(nextFrom: string, nextTo: string, o?: LatLng, d?: LatLng) {
    if (!nextFrom.trim() || !nextTo.trim()) {
      setError('Indica origen y destino.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const route = await lookupTripFromConfig(
        {
          from: o ?? nextFrom,
          to: d ?? nextTo,
          roundTrip: mode === 'roundTrip',
        },
        routeSourcePreference,
      )
      route.from = nextFrom.trim()
      route.to = nextTo.trim()
      if (o) route.origin = o
      if (d) route.dest = d
      onLookedUpRoute(route)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo calcular la ruta. Usa km manual.',
      )
      setShowManual(true)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    pinLookupDebounce.current.cancel()
    void runLookup(from, to, origin, dest)
  }

  function handlePinsChange(nextOrigin: LatLng, nextDest: LatLng) {
    setOrigin(nextOrigin)
    setDest(nextDest)
    pinLookupDebounce.current.schedule((isStale) => {
      void (async () => {
        const key = getGoogleApiKey()
        const [fromLabel, toLabel] = await Promise.all([
          key
            ? reverseGeocode(nextOrigin, key)
            : photonReverse(nextOrigin).catch(
                () => `${nextOrigin.lat.toFixed(4)}, ${nextOrigin.lng.toFixed(4)}`,
              ),
          key
            ? reverseGeocode(nextDest, key)
            : photonReverse(nextDest).catch(
                () => `${nextDest.lat.toFixed(4)}, ${nextDest.lng.toFixed(4)}`,
              ),
        ])
        if (isStale()) return
        setFrom(fromLabel)
        setTo(toLabel)
        await runLookup(fromLabel, toLabel, nextOrigin, nextDest)
      })()
    }, 800)
  }

  function handleManual(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const distanceKm = Number(manualKm)
    if (!from.trim() || !to.trim()) {
      setError('Indica ciudad A y ciudad B.')
      return
    }
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError('Los kilómetros deben ser un número mayor a 0.')
      return
    }
    const route = addCustomRoute({ from, to, distanceKm })
    onCustomRoutesChange([...customRoutes, route])
    onRouteCreated?.(route)
    setManualKm('')
  }

  function handleRemove(id: string) {
    const next = removeCustomRoute(id)
    onCustomRoutesChange(next)
  }

  /** Presets/custom have city names; drop leftover pin coords from a prior lookup. */
  function applyNamedRoute(route: Route) {
    pinLookupDebounce.current.cancel()
    setFrom(route.from)
    setTo(route.to)
    setOrigin(route.origin)
    setDest(route.dest)
    setError(null)
    onSelectPreset?.(route)
  }

  const outboundPath = selectedRoute?.outbound?.path
  const inboundPath = selectedRoute?.inbound?.path
  const mapOrigin = origin ?? selectedRoute?.origin
  const mapDest = dest ?? selectedRoute?.dest

  return (
    <section className="route-manager" aria-labelledby="route-manager-heading">
      <h2 id="route-manager-heading">Ruta</h2>
      <p className="section-lead">
        Primero elige origen y destino. Los km, elevación, casetas y cargadores
        salen del mapa
        {useGoogle ? ' (Google).' : ' (OSM/OSRM público; puede ser inestable).'}
      </p>

      <div className="preset-chips" aria-label="Rutas frecuentes">
        <span>Rutas frecuentes</span>
        {presetRoutes.map((route) => (
          <button
            key={route.id}
            type="button"
            className="preset-chip"
            onClick={() => applyNamedRoute(route)}
          >
            {routeLabel(route)}
          </button>
        ))}
      </div>

      {!useGoogle ? (
        <p className="form-hint" role="status">
          Usando mapa y ruteo público. Puede fallar o ir lento. En Ajustes
          puedes pegar una API key de Google u OpenRouteService.
        </p>
      ) : (
        <p className="form-hint" role="status">
          Google Maps: arrastra los pines A/B para recalcular.
        </p>
      )}

      <form className="route-form" onSubmit={handleSubmit}>
        <PlaceField
          label="Desde"
          value={from}
          onChange={(value) => {
            setFrom(value)
            setOrigin(undefined)
          }}
          placeholder="Ej. CDMX"
          onResolved={(label, latlng) => {
            setFrom(label)
            setOrigin(latlng)
          }}
        />
        <PlaceField
          label="Hasta"
          value={to}
          onChange={(value) => {
            setTo(value)
            setDest(undefined)
          }}
          placeholder="Ej. Querétaro"
          onResolved={(label, latlng) => {
            setTo(label)
            setDest(latlng)
          }}
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Consultando…' : 'Obtener ruta'}
        </button>
      </form>

      <MapView
        useGoogle={useGoogle}
        origin={mapOrigin}
        dest={mapDest}
        outboundPath={outboundPath}
        inboundPath={inboundPath}
        onPinsChange={handlePinsChange}
        overlays={overlays}
      />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {selectedRoute?.tolls ? (
        <TollEditor route={selectedRoute} onChange={onSelectedRouteChange} />
      ) : null}

      {selectedRoute &&
      selectedRoute.source !== 'preset' &&
      selectedRoute.source !== 'custom' ? (
        <p className="form-hint">
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              const saved = addCustomRoute({
                ...selectedRoute,
                from: selectedRoute.from,
                to: selectedRoute.to,
                distanceKm: selectedRoute.distanceKm,
                driveHoursOneWay: selectedRoute.driveHoursOneWay,
              })
              onCustomRoutesChange([...customRoutes, saved])
              onRouteCreated?.(saved)
            }}
          >
            Guardar en este navegador
          </button>
        </p>
      ) : null}

      {selectedRoute?.chargingPois && selectedRoute.chargingPois.length > 0 ? (
        <div className="charging-list">
          <h3>Carga en ruta</h3>
          <ul>
            {selectedRoute.chargingPois.slice(0, 8).map((poi) => (
              <li key={poi.id}>
                {poi.name}
                {poi.network ? ` · ${poi.network}` : ''}
                {poi.powerKW != null ? ` · ${poi.powerKW} kW` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="section-lead">
        <button
          type="button"
          className="btn-text"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual
            ? 'Ocultar km manual'
            : 'No se encontró la ruta — captura km a mano'}
        </button>
      </p>

      {showManual ? (
        <form className="route-form" onSubmit={handleManual}>
          <label className="field">
            <span>Kilómetros</span>
            <input
              type="number"
              min={1}
              step={1}
              value={manualKm}
              onChange={(e) => setManualKm(e.target.value)}
              placeholder="220"
            />
          </label>
          <button type="submit" className="btn-secondary">
            Guardar km manual
          </button>
        </form>
      ) : null}

      {customRoutes.length > 0 ? (
        <ul className="custom-route-list">
          {customRoutes.map((route) => (
            <li key={route.id}>
              <button
                type="button"
                className="btn-text"
                onClick={() => applyNamedRoute(route)}
              >
                {routeLabel(route)}
              </button>
              <button
                type="button"
                className="btn-text"
                onClick={() => handleRemove(route.id)}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function TollEditor({
  route,
  onChange,
}: {
  route: Route
  onChange: (route: Route) => void
}) {
  const estimate = route.tolls
  const [draft, setDraft] = useState(String(estimate?.costMxn ?? 0))
  useEffect(() => {
    setDraft(String(route.tolls?.costMxn ?? 0))
  }, [route.id, route.tolls?.costMxn])

  if (!estimate) return null

  return (
    <div className="toll-editor">
      <p className="form-hint">
        Casetas {estimate.likelyTolls ? '(hay cuota)' : '(sin cuota detectada)'}:{' '}
        {formatMxn(estimate.costMxn)}
        {estimate.source === 'mx-table' ? ' · tabla MX' : ''}
        {estimate.source === 'manual' ? ' · manual' : ''}
        {estimate.segments[0] ? ` · ${estimate.segments[0].name}` : ''}
      </p>
      <label className="field">
        <span>Casetas (MXN, editable)</span>
        <input
          type="number"
          min={0}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft)
            if (!Number.isFinite(n) || n < 0) return
            onChange({ ...route, tolls: applyTollOverride(estimate, n) })
          }}
        />
      </label>
    </div>
  )
}
