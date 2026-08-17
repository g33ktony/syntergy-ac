import type { FuelType, Powertrain } from '../types'
import { POWERTRAIN_GROUP_LABELS } from '../lib/format'

type PowertrainBadgeProps = {
  type: Powertrain
  /** ICE/HEV/PHEV fuel, when a version is selected — avoids labeling all ICE as gasolina. */
  fuel?: FuelType
}

/**
 * Small label for a vehicle's powertrain type. ICE is "Combustión" (covers
 * gasolina and diésel); pass `fuel` to show the selected version's fuel.
 */
export function PowertrainBadge({ type, fuel }: PowertrainBadgeProps) {
  const label =
    type === 'ICE' && fuel
      ? fuel === 'diesel'
        ? 'Diésel'
        : 'Gasolina'
      : POWERTRAIN_GROUP_LABELS[type]

  return (
    <span className={`powertrain-badge powertrain-badge--${type.toLowerCase()}`}>
      {label}
    </span>
  )
}
