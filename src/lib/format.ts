import type { FuelType, Powertrain } from '../types'

export function formatLocaleNumber(value: number, digits = 1): string {
  return value.toLocaleString('es-MX', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export function formatMxn(value: number): string {
  return `$${formatLocaleNumber(value)} MXN`
}

export function fuelTypeLabel(fuel: FuelType): string {
  return fuel === 'diesel' ? 'Diésel' : 'Gasolina'
}

export const POWERTRAIN_GROUP_LABELS: Record<Powertrain, string> = {
  BEV: 'Eléctrico',
  HEV: 'Híbrido',
  PHEV: 'Híbrido enchufable',
  ICE: 'Combustión',
}

/** Selector / badge group order: electrics, then hybrids, then combustion. */
export const POWERTRAIN_GROUP_ORDER: Powertrain[] = ['BEV', 'HEV', 'PHEV', 'ICE']
