import { describe, expect, it } from 'vitest'
import { calcPhevTrip } from './calc-phev'
import { MX_FACTOR } from './constants'
import { presetRoutes } from '../data/routes'
import { phevVehicles } from '../data/vehicles-phev'
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
      averageSpeedKmh: 90,
    })

    expect(result.usedElectricOnly).toBe(true)
    expect(result.fuelKmUsed).toBe(0)
    expect(result.litersUsed).toBe(0)
    expect(result.electricKmUsed).toBe(40)
    expect(result.costMxn).toBeGreaterThan(0)
    expect(result.reachesWithoutStop).toBe(true)
    expect(result.fuelStopsEstimate).toBe(0)
    expect(result.arrivalFuelPercent).toBe(100)
  })

  it('applies MX_FACTOR to implied EV kWh/100 like BEV, not as a range haircut', () => {
    const version = ravFourPrime()
    const result = calcPhevTrip({
      distanceKm: 40,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })

    const impliedKWhPer100 = (version.batteryKWh / version.electricRangeKmOfficial) * 100
    const expectedEnergy = (40 * impliedKWhPer100 * MX_FACTOR) / 100
    expect(result.energyKWh).toBeCloseTo(expectedEnergy, 5)
    expect(result.electricKmUsed).toBe(40)
  })

  it('uses some fuel on a trip that fits official EV range but not MX_FACTOR-adjusted range', () => {
    const version = ravFourPrime()
    const official = version.electricRangeKmOfficial
    const effectiveKm = official / MX_FACTOR
    const distanceKm = (effectiveKm + official) / 2
    const result = calcPhevTrip({
      distanceKm,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })

    expect(distanceKm).toBeLessThan(official)
    expect(result.usedElectricOnly).toBe(false)
    expect(result.fuelKmUsed).toBeGreaterThan(0)
    expect(result.electricKmUsed).toBeLessThan(distanceKm)
  })

  it('applies drive-style to EV range and energy on electric-only trips', () => {
    const version = ravFourPrime()
    const base = {
      distanceKm: 40,
      version,
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay' as const,
      averageSpeedKmh: 90,
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
      averageSpeedKmh: 90,
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
      averageSpeedKmh: 90,
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
      averageSpeedKmh: 90,
    })
    const round = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
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
    expect(round.rechargeAtDestination).toBe(false)
  })

  it('flags a fuel stop when charge-sustaining liters exceed the tank', () => {
    const version = ravFourPrime()
    const result = calcPhevTrip({
      distanceKm: 1200,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })

    expect(result.usedElectricOnly).toBe(false)
    expect(result.litersUsed).toBeGreaterThan(version.tankLiters)
    expect(result.reachesWithoutStop).toBe(false)
    expect(result.fuelStopsEstimate).toBeGreaterThan(0)
  })

  it('recomputes round-trip PHEV stops when one-way fits but total liters do not', () => {
    const gdlCdmx = presetRoutes.find((route) => route.id === 'gdl-cdmx')!
    const version = phevVehicles
      .find((vehicle) => vehicle.id === 'toyota-rav4-prime')!
      .versions[0]

    const oneWay = calcPhevTrip({
      distanceKm: gdlCdmx.distanceKm,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
      driveHoursOneWay: gdlCdmx.driveHoursOneWay,
    })
    const roundTrip = calcPhevTrip({
      distanceKm: gdlCdmx.distanceKm,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
      driveHoursOneWay: gdlCdmx.driveHoursOneWay,
    })

    expect(oneWay.reachesWithoutStop).toBe(true)
    expect(oneWay.fuelStopsEstimate).toBe(0)
    expect(roundTrip.oneWay!.reachesWithoutStop).toBe(true)
    expect(roundTrip.litersUsed).toBeGreaterThan(version.tankLiters * 0.85)
    expect(roundTrip.reachesWithoutStop).toBe(false)
    expect(roundTrip.fuelStopsEstimate).toBeGreaterThan(0)
    expect(roundTrip.rechargeAtDestination).toBe(false)
  })

  it('splits elevation adjustment proportionally between electric and fuel portions', () => {
    const version = ravFourPrime()
    const flat = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })
    const climbing = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
      elevationGainM: 900,
    })

    // Trip blends electric (first ~68 km) then fuel (remainder). Climb
    // cannot push pack energy past batteryKWh; extra demand spills to fuel.
    expect(climbing.energyKWh).toBeLessThanOrEqual(version.batteryKWh)
    expect(climbing.litersUsed).toBeGreaterThan(flat.litersUsed)
  })

  it('reverses elevation for the return leg on a no-recharge round trip', () => {
    const version = ravFourPrime()
    const flat = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
    })
    const downhillOneWay = calcPhevTrip({
      distanceKm: 150,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'roundTrip',
      averageSpeedKmh: 90,
      elevationGainM: 0,
      elevationLossM: 500,
    })

    // Return leg is fuel-only (no recharge) and climbs the 500 m back with
    // no descent credit — total liters must exceed the flat baseline.
    expect(downhillOneWay.litersUsed).toBeGreaterThan(flat.litersUsed)
  })

  it('caps electric energy at pack size and spills climb overflow to fuel', () => {
    const version = ravFourPrime()
    const result = calcPhevTrip({
      distanceKm: 80,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
      averageSpeedKmh: 90,
      elevationGainM: 5000,
    })

    expect(result.energyKWh).toBeLessThanOrEqual(version.batteryKWh)
    expect(result.usedElectricOnly).toBe(false)
    expect(result.litersUsed).toBeGreaterThan(0)
  })
})
