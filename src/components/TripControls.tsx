import { useState, type FormEvent } from 'react'
import { routeLabel } from '../data/routes'
import { hasGoogleApiKey, getGoogleApiKey } from '../lib/config'
import { fetchRouteDistance, makeGoogleRoute } from '../lib/google'
import type { DriveStyle, Route, TripMode } from '../types'

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
  apiKeyEpoch: number
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
  apiKeyEpoch,
}: TripControlsProps) {
  void apiKeyEpoch
  const showGoogle = hasGoogleApiKey()
  const styleIndex = DRIVE_STYLE_OPTIONS.findIndex((o) => o.value === driveStyle)

  const [gFrom, setGFrom] = useState('')
  const [gTo, setGTo] = useState('')
  const [gBusy, setGBusy] = useState(false)
  const [gError, setGError] = useState<string | null>(null)

  async function handleGoogleLookup(e: FormEvent) {
    e.preventDefault()
    setGError(null)
    const key = getGoogleApiKey()
    if (!key) {
      setGError('No hay API key configurada.')
      return
    }
    setGBusy(true)
    try {
      const result = await fetchRouteDistance(gFrom, gTo, key)
      const route = makeGoogleRoute(
        gFrom,
        gTo,
        result.distanceKm,
        result.driveHoursOneWay,
      )
      onGoogleRoute(route)
    } catch (err) {
      setGError(
        err instanceof Error
          ? err.message
          : 'Error al consultar Google. Usa km manual.',
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
      </div>

      {showGoogle ? (
        <form className="google-form" onSubmit={handleGoogleLookup}>
          <h3>Distancia con Google</h3>
          <p className="section-lead">
            Consulta Distance Matrix si tienes API key.
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
        </form>
      ) : null}
    </section>
  )
}
