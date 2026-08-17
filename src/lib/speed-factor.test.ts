import { describe, expect, it } from 'vitest'
import {
  clampSpeedKmh,
  seedAverageSpeedKmh,
  speedConsumptionFactor,
} from './speed-factor'

describe('speedConsumptionFactor', () => {
  it('is 1 at 90 km/h', () => {
    expect(speedConsumptionFactor(90)).toBeCloseTo(1, 8)
  })
  it('is below 1 at 77 km/h', () => {
    expect(speedConsumptionFactor(77)).toBeLessThan(1)
    expect(speedConsumptionFactor(77)).toBeCloseTo(
      0.6 + 0.4 * (77 / 90) ** 2,
      8,
    )
  })
  it('is above 1 at 110 km/h', () => {
    expect(speedConsumptionFactor(110)).toBeGreaterThan(1)
  })
})

describe('clampSpeedKmh', () => {
  it('clamps to 40–130', () => {
    expect(clampSpeedKmh(10)).toBe(40)
    expect(clampSpeedKmh(200)).toBe(130)
    expect(clampSpeedKmh(77)).toBe(77)
  })
})

describe('seedAverageSpeedKmh', () => {
  it('uses distance / hours when duration exists', () => {
    expect(seedAverageSpeedKmh({ distanceKm: 231, driveHoursOneWay: 3 })).toBe(
      clampSpeedKmh(231 / 3),
    )
  })
  it('falls back to 90 when no duration', () => {
    expect(seedAverageSpeedKmh({ distanceKm: 100 })).toBe(90)
  })
})
