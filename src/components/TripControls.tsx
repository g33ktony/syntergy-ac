import { routeLabel } from '../data/routes'
import { formatTripUnits } from '../lib/units'
import type {
  DriveStyle,
  Route,
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
  mode: TripMode
  onModeChange: (mode: TripMode) => void
  driveStyle: DriveStyle
  onDriveStyleChange: (style: DriveStyle) => void
  pricePerKWh: number
  onPriceChange: (price: number) => void
  pricePerLiter: number
  onPricePerLiterChange: (price: number) => void
  unitSystem: UnitSystem
  onApplySuggestedPrice: (price: number) => void
  selectedRoute: Route | null
}

function sourceSuffix(source: Route['source']): string {
  if (source === 'custom') return ' · custom'
  if (source === 'google') return ' · Google'
  if (source === 'osm' || source === 'ors') return ' · OSM'
  if (source === 'abrp') return ' · ABRP'
  if (source === 'merged') return ' · mixto'
  return ''
}

export function TripControls({
  routes,
  selectedRouteId,
  onSelectRouteId,
  mode,
  onModeChange,
  driveStyle,
  onDriveStyleChange,
  pricePerKWh,
  onPriceChange,
  pricePerLiter,
  onPricePerLiterChange,
  unitSystem,
  onApplySuggestedPrice,
  selectedRoute,
}: TripControlsProps) {
  const styleIndex = DRIVE_STYLE_OPTIONS.findIndex((o) => o.value === driveStyle)

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
                {sourceSuffix(route.source)}
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

      {selectedRoute?.elevationGainM != null || selectedRoute?.elevationLossM != null ? (
        <p className="form-hint">
          Elevación (ida): +
          {formatTripUnits(selectedRoute.elevationGainM ?? 0, 'elevation', unitSystem, 0)}
          {' / -'}
          {formatTripUnits(selectedRoute.elevationLossM ?? 0, 'elevation', unitSystem, 0)}
          {selectedRoute.inbound ? (
            <>
              {' · vuelta: +'}
              {formatTripUnits(
                selectedRoute.inbound.elevationGainM ?? 0,
                'elevation',
                unitSystem,
                0,
              )}
              {' / -'}
              {formatTripUnits(
                selectedRoute.inbound.elevationLossM ?? 0,
                'elevation',
                unitSystem,
                0,
              )}
            </>
          ) : null}
        </p>
      ) : null}

      {selectedRoute?.suggestedPricePerKWh != null ? (
        <p className="form-hint suggested-price">
          Precio sugerido en ruta (ABRP): $
          {selectedRoute.suggestedPricePerKWh.toFixed(2)} MXN/kWh — dato poco
          fiable en México, revísalo antes de usarlo.{' '}
          <button
            type="button"
            className="btn-text"
            onClick={() =>
              onApplySuggestedPrice(selectedRoute.suggestedPricePerKWh!)
            }
          >
            Usar precio sugerido
          </button>
        </p>
      ) : null}
    </section>
  )
}
