import type { Powertrain } from '../types'

const LABELS: Record<Powertrain, string> = {
  BEV: 'Eléctrico',
  HEV: 'Híbrido',
  PHEV: 'Híbrido enchufable',
  ICE: 'Gasolina',
}

/**
 * Small label for a vehicle's powertrain type. New Phase 2 component —
 * intended to be dropped next to model/version selects once Phase 1 wires
 * the multi-fuel catalog in (plan Task 6).
 */
export function PowertrainBadge({ type }: { type: Powertrain }) {
  return (
    <span className={`powertrain-badge powertrain-badge--${type.toLowerCase()}`}>
      {LABELS[type]}
    </span>
  )
}
