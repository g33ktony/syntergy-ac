import { describe, expect, it } from 'vitest'
import { calcPhevTrip } from './calc-phev'
import type { PhevVersion } from '../types'

function ravFourPrime(): PhevVersion {
  // Approx Toyota RAV4 Prime: ~18.1 kWh, ~68 km EV range (EPA-ish, MX
  // marketing rounds up), 45 L tank, ~6 L/100 charge-sustaining.
  return {
    id: 'rav4-prime',
    name: 'Prime',
    batteryKWh: 18.1,
    electricRangeKmOfficial: 68,
    tankLiters: 45,
    consumptionLPer100ChargeSustaining: 6,
    fuel: 'gasolina',
    connector: 'other',
  }
}

describe('calcPhevTrip', () => {
  it('uses electric-only when the trip fits inside the effective EV range', () => {
    const version = ravFourPrime()
    const result = calcPhevTrip({
      distanceKm: 40,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
    })

    expect(result.usedElectricOnly).toBe(true)
    expect(result.fuelKmUsed).toBe(0)
    expect(result.litersUsed).toBe(0)
    expect(result.electricKmUsed).toBe(40)
    expect(result.costMxn).toBeGreaterThan(0)
  })

  it('applies drive-style to EV range and energy on electric-only trips', () => {
    const version = ravFourPrime()
    const base = {
      distanceKm: 40,
      version,
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay' as const,
    }

    const eco = calcPhevTrip({ ...base, driveStyle: 'eco' })
    const normal = calcPhevTrip({ ...base, driveStyle: 'normal' })
    const aggressive = calcPhevTrip({ ...base, driveStyle: 'aggressive' })

    expect(eco.usedElectricOnly).toBe(true)
    expect(normal.usedElectricOnly).toBe(true)
    expect(aggressive.usedElectricOnly).toBe(true)
    expect(eco.energyKWh).toBeCloseTo(normal.energyKWh * 0.9, 5)
    expect(aggressive.energyKWh).toBeCloseTo(normal.energyKWh * 1.15, 5)
    expect(eco.costMxn).toBeCloseTo(normal.costMxn * 0.9, 5)
    expect(aggressive.costMxn).toBeCloseTo(normal.costMxn * 1.15, 5)
  })

  it('shrinks electric km and grows the fuel remainder as drive style gets more aggressive', () => {
    const version = ravFourPrime()
    const base = {
      distanceKm: 150,
      version,
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay' as const,
    }

    const eco = calcPhevTrip({ ...base, driveStyle: 'eco' })
    const normal = calcPhevTrip({ ...base, driveStyle: 'normal' })
    const aggressive = calcPhevTrip({ ...base, driveStyle: 'aggressive' })

    expect(eco.electricKmUsed).toBeGreaterThan(normal.electricKmUsed)
    expect(aggressive.electricKmUsed).toBeLessThan(normal.electricKmUsed)
    expect(eco.fuelKmUsed).toBeLessThan(normal.fuelKmUsed)
    expect(aggressive.fuelKmUsed).toBeGreaterThan(normal.fuelKmUsed)
    expect(eco.electricKmUsed).toBeCloseTo(normal.electricKmUsed / 0.9, 5)
    expect(aggressive.electricKmUsed).toBeCloseTo(normal.electricKmUsed / 1.15, 5)
  })

  it('blends electric-first then fuel for the remainder past EV range', () => {
    const version = ravFourPrime()
    const result = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
    })

    expect(result.usedElectricOnly).toBe(false)
    expect(result.electricKmUsed).toBeGreaterThan(0)
    expect(result.electricKmUsed).toBeLessThan(150)
    expect(result.fuelKmUsed).toBeCloseTo(
      150 - result.electricKmUsed,
      5,
    )
    expect(result.litersUsed).toBeGreaterThan(0)
    expect(result.energyKWh).toBeGreaterThan(0)
  })

  it('does not assume recharge at destination on round trips by default', () => {
    const version = ravFourPrime()
    const oneLeg = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
    })
    const round = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'roundTrip',
    })

    expect(round.oneWay).toBeDefined()
    // Conservative default: no recharge, so the second leg is fuel-only —
    // total electric km stays at the first leg's EV usage, not doubled.
    expect(round.electricKmUsed).toBeCloseTo(oneLeg.electricKmUsed, 5)
    expect(round.fuelKmUsed).toBeCloseTo(
      oneLeg.fuelKmUsed + 150,
      5,
    )
    expect(round.distanceKm).toBe(300)
  })
})
