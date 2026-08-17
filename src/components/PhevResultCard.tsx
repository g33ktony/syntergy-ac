import type { PhevTripResult, PhevTripResultBase, TripMode, UnitSystem } from '../types'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type PhevResultCardProps = {
  result: PhevTripResult
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
  result: PhevTripResultBase
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
          <dt>Tramo eléctrico</dt>
          <dd>
            {formatTripUnits(result.electricKmUsed, 'distance', unitSystem, 0)} ·{' '}
            {formatTripUnits(result.energyKWh, 'energy', unitSystem)}
          </dd>
        </div>
        <div>
          <dt>Tramo en gasolina</dt>
          <dd>
            {formatTripUnits(result.fuelKmUsed, 'distance', unitSystem, 0)} ·{' '}
            {formatTripUnits(result.litersUsed, 'volume', unitSystem)}
          </dd>
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

export function PhevResultCard({ result, mode, unitSystem }: PhevResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" unitSystem={unitSystem} />
        <Metrics
          result={result}
          label="Redondo (sin recarga en destino)"
          unitSystem={unitSystem}
        />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics result={result} unitSystem={unitSystem} />
    </article>
  )
}
