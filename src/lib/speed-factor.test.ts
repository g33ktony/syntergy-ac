import { describe, expect, it } from 'vitest'
import {
  clampSpeedKmh,
  routeGeometryChanged,
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

describe('routeGeometryChanged', () => {
  const base = {
    id: 'r1',
    from: 'A',
    to: 'B',
    distanceKm: 200,
    source: 'osm' as const,
    driveHoursOneWay: 2.5,
    origin: { lat: 19.4, lng: -99.1 },
    dest: { lat: 20.6, lng: -100.4 },
    tolls: { likelyTolls: true, costMxn: 226, source: 'mx-table' as const, segments: [] },
  }

  it('is false when only casetas change', () => {
    const withEditedTolls = {
      ...base,
      tolls: { ...base.tolls, costMxn: 400, source: 'manual' as const },
    }
    expect(routeGeometryChanged(base, withEditedTolls)).toBe(false)
  })

  it('is true when origin, dest, distance, or duration change', () => {
    expect(
      routeGeometryChanged(base, {
        ...base,
        origin: { lat: 19.5, lng: -99.1 },
      }),
    ).toBe(true)
    expect(
      routeGeometryChanged(base, { ...base, distanceKm: 210 }),
    ).toBe(true)
    expect(routeGeometryChanged(null, base)).toBe(true)
  })
})
