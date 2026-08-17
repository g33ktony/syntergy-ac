import type { FuelTripResult, FuelTripResultBase, TripMode, UnitSystem } from '../types'
import { formatHours, formatLocaleNumber, formatMxn, fuelTypeLabel } from '../lib/format'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type FuelResultCardProps = {
  result: FuelTripResult
  mode: TripMode
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
}

function Metrics({
  result,
  label,
  unitSystem,
  avgSpeedLimitKmh,
  avgTravelSpeedKmh,
}: {
  result: FuelTripResultBase
  label?: string
  unitSystem: UnitSystem
  avgSpeedLimitKmh?: number
  avgTravelSpeedKmh?: number
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
        <div>
          <dt>Combustible usado</dt>
          <dd>{formatTripUnits(result.litersUsed, 'volume', unitSystem)}</dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>{formatMxn(result.costMxn)}</dd>
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
}: FuelResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics
          result={result.oneWay}
          label="Ida"
          unitSystem={unitSystem}
          avgSpeedLimitKmh={avgSpeedLimitKmh}
          avgTravelSpeedKmh={avgTravelSpeedKmh}
        />
        <Metrics
          result={result}
          label="Redondo"
          unitSystem={unitSystem}
          avgSpeedLimitKmh={avgSpeedLimitKmh}
          avgTravelSpeedKmh={avgTravelSpeedKmh}
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
      />
    </article>
  )
}
