import { describe, expect, it } from 'vitest'
import { bevKWhPerKm, lookupTripViaStops } from './charge-legs'
import { calcTrip } from './calc'
import type { LookupTripOptions } from './providers/lookup-trip'
import type { ChargingPoi, Route, VehicleVersion } from '../types'

const version: VehicleVersion = {
  id: 'spark-euv-activ',
  name: 'Activ',
  batteryKWh: 42,
  rangeKmOfficial: 385,
  consumptionKWhPer100: 10.91,
  connector: 'CCS1',
}

describe('bevKWhPerKm', () => {
  it('matches calcTrip energy/distance on a 100 km trip at 90 km/h', () => {
    const result = calcTrip({
      distanceKm: 100,
      version,
      driveStyle: 'normal',
      pricePerKWh: 3,
      reservePercent: 15,
      mode: 'oneWay',
      averageSpeedKmh: 90,
    })
    const kWhPerKm = bevKWhPerKm({
      consumptionKWhPer100: version.consumptionKWhPer100,
      driveStyle: 'normal',
      averageSpeedKmh: 90,
    })
    expect(kWhPerKm * 100).toBeCloseTo(result.energyKWh, 6)
  })
})

describe('lookupTripViaStops', () => {
  it('stitches legs through stops and sums distance/hours/path', async () => {
    const stop: ChargingPoi = { id: 'poi-1', name: 'Stop', lat: 20, lng: -100 }
    const calls: string[] = []
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      calls.push(`${JSON.stringify(options.query.from)}->${JSON.stringify(options.query.to)}`)
      const path =
        calls.length === 1
          ? [{ lat: 19, lng: -99 }, { lat: 20, lng: -100 }]
          : [{ lat: 20, lng: -100 }, { lat: 21, lng: -101 }]
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: 100,
        source: 'osm',
        outbound: { distanceKm: 100, driveHours: 1, path },
      }
    }

    const route = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [stop],
      roundTrip: false,
      preference: 'both',
      lookup,
    })

    expect(route).not.toBeNull()
    expect(route?.distanceKm).toBe(200)
    expect(route?.driveHoursOneWay).toBe(2)
    expect(route?.outbound?.path).toEqual([
      { lat: 19, lng: -99 },
      { lat: 20, lng: -100 },
      { lat: 21, lng: -101 },
    ])
  })

  it('returns null when a leg fails', async () => {
    const lookup = async (): Promise<Route> => {
      throw new Error('network down')
    }
    const route = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [],
      roundTrip: false,
      preference: 'both',
      lookup,
    })
    expect(route).toBeNull()
  })
})
