import type { PhevTripResult, PhevTripResultBase, TripMode } from '../types'

type PhevResultCardProps = {
  result: PhevTripResult
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
  result: PhevTripResultBase
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
          <dt>Tramo eléctrico</dt>
          <dd>{formatNumber(result.electricKmUsed, 0)} km · {formatNumber(result.energyKWh)} kWh</dd>
        </div>
        <div>
          <dt>Tramo en gasolina</dt>
          <dd>{formatNumber(result.fuelKmUsed, 0)} km · {formatNumber(result.litersUsed)} L</dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>${formatNumber(result.costMxn)} MXN</dd>
        </div>
        <div>
          <dt>Modo</dt>
          <dd>
            {result.usedElectricOnly
              ? 'Solo eléctrico'
              : 'Eléctrico + gasolina'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * PHEV counterpart to `ResultCard` (Phase 2, plan Task 6). Shows the
 * electric-first / fuel-remainder blend explicitly rather than collapsing
 * to a single energy number, per design's "unified comparison row" note
 * that every powertrain should still expose its own breakdown.
 *
 * Standalone — not wired into `VehicleSlot` yet (Phase 1-owned).
 */
export function PhevResultCard({ result, mode }: PhevResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" />
        <Metrics
          result={result}
          label="Redondo (sin recarga en destino)"
        />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics result={result} />
    </article>
  )
}
