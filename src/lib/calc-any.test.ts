import { describe, expect, it } from 'vitest'
import { calcAnyTrip, toComparisonRow } from './calc'
import { RESERVE_PERCENT } from './constants'
import { getVehicleById } from '../data/vehicles'
import { iceVehicles } from '../data/vehicles-ice'
import { phevVehicles } from '../data/vehicles-phev'

describe('calcAnyTrip dispatcher', () => {
  it('dispatches BEV to calcTrip', () => {
    const version = getVehicleById('byd-dolphin-mini')!.versions[1]
    const result = calcAnyTrip({
      vehicleType: 'BEV',
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      reservePercent: RESERVE_PERCENT,
      mode: 'oneWay',
    })
    expect('arrivalSocPercent' in result).toBe(true)
  })

  it('dispatches ICE to calcFuelTrip', () => {
    const version = iceVehicles[0].versions[0]
    const result = calcAnyTrip({
      vehicleType: 'ICE',
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerLiter: 24,
      mode: 'oneWay',
    })
    expect('litersUsed' in result).toBe(true)
  })

  it('dispatches PHEV to calcPhevTrip and reduces to a comparison row', () => {
    const version = phevVehicles[0].versions[0]
    const result = calcAnyTrip({
      vehicleType: 'PHEV',
      distanceKm: 50,
      version,
      driveStyle: 'normal',
      pricePerKWh: 2,
      pricePerLiter: 24,
      mode: 'oneWay',
    })
    expect('electricKmUsed' in result).toBe(true)

    const row = toComparisonRow('t', 'v', 'PHEV', result)
    expect(row.type).toBe('PHEV')
    expect(row.totalCostMxn).toBe(result.costMxn)
    expect(row.costPerKm).toBeCloseTo(result.costMxn / 50, 5)
  })
})
