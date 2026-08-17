import { useState, type FormEvent } from 'react'
import { routeLabel } from '../data/routes'
import { getAbrpApiKey, getGoogleApiKey, hasAbrpApiKey, hasGoogleApiKey } from '../lib/config'
import { createAbrpProvider } from '../lib/providers/abrp'
import { createGoogleProvider } from '../lib/providers/google'
import { lookupRoute } from '../lib/providers/merge'
import type { RouteProvider } from '../lib/providers/types'
import { enrichmentToRoute } from '../lib/route-enrichment'
import { formatTripUnits } from '../lib/units'
import type {
  DriveStyle,
  Route,
  RouteSourcePreference,
  TripMode,
  UnitSystem,
} from '../types'

const DRIVE_STYLE_OPTIONS: { value: DriveStyle; label: string }[] = [
  { value: 'eco', label: 'Económico' },
  { value: 'normal', label: 'Normal' },
  { value: 'aggressive', label: 'Agresivo' },
]

type TripControlsProps = {
  routes: Route[]
  selectedRouteId: string
  onSelectRouteId: (id: string) => void
  onGoogleRoute: (route: Route) => void
  mode: TripMode
  onModeChange: (mode: TripMode) => void
  driveStyle: DriveStyle
  onDriveStyleChange: (style: DriveStyle) => void
  pricePerKWh: number
  onPriceChange: (price: number) => void
  pricePerLiter: number
  onPricePerLiterChange: (price: number) => void
  apiKeyEpoch: number
  routeSourcePreference: RouteSourcePreference
  unitSystem: UnitSystem
  onApplySuggestedPrice: (price: number) => void
}

const ROUTE_SOURCE_LABEL: Record<RouteSourcePreference, string> = {
  google: 'Google',
  abrp: 'ABRP',
  both: 'Google + ABRP',
}

export function TripControls({
  routes,
  selectedRouteId,
  onSelectRouteId,
  onGoogleRoute,
  mode,
  onModeChange,
  driveStyle,
  onDriveStyleChange,
  pricePerKWh,
  onPriceChange,
  pricePerLiter,
  onPricePerLiterChange,
  apiKeyEpoch,
  routeSourcePreference,
  unitSystem,
  onApplySuggestedPrice,
}: TripControlsProps) {
  void apiKeyEpoch
  const showGoogle = hasGoogleApiKey()
  const showAbrp = hasAbrpApiKey()
  const showLookup = showGoogle || showAbrp
  const styleIndex = DRIVE_STYLE_OPTIONS.findIndex((o) => o.value === driveStyle)

  const [gFrom, setGFrom] = useState('')
  const [gTo, setGTo] = useState('')
  const [gBusy, setGBusy] = useState(false)
  const [gError, setGError] = useState<string | null>(null)
  const [lastRoute, setLastRoute] = useState<Route | null>(null)

  function activeProviders(): RouteProvider[] {
    const providers: RouteProvider[] = []
    const wantsGoogle =
      routeSourcePreference === 'google' || routeSourcePreference === 'both'
    const wantsAbrp =
      routeSourcePreference === 'abrp' || routeSourcePreference === 'both'

    const googleKey = getGoogleApiKey()
    if (wantsGoogle && googleKey) providers.push(createGoogleProvider(googleKey))

    const abrpKey = getAbrpApiKey()
    if (wantsAbrp && abrpKey) providers.push(createAbrpProvider(abrpKey))

    return providers
  }

  async function handleRouteLookup(e: FormEvent) {
    e.preventDefault()
    setGError(null)
    const providers = activeProviders()
    if (providers.length === 0) {
      setGError('No hay API key configurada para la fuente elegida.')
      return
    }
    setGBusy(true)
    try {
      const merged = await lookupRoute(providers, gFrom, gTo)
      const route = enrichmentToRoute(gFrom, gTo, merged)
      setLastRoute(route)
      onGoogleRoute(route)
    } catch (err) {
      setGError(
        err instanceof Error
          ? err.message
          : 'Error al consultar la ruta. Usa km manual.',
      )
    } finally {
      setGBusy(false)
    }
  }

  return (
    <section className="trip-controls" aria-labelledby="trip-controls-heading">
      <h2 id="trip-controls-heading">Viaje</h2>

      <div className="controls-grid">
        <label className="field field-wide">
          <span>Ruta</span>
          <select
            value={selectedRouteId}
            onChange={(e) => onSelectRouteId(e.target.value)}
          >
            <option value="">Elegir ruta…</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {routeLabel(route)}
                {route.source === 'custom'
                  ? ' · custom'
                  : route.source === 'google'
                    ? ' · Google'
                    : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mode-toggle">
          <legend>Tipo de viaje</legend>
          <div className="segmented" role="group" aria-label="Tipo de viaje">
            <button
              type="button"
              className={mode === 'oneWay' ? 'active' : undefined}
              aria-pressed={mode === 'oneWay'}
              onClick={() => onModeChange('oneWay')}
            >
              Solo ida
            </button>
            <button
              type="button"
              className={mode === 'roundTrip' ? 'active' : undefined}
              aria-pressed={mode === 'roundTrip'}
              onClick={() => onModeChange('roundTrip')}
            >
              Redondo
            </button>
          </div>
        </fieldset>

        <label className="field field-wide">
          <span>
            Estilo de manejo:{' '}
            <strong>{DRIVE_STYLE_OPTIONS[styleIndex]?.label ?? 'Normal'}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={styleIndex < 0 ? 1 : styleIndex}
            onChange={(e) => {
              const next = DRIVE_STYLE_OPTIONS[Number(e.target.value)]
              if (next) onDriveStyleChange(next.value)
            }}
            aria-valuetext={DRIVE_STYLE_OPTIONS[styleIndex]?.label}
          />
          <span className="slider-labels" aria-hidden="true">
            <span>Eco</span>
            <span>Normal</span>
            <span>Agresivo</span>
          </span>
        </label>

        <label className="field">
          <span>$ / kWh (MXN)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={pricePerKWh}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n) && n >= 0) onPriceChange(n)
            }}
          />
        </label>

        <label className="field">
          <span>$ / L gasolina (MXN)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={pricePerLiter}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n) && n >= 0) onPricePerLiterChange(n)
            }}
          />
        </label>
      </div>

      {showLookup ? (
        <form className="google-form" onSubmit={handleRouteLookup}>
          <h3>Distancia con {ROUTE_SOURCE_LABEL[routeSourcePreference]}</h3>
          <p className="section-lead">
            Consulta la ruta con la fuente elegida en Ajustes.
          </p>
          <div className="route-form">
            <label className="field">
              <span>Origen</span>
              <input
                value={gFrom}
                onChange={(e) => setGFrom(e.target.value)}
                placeholder="Ciudad de México, MX"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Destino</span>
              <input
                value={gTo}
                onChange={(e) => setGTo(e.target.value)}
                placeholder="Querétaro, MX"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary"
              disabled={gBusy}
            >
              {gBusy ? 'Consultando…' : 'Obtener km'}
            </button>
          </div>
          {gError ? (
            <p className="form-error" role="alert">
              {gError}
            </p>
          ) : null}

          {lastRoute?.elevationGainM != null || lastRoute?.elevationLossM != null ? (
            <p className="form-hint">
              Elevación (ida): +
              {formatTripUnits(lastRoute.elevationGainM ?? 0, 'elevation', unitSystem, 0)}
              {' / -'}
              {formatTripUnits(lastRoute.elevationLossM ?? 0, 'elevation', unitSystem, 0)}
              {' · fuente '}
              {lastRoute.fieldSources?.elevationGainM ?? 'abrp'}
            </p>
          ) : null}

          {lastRoute?.suggestedPricePerKWh != null ? (
            <p className="form-hint suggested-price">
              Precio sugerido en ruta (ABRP): $
              {lastRoute.suggestedPricePerKWh.toFixed(2)} MXN/kWh — dato poco
              fiable en México, revísalo antes de usarlo.{' '}
              <button
                type="button"
                className="btn-text"
                onClick={() =>
                  onApplySuggestedPrice(lastRoute.suggestedPricePerKWh!)
                }
              >
                Usar precio sugerido
              </button>
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}
