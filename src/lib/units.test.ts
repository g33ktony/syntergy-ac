import { describe, expect, it } from 'vitest'
import { DEFAULT_HIGHWAY_KMH } from './constants'
import {
  formatAvgSpeedRow,
  formatTripUnits,
  kmhToMph,
  kmToMi,
  litersToUsGallons,
  resolveAvgSpeedKmh,
} from './units'
import { formatHours, formatMxn, fuelTypeLabel } from './format'

describe('units conversions', () => {
  it('converts distance and speed to imperial', () => {
    expect(kmToMi(160.9344)).toBeCloseTo(100, 5)
    expect(kmhToMph(90)).toBeCloseTo(55.9234, 3)
    expect(litersToUsGallons(3.785411784)).toBeCloseTo(1, 5)
  })

  it('formats Spanish copy for both unit systems', () => {
    expect(formatTripUnits(100, 'distance', 'metric', 0)).toBe('100 km')
    expect(formatTripUnits(160.9344, 'distance', 'imperial', 0)).toBe('100 mi')
    expect(formatTripUnits(90, 'speed', 'metric', 0)).toBe('90 km/h')
    expect(formatTripUnits(90, 'speed', 'imperial', 0)).toContain('mph')
    expect(formatTripUnits(10, 'volume', 'metric', 1)).toBe('10.0 L')
    expect(formatTripUnits(3.785411784, 'volume', 'imperial', 1)).toBe('1.0 gal')
  })
})

describe('resolveAvgSpeedKmh', () => {
  it('prefers speed-limit average when present', () => {
    const result = resolveAvgSpeedKmh({
      distanceKm: 100,
      driveHours: 2,
      avgSpeedLimitKmh: 95,
      avgTravelSpeedKmh: 50,
    })
    expect(result).toEqual({ speedKmh: 95, kind: 'limits' })
  })

  it('uses distance/hours when no enrichment', () => {
    const result = resolveAvgSpeedKmh({
      distanceKm: 180,
      driveHours: 2,
    })
    expect(result.kind).toBe('estimated')
    expect(result.speedKmh).toBeCloseTo(90, 5)
  })

  it('falls back to default highway speed', () => {
    const result = resolveAvgSpeedKmh({
      distanceKm: 100,
      driveHours: 0,
    })
    expect(result).toEqual({
      speedKmh: DEFAULT_HIGHWAY_KMH,
      kind: 'fallback',
    })
  })

  it('builds a Spanish avg-speed row for imperial', () => {
    const row = formatAvgSpeedRow(
      { distanceKm: 160.9344, driveHours: 2 },
      'imperial',
    )
    expect(row.label).toBe('Vel. promedio')
    expect(row.value).toContain('mph')
    expect(row.value).toContain('estimada')
  })
})

describe('format helpers', () => {
  it('formats hours, MXN, and fuel type labels', () => {
    expect(formatHours(0.5)).toBe('30 min')
    expect(formatHours(2)).toBe('2 h')
    expect(formatHours(2.5)).toBe('2 h 30 min')
    expect(formatMxn(19.2)).toBe('$19.2 MXN')
    expect(fuelTypeLabel('gasolina')).toBe('Gasolina')
    expect(fuelTypeLabel('diesel')).toBe('Diésel')
  })
})
