import {
  CO2_KG_PER_KWH_MX_GRID,
  CO2_KG_PER_LITER_GASOLINE,
} from './constants'

export function tripCo2Kg(input: { energyKWh?: number; liters?: number }): number {
  const kwh = input.energyKWh ?? 0
  const liters = input.liters ?? 0
  return kwh * CO2_KG_PER_KWH_MX_GRID + liters * CO2_KG_PER_LITER_GASOLINE
}
