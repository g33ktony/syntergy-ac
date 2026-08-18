import { describe, expect, it } from 'vitest'
import { planChargeStops, poiMatchesConnector } from './charge-plan'
import type { ChargingPoi, LatLng } from '../types'

const path: LatLng[] = [
  { lat: 19.4, lng: -99.1 },
  { lat: 20.6, lng: -100.4 },
]

describe('poiMatchesConnector', () => {
  it('matches CCS1 to Combo/CCS titles', () => {
    expect(poiMatchesConnector('CCS1', ['IEC 62196-3 CCS Combo 2'])).toBe(true)
    expect(poiMatchesConnector('CCS1', ['Type 2'])).toBe(false)
  })
  it('matches GB/T', () => {
    expect(poiMatchesConnector('GB/T', ['GB/T'])).toBe(true)
    expect(poiMatchesConnector('GB/T', ['GBT'])).toBe(true)
  })
  it('matches NACS / Tesla', () => {
    expect(poiMatchesConnector('NACS', ['NACS'])).toBe(true)
    expect(poiMatchesConnector('NACS', ['Tesla'])).toBe(true)
  })
  it('does not filter when connector is other', () => {
    expect(poiMatchesConnector('other', ['anything'])).toBe(true)
    expect(poiMatchesConnector('other', [])).toBe(true)
  })
})

describe('planChargeStops', () => {
  it('returns no stops when dest stays above reserve', () => {
    const plan = planChargeStops({
      path,
      pathLengthKm: 80,
      pois: [],
      batteryKWh: 38,
      kWhPerKm: 0.08,
      reservePercent: 15,
      startSocPercent: 100,
      chargeToPercent: 80,
      maxStops: 6,
      connector: 'GB/T',
    })
    expect(plan.feasible).toBe(true)
    expect(plan.stops).toEqual([])
    expect(plan.reason).toBe('already-feasible')
  })
})
