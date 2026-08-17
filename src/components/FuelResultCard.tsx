import type { FuelTripResult, FuelTripResultBase, TripMode, UnitSystem } from '../types'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type FuelResultCardProps = {
  result: FuelTripResult
  mode: TripMode
  unitSystem: UnitSystem
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('es-MX', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function Metrics({
  result,
  label,
  unitSystem,
}: {
  result: FuelTripResultBase
  label?: string
  unitSystem: UnitSystem
}) {
  const speed = formatAvgSpeedRow(
    { distanceKm: result.distanceKm, driveHours: result.driveHours },
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
          <dd>${formatNumber(result.costMxn)} MXN</dd>
        </div>
        <div>
          <dt>% tanque al llegar</dt>
          <dd className={result.reachesWithoutStop ? 'soc-ok' : 'soc-low'}>
            {formatNumber(Math.max(result.arrivalFuelPercent, 0), 0)}%
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
          <dd>{result.fuel === 'gasolina' ? 'Gasolina' : 'Diésel'}</dd>
        </div>
      </dl>
    </div>
  )
}

export function FuelResultCard({ result, mode, unitSystem }: FuelResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" unitSystem={unitSystem} />
        <Metrics result={result} label="Redondo" unitSystem={unitSystem} />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics result={result} unitSystem={unitSystem} />
    </article>
  )
}
