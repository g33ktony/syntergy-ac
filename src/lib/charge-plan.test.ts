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

  function poi(id: string, alongKm: number, connectors: string[] = ['GB/T']): ChargingPoi {
    return { id, name: id, lat: 0, lng: 0, alongKm, connectors }
  }

  it('picks the in-window stop closest to the must-stop point', () => {
    const plan = planChargeStops({
      path,
      pathLengthKm: 300,
      pois: [poi('early', 50), poi('window', 220)],
      batteryKWh: 60,
      kWhPerKm: 0.2,
      reservePercent: 15,
      startSocPercent: 100,
      chargeToPercent: 80,
      maxStops: 6,
      connector: 'GB/T',
    })
    expect(plan.feasible).toBe(true)
    expect(plan.stops).toHaveLength(1)
    expect(plan.stops[0].poi.id).toBe('window')
  })

  it('returns no-poi when the only in-window POI has the wrong connector', () => {
    const plan = planChargeStops({
      path,
      pathLengthKm: 300,
      pois: [poi('early', 50), poi('window', 220, ['Type 2'])],
      batteryKWh: 60,
      kWhPerKm: 0.2,
      reservePercent: 15,
      startSocPercent: 100,
      chargeToPercent: 80,
      maxStops: 6,
      connector: 'GB/T',
    })
    expect(plan.feasible).toBe(false)
    expect(plan.stops).toEqual([])
    expect(plan.reason).toBe('no-poi')
  })

  it('chains two stops on a longer path', () => {
    const plan = planChargeStops({
      path,
      pathLengthKm: 500,
      pois: [poi('a', 220), poi('b', 400)],
      batteryKWh: 60,
      kWhPerKm: 0.2,
      reservePercent: 15,
      startSocPercent: 100,
      chargeToPercent: 80,
      maxStops: 6,
      connector: 'GB/T',
    })
    expect(plan.feasible).toBe(true)
    expect(plan.stops.map((s) => s.poi.id)).toEqual(['a', 'b'])
  })

  it('caps at maxStops when more stops would be needed', () => {
    const plan = planChargeStops({
      path,
      pathLengthKm: 500,
      pois: [poi('a', 220), poi('b', 400)],
      batteryKWh: 60,
      kWhPerKm: 0.2,
      reservePercent: 15,
      startSocPercent: 100,
      chargeToPercent: 80,
      maxStops: 1,
      connector: 'GB/T',
    })
    expect(plan.feasible).toBe(false)
    expect(plan.reason).toBe('max-stops')
    expect(plan.stops).toHaveLength(1)
  })
})
