import type { TripResult, TripMode, UnitSystem } from '../types'
import { formatHours, formatLocaleNumber, formatMxn } from '../lib/format'
import { reserveStatusCopy } from '../lib/reserve-copy'
import {
  formatAvgSpeedRow,
  formatElevationRow,
  formatTripUnits,
  displayRoundTripElevation,
} from '../lib/units'

type ResultCardProps = {
  result: TripResult
  mode: TripMode
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
  cruiseSpeedKmh?: number
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
  cruiseSpeedKmh,
  elevationGainM,
  elevationLossM,
}: {
  result: Pick<
    TripResult,
    | 'distanceKm'
    | 'driveHours'
    | 'energyKWh'
    | 'costMxn'
    | 'tollCostMxn'
    | 'totalCostMxn'
    | 'arrivalSocPercent'
    | 'reachesWithReserve'
    | 'chargeStopsEstimate'
    | 'chargeStopsRoundTripEstimate'
    | 'connector'
    | 'costPerKm'
    | 'co2Kg'
  >
  label?: string
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
  cruiseSpeedKmh?: number
  elevationGainM?: number
  elevationLossM?: number
}) {
  const speed = formatAvgSpeedRow(
    {
      distanceKm: result.distanceKm,
      driveHours: result.driveHours,
      avgSpeedLimitKmh,
      avgTravelSpeedKmh,
      cruiseSpeedKmh,
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
          <dt>Energía</dt>
          <dd>{formatTripUnits(result.energyKWh, 'energy', unitSystem)}</dd>
        </div>
        <div>
          <dt>% batería al llegar</dt>
          <dd
            className={
              result.reachesWithReserve ? 'soc-ok' : 'soc-low'
            }
          >
            {formatLocaleNumber(Math.max(result.arrivalSocPercent, 0), 0)}%
            <span className="form-hint">
              {' '}
              {reserveStatusCopy(result.reachesWithReserve)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Paradas de carga</dt>
          <dd>
            {result.chargeStopsEstimate}
            {result.chargeStopsRoundTripEstimate
              ? ` · redondo ${result.chargeStopsRoundTripEstimate}`
              : null}
          </dd>
        </div>
        <div>
          <dt>Conector</dt>
          <dd>{result.connector}</dd>
        </div>
        <div className="metric-total">
          <dt>{result.tollCostMxn > 0 ? 'Costo energía' : 'Costo'}</dt>
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

export function ResultCard({
  result,
  mode,
  unitSystem,
  avgSpeedLimitKmh,
  avgTravelSpeedKmh,
  cruiseSpeedKmh,
  elevationGainM,
  elevationLossM,
  returnElevationGainM,
  returnElevationLossM,
}: ResultCardProps) {
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
          cruiseSpeedKmh={cruiseSpeedKmh}
          elevationGainM={elevationGainM}
          elevationLossM={elevationLossM}
        />
        <Metrics
          result={result}
          label="Redondo (sin cargar en destino)"
          unitSystem={unitSystem}
          avgSpeedLimitKmh={avgSpeedLimitKmh}
          avgTravelSpeedKmh={avgTravelSpeedKmh}
          cruiseSpeedKmh={cruiseSpeedKmh}
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
        cruiseSpeedKmh={cruiseSpeedKmh}
        elevationGainM={elevationGainM}
        elevationLossM={elevationLossM}
      />
    </article>
  )
}
