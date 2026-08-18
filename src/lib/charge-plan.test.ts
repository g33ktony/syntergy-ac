import { describe, expect, it } from 'vitest'
import {
  arrivalSocOnPath,
  inboundPlanGeometry,
  planChargeStops,
  poiMatchesConnector,
  poisForInboundPlan,
} from './charge-plan'
import type { ChargingPoi, LatLng } from '../types'

const path: LatLng[] = [
  { lat: 19.4, lng: -99.1 },
  { lat: 20.6, lng: -100.4 },
]

function poi(id: string, alongKm: number, connectors: string[] = ['GB/T']): ChargingPoi {
  return { id, name: id, lat: 0, lng: 0, alongKm, connectors }
}

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
    expect(plan.arrivalSocPercent).toBeCloseTo(100 - (100 * 80 * 0.08) / 38)
  })

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
    expect(plan.arrivalSocPercent).toBeCloseTo(80 - (100 * 80 * 0.2) / 60)
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

  it('plans inbound from post-outbound arrival SoC rather than a full charge', () => {
    const shared = {
      path,
      pois: [poi('near-dest', 180), poi('near-origin', 20)],
      batteryKWh: 60,
      kWhPerKm: 0.2,
      reservePercent: 15,
      chargeToPercent: 80,
      maxStops: 6,
      connector: 'GB/T' as const,
    }
    const outbound = planChargeStops({
      ...shared,
      pathLengthKm: 200,
      startSocPercent: 100,
    })
    expect(outbound.feasible).toBe(true)
    expect(outbound.stops).toEqual([])
    expect(outbound.reason).toBe('already-feasible')

    const inboundFromFull = planChargeStops({
      ...shared,
      pathLengthKm: 200,
      startSocPercent: 100,
    })
    expect(inboundFromFull.reason).toBe('already-feasible')

    const inboundFromArrival = planChargeStops({
      ...shared,
      pathLengthKm: 200,
      pois: shared.pois.map((p) => ({ ...p, alongKm: 200 - (p.alongKm as number) })),
      startSocPercent: outbound.arrivalSocPercent,
    })
    expect(inboundFromArrival.feasible).toBe(true)
    expect(inboundFromArrival.stops.map((s) => s.poi.id)).toEqual(['near-dest'])
  })
})

describe('poisForInboundPlan', () => {
  it('scales flipped alongKm onto a different inbound length instead of subtracting', () => {
    const pois = [poi('near-origin', 20), poi('mid', 100)]
    const inbound = inboundPlanGeometry(path, 200, { distanceKm: 250 })
    const remapped = poisForInboundPlan(pois, 200, inbound)
    expect(inbound.pathLengthKm).toBe(250)
    expect(inbound.fromInboundGeometry).toBe(false)
    expect(remapped[0]?.alongKm).toBeCloseTo(250 * (1 - 20 / 200))
    expect(remapped[1]?.alongKm).toBeCloseTo(250 * (1 - 100 / 200))
    expect(remapped[0]?.alongKm).not.toBeCloseTo(230)
    expect(remapped[0]?.alongKm).toBeGreaterThanOrEqual(0)
    expect(remapped[0]?.alongKm).toBeLessThanOrEqual(250)
  })

  it('does not emit negative alongKm when inbound is shorter than an outbound POI km', () => {
    const inbound = inboundPlanGeometry(path, 200, { distanceKm: 150 })
    const remapped = poisForInboundPlan([poi('late', 180)], 200, inbound)
    expect(remapped[0]?.alongKm).toBeCloseTo(150 * (1 - 180 / 200))
    expect(remapped[0]?.alongKm).toBeGreaterThanOrEqual(0)
    expect(150 - 180).toBeLessThan(0)
  })

  it('keeps reversed-outbound positions inside outbound length when inbound km is missing', () => {
    const inbound = inboundPlanGeometry(path, 200)
    const remapped = poisForInboundPlan([poi('near-origin', 20)], 200, inbound)
    expect(inbound.pathLengthKm).toBe(200)
    expect(remapped[0]?.alongKm).toBeCloseTo(180)
  })

  it('projects POIs onto a real inbound path', () => {
    const outbound = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    ]
    const inboundPath = [
      { lat: 0, lng: 1 },
      { lat: 0, lng: 0 },
    ]
    const destPoi: ChargingPoi = { id: 'dest', name: 'd', lat: 0, lng: 1, alongKm: 100 }
    const originPoi: ChargingPoi = { id: 'origin', name: 'o', lat: 0, lng: 0, alongKm: 0 }
    const inbound = inboundPlanGeometry(outbound, 100, { path: inboundPath, distanceKm: 120 })
    const remapped = poisForInboundPlan([destPoi, originPoi], 100, inbound)
    expect(inbound.fromInboundGeometry).toBe(true)
    expect(remapped.find((p) => p.id === 'dest')?.alongKm).toBeCloseTo(0, 5)
    expect(remapped.find((p) => p.id === 'origin')?.alongKm).toBeCloseTo(120, 5)
  })
})

describe('arrivalSocOnPath', () => {
  it('lowers arrival SoC by detour kilometers after the last charge', () => {
    const base = arrivalSocOnPath({
      pathLengthKm: 200,
      batteryKWh: 60,
      kWhPerKm: 0.2,
      startSocPercent: 100,
      chargeToPercent: 80,
    })
    const withDetour = arrivalSocOnPath({
      pathLengthKm: 230,
      batteryKWh: 60,
      kWhPerKm: 0.2,
      startSocPercent: 100,
      chargeToPercent: 80,
    })
    expect(withDetour).toBeLessThan(base)
    expect(base - withDetour).toBeCloseTo((100 * 30 * 0.2) / 60)
  })

  it('uses charge target from the last stop rather than start SoC', () => {
    const soc = arrivalSocOnPath({
      pathLengthKm: 300,
      lastChargeAlongKm: 220,
      batteryKWh: 60,
      kWhPerKm: 0.2,
      startSocPercent: 100,
      chargeToPercent: 80,
    })
    expect(soc).toBeCloseTo(80 - (100 * 80 * 0.2) / 60)
  })
})
