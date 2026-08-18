import { routeLabel } from '../data/routes'
import { MAX_SPEED_KMH, MIN_SPEED_KMH } from '../lib/constants'
import { clampSpeedKmh } from '../lib/speed-factor'
import { formatTripUnits, kmhToMph, miToKm } from '../lib/units'
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
  averageSpeedKmh: number
  onAverageSpeedChange: (speedKmh: number) => void
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
  averageSpeedKmh,
  onAverageSpeedChange,
}: TripControlsProps) {
  const styleIndex = DRIVE_STYLE_OPTIONS.findIndex((o) => o.value === driveStyle)

  return (
    <section className="trip-controls" aria-labelledby="trip-controls-heading">
      <h2 id="trip-controls-heading">Viaje</h2>

      <div className="controls-grid">
        <div className="field field-wide">
          <span>Ruta</span>
          <p className="route-summary" aria-live="polite" aria-disabled="true">
            {selectedRoute
              ? `${routeLabel(selectedRoute)}${sourceSuffix(selectedRoute.source)}`
              : 'Elige origen y destino arriba para ver la ruta.'}
          </p>
        </div>

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
          <span>
            Velocidad promedio (
            {unitSystem === 'imperial' ? 'mph' : 'km/h'})
          </span>
          <input
            type="number"
            min={
              unitSystem === 'imperial'
                ? Math.round(kmhToMph(MIN_SPEED_KMH))
                : MIN_SPEED_KMH
            }
            max={
              unitSystem === 'imperial'
                ? Math.round(kmhToMph(MAX_SPEED_KMH))
                : MAX_SPEED_KMH
            }
            step={1}
            value={
              unitSystem === 'imperial'
                ? Math.round(kmhToMph(averageSpeedKmh))
                : Math.round(averageSpeedKmh)
            }
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              const kmh = unitSystem === 'imperial' ? miToKm(n) : n
              onAverageSpeedChange(clampSpeedKmh(kmh))
            }}
          />
          <span className="form-hint">
            Afecta tiempo y consumo de todos los tickets.
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
