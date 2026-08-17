import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOsmProvider } from './osm'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  }
}

describe('createOsmProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes via OSRM + OpenTopoData when no ORS key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('photon.komoot.io/api')) {
          return jsonResponse({
            features: [
              {
                geometry: { coordinates: [-99.13, 19.43] },
                properties: { name: 'CDMX', country: 'México' },
              },
            ],
          })
        }
        if (url.includes('router.project-osrm.org')) {
          return jsonResponse({
            code: 'Ok',
            routes: [
              {
                distance: 220000,
                duration: 9000,
                geometry: {
                  coordinates: [
                    [-99.13, 19.43],
                    [-100.39, 20.59],
                  ],
                },
              },
            ],
          })
        }
        if (url.includes('opentopodata.org')) {
          return jsonResponse({
            results: [{ elevation: 2200 }, { elevation: 1800 }],
          })
        }
        throw new Error(`unexpected fetch ${url}`)
      }),
    )

    const provider = createOsmProvider()
    const result = await provider.lookup({ from: 'CDMX', to: 'Querétaro' })

    expect(result.provider).toBe('osm')
    expect(result.distanceKm).toBe(220)
    expect(result.driveHoursOneWay).toBe(2.5)
    expect(result.outbound?.path).toHaveLength(2)
    expect(result.elevationGainM).toBe(0)
    expect(result.elevationLossM).toBe(400)
  })

  it('uses ORS when a key is provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('photon.komoot.io/api')) {
          return jsonResponse({
            features: [
              {
                geometry: { coordinates: [-99.13, 19.43] },
                properties: { name: 'CDMX' },
              },
            ],
          })
        }
        if (url.includes('openrouteservice.org')) {
          expect(init?.headers).toMatchObject({ Authorization: 'ors-key' })
          return jsonResponse({
            features: [
              {
                properties: {
                  summary: { distance: 130000, duration: 6300 },
                  extras: { tollways: { values: [[0, 1, 1]] } },
                },
                geometry: {
                  coordinates: [
                    [-99.13, 19.43, 2200],
                    [-98.2, 19.04, 2100],
                  ],
                },
              },
            ],
          })
        }
        throw new Error(`unexpected fetch ${url}`)
      }),
    )

    const provider = createOsmProvider('ors-key')
    const result = await provider.lookup({ from: 'CDMX', to: 'Puebla' })
    expect(result.provider).toBe('ors')
    expect(result.distanceKm).toBe(130)
    expect(result.likelyTolls).toBe(true)
    expect(result.elevationLossM).toBe(100)
  })
})
