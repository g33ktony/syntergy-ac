import type { TripResult, TripMode, UnitSystem } from '../types'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type ResultCardProps = {
  result: TripResult
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
  result: Pick<
    TripResult,
    | 'distanceKm'
    | 'driveHours'
    | 'energyKWh'
    | 'costMxn'
    | 'arrivalSocPercent'
    | 'reachesWithReserve'
    | 'chargeStopsEstimate'
    | 'chargeStopsRoundTripEstimate'
    | 'connector'
  >
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
          <dt>Energía</dt>
          <dd>{formatTripUnits(result.energyKWh, 'energy', unitSystem)}</dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>${formatNumber(result.costMxn)} MXN</dd>
        </div>
        <div>
          <dt>% batería al llegar</dt>
          <dd
            className={
              result.reachesWithReserve ? 'soc-ok' : 'soc-low'
            }
          >
            {formatNumber(Math.max(result.arrivalSocPercent, 0), 0)}%
            {result.reachesWithReserve
              ? ' · alcanza (reserva 15%)'
              : ' · no alcanza con reserva'}
          </dd>
        </div>
        <div>
          <dt>Paradas de carga (est.)</dt>
          <dd>
            {result.chargeStopsEstimate}
            {result.chargeStopsRoundTripEstimate != null
              ? ` · redondo ~${result.chargeStopsRoundTripEstimate}`
              : null}
          </dd>
        </div>
        <div>
          <dt>Conector</dt>
          <dd>{result.connector}</dd>
        </div>
      </dl>
    </div>
  )
}

export function ResultCard({ result, mode, unitSystem }: ResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" unitSystem={unitSystem} />
        <Metrics
          result={result}
          label="Redondo (sin cargar en destino)"
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
