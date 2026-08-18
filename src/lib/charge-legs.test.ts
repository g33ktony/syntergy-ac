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
    expect(route?.inbound).toBeUndefined()
  })

  it('sums elevation gain and loss from each stitched leg', async () => {
    const stop: ChargingPoi = { id: 'poi-1', name: 'Stop', lat: 20, lng: -100 }
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      const from = options.query.from as { lat: number; lng: number }
      const to = options.query.to as { lat: number; lng: number }
      const first = from.lat === 19
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: 100,
        source: 'osm',
        elevationGainM: first ? 200 : 300,
        elevationLossM: first ? 50 : 80,
        outbound: {
          distanceKm: 100,
          driveHours: 1,
          path: [from, to],
          elevationGainM: first ? 200 : 300,
          elevationLossM: first ? 50 : 80,
        },
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
    expect(route?.outbound?.elevationGainM).toBe(500)
    expect(route?.outbound?.elevationLossM).toBe(130)
    expect(route?.elevationGainM).toBe(500)
    expect(route?.elevationLossM).toBe(130)
  })

  it('fills inbound when roundTrip is true and omits it one-way', async () => {
    const stop: ChargingPoi = { id: 'poi-1', name: 'Stop', lat: 20, lng: -100 }
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      expect(options.query.roundTrip).toBe(false)
      const from = options.query.from as { lat: number; lng: number }
      const to = options.query.to as { lat: number; lng: number }
      const northbound = from.lat < to.lat
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: northbound ? 100 : 90,
        source: 'osm',
        elevationGainM: northbound ? 200 : 40,
        elevationLossM: northbound ? 50 : 10,
        outbound: {
          distanceKm: northbound ? 100 : 90,
          driveHours: northbound ? 1 : 0.9,
          path: [from, to],
          elevationGainM: northbound ? 200 : 40,
          elevationLossM: northbound ? 50 : 10,
        },
      }
    }

    const roundTrip = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [stop],
      roundTrip: true,
      preference: 'both',
      lookup,
    })

    expect(roundTrip).not.toBeNull()
    expect(roundTrip?.inbound).toBeDefined()
    expect(roundTrip?.inbound?.path).toEqual([
      { lat: 21, lng: -101 },
      { lat: 20, lng: -100 },
      { lat: 19, lng: -99 },
    ])
    expect(roundTrip?.inbound?.distanceKm).toBe(180)
    expect(roundTrip?.inbound?.driveHours).toBeCloseTo(1.8)
    expect(roundTrip?.inbound?.elevationGainM).toBe(80)
    expect(roundTrip?.inbound?.elevationLossM).toBe(20)
    expect(roundTrip?.outbound?.elevationGainM).toBe(400)
    expect(roundTrip?.outbound?.elevationLossM).toBe(100)

    const oneWay = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [stop],
      roundTrip: false,
      preference: 'both',
      lookup,
    })
    expect(oneWay?.inbound).toBeUndefined()
  })

  it('stitches inbound through inboundStops instead of reversing outbound stops', async () => {
    const outboundStop: ChargingPoi = { id: 'out', name: 'Out', lat: 20, lng: -100 }
    const inboundStop: ChargingPoi = { id: 'in', name: 'In', lat: 20.5, lng: -100.5 }
    const calls: string[] = []
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      const from = options.query.from as { lat: number; lng: number }
      const to = options.query.to as { lat: number; lng: number }
      calls.push(`${from.lat}->${to.lat}`)
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: 50,
        source: 'osm',
        outbound: { distanceKm: 50, driveHours: 0.5, path: [from, to] },
      }
    }

    const route = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [outboundStop],
      inboundStops: [inboundStop],
      roundTrip: true,
      preference: 'both',
      lookup,
    })

    expect(calls).toEqual(['19->20', '20->21', '21->20.5', '20.5->19'])
    expect(route?.chargingPois?.map((p) => p.id)).toEqual(['out', 'in'])
    expect(route?.inbound?.path).toEqual([
      { lat: 21, lng: -101 },
      { lat: 20.5, lng: -100.5 },
      { lat: 19, lng: -99 },
    ])
  })

  it('does not reverse outbound stops when inboundStops is empty', async () => {
    const outboundStop: ChargingPoi = { id: 'out', name: 'Out', lat: 20, lng: -100 }
    const calls: string[] = []
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      const from = options.query.from as { lat: number; lng: number }
      const to = options.query.to as { lat: number; lng: number }
      calls.push(`${from.lat}->${to.lat}`)
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: 50,
        source: 'osm',
        outbound: { distanceKm: 50, driveHours: 0.5, path: [from, to] },
      }
    }

    await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [outboundStop],
      inboundStops: [],
      roundTrip: true,
      preference: 'both',
      lookup,
    })

    expect(calls).toEqual(['19->20', '20->21', '21->19'])
  })

  it('reuses outboundRoute instead of fetching origin→dest again', async () => {
    const outboundStop: ChargingPoi = { id: 'out', name: 'Out', lat: 20, lng: -100 }
    const inboundStop: ChargingPoi = { id: 'in', name: 'In', lat: 20.5, lng: -100.5 }
    const calls: string[] = []
    const lookup = async (options: LookupTripOptions): Promise<Route> => {
      const from = options.query.from as { lat: number; lng: number }
      const to = options.query.to as { lat: number; lng: number }
      calls.push(`${from.lat}->${to.lat}`)
      return {
        id: 'leg',
        from: 'a',
        to: 'b',
        distanceKm: 50,
        source: 'osm',
        outbound: { distanceKm: 50, driveHours: 0.5, path: [from, to] },
      }
    }

    const outboundRoute: Route = {
      id: 'out',
      from: 'a',
      to: 'b',
      distanceKm: 210,
      source: 'osm',
      driveHoursOneWay: 2.1,
      outbound: {
        distanceKm: 210,
        driveHours: 2.1,
        path: [
          { lat: 19, lng: -99 },
          { lat: 20, lng: -100 },
          { lat: 21, lng: -101 },
        ],
        elevationGainM: 40,
        elevationLossM: 10,
      },
    }

    const route = await lookupTripViaStops({
      origin: { lat: 19, lng: -99 },
      dest: { lat: 21, lng: -101 },
      stops: [outboundStop],
      inboundStops: [inboundStop],
      outboundRoute,
      roundTrip: true,
      preference: 'both',
      lookup,
    })

    expect(calls).toEqual(['21->20.5', '20.5->19'])
    expect(route?.distanceKm).toBe(210)
    expect(route?.outbound?.path).toEqual(outboundRoute.outbound?.path)
    expect(route?.inbound?.path).toEqual([
      { lat: 21, lng: -101 },
      { lat: 20.5, lng: -100.5 },
      { lat: 19, lng: -99 },
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
