import type { FuelTripResult, FuelTripResultBase, TripMode } from '../types'

type FuelResultCardProps = {
  result: FuelTripResult
  mode: TripMode
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
}: {
  result: FuelTripResultBase
  label?: string
}) {
  return (
    <div className="metrics">
      {label ? <h4 className="metrics-label">{label}</h4> : null}
      <dl>
        <div>
          <dt>Distancia</dt>
          <dd>{formatNumber(result.distanceKm, 0)} km</dd>
        </div>
        <div>
          <dt>Tiempo estimado</dt>
          <dd>{formatHours(result.driveHours)}</dd>
        </div>
        <div>
          <dt>Combustible usado</dt>
          <dd>{formatNumber(result.litersUsed)} L</dd>
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

/**
 * ICE/HEV counterpart to `ResultCard` (Phase 2, plan Task 6). Standalone —
 * not wired into `VehicleSlot` yet, since that's a Phase 1-owned shared
 * component; merge coordination decides how BEV/fuel cards compose.
 */
export function FuelResultCard({ result, mode }: FuelResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" />
        <Metrics result={result} label="Redondo" />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics result={result} />
    </article>
  )
}
