import { describe, expect, it } from 'vitest'
import { iceVehicles } from '../data/vehicles-ice'
import { presetRoutes } from '../data/routes'
import { calcFuelTrip } from './calc-fuel'
import { FUEL_MX_FACTOR } from './constants'
import type { IceVersion } from '../types'

function virtus(): IceVersion {
  // Approx VW Virtus Comfortline MX: ~50 L tank, ~600 km claimed range,
  // ~7.5 L/100 combined (public spec sheets, rounded for compare UX).
  return {
    id: 'virtus-comfortline',
    name: 'Comfortline',
    tankLiters: 50,
    rangeKmOfficial: 600,
    consumptionLPer100: 7.5,
    fuel: 'gasolina',
  }
}

describe('calcFuelTrip ICE/HEV', () => {
  it('computes one-way liters, cost, arrival fuel %, and feasibility', () => {
    const version = virtus()
    // 120 km one-way, normal: effective 7.5 * MX_FACTOR * 1.0
    const result = calcFuelTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'oneWay',
    })

    const expectedLiters = (120 * (7.5 * FUEL_MX_FACTOR * 1.0)) / 100
    expect(result.oneWay).toBeUndefined()
    expect(result.distanceKm).toBe(120)
    expect(result.litersUsed).toBeCloseTo(expectedLiters, 5)
    expect(result.costMxn).toBeCloseTo(expectedLiters * 24, 5)
    expect(result.arrivalFuelPercent).toBeCloseTo(
      100 - (expectedLiters / 50) * 100,
      5,
    )
    expect(result.reachesWithoutStop).toBe(true)
    expect(result.fuelStopsEstimate).toBe(0)
    expect(result.fuel).toBe('gasolina')
    expect(result.driveHours).toBeCloseTo(120 / 90, 5)
  })

  it('applies drive-style multipliers vs normal', () => {
    const version = virtus()
    const base = {
      distanceKm: 100,
      version,
      pricePerLiter: 24,
      mode: 'oneWay' as const,
    }

    const eco = calcFuelTrip({ ...base, driveStyle: 'eco' })
    const normal = calcFuelTrip({ ...base, driveStyle: 'normal' })
    const aggressive = calcFuelTrip({ ...base, driveStyle: 'aggressive' })

    expect(eco.litersUsed).toBeCloseTo(normal.litersUsed * 0.9, 5)
    expect(aggressive.litersUsed).toBeCloseTo(normal.litersUsed * 1.15, 5)
  })

  it('computes round-trip with one-way breakdown and doubled liters/cost', () => {
    const version = virtus()
    const result = calcFuelTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'roundTrip',
    })

    expect(result.oneWay).toBeDefined()
    expect(result.oneWay!.distanceKm).toBe(120)
    expect(result.distanceKm).toBe(240)
    expect(result.litersUsed).toBeCloseTo(result.oneWay!.litersUsed * 2, 5)
    expect(result.costMxn).toBeCloseTo(result.oneWay!.costMxn * 2, 5)
    expect(result.driveHours).toBeCloseTo((120 / 90) * 2, 5)
  })

  it('recomputes round-trip stops when one-way fits but total distance does not', () => {
    const gdlCdmx = presetRoutes.find((route) => route.id === 'gdl-cdmx')!
    const version = iceVehicles
      .find((vehicle) => vehicle.id === 'vw-virtus')!
      .versions.find((item) => item.id === 'virtus-comfortline')!

    const oneWay = calcFuelTrip({
      distanceKm: gdlCdmx.distanceKm,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'oneWay',
      driveHoursOneWay: gdlCdmx.driveHoursOneWay,
    })
    const roundTrip = calcFuelTrip({
      distanceKm: gdlCdmx.distanceKm,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'roundTrip',
      driveHoursOneWay: gdlCdmx.driveHoursOneWay,
    })

    expect(oneWay.reachesWithoutStop).toBe(true)
    expect(oneWay.fuelStopsEstimate).toBe(0)
    expect(roundTrip.oneWay!.reachesWithoutStop).toBe(true)
    expect(roundTrip.litersUsed).toBeGreaterThan(version.tankLiters)
    expect(roundTrip.reachesWithoutStop).toBe(false)
    expect(roundTrip.fuelStopsEstimate).toBeGreaterThan(0)
  })

  it('shows lower arrival tank % on round trip than on the one-way leg', () => {
    const version = virtus()
    const result = calcFuelTrip({
      distanceKm: 120,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'roundTrip',
    })

    expect(result.oneWay).toBeDefined()
    expect(result.arrivalFuelPercent).toBeCloseTo(
      100 - (result.litersUsed / version.tankLiters) * 100,
      5,
    )
    expect(result.arrivalFuelPercent).toBeLessThan(result.oneWay!.arrivalFuelPercent)
  })

  it('flags a stop needed when trip exceeds the safety-factored range', () => {
    const version = virtus()
    // Effective range ≈ tank / (consumption*MX_FACTOR/100); push distance
    // well past 85% of it to force a required stop.
    const result = calcFuelTrip({
      distanceKm: 900,
      version,
      driveStyle: 'aggressive',
      pricePerLiter: 24,
      mode: 'oneWay',
    })

    expect(result.reachesWithoutStop).toBe(false)
    expect(result.fuelStopsEstimate).toBeGreaterThan(0)
  })

  it('adds elevation-adjusted fuel on a one-way climb', () => {
    const version = virtus()
    const flat = calcFuelTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'oneWay',
    })
    const climbing = calcFuelTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'oneWay',
      elevationGainM: 800,
    })

    expect(climbing.litersUsed).toBeGreaterThan(flat.litersUsed)
  })

  it('round trip climbs the descent back — total gain equals gain+loss', () => {
    const version = virtus()
    const flat = calcFuelTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'roundTrip',
    })
    const downhillOneWay = calcFuelTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'roundTrip',
      elevationGainM: 0,
      elevationLossM: 500,
    })

    // Liquid fuel gets no descent credit — round trip must cost strictly
    // more than flat once the return leg climbs the 500 m back.
    expect(downhillOneWay.litersUsed).toBeGreaterThan(flat.litersUsed)
  })
})
