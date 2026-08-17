import type { TripResult, TripMode, UnitSystem } from '../types'
import { formatHours, formatLocaleNumber, formatMxn } from '../lib/format'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type ResultCardProps = {
  result: TripResult
  mode: TripMode
  unitSystem: UnitSystem
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
          <dd>{formatMxn(result.costMxn)}</dd>
        </div>
        <div>
          <dt>% batería al llegar</dt>
          <dd
            className={
              result.reachesWithReserve ? 'soc-ok' : 'soc-low'
            }
          >
            {formatLocaleNumber(Math.max(result.arrivalSocPercent, 0), 0)}%
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
