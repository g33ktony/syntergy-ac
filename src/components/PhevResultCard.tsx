import type { PhevTripResult, PhevTripResultBase, TripMode, UnitSystem } from '../types'
import { formatHours, formatLocaleNumber, formatMxn, fuelTypeLabel } from '../lib/format'
import { formatAvgSpeedRow, formatTripUnits } from '../lib/units'

type PhevResultCardProps = {
  result: PhevTripResult
  mode: TripMode
  unitSystem: UnitSystem
}

function roundTripLabel(rechargeAtDestination: boolean): string {
  return rechargeAtDestination
    ? 'Redondo (con recarga en destino)'
    : 'Redondo (sin recarga en destino)'
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
  const fuelWord = fuelTypeLabel(result.fuel).toLowerCase()

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
          <dt>Tramo en {fuelWord}</dt>
          <dd>
            {formatTripUnits(result.fuelKmUsed, 'distance', unitSystem, 0)} ·{' '}
            {formatTripUnits(result.litersUsed, 'volume', unitSystem)}
          </dd>
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
          <dt>Modo</dt>
          <dd>
            {result.usedElectricOnly
              ? 'Solo eléctrico'
              : `Eléctrico + ${fuelWord}`}
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
          label={roundTripLabel(result.rechargeAtDestination)}
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
