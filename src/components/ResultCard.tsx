import type { TripResult, TripMode } from '../types'

type ResultCardProps = {
  result: TripResult
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
          <dt>Energía</dt>
          <dd>{formatNumber(result.energyKWh)} kWh</dd>
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

export function ResultCard({ result, mode }: ResultCardProps) {
  if (mode === 'roundTrip' && result.oneWay) {
    return (
      <article className="result-card">
        <Metrics result={result.oneWay} label="Ida" />
        <Metrics result={result} label="Redondo (sin cargar en destino)" />
      </article>
    )
  }

  return (
    <article className="result-card">
      <Metrics result={result} />
    </article>
  )
}
