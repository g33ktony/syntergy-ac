import { describe, expect, it } from 'vitest'
import { tripCo2Kg } from './co2'

describe('tripCo2Kg', () => {
  it('uses 0.40 kg/kWh for electricity', () => {
    expect(tripCo2Kg({ energyKWh: 10, liters: 0 })).toBeCloseTo(4, 8)
  })
  it('uses 2.31 kg/L for gasoline', () => {
    expect(tripCo2Kg({ energyKWh: 0, liters: 2 })).toBeCloseTo(4.62, 8)
  })
  it('sums PHEV blend', () => {
    expect(tripCo2Kg({ energyKWh: 5, liters: 1 })).toBeCloseTo(2 + 2.31, 8)
  })
})
