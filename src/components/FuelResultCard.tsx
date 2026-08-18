import type { FuelTripResult, FuelTripResultBase, TripMode, UnitSystem } from '../types'
import { formatHours, formatLocaleNumber, formatMxn, fuelTypeLabel } from '../lib/format'
import {
  displayRoundTripElevation,
  formatAvgSpeedRow,
  formatElevationRow,
  formatTripUnits,
} from '../lib/units'

type FuelResultCardProps = {
  result: FuelTripResult
  mode: TripMode
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
  elevationGainM?: number
  elevationLossM?: number
  returnElevationGainM?: number
  returnElevationLossM?: number
}

function Metrics({
  result,
  label,
  unitSystem,
  avgSpeedLimitKmh,
  avgTravelSpeedKmh,
  elevationGainM,
  elevationLossM,
}: {
  result: FuelTripResultBase
  label?: string
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
  elevationGainM?: number
  elevationLossM?: number
}) {
  const speed = formatAvgSpeedRow(
    {
      distanceKm: result.distanceKm,
      driveHours: result.driveHours,
      avgSpeedLimitKmh,
      avgTravelSpeedKmh,
    },
    unitSystem,
  )
  const elevation = formatElevationRow(elevationGainM, elevationLossM, unitSystem)

  return (
    <div className="metrics">
      {label ? <h4 className="metrics-label">{label}</h4> : null}
      <dl>
        <div>
          <dt>Distancia</dt>
          <dd>{formatTripUnits(result.distanceKm, 'distance', unitSystem, 0)}</dd>
        </div>
        <div>
          <dt>Tiempo estimado</dt>
          <dd>{formatHours(result.driveHours)}</dd>
        </div>
        <div>
          <dt>{speed.label}</dt>
          <dd>{speed.value}</dd>
        </div>
        {elevation ? (
          <div>
            <dt>{elevation.label}</dt>
            <dd>{elevation.value}</dd>
          </div>
        ) : null}
        <div>
          <dt>Combustible usado</dt>
          <dd>{formatTripUnits(result.litersUsed, 'volume', unitSystem)}</dd>
        </div>
        <div>
          <dt>% tanque al llegar</dt>
          <dd className={result.reachesWithoutStop ? 'soc-ok' : 'soc-low'}>
            {formatLocaleNumber(Math.max(result.arrivalFuelPercent, 0), 0)}%
            {result.reachesWithoutStop
              ? ' · alcanza sin parada'
              : ' · requiere parada de reabastecimiento'}
          </dd>
        </div>
        <div>
          <dt>Paradas de reabastecimiento (est.)</dt>
          <dd>{result.fuelStopsEstimate}</dd>
        </div>
        <div>
          <dt>Tipo de combustible</dt>
          <dd>{fuelTypeLabel(result.fuel)}</dd>
        </div>
        <div className="metric-total">
          <dt>{result.tollCostMxn > 0 ? 'Costo combustible' : 'Costo'}</dt>
          <dd>{formatMxn(result.costMxn)}</dd>
        </div>
        {result.tollCostMxn > 0 ? (
          <>
            <div>
              <dt>Casetas</dt>
              <dd>{formatMxn(result.tollCostMxn)}</dd>
            </div>
            <div className="metric-total">
              <dt>Costo total</dt>
              <dd>{formatMxn(result.totalCostMxn)}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Costo por km</dt>
          <dd>{formatMxn(result.costPerKm)}</dd>
        </div>
        <div>
          <dt>CO₂ (est.)</dt>
          <dd>{formatLocaleNumber(result.co2Kg, 1)} kg</dd>
        </div>
      </dl>
    </div>
  )
}

export function FuelResultCard({
  result,
  mode,
  unitSystem,
  avgSpeedLimitKmh,
  avgTravelSpeedKmh,
  elevationGainM,
  elevationLossM,
  returnElevationGainM,
  returnElevationLossM,
}: FuelResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    const roundTrip = displayRoundTripElevation(
      elevationGainM,
      elevationLossM,
      returnElevationGainM,
      returnElevationLossM,
    )
    return (
      <article className="result-card">
        <Metrics
          result={result.oneWay}
          label="Ida"
          unitSystem={unitSystem}
          avgSpeedLimitKmh={avgSpeedLimitKmh}
          avgTravelSpeedKmh={avgTravelSpeedKmh}
          elevationGainM={elevationGainM}
          elevationLossM={elevationLossM}
        />
        <Metrics
          result={result}
          label="Redondo"
          unitSystem={unitSystem}
          avgSpeedLimitKmh={avgSpeedLimitKmh}
          avgTravelSpeedKmh={avgTravelSpeedKmh}
          elevationGainM={roundTrip.gainM}
          elevationLossM={roundTrip.lossM}
        />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics
        result={result}
        unitSystem={unitSystem}
        avgSpeedLimitKmh={avgSpeedLimitKmh}
        avgTravelSpeedKmh={avgTravelSpeedKmh}
        elevationGainM={elevationGainM}
        elevationLossM={elevationLossM}
      />
    </article>
  )
}
