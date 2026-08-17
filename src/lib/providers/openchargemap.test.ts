import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchChargingPoisAlongPath } from './openchargemap'

describe('fetchChargingPoisAlongPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps OpenChargeMap rows onto the path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            UUID: 'ocm-1',
            AddressInfo: {
              Title: 'VEMO QRO',
              Latitude: 20.6,
              Longitude: -100.4,
            },
            Connections: [{ PowerKW: 60, ConnectionType: { Title: 'CCS' } }],
            OperatorInfo: { Title: 'VEMO' },
          },
        ],
      })),
    )

    const pois = await fetchChargingPoisAlongPath(
      [
        { lat: 19.4, lng: -99.1 },
        { lat: 20.6, lng: -100.4 },
      ],
      'ocm-key',
    )
    expect(pois[0]?.name).toBe('VEMO QRO')
    expect(pois[0]?.network).toBe('VEMO')
    expect(pois[0]?.powerKW).toBe(60)
  })

  it('returns an empty list when the path is too short', async () => {
    expect(await fetchChargingPoisAlongPath([{ lat: 1, lng: 1 }])).toEqual([])
  })
})
