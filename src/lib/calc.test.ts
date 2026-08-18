import { describe, expect, it } from 'vitest'
import { calcTrip } from './calc'
import { MX_FACTOR, RESERVE_PERCENT } from './constants'
import { getVehicleById } from '../data/vehicles'
import type { VehicleVersion } from '../types'

function dolphinPlus(): VehicleVersion {
  const v = getVehicleById('byd-dolphin-mini')
  const plus = v?.versions.find((x) => x.id === 'dolphin-mini-plus')
  if (!plus) throw new Error('Dolphin Mini Plus missing from catalog')
  return plus
}

describe('calcTrip BEV', () => {
  it('uses averageSpeedKmh for hours and scales energy vs 90 km/h', () => {
    const version = dolphinPlus()
    const base = {
      distanceKm: 90,
      version,
      driveStyle: 'normal' as const,
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay' as const,
      averageSpeedKmh: 90,
    }
    const at90 = calcTrip({ ...base, averageSpeedKmh: 90 })
    const at77 = calcTrip({ ...base, averageSpeedKmh: 77 })
    expect(at90.driveHours).toBeCloseTo(1, 5)
    expect(at77.driveHours).toBeCloseTo(90 / 77, 5)
    expect(at77.energyKWh).toBeLessThan(at90.energyKWh)
    expect(at90.chargeStopsEstimate).toBe(0)
    expect(at90.costPerKm).toBeCloseTo(at90.totalCostMxn / 90, 5)
    expect(at90.co2Kg).toBeCloseTo(at90.energyKWh * 0.4, 5)
  })

  it('computes one-way energy, SoC, cost, and reserve for Dolphin Mini Plus', () => {
    const version = dolphinPlus()
    // 120 km one-way, normal style: effective 10 * 0.8 * 1.0 = 8 kWh/100
    const result = calcTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })

    expect(result.oneWay).toBeUndefined()
    expect(result.distanceKm).toBe(120)
    expect(result.energyKWh).toBeCloseTo(9.6, 5)
    expect(result.costMxn).toBeCloseTo(19.2, 5)
    expect(result.arrivalSocPercent).toBeCloseTo(
      100 - (9.6 / 38) * 100,
      5,
    )
    expect(result.reachesWithReserve).toBe(true)
    expect(result.chargeStopsEstimate).toBe(0)
    expect(result.connector).toBe('GB/T')
    expect(result.driveHours).toBeCloseTo(120 / 90, 5)
  })

  it('applies drive-style multipliers vs normal', () => {
    const version = dolphinPlus()
    const base = {
      distanceKm: 100,
      version,
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay' as const,
      averageSpeedKmh: 90,
    }

    const eco = calcTrip({ ...base, driveStyle: 'eco' })
    const normal = calcTrip({ ...base, driveStyle: 'normal' })
    const aggressive = calcTrip({ ...base, driveStyle: 'aggressive' })

    expect(eco.energyKWh).toBeCloseTo(normal.energyKWh * 0.9, 5)
    expect(aggressive.energyKWh).toBeCloseTo(normal.energyKWh * 1.15, 5)
    expect(normal.energyKWh).toBeCloseTo(100 * (10 * MX_FACTOR) / 100, 5)
  })

  it('computes round-trip with one-way breakdown and doubled energy', () => {
    const version = dolphinPlus()
    const result = calcTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
    })

    expect(result.oneWay).toBeDefined()
    expect(result.oneWay!.distanceKm).toBe(120)
    expect(result.oneWay!.energyKWh).toBeCloseTo(9.6, 5)
    expect(result.distanceKm).toBe(240)
    expect(result.energyKWh).toBeCloseTo(19.2, 5)
    expect(result.costMxn).toBeCloseTo(38.4, 5)
    expect(result.driveHours).toBeCloseTo((120 / 90) * 2, 5)
    expect(result.arrivalSocPercent).toBeCloseTo(
      100 - (2 * 9.6 * 100) / 38,
      5,
    )
    // per-leg stops still based on one-way distance
    expect(result.chargeStopsEstimate).toBe(0)
    expect(result.chargeStopsRoundTripEstimate).toBe(0)
    expect(result.reachesWithReserve).toBe(
      result.arrivalSocPercent >= RESERVE_PERCENT,
    )
  })

  it('marks unreachable when arrival SoC is below reserve', () => {
    const version = dolphinPlus()
    // Large one-way distance drains below 15% reserve
    const result = calcTrip({
      distanceKm: 400,
      version,
      driveStyle: 'aggressive',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })

    expect(result.arrivalSocPercent).toBeLessThan(RESERVE_PERCENT)
    expect(result.reachesWithReserve).toBe(false)
  })

  it('adds elevation-adjusted energy on a one-way climb', () => {
    const version = dolphinPlus()
    const flat = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })
    const climbing = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
      averageSpeedKmh: 90,
      elevationGainM: 800,
      elevationLossM: 0,
    })

    expect(climbing.energyKWh).toBeGreaterThan(flat.energyKWh)
  })

  it('round trip elevation is gain+loss both ways, not the one-way delta doubled', () => {
    const version = dolphinPlus()
    // Mostly downhill one-way (regen credit) — the return leg climbs it
    // back, so round trip must NOT be cheaper than round trip with no
    // elevation data at all.
    const flat = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
    })
    const downhillOneWay = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
      elevationGainM: 0,
      elevationLossM: 500,
    })

    // Regen never fully recovers descent energy, and the return leg pays
    // to climb the same 500 m back — round trip must cost more energy
    // than flat, even though the one-way leg alone would look cheaper.
    expect(downhillOneWay.energyKWh).toBeGreaterThan(flat.energyKWh)
  })

  it('adds casetas to totalCostMxn without changing energy costMxn', () => {
    const version = dolphinPlus()
    const result = calcTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
      averageSpeedKmh: 90,
      tollCostMxn: 320,
    })
    expect(result.costMxn).toBeCloseTo(19.2, 5)
    expect(result.tollCostMxn).toBe(320)
    expect(result.totalCostMxn).toBeCloseTo(339.2, 5)
  })

  it('uses a real inbound elevation profile when provided', () => {
    const version = dolphinPlus()
    const swapped = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
      elevationGainM: 400,
      elevationLossM: 50,
    })
    const inbound = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
      elevationGainM: 400,
      elevationLossM: 50,
      returnElevationGainM: 10,
      returnElevationLossM: 20,
      returnDistanceKm: 110,
    })
    expect(inbound.distanceKm).toBe(210)
    expect(inbound.energyKWh).not.toBeCloseTo(swapped.energyKWh, 5)
  })
})
