import { describe, expect, it } from 'vitest'
import { elevationEnergyDeltaKWh, elevationFuelDeltaLiters } from './elevation'
import {
  ELEVATION_KWH_PER_100M_GAIN,
  ELEVATION_L_PER_100M_GAIN,
  ELEVATION_REGEN_RECOVERY,
} from './constants'

describe('elevationEnergyDeltaKWh (BEV/PHEV electric portion)', () => {
  it('returns 0 when there is no elevation data', () => {
    expect(elevationEnergyDeltaKWh(undefined, undefined)).toBe(0)
  })

  it('adds energy proportional to net climb', () => {
    const result = elevationEnergyDeltaKWh(500, 0)
    expect(result).toBeCloseTo((500 / 100) * ELEVATION_KWH_PER_100M_GAIN, 5)
  })

  it('credits only a fraction of descent as regen recovery', () => {
    const result = elevationEnergyDeltaKWh(0, 500)
    const expected =
      -(500 / 100) * ELEVATION_KWH_PER_100M_GAIN * ELEVATION_REGEN_RECOVERY
    expect(result).toBeCloseTo(expected, 5)
  })

  it('nets gain and (regen-discounted) loss for a mixed profile', () => {
    const result = elevationEnergyDeltaKWh(300, 300)
    const gainCost = (300 / 100) * ELEVATION_KWH_PER_100M_GAIN
    const lossCredit =
      (300 / 100) * ELEVATION_KWH_PER_100M_GAIN * ELEVATION_REGEN_RECOVERY
    expect(result).toBeCloseTo(gainCost - lossCredit, 5)
  })

  it('scales down by kmShare for the electric-only portion of a PHEV trip', () => {
    const full = elevationEnergyDeltaKWh(500, 0)
    const half = elevationEnergyDeltaKWh(500, 0, 0.5)
    expect(half).toBeCloseTo(full * 0.5, 5)
  })
})

describe('elevationFuelDeltaLiters (ICE/HEV/PHEV fuel portion)', () => {
  it('returns 0 when there is no elevation data', () => {
    expect(elevationFuelDeltaLiters(undefined)).toBe(0)
  })

  it('adds fuel proportional to climb only, with no descent credit', () => {
    const result = elevationFuelDeltaLiters(400)
    expect(result).toBeCloseTo((400 / 100) * ELEVATION_L_PER_100M_GAIN, 5)
  })

  it('scales down by kmShare for the fuel portion of a PHEV trip', () => {
    const full = elevationFuelDeltaLiters(400)
    const quarter = elevationFuelDeltaLiters(400, 0.25)
    expect(quarter).toBeCloseTo(full * 0.25, 5)
  })

  it('never returns a negative delta', () => {
    expect(elevationFuelDeltaLiters(0)).toBe(0)
  })
})
